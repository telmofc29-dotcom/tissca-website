# CLAUDE PROMPT — WEBSITE FULL ARCHITECTURE AUDIT

**Scope:** Tools → Create Lead → Leads → Jobs → PDF → History

You are working on the TISSCA website codebase.

This is a **READ-ONLY, proof-based audit pass**.
Do not modify code in this pass.

I need a full structural audit of the website flow from:

- Tools
- Create Lead screen / create flow
- Leads
- Jobs
- PDF generation
- History

The purpose is to understand exactly how the website currently works, where it matches Android/iOS, where it differs, and what needs correcting later.

---

## IMPORTANT RULES

- Do not change code
- Do not suggest speculative architecture
- Do not assume parity with Android or iOS
- Trace everything from the actual website source
- Every claim must be based on real files / real functions / real fields
- Separate clearly:
  - already correct
  - missing
  - miswired
  - UI-only issue
  - logic/data issue

This is an audit only.

---

## AUDIT GOALS

I need you to map the real current website structure for:

### A. Tools

For all website tools / calculators / estimate builders:

**Audit:**

- what each tool produces
- what is stored in tool payload / local state / DB / form state
- whether tools include:
  - line items
  - quantities
  - prices
  - subtotal
  - discount
  - VAT
  - deposit
  - notes
  - tool key / tool identity
- whether tools currently expose an Adjustments section
- whether those adjustments are:
  - visible
  - hidden
  - persisted
  - used by PDF
  - used by Lead / Job creation
- whether tool totals are raw item totals or already adjusted totals

I need the exact website truth:

- what comes out of a tool
- what gets passed into create lead
- what gets passed into create job
- what gets attached later

### B. Create Lead Screen / Tool Handoff

Audit the full website path from tool → create lead.

I need to know:

- how a tool creates a lead on web
- whether there is a dedicated Create Lead screen
- what parameters are passed into it
- what financial data is prefilled there
- what fields exist there
- which of these fields are editable:
  - job type
  - estimated value
  - quoted value
  - deposit
  - VAT
  - discount
  - follow-up
  - notes
  - start/due dates
- whether the website supports:
  - create lead from tool
  - add more tools to existing lead
  - add tool to existing job
- whether totals recalculate after attaching more tools
- whether any displayed amount becomes stale after later tool attachment

I need the exact handoff chain:

1. Tool UI
2. route/navigation
3. page/component
4. submit handler
5. stored model / DB write

### C. Leads

Audit website Lead structure in full.

I need to know:

#### Lead model / data

- what fields exist on web Lead record
- which fields represent:
  - estimate
  - quoted total
  - deposit requested
  - deposit paid
  - VAT
  - discount
  - total
  - balance
  - notes
  - attachments
  - tool source key
  - pipeline status
  - dates
  - follow-up
- whether website has separate fields for:
  - requested deposit
  - paid deposit
- whether there is a quote override field similar to Android `quoteAmount`
- whether website currently has a financial controls dialog/editor

#### Lead detail screen

**Audit:**

- what cards/sections exist
- what values are displayed
- what is real vs decorative
- whether lead PDF uses lead fields or tool attachment fields
- whether lead deposit is incorrectly treated as paid in PDFs
- whether discount/VAT print correctly
- whether add-more-tools keeps totals correct
- whether any field blocks new tool totals from updating PDF

#### Lead status logic

Audit whether website supports:

- new
- contacted
- viewing booked
- quoted
- negotiating
- won
- lost
- archived

And whether these are actually reachable through UI actions.

### D. Jobs

Audit website Job structure in full.

I need to know:

#### Job model / data

- what fields exist on web Job record
- what fields represent:
  - agreed total
  - deposit requested
  - deposit paid
  - stage payments
  - final payment
  - VAT
  - discount
  - total
  - balance
  - notes
  - attachments
  - dates

#### Lead → Job conversion

**Audit:**

- how Lead converts into Job on website
- what exact fields are copied
- whether manual quote override is preserved
- whether deposit is copied correctly
- whether "mark deposit as paid" exists and what it does
- whether accepting a lead vs marking deposit as paid follow different conversion paths
- whether Job receives actual paid deposit or just configured deposit

#### Job detail screen

**Audit:**

- what cards/sections exist
- what is shown
- whether deposit/final payment areas are properly wired
- whether PDF generation uses the correct Job totals
- whether discount appears
- whether VAT appears
- whether attached tools are read properly
- whether PDF Header / Footer Notes exist
- whether PDF Output selection exists

### E. PDF Generation

This is a major part of the audit.

I need a full source-of-truth audit of website PDF generation.

You must trace:

- where the website PDF payload is built
- which fields are used for:
  - line items
  - subtotal
  - discount
  - VAT rate
  - VAT amount
  - total
  - deposit paid
  - balance due
  - header notes
  - footer notes
  - company info
  - client info
  - currency
