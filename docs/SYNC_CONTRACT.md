TISSCA Sync Contract (Web + Android + iOS + Live Supabase)

Last updated: 11 April 2026

Live Supabase schema and deployed functions are the source of truth.
This document is the cross-platform sync contract for website, Android, iOS, and Supabase.
If anything here conflicts with the live server, the live server wins and this document must be updated.

1) Core Platform Rule

TISSCA now operates as a shared multi-platform system:

Website: Next.js + Supabase
Android: Kotlin / Jetpack Compose
iOS: Swift / SwiftUI
Backend: Live Supabase schema + deployed routes/functions

All three clients must align to the same:

identity model
plan tier model
workspace role model
accountant hub access matrix
tool payload shape
document PDF info shape
tax-year filtering rules
accounting/export metadata rules
2) Auth Identity Rules
Single identity provider: Supabase Auth
The same Supabase project is used by web, Android, and iOS
The Supabase user id (auth.users.id) is the canonical identity for all services
Email verification redirects include:
https://www.tissca.com/auth/verified
https://www.tissca.com/auth/verified/
http://localhost:3000/auth/verified for local website testing only
3) Environment Configuration
Website

Set these in .env.local:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_BASE_URL=https://www.tissca.com
Supabase dashboard

Allowed URLs must include:

https://www.tissca.com
https://www.tissca.com/auth/verified
https://www.tissca.com/auth/verified/
http://localhost:3000/auth/verified for local testing only
4) Profile Tables (Live Server)

Two profile tables exist on the live server.

public.user_profiles (primary workspace context)

Columns:

id uuid primary key references auth.users.id
full_name
email
current_workspace_id
business_id
created_at
updated_at
public.profiles (auxiliary / fallback)

Columns:

id uuid primary key references auth.users.id
full_name
email
company_name
phone
business_id
created_at
updated_at
Rules
user_profiles.current_workspace_id is the primary source of truth for active workspace context
profiles is auxiliary and may be used for fallback name/email resolution
Do not treat profiles as the primary workspace-context table
Member name resolution may use a fallback chain:
profiles
user_profiles
auth admin lookup if required
5) Plan Tiers (Canonical)

Canonical values stored in workspaces.plan_tier:

free
pro
pro_plus
team_starter
team_pro
Semantics
free: no TissChat, no Accountant Hub, no Document PDF Info
pro: single-user paid plan
pro_plus: reserved / future-compatible single-user paid tier
team_starter: team plan, max 5 members
team_pro: team plan, max 200 members
Legacy mapping
team → normalize to team_starter
6) Shared Entitlement Helpers

Canonical helper behaviour:

normalizePlanTier(raw)
isPro(plan)
isTeam(plan)
hasTissChatAccess(plan)
maxWorkspaceMembers(plan)
Canonical behaviour
isPro(plan) returns true for:
pro
pro_plus
team_starter
team_pro
isTeam(plan) returns true for:
team_starter
team_pro
hasTissChatAccess(plan) delegates to isTeam(plan)
maxWorkspaceMembers(plan):
team_pro → 200
team_starter → 5
others → 1
7) Workspace Member Roles

Valid values in workspace_members.role:

owner
admin
member
accountant
Meaning
owner: full workspace control
admin: member/team management, but not accountant hub
member: regular workspace access
accountant: financial access only where allowed by plan
8) TissChat Contract
Workspace entitlement rule

TissChat is enabled by workspace entitlement, not just ownership.

Allowed when:

the resolved workspace is on team_starter or team_pro
TissChat access
owner → allowed
admin → allowed
member → allowed
accountant → allowed
as long as the workspace tier is a valid team tier
Website current routes
/api/chat/conversations
/api/chat/conversations/[id]/messages
/api/chat/messages
/api/chat/mark-read
/api/chat/reactions
/api/chat/upload
/api/chat/devices
Live divergence note

Android and iOS may also use deployed edge functions / RPCs in the live Supabase project that are not tracked in the website repo. Live backend truth always wins.

9) Team Management Contract

Team Management is now a menu-level feature, not a Settings feature.

Cross-platform navigation rule
Android: Team Management appears in the new drawer menu, not Settings
iOS: Team Management appears in the menu, not Settings
Website: Team Management is a dedicated page, but settings/menu visibility must follow the same role rules
Visibility rule

Team Management is visible only on team plans and only to:

