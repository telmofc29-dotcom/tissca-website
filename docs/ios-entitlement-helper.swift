// ios-entitlement-helper.swift
//
// TISSCA — Portable iOS entitlement helper.
// Drop this into the iOS project and call from all plan-gated features.
// Mirrors the canonical logic from the website's src/lib/plans.ts.
//
// CANONICAL PLAN SET: free, pro, pro_plus, team_starter, team_pro
// LEGACY MAPPING: "team" → "team_starter"
//
// USAGE:
//   let tier = PlanEntitlement.normalize(rawTier)
//   if PlanEntitlement.hasTissChatAccess(tier) { … }
//   let cap = PlanEntitlement.maxWorkspaceMembers(tier)

import Foundation

enum PlanTier: String, Codable, CaseIterable {
    case free
    case pro
    case proPlus = "pro_plus"
    case teamStarter = "team_starter"
    case teamPro = "team_pro"
}

struct PlanEntitlement {

    // MARK: - Legacy mapping

    private static let legacyMap: [String: PlanTier] = [
        "team": .teamStarter
    ]

    // MARK: - Normalization

    /// Normalize a raw plan_tier string from the database to a canonical PlanTier.
    /// Handles legacy values, whitespace, casing, hyphens.
    /// Unknown values log a warning and default to .free.
    static func normalize(_ raw: String?) -> PlanTier {
        let key = (raw ?? "free")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "-", with: "_")

        if let legacy = legacyMap[key] {
            return legacy
        }
        if let canonical = PlanTier(rawValue: key) {
            return canonical
        }
        if key != "free" {
            print("[PlanEntitlement] Unknown plan tier: \(raw ?? "nil") → defaulting to free")
        }
        return .free
    }

    // MARK: - Entitlement checks

    /// True for any paid plan (pro, pro_plus, team_starter, team_pro).
    static func isPro(_ plan: PlanTier) -> Bool {
        switch plan {
        case .pro, .proPlus, .teamStarter, .teamPro: return true
        case .free: return false
        }
    }

    /// True for team-tier plans only (team_starter, team_pro).
    static func isTeam(_ plan: PlanTier) -> Bool {
        switch plan {
        case .teamStarter, .teamPro: return true
        default: return false
        }
    }

    /// True if the plan tier includes TissChat access (team_starter, team_pro).
    static func hasTissChatAccess(_ plan: PlanTier) -> Bool {
        return isTeam(plan)
    }

    /// Maximum workspace members for the given plan tier.
    static func maxWorkspaceMembers(_ plan: PlanTier) -> Int {
        switch plan {
        case .teamPro: return 200
        case .teamStarter: return 5
        default: return 1
        }
    }

    /// Human-readable label for a plan tier.
    static func label(_ plan: PlanTier) -> String {
        switch plan {
        case .free: return "Free"
        case .pro: return "Pro"
        case .proPlus: return "Pro Plus"
        case .teamStarter: return "Team Starter"
        case .teamPro: return "Team Pro"
        }
    }
}

// MARK: - iOS TissChat visibility diagnosis
//
// KNOWN ROOT CAUSE for "No conversations yet" / "You're the only member":
//
// 1. WORKSPACE RESOLUTION: If the active workspace ID is not set or resolves
//    to a different workspace than the one containing the user's team,
//    member and conversation fetches will return empty results.
//    FIX: Verify activeWorkspaceId matches the workspace visible on the website.
//
// 2. ENTITLEMENT GATING: If the iOS tier check uses raw plan_tier string
//    without normalization, legacy "team" values block access.
//    FIX: Use PlanEntitlement.normalize() before any tier check.
//
// 3. MEMBER FETCH PATH: If iOS fetches workspace_members but filters by
//    a stale or incorrect workspace ID, result is 0 rows.
//    FIX: Ensure the member fetch uses the same workspace ID as the website's
//    GET /api/workspace/members endpoint.
//
// 4. CONVERSATION FETCH: If iOS fetches conversations but doesn't join through
//    conversation_members to filter by the current user, it may get 0 results
//    (RLS blocks access) or all workspace conversations (privacy bug).
//    FIX: Query conversation_members WHERE user_id = currentUserId first,
//    then fetch conversations WHERE id IN (those conversation IDs).
//
// 5. STORE RESET: If the conversation/member store is reset on every
//    screen appearance or workspace switch, freshly loaded data may be
//    overwritten by an empty default before the UI renders.
//    FIX: Do not reset store until new data has been fetched.
//
// RECOMMENDED VERIFICATION STEPS:
//   1. Log activeWorkspaceId on Chat screen appear
//   2. Log raw plan_tier + normalized tier
//   3. Log member fetch count before/after filtering
//   4. Log conversation fetch count before/after filtering
//   5. Compare all IDs with the values returned by GET /api/user/me on website