- whether website PDF uses:
  - structured model fields
  - tool payload
  - parsed text
  - attachment summary strings
  - history snapshots
- whether lead PDF and job PDF use different rules
- whether deposit is shown only when actually paid
- whether lead PDFs incorrectly show deposit paid
- whether VAT comes from:
  - settings
  - lead/job
  - tool payload
  - mixed sources
- whether discount comes from:
  - tool payload
  - lead/job
  - settings
  - mixed sources

Also audit pagination:

- whether item overflow creates proper second page
- whether totals placement is correct
- whether page 2 can become mostly empty
- whether notes/footer placement is stable

I need the real website truth, not assumptions from Android/iOS.

### F. History

Audit website History end-to-end.

I need to know:

- what kinds of records website history stores:
  - leads
  - jobs
  - PDFs
  - payments
  - documents
- whether history stores:
  - final rendered totals
  - snapshots
  - source record pointers
  - regenerated values
- whether history uses real final amounts or recalculates at read time
- whether PDF history reflects exactly what was generated at that moment
- whether later edits can change what old history shows
- whether lead/job conversion keeps history integrity
- whether attachment changes are reflected correctly

I also need to know:

- whether website history is aligned with Android/iOS intent
- or whether it is still partial / placeholder / miswired

---

## SPECIFIC QUESTIONS YOU MUST ANSWER

Please answer these explicitly in the report.

### 1. Tools

- Do website tools currently expose Adjustments?
- If yes, are they visible, hidden, or dead?
- Are tool adjustments used in PDFs?
- Are tools acting as item builders only, or as financial authorities?

### 2. Create Lead

- Does website create lead from tool properly?
- Can website add more tools to an existing lead?
- Can website add more tools to an existing job?
- When tools are added later, do totals recalculate correctly?

### 3. Leads

- Does website have a field equivalent to `quoteAmount` / manual quote override?
- If yes, does it block later tool totals?
- Is Lead deposit treated as requested or paid?
- Does Lead PDF incorrectly show deposit paid?

### 4. Jobs

- Does website distinguish configured deposit vs paid deposit?
- Does website preserve manual quote override when converting lead → job?
- Are Job payment fields structurally correct?

### 5. VAT / Discount

- Where does VAT authority live on website?
  - Settings only?
  - Tool only?
  - Lead/job?
  - mixed?
- Where does discount authority live?
- Is this aligned with intended structure?

### 6. PDF

- Is website PDF built from structured data or parsed text?
- Do Lead PDF and Job PDF use different deposit rules?
- Does VAT render correctly?
- Does discount render correctly?
- Is pagination stable?

### 7. History

- Does website history preserve generated reality?
- Or does it re-derive values later?
- Is it ready to be the real source for past documents/events?

---

## REQUIRED OUTPUT FORMAT

Return a structured report with these sections:

### 1. Files inspected

List exact files and what each file is responsible for.

### 2. Tool → Lead flow

Trace the exact website flow from tool output into Create Lead and persistence.

### 3. Lead → Add more tools flow

Explain exactly how add-to-existing-lead works and whether totals stay correct.

### 4. Lead → Job conversion flow

Explain exactly what is copied and what is lost.

### 5. Financial fields audit

Field-by-field map for website:

- estimate
- quote override
- quoted total
- deposit requested
- deposit paid
- VAT rate
- VAT amount
- discount
- total
- balance due

For each field say:

- where stored
- who writes it
- who reads it
- PDF impact
- safe / unsafe / missing

### 6. PDF source-of-truth audit

A table showing each PDF field and where it comes from.

### 7. History audit

What history stores, whether it is snapshot-based or recomputed, and whether it is trustworthy.

### 8. Alignment verdict

A table comparing website structure against intended architecture:

| Area | Status |
|------|--------|
| Tools = item builders | |
| Lead = quote stage | |
| Job = payment stage | |
| Settings = VAT authority | |
| PDF = structured source | |
| Deposit paid only after explicit confirmation | |
| Add-more-tools recalculates correctly | |
| History preserves reality | |

Mark each as:

- ✅ matched
- ⚠️ partially matched
- ❌ missing
- 🔀 misaligned

### 9. Risks / gaps

List all structural gaps found, ranked:

- **critical**
- **medium**
- **low**

### 10. Safest next steps

Do not implement, just recommend the safest order for fixes later.

---

## FINAL IMPORTANT INSTRUCTION

This is an **audit only**.

Do not patch anything yet.

I want the website fully understood first so that later we can make it match Android and iOS properly without guessing.

- If some part is not implemented yet, say that clearly.
- If some part is ambiguous, trace further until you can prove it.