owner
admin

Hidden for:

member
accountant
non-team users
Management rule

Current canonical behaviour:

owners can manage members
admins may view the page where implemented
if platform-specific editing is more restrictive, server rules must still remain safe
Safety rules
cannot self-demote owner
cannot remove last owner
cannot assign owner casually unless explicit ownership-transfer flow exists
member cap must be enforced for invite/add flows
Member cap
team_starter → 5
team_pro → 200
10) Document PDF Info Contract

Document PDF Info is no longer a free/global settings screen. It is role/tier gated.

Navigation placement
Android: no longer surfaced as a broad free feature; access gated
iOS: route guarded
Website: page + server check guarded
Access matrix
Plan Tier	Owner	Admin	Accountant	Member
free	❌	❌	❌	❌
pro	✅	—	—	—
pro_plus	✅	—	—	—
team_starter	✅	❌	❌	❌
team_pro	✅	❌	❌	❌
Behaviour
free users must not see or access Document PDF Info
pro / pro_plus single-user accounts can access it
team tiers: owner only
Route rule

Entry-level hiding alone is not enough. Direct route/page access must also be guarded.

11) Business Structure Contract

Business structure is part of the shared settings model and affects documents + accountant hub.

Canonical values

Stored as:

sole_trader
limited_company
Server persistence

Lives in document_pdf_info.business_structure

Cross-platform behaviour

When sole_trader:

company number is optional
wording should not imply a limited company
label should be business-oriented, not “legal company” wording

When limited_company:

company number is required
legal/company wording becomes active
accountant hub switches to limited-company framing
Required UX behaviour

All platforms should show visible mode-switch feedback when toggling:

sole_trader ↔ limited_company

12) Accountant Hub — Profit & Loss Contract

The Accountant Hub GET response includes an additive `profitAndLoss` object.

Source data

Cost data is aggregated from `tool_attachments.result_data` line items within the selected tax year.
Each line item carries a `cost_bucket` classification.

Accounting model (construction trade)

Labour = profit margin. Labour is the tradesperson's charge for work — it is NOT a cost.
Materials, subcontractors, plant hire = cost of sales (what the business pays out).
Overhead = operating expenses (business running costs).
Unknown = not deducted (treated conservatively as margin until classified).

Cost bucket mapping

Profit margin (NOT deducted):
- labour

Cost of Sales (deducted from turnover):
- materials
- subcontractor
- plant_hire
- other_direct_cost

Operating Expenses (deducted after gross profit):
- overhead

Not deducted (unclassified):
- unknown

Formulas

turnover = sum(ALL line_total from tool attachments)
cost_of_sales = sum(materials + subcontractor + plant_hire + other_direct_cost)
gross_profit = turnover - cost_of_sales
operating_expenses = sum(overhead)
net_profit = gross_profit - operating_expenses

P&L response shape

```
profitAndLoss: {
  turnover: number           // sum of ALL tool line item totals
  labour: number             // labour total (profit margin — not deducted)
  cost_of_sales: number      // materials + subcontractor + plant_hire + other_direct_cost
  cost_of_sales_breakdown: {
    materials, subcontractor, plant_hire,
    other_direct_cost, unknown
  }
  gross_profit: number       // turnover - cost_of_sales
  operating_expenses: number // sum of overhead bucket
  operating_expenses_breakdown: { overhead }
  net_profit: number         // gross_profit - operating_expenses
  tool_attachment_count: number
}
```

Rules

- `profitAndLoss` is always present in the response (additive, not breaking).
- When `tool_attachment_count` is 0, all cost/profit fields are 0 and the UI shows a placeholder.
- Old payloads without `cost_bucket` or `quantity` are normalized (qty→1, bucket→unknown).
- Turnover = sum of all tool line item totals (not yearRevenue from documents).
- Labour is shown in the breakdown but NOT deducted as a cost.
- All P&L figures respect the selected tax year window.
- CSV and PDF exports include P&L breakdown when tool data exists.
- All platforms (web, Android, iOS) must use the same formulas.

13) Tool Line Item Contract

Canonical `ToolLineItem` shape (stored in `tool_attachments.result_data.payload.line_items`):

```
{
  index: number
  description: string
  quantity: number        // default 1
  unit_price: number
  amount: number          // = quantity × unit_price
  cost_bucket: CostBucket // 'labour' | 'materials' | 'subcontractor' | 'plant_hire' | 'other_direct_cost' | 'overhead' | 'unknown'
}
```

