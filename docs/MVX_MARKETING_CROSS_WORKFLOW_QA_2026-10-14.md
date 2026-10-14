# MVX Marketing Master — Transversal Workflow, Content, Analytics and Data QA

**Executed:** 2026-10-14 on mini-pc1 in the existing `C:\Users\Deglu\.hermes\paperclip` checkout, branch `feat/mvx-sovereign-marketing-30-evidence` (draft PR #1). No remote production mutations or new repo clones.

## Test suites and exact verification scope

| Suite | Execution | Coverage |
|---|---|---|
| Marketing core, content, competitor ads, CRM/consent, affiliate/referrals and math | `npm run test:mvx-marketing-fleet` | **76 Node tests** |
| KPI dashboards, company isolation, API controller and visual metadata | `npm run test:mvx-marketing-dashboard` | **18 TS/Node tests** |
| Campaign cross-artifact invariants, negative/fault injection, disk persistence and concurrency | `npm run test:mvx-marketing-transversal` | **29 Node tests** |
| **Total** | `npm run test:mvx-marketing-all` | **123 automated tests** |

The composite suite must pass **123/123** before this branch's tranche can be declared locally regression-checked. A local run may additionally validate the typed teams-catalog manifest and JS module syntax. The complete Paperclip monorepo UI build, full TypeScript project build, browser screenshot/accessibility check, live agent/vision runs, provider-native webhook sessions and real advertising purchases are separate release gates; they are **not** covered or marked PASS by these tests.

## Newly implemented cross-artifact acceptance gate

`cross-workflow-audit.mjs` computes 21 independent, deterministic, source-bound controls across:
1. Tenant, company, client, campaign, strategy and reviewer identities.
2. SHA-256 metadata, source-reference binding, source freshness and archive provenance.
3. Every generated draft's unique ID, campaign ownership, actual caption/hook/CTA and source references.
4. Structural copy/claim source review; no "green" status from caption length alone.
5. Marketing dashboard versus campaign post count, unchanged content and evidence inventory.
6. Real analytics values remain **null**, never invented (CTR, CVR, impressions, spend, ROAS, profit).
7. Image/media review explicitly unperformed unless corresponding real evidence exists.
8. Agent executions and publication outcomes never forged.
9. Experiment control/treatment post IDs, preregistered status and zero invented lift.
10. Independent critic findings preserved with owner/severity and source-linked competitor observations.
11. Final output remains **draft-only** with no permission to publish, pay, DM or allocate spend.

The gate emits `BLOCKED`, `DRAFT_WITH_WARNINGS` or `DRAFT_INTEGRITY_PASSED_NOT_PUBLISHED`, per-check status, evidence refs, counts and a deterministic trace hash. **This is an integrity/consistency gate, not a certification of campaign business success or genuine provider authentication.**

## Fault injection tests

Deliberate corruption scenarios that must be blocked include cross-tenant/client/company mixups; wrong campaign ID; changed raw source SHA-256; tampered post copy; fake evidence references; duplicated creative IDs; fabricated clicks, ROI, budget or conversion; fake vision review receipts; invented agent run IDs; unauthorized publication, client approval or competitor ads; invalid A/B pair; missing red-team findings; tenant mismatch in filesystem manifests; tampered or missing archived files; forged dashboard JSON with a freshly recomputed local checksum; source URLs containing `javascript:`.

100 concurrent signed requests for the same opted-in mock DM are also sent against the in-memory gateway to confirm one provider call, deterministic `IN_PROGRESS` for the remaining 99 concurrent duplicates and idempotent replay.

## Real workflow acceptance

Oatly public sources (two product/catalog pages) -> 24 per-channel drafts + 12 experiment pair definitions -> two independently acquired rival product sites (Alpro and Minor Figures) from openly disclosed operator-curated seed URLs -> evidence-labeled competitor need hypotheses -> independent critic report with **4 major, 2 minor** findings -> per-post marketing dashboard covering **91 agent templates and 14 specialist QA lenses** -> file-level SHA-256 manifest -> independent verification -> company/client isolated dashboard snapshot.

The latest local read-only acceptance run verified **21 of 21 cross-workflow checks**, **10 of 10 critic archive artifacts** and a company-scoped snapshot, without authentic competitor ad creative or financial performance claims. It wrote only to `.hermes\paperclip\evidence\mvx-marketing-fleet\competitive\sandbox-research-company\oatly-public-research\<run>` and `dashboards\sandbox-research-company\...`.

The official Meta Ad Library EU API remains credential-gated; the prototype does not fabricate third-party competitor ROAS, click metrics or revenue. Google and TikTok library references are links to public research interfaces, not observed ads.

## Corrections and hardening implemented

- **Dashboard copy gate:** rule checks now run actual source-bound `assessContentClaims`, verify individual evidence IDs against campaign statements, and no longer accept the mere existence of a long caption or arbitrary evidence string.
- **Archive isolation:** both client workflow and competitor audit file archives are now under `<companyId>/<clientId>/<UTC-run>`, avoiding two companies with identical client IDs sharing a directory.
- **Tenant/client validation:** strict safe identifier formats before paths are created.
- **Provider-value forgery prevention:** the read-only dashboard API rejects even correctly SHA-256 recomputed local envelopes which claim verified paid ROAS, purchases, actual vision execution, published posts, or unsafe clickable evidence URLs. Local SHA-256 is not used as a permission.
- **API integration boundary:** pure controller `resolveMarketingDashboardQuery` is wired into Express routing, authorizes company membership before any disk access, enforces 400 on invalid scope, sets private/no-store headers; tested without needing a running Paperclip instance.
- **Manifest verification:** every archive file's real size and hash is verified against its corresponding manifest; missing or corrupted data causes `BLOCKED`.
- **Persistence gate:** `persistValidatedAudit` writes the dashboard only after the 21-check cross-workflow acceptance and independently verified 10-file archive digest; tampered approvals or counterfeit analytics fail closed.

## Outstanding blockers — test infrastructure & live runtime

- Full pnpm/TypeScript React monorepo build, browser navigation and visual-regression screenshots were **not run** on this sparse checkout: node_modules are not installed. Current UI syntax smoke test uses isolated esbuild transformation only.
- Actual multimodal image analysis requires rights-cleared PNG/JPEG/video inputs and a real vision provider receipt; local PNG/JPEG tests check image container metadata, **not semantic truth, brand fit, accessibility contrast or visual conversion quality**.
- Paperclip 91-agent catalog is optional: no autonomous 91-agent deployment/heartbeats or real per-content agent verdicts are claimed.
- Tier 1 Growth OS/Ads Master and actual Meta/Google/TikTok/LinkedIn provider metrics, verified payment evidence, GDPR consent and ad publication events must be connected for production-grade quantitative KPI testing.
- `MemoryInteractionLedger` guarantees process-local idempotency only; production provider messaging requires persistent, atomic, idempotent outbox and native webhook acknowledgement.
- Red-team/experiment gates are offline draft recommendations. Production marketing spend, conversion optimization and affiliate payouts require genuine campaign performance, holdouts, a licensed data source, merchant approval and audited releases.

### Commands

```powershell
npm run test:mvx-marketing-all
npm exec --yes --package=tsx@4.20.6 -- tsx packages/teams-catalog/scripts/validate-catalog.ts
node scripts/mvx-marketing-fleet/run-competitive-audit.mjs scripts/mvx-marketing-fleet/sample-client-oatly.json scripts/mvx-marketing-fleet/sample-competitor-search-seeds.json
```

**Status:** locally tested draft. Do not market the tests as full production certification, real ads ROI, or an installed autonomous agent fleet.
