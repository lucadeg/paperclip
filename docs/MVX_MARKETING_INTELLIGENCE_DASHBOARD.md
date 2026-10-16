# MVX Marketing Intelligence — Dashboards, KPI, Agent Reviews & Visual Content Audit

## Implemented 2026-10-14

GitHub repository `lucadeg/paperclip`, base `mvx-sovereign-master`, draft PR #1. All operational files under existing mini-pc1 `C:\Users\Deglu\.hermes\paperclip`.

### 1. UI entrypoints and actual UX

Route `/marketing-intelligence` (alias `/marketing-audit`) registered in three Paperclip navigation contexts. Navigation link exists in both classic Sovereign sidebar and production sidebar.

The new page `ui/src/pages/MvxMarketingIntelligence.tsx` contains six functional tabs:
1. **Executive & KPI**: cards showing posts, QA coverage, source citations, criticality, competitor candidates and actual available measurements. Channel distribution, defect classes, per-client historical run comparison, completeness/freshness and unknown real business figures.
2. **Visual Content QA**: per-platform search/filter, 24 individual selectable post cards in acceptance scenario, source-linked captions, hooks, CTAs, storyboard, alt-text, compliance checks and a preview drawer showing explicit missing media assets. Media absence never masquerades as a rendered ad.
3. **Agent Review Board**: full 91-definition workforce visibility with honest runtime state, and 14 independently assigned review-lens columns for each creative. Shows deterministic rule pass/block separate from never-executed agent model reviews; no fabricated multimodal results.
4. **Competitor Ads**: candidate list and heuristic relevance, official searchable Ad Library references, observed-ad counts and provider connection blockers; no claim that ad visibility establishes ROAS.
5. **Customer Needs**: competitor-marketing pain hypotheses separate from consented Voice-of-Customer observations, and four differentiated test concepts.
6. **Evidenze & audit**: severity-filtered issues, accountable owners and corrections, source URLs with observed times and SHA-256.

Accessibility implemented: accessible labels for interactive filters, tab/list controls, search, previews, table column heads, modal/drawer close and alternative states. Responsive cards and scrolling detail panes. No live-browser screenshot or full app typecheck conducted on mini-pc1 because full mono-repo dependencies are not installed.

### 2. Data plane, API & tenant boundary

Pipeline `run-competitive-audit.mjs` now builds a consistent campaign/competitor/red-team dashboard snapshot using `dashboard-model.mjs`. 24 posts contain 14 per-post audit statuses, visual metadata check results, source references, known/open risks, and per-post business KPIs marked `null` until verified.

The snapshot is stored at
`evidence/mvx-marketing-fleet/dashboards/<companyId>/<clientId>/<UTC-run>/snapshot.json`
within the existing `.hermes` repo, using `dashboard-store.mjs`; raw/source data is already gitignored. The envelope uses SHA-256 over JSON payload, **integrity only**, not an authenticated producer signature nor Tier 1 reconciliation. Do NOT misrepresent it as a trusted CRM or advertising ledger.

Route `GET /api/companies/:companyId/mvx-marketing/dashboard`, added to the existing Paperclip dashboard router. **`assertCompanyAccess(req, companyId)` is enforced server-side** before reading. Path/client/company IDs are allowlisted, directory symlinks and traversal rejected, large or tampered snapshots ignored, and a bounded maximum of snapshots per company/client returned. API response contains `status`, `snapshots`, `history`, `availableClients`, `sourcePolicy`. Supports optional `clientId` filter, no public endpoint and cache-control `private, no-store`.

**Zero fabricated sales outcomes:** `CTR`, `CVR`, `CPA`, `ROAS`, spend net, VAT, gross cash, revenue and incremental profit remain `null` until real verified provider reconciliation. The on-screen label is *N/D*, not 0.

### 3. Actual visual-media inspection / agent readiness

Six new specialized agent profiles:
`visual-composition-critic`, `visual-brand-guardian`, `visual-accessibility-auditor`, `product-visual-veracity-auditor`, `platform-creative-spec-auditor`, `cross-modal-claim-auditor`. The optional fleet now consists of **27 council analytical profiles + 64 marketing specialists = 91 agent templates**, 64 first tasks and 10 recurring review templates. Two new routines inspect visual provenance and weekly multimodal/platform integrity.

`visual-audit-engine.mjs` inspects supplied actual PNG or JPEG bytes locally (dimensions, SHA-256, intended channel aspect-ratio heuristic and minimum resolution); it cannot claim pixel contrast, object authenticity, design fit, visual impact or legal rights solely from headers. Production multimodal analysis is deliberately gated by `verifyWithTier1`, operator approval and a vision-provider callback that must return a source-bound `receiptId`, evidence hash and auditable findings. Failed provider responses or absent credentials are blocked, not silently passed.

For each post the dashboard distinguishes rule-tested fields from `NOT_TESTED` or `PENDING_AGENT_EXECUTION`. Future genuine per-agent model receipts must be reconciled into the Tier 1 ledger; until that point there are no completed multimodal visual audits.

### 4. Test coverage, integration & evidence

New `dashboard.test.ts`: 12 tests for KPI integrity, no invented performance data, 91-agent inventory/14 review lenses, source and media QA separation, tenant scope/traversal, tampered envelope detection, authenticated route wiring in all layouts, company-scoped file reader and actual PNG bytes / vision gateway behavior. Executed through `tsx`.

The fleet existing tests (76) continue to check roster, governance, provider evidence, research, consent, pricing, experiments and campaigns; **total 88 tests** across the two suites after fixing the older competitor E2E fixture to use a valid tenant/company ID. Catalog generation is separately validated and should show **167 team files**, 91 agents, 64 initial tasks and 10 routines.

On mini-pc1 the test fixture uses publicly accessible Oatly / Alpro / Minor Figures product pages, published content drafts, transparent 0 real ads, 4 major+2 minor criticality counts. Saved sandbox snapshots belong to the **sandbox-research-company**, not a production Paperclip company. An actual UI tenant will intentionally display a helpful empty state until approved snapshots exist for that company's real ID.

### 5. Reproduce inside the existing checkout

```powershell
npm run test:mvx-marketing-fleet
npm run test:mvx-marketing-dashboard
node scripts/mvx-marketing-fleet/run-competitive-audit.mjs scripts/mvx-marketing-fleet/sample-client-oatly.json scripts/mvx-marketing-fleet/sample-competitor-search-seeds.json
```

The last command records evidence for a sandbox company and does not publish anything or send messages.

### 6. Remaining production gates

- Real Paperclip company install and provider model/vision account activation, agent run IDs and authentic review receipts.
- Tier 1 MVX Growth OS/Ads Master authenticated consumer engagement events, Meta/Google/TikTok/LinkedIn analytics, attribution and fee/VAT-inclusive contribution.
- Agent reviewer workflow deadlines, consumer voice collection rights, brand asset licenses and actual media files.
- Durable signed data ingestion backed by authentic provider receipts and revocation/reconciliation; move local data to secured and tenant-isolated managed storage for production.
- Full browser E2E, accessibility, package typecheck and visual regression CI. Neither the draft PR nor local tests alone certify a deployed UI or revenue lift.

Source code is versioned; local sandbox evidence is intentionally not committed into Git.