Backward compatibility

`normalizeLineItem()` handles old payloads:
- Missing `quantity` → 1
- Missing `unit_price` → `amount` (old flat field)
- Missing `cost_bucket` → 'unknown'
- `amount` is recalculated as `quantity × unit_price`

Auto-detection

`detectCostBucket(description)` provides best-effort classification from item text.
Always overridable by the user via cost bucket dropdown.
Default when no keywords match: `other_direct_cost` (conservative — counted in cost of sales).

Detection keywords:
- Labour: labour, labor, work, hours, installation, fitting, fixing, service, joiner, plumber, electrician, etc.
- Materials: tile, wood, paint, cement, plaster, board, panel, pipe, cable, timber, etc.
- Plant hire: hire, rental, machine, equipment, scaffold, skip
- Subcontractor: subcontract, external, outsourced
- Overhead: insurance, software, subscription, fuel, transport, accountant, etc.
- Else → other_direct_cost

“Sole Trader mode enabled”
“Limited Company mode enabled”

This can be:

snackbar
premium banner
confirmation card
transient mode message
12) Document PDF Info Additional Tax Context

The following fields are part of shared tax/accounting context:

business_structure
tax_region
selected_tax_year
vat_status
Canonical values
tax_region
england_wales_ni
scotland
selected_tax_year
2024_25
2025_26
2026_27
vat_status
not_registered
registered
Meaning

These fields drive:

accountant hub tax display
tax-year tab selection
export metadata
legal/advisory wording
VAT warning messaging
13) Accountant Hub — Cross-Platform Contract

Accountant Hub is now a menu-level financial feature on mobile platforms.

Navigation placement
Android: in drawer menu, removed from Settings
iOS: in menu, removed from Settings
Website: dedicated page remains valid, but contract must mirror mobile behaviour
Access Control Rules (LOCKED)
Plan Tier	Owner	Accountant	Admin	Member
Free	❌	❌	❌	❌
Pro	✅	—	—	—
Pro Plus	✅	—	—	—
Team Starter	✅	❌	❌	❌
Team Pro	✅	✅	❌	❌
Denial codes

Canonical denied response values:

tier_free
not_member
role_not_allowed
no_workspace

Platforms may internally map richer enums, but these are the shared external denial codes.

14) Accountant Hub — Core UX Rules

The Accountant Hub must now behave consistently across all three clients.

Required sections

At minimum:

Financial Overview
Documents / year-scoped document counts
Tax Estimate / Tax Summary
Export
Selected tax year must affect the whole hub

Switching tax year must affect:

turnover / total income
tax calculation
VAT-related figures
invoice counts
quote counts
document counts
recent document lists if shown
export output
Not allowed

It is no longer acceptable for tax-year tabs to only change one tax card while the rest of the hub stays on all-time or calendar-year values.

15) Accountant Hub — Tax Year Rules
Canonical tax years
2024/25 → 6 Apr 2024 to 5 Apr 2025
2025/26 → 6 Apr 2025 to 5 Apr 2026
2026/27 → 6 Apr 2026 to 5 Apr 2027
Canonical storage identifiers
2024_25
2025_26
2026_27
Default selected year

Current UK tax year based on today’s date.

16) Accountant Hub — Tax Region Rules
Supported regions
England / Wales / Northern Ireland
Scotland
Behaviour
region affects sole trader tax bands
region does not change corporation tax rules
Scotland must show Scottish income-tax framing/bands
England/Wales/NI uses UK basic/higher/additional structure
17) Accountant Hub — Sole Trader Tax Logic

This is an estimate, not filing advice.

Required principles
personal allowance must be considered
personal allowance taper must apply above £100,000
20%, 40%, and 45% thresholds must be modelled for England/Wales/NI
Scottish band structure must be region-specific where selected
NI should be modelled, not omitted
UI must clearly say:
estimate
based on selected year and current inputs
confirm with accountant / HMRC before filing
Personal allowance taper
full PA up to £100,000 adjusted net income
reduced by £1 for every £2 over £100,000
reaches zero by £125,140
Display guidance

Use semantic colours:

gold → turnover / revenue / total income
green → profit / after-tax profit / taxable profit
red → tax due / NI / VAT due / warnings
white/neutral → thresholds / expenses / explanatory rows / allowance rows
18) Accountant Hub — Limited Company Tax Logic

