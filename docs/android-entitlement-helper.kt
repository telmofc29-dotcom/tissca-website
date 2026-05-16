// android-entitlement-helper.kt
//
// TISSCA — Portable Android entitlement helper.
// Drop this into the Android project alongside existing plan logic.
// Mirrors the canonical logic from the website's src/lib/plans.ts.
//
// CANONICAL PLAN SET: free, pro, pro_plus, team_starter, team_pro
// LEGACY MAPPING: "team" → "team_starter"
//
// USAGE:
//   val tier = PlanEntitlement.normalize(rawTier)
//   if (PlanEntitlement.hasTissChatAccess(tier)) { … }
//   val cap = PlanEntitlement.maxWorkspaceMembers(tier)

package com.tissca.entitlement

enum class PlanTier(val key: String) {
    FREE("free"),
    PRO("pro"),
    PRO_PLUS("pro_plus"),
    TEAM_STARTER("team_starter"),
    TEAM_PRO("team_pro");

    companion object {
        fun fromKey(key: String): PlanTier? = entries.find { it.key == key }
    }
}

object PlanEntitlement {

    // Legacy mapping: old DB values → canonical tier
    private val legacyMap = mapOf(
        "team" to PlanTier.TEAM_STARTER
    )

    /**
     * Normalize a raw plan_tier string from the database to a canonical PlanTier.
     * Handles legacy values, whitespace, casing, hyphens.
     * Unknown values log a warning and default to FREE.
     */
    fun normalize(raw: String?): PlanTier {
        val key = (raw ?: "free")
            .trim()
            .lowercase()
            .replace(Regex("[\\s-]"), "_")

        legacyMap[key]?.let { return it }
        PlanTier.fromKey(key)?.let { return it }

        if (key != "free") {
            android.util.Log.w("PlanEntitlement", "Unknown plan tier: $raw → defaulting to free")
        }
        return PlanTier.FREE
    }

    /** True for any paid plan (pro, pro_plus, team_starter, team_pro). */
    fun isPro(plan: PlanTier): Boolean = when (plan) {
        PlanTier.PRO, PlanTier.PRO_PLUS, PlanTier.TEAM_STARTER, PlanTier.TEAM_PRO -> true
        PlanTier.FREE -> false
    }

    /** True for team-tier plans only (team_starter, team_pro). */
    fun isTeam(plan: PlanTier): Boolean = when (plan) {
        PlanTier.TEAM_STARTER, PlanTier.TEAM_PRO -> true
        else -> false
    }

    /** True if the plan tier includes TissChat access (team_starter, team_pro). */
    fun hasTissChatAccess(plan: PlanTier): Boolean = isTeam(plan)

    /** Maximum workspace members for the given plan tier. */
    fun maxWorkspaceMembers(plan: PlanTier): Int = when (plan) {
        PlanTier.TEAM_PRO -> 200
        PlanTier.TEAM_STARTER -> 5
        else -> 1
    }

    /** Human-readable label for a plan tier. */
    fun label(plan: PlanTier): String = when (plan) {
        PlanTier.FREE -> "Free"
        PlanTier.PRO -> "Pro"
        PlanTier.PRO_PLUS -> "Pro Plus"
        PlanTier.TEAM_STARTER -> "Team Starter"
        PlanTier.TEAM_PRO -> "Team Pro"
    }
}

// HARDENING NOTES FOR ANDROID:
//
// 1. Replace scattered raw plan string checks with PlanEntitlement.normalize() + hasTissChatAccess().
// 2. Any check like `plan == "team"` must go through normalize() first.
// 3. The "pro_plus" tier is future-proofed — it won't be blocked or cause crashes.
// 4. Do NOT change chat creation, conversation list, or message flow — Android is source of truth.
// 5. Only add this entitlement layer for plan interpretation safety.