This is also an estimate, not filing advice.

Required principles
do not reuse sole trader labels
no NI wording in the company tax section
company view must separate:
revenue
allowable company expenses
taxable company profit
corporation tax estimate
after-tax profit
VAT liability
Corporation tax framing

Use current small-profits/main-rate structure with simplified marginal-relief framing where implemented.

Caveat

Associated companies, short accounting periods, and full professional tax adjustments may not be fully modelled. The UI must say this is an estimate.

19) VAT Framing Rules
Canonical vat_status
not_registered
registered
Behaviour

If registered:

show VAT liability rows and due values where applicable

If not_registered:

do not imply VAT is automatically due
VAT section may be hidden or shown neutrally as “Not VAT registered”
Threshold warning

If not registered and turnover exceeds the threshold, show advisory warning.

Current threshold framing used across contract:

registration threshold: £90,000
deregistration threshold: £88,000

If threshold values are updated by HMRC in future, live logic should be updated and this contract revised.

20) Accountant Hub — Export Contract
User-facing formats

Canonical user-facing export formats:

CSV
PDF

JSON is not the canonical user-facing export format.

Metadata that must be included

Both CSV and PDF should include, where available:

business_structure
tax_region
vat_status
selected_tax_year
source
computed_at
snapshot_version
reconciliation_status
Export content rule

Exported values must reflect the selected tax year, not all-time values.

21) Accountant Hub — Snapshot / Reconciliation Contract
Live tables
public.accountant_hub_snapshots
public.accountant_hub_audit_log
Rules
live snapshot table remains versioned server truth
clients may compute local/device views
clients may compare local vs server values
response may include:
snapshot version
computed_at
reconciliation_status
mismatch flags/details
Important note

Year switching affects client-visible hub totals. Snapshot storage is still workspace-level unless explicitly partitioned by tax year. This can produce harmless comparison ambiguity if the stored server snapshot is from a different selected year.

22) Accountant Hub — Year Filtering Contract

All platforms must use UK tax-year windows, not calendar-year windows, when the selected tax year is active.

Canonical date windows
2024/25: 2024-04-06 to 2025-04-05
2025/26: 2025-04-06 to 2026-04-05
2026/27: 2026-04-06 to 2027-04-05
Metric rule

All hub metrics shown under the selected year must come only from items within that tax-year window.

Edge case note

Outstanding/current liabilities may still use present-state logic in some clients. Where that differs from pure historical year-scoping, the UI can note that it represents current obligations.

23) Shared Tool Row Contract

TISSCA is moving toward a structured row-based accounting model for tools and generated documents.

Canonical line item shape

Every structured tool row should support:

index
item_name or description
quantity
unit_price
line_total
cost_bucket
optional notes/metadata
source tracing fields where available
Equation
line_total = quantity × unit_price
subtotal = sum of all line totals
discount and VAT apply after subtotal using existing pricing rules
Backwards compatibility

Older payloads without:

quantity
unit_price
cost_bucket

must still load safely by defaulting as needed.

24) Cost Bucket Contract

This is the next major accounting classification layer.

Canonical buckets

Every structured row should ultimately classify into one of:

labour
materials
subcontractor
plant_hire
other_direct_cost
overhead
unknown
Intended accounting meaning
Cost of sales

Typically includes:

labour
materials
subcontractor
plant_hire
other_direct_cost
Operating expenses

Typically includes:

overhead
Unknown

Temporary fallback when a row cannot be classified yet

Rule

Do not silently treat everything as profit.
Rows must progressively move toward explicit bucket classification.

25) Cost Bucket Auto-Detection Rule

Auto-detection may use description text and tool context, but explicit classification is preferred.

Temporary auto-detection rule

If row text strongly matches labour wording, it may default to labour.

Examples:

labour
labor
labourer
fitting
installation
install
works
work
fix
repair
service
callout
joiner labour
painter labour
electrician labour
plumber labour
Important rule

Auto-detection is a helper only.
The long-term contract is still structured classification, not fuzzy guessing.

26) Documents ↔ Tools Accounting Rule

Generated documents must remain rich enough to preserve both commercial and accounting meaning.

Document generation must preserve:
item names
quantities
unit prices
totals
labour/material wording
enough structured/raw text for later accounting interpretation
Rule

Documents should not strip away useful tool-detail semantics that are needed later for accounting classification.

27) Menu / Settings Consolidation Rule
Mobile platforms

The following are now menu features, not Settings features:

Team Management
History
Accountant Hub
Rules
if a dead/dummy menu link exists, it must be replaced with the real screen
duplicate entries must be removed from Settings
one canonical entry point per feature
Website equivalent

Website may still keep these in page structure as needed, but role/access logic must remain aligned.

28) History Placement Rule

History belongs in the main menu navigation, not duplicated across both menu and settings.

Mobile
Android: menu only
iOS: menu only
29) Theme / Visual Semantics Rule

Android visual styling is being aligned toward iOS premium dark presentation.

Shared semantic guidance
warmer espresso / brown-grey dark base preferred over cold navy
gold accent for premium/high-value income figures
green for profit / positive net outcomes
red for due / liability / warnings
neutral white/grey for labels, thresholds, helper text

This is a UX parity rule, not a DB contract rule, but platforms should maintain it for financial clarity.

30) Tools Quantity Contract

Tools that support repeatable/addable items must support quantity properly.

Required behaviour
if multiple identical items are being added, quantity should be usable instead of duplicating identical rows
equations must still remain correct
saved attachments / reopened tool states must preserve quantity
valuesText / exported summaries must show qty × unit price clearly where supported
Current state

Some tools already support it, some are still placeholder or next-pass. The contract allows phased rollout but the target shape is fixed.

31) Structured Accounting Tables (Supabase)

Live/additive structured accounting support may include tables such as:

tool_attachment_line_items
future classification / accounting support tables if added
Purpose

These enable:

structured item rows
quantities
cost bucket classification
richer accountant hub breakdowns
future self-assessment-grade exports
Rule

Additive migrations must be backward-compatible and safe to run on the live DB.

32) Known Incomplete Areas

These are accepted current gaps, not contract violations, as long as they are treated honestly in UI and code:

full tool-by-tool cost bucket classification is not complete yet
some tools still remain placeholder or next-pass
cost of sales / operating expenses may still be zero where structured classification has not yet been populated
some reconciliation may still compare against workspace-level snapshots not partitioned by tax year
some tax caveats remain estimate-only
live HMRC threshold changes require contract update
33) Reliability / Legal Copy Rule

All platforms must keep the Accountant Hub wording honest.

Required wording concepts

The UI/export must clearly communicate:

this is an estimate
based on selected year and current inputs
confirm with accountant / HMRC before filing
Not allowed
fake certainty
implying accountant-grade final filing output where the model is still estimate-based
hiding caveats when tax rules are simplified
34) Supabase Live Tables Relevant to This Contract

This contract currently depends on live usage of tables including, but not limited to:

workspaces
workspace_members
user_profiles
profiles
document_pdf_info
accountant_hub_snapshots
accountant_hub_audit_log
tool_attachments
tool_attachment_line_items if present
invoices / quotes / documents-related tables used by the live accountant route
chat tables listed earlier
35) If Live Server and Clients Diverge

When behaviour differs:

Live Supabase schema / deployed routes / deployed functions win
Clients must be updated to match
This contract must then be updated
Platform-specific docs must never override live backend truth
36) Current Cross-Platform State Summary
Android
Team Management, History, Accountant Hub moved to drawer menu
warmer iOS-like dark theme tuning applied
Accountant Hub selected tax year affects hub values
structured quantity rollout started
P&L fields introduced for future accounting-grade breakdown
iOS
Team Management, History, Accountant Hub moved to menu
CSV white-screen fixed
JSON replaced with CSV + PDF user-facing export
full-hub year filtering and tax context expanded
region, VAT status, PA taper, sole trader vs limited company logic added
Website
Accountant Hub full-year filtering implemented using UK tax years
General tool upgraded with quantity / unit price / cost bucket structure
ready for broader accounting classification expansion
Supabase
core accountant/document tables already exist
additional tax-context fields added on document settings side
structured line-item/accounting tables have begun in additive safe form
37) Next Required Phase

The next major implementation phase is:

“Accounting Classification Pass”

Goal:

classify structured rows into cost buckets across tools and documents
feed Accountant Hub with true:
turnover
cost of sales
gross profit
operating expenses
net profit
38) Document Identity, Regeneration, and Version Contract (LOCKED)

This section defines how generated documents (quotes, invoices, layout quotes) are persisted and regenerated across all platforms.

Identity key

Every generated document has a logical identity defined by:

(workspace_id, linked_entity_type, linked_entity_id, type)

Where:

workspace_id — the workspace that owns the document
linked_entity_type — 'quote', 'invoice', or 'layout'
linked_entity_id — the UUID of the source entity (quote.id, invoice.id, layout.id)
type — the document type string: 'quote', 'invoice', 'layout_quote'

This tuple is enforced by a partial unique index on the documents table (WHERE linked_entity_type IS NOT NULL AND linked_entity_id IS NOT NULL).

First generation behaviour

When a PDF is generated for an entity that has no existing document row:

INSERT a new row into documents with version = 1
Allocate a new reference number (the entity's existing number, e.g. quote_number)
Log to crm_history with action = 'generated'
KPI counters increase by 1

Regeneration behaviour

When a PDF is generated for an entity that already has a document row (same identity key):

UPDATE the existing row — do NOT insert a new row
Increment version by 1 (version = old_version + 1)
Reuse the existing reference number — do NOT allocate a new number
Update all snapshot fields (client info, totals, items, notes, etc.) to current values
Set updated_at to current timestamp
Log to crm_history with action = 'regenerated'
KPI counters do NOT increase — the document count stays the same

Version rules

version starts at 1 for every new document
version increments by 1 on each regeneration
version must never decrease
version is stored as INTEGER NOT NULL DEFAULT 1 with CHECK (version >= 1)
Platforms must not reset version to 1 on regeneration

KPI counting rule

Document counts (docs_invoices_generated, docs_quotes_generated, etc.) must count ROWS in the documents table, not events in crm_history.
Because regeneration updates the existing row rather than inserting a new one, KPI counts are naturally protected from inflation.

History logging rule

First generation:
entity_type = 'document'
action = 'generated'
details must include: type, reference, version (1)

Regeneration:
entity_type = 'document'
action = 'regenerated'
details must include: type, reference, version (new version number)

History is append-only. Each regeneration creates a new crm_history row with the 'regenerated' action. This provides a full audit trail of every version.

Linked entity requirements

All platforms must pass linked_entity_type and linked_entity_id when persisting a document.
Documents without linked_entity values cannot be deduplicated and will always INSERT new rows.
The linked_entity_type must be one of: 'quote', 'invoice', 'layout'
The linked_entity_id must be the UUID of the source entity.

Cross-platform expectations

Website:
persistDocumentAndLog() implements the lookup-before-write pattern with unique index race protection.
Quote PDF, Invoice PDF, and Layout Quote PDF routes pass linked_entity values.

Android:
Must implement the same identity key lookup before writing to the documents table.
Must pass linked_entity_type and linked_entity_id for all generated documents.
Must increment version on regeneration, never reset to 1.
Must use action = 'regenerated' in crm_history for updates, not 'generated'.

iOS:
Same requirements as Android.
Must implement the same identity key and regeneration logic.

If any platform writes a document row without linked_entity values, that document is unconstrained and will not participate in deduplication. This is acceptable only for legacy/demo documents.

39) Lead to Job Conversion Contract

Conversion process

When a lead is converted to a job, the following must occur in order:

1. Read document settings for VAT authority
2. Aggregate tool attachment financials via sumToolAttachmentTotals
3. Create job with:
   title = lead.name
   lead_id = original lead ID (provenance)
   client_id = lead.client_id
   notes = lead.notes (carried over)
   value = tool total (if > 0) or lead.value_estimate
   vat_rate = from document_pdf_info settings
   deposit_requested = sum of tool payloads deposit_paid
   discount from tool suggestion
4. Reassign tool attachments: set job_id on all lead tools, keep lead_id for audit
5. Mark lead as 'won'
6. Log two history events:
   Lead-side: entity_type = 'lead', action = 'converted_to_job', including job_id
   Job-side: entity_type = 'job', action = 'created_from_lead', including lead_id

Tool attachment dual-ID model

After conversion:
lead_id remains set (audit trail)
job_id is set to the new job (active context)
Tools created directly on a job have lead_id = NULL

Fields carried over

client_id, name/title, notes, value, follow_up_date → scheduled_date, tool attachments (reassigned)

Fields NOT carried over

tags, source, status history
This is the main step still needed to reach a more accountant-grade experience.