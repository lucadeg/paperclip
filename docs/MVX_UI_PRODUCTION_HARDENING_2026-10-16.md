# MVX Ads Master — UI Production Hardening (2026-10-16)

Repository: `lucadeg/paperclip`, branch `feat/mvx-sovereign-marketing-30-evidence`, base `mvx-sovereign-master`, PR #1 (draft). Implementation and tests conducted only in the existing mini-pc1 `C:\Users\Deglu\.hermes\paperclip` checkout.

## Implementation — source and company integrity

- `ui/src/context/CompanyContext.tsx`: removed the hardcoded fictional `mvx-ads-master-hq` company ID, inactive/empty-API synthetic company data and fictional €5,000 budget. Company selection starts unknown until an authorized API result is available. The required `useCompany` hook now throws outside `CompanyProvider`; `useOptionalCompany` remains the supported optional hook. Legitimate empty, error and onboarding states can now surface.
- `server/src/routes/mvx-marketing-dashboard.ts`: TypeScript unknown-value guard narrows count before numeric comparison (fixes TS18046 without `any`).
- `server/src/sentry.ts`: narrowed SDK adapter to the explicitly used `"strict"` unhandled rejection mode; no weakening of failure behavior.
- `server/src/routes/openapi.ts`: registered the existing MVX dashboard endpoint and the authenticated Tier 1 resource endpoints, including failure and authorization responses.
- `packages/paperclip-runner/src/drivers/codex/codex-protocol-cleanup.test.ts`: replaced unsupported Vitest `import.meta.resolve("tsx")` with Node's `createRequire(import.meta.url).resolve("tsx")`.

## Tier 1 integration boundary

`server/src/routes/mvx-tier1-read.ts` offers a **read-only** authenticated, company-scoped adapter for:
- CRM contacts: `GET /api/companies/:companyId/mvx-marketing/crm/contacts`
- Marketing creative phrases: `GET /api/companies/:companyId/mvx-marketing/content/phrases`
- Marketing calendar events: `GET /api/companies/:companyId/mvx-marketing/content/calendar`

All three require a board user authorized for that specific company; they call an operator-configured upstream only if `MVX_TIER1_API_ORIGIN` and `MVX_TIER1_SERVICE_TOKEN` are configured. Production requires HTTPS origin. Development can explicitly permit local loopback HTTP with `NODE_ENV=development`. Upstream must return a JSON object with `companyId` matching the requested UUID and an array under `contacts`, `phrases` or `events`; an unscoped legacy array is **rejected**. Bearer token is server-only, outbound redirects are disallowed, records are bounded, and network errors fail closed. These are explicit integration contracts **not confirmation that a real Tier 1 provider is configured**.

## UI corrections

- CRM now calls Paperclip's authenticated same-origin API, filters structural records and shows a visible error and retry on missing or invalid Tier 1 data. Removed browser-side `localhost:8770` and the fake external CRM launch link.
- Content Planner removed eight preloaded fictional campaign cards, static September 2026 today, fake 25k/15k views fallbacks and calls to browser `localhost:8770`. Calendar loads only authorized company-scoped provider events; dates use the viewer's local day. Publishing is **not simulated** by changing React state; until a write-authorized provider/approval flow exists, scheduling shows a blocking message. Unconfigured external editors show disabled controls.
- Sidebar's unverified badges (27/159/226/5,125) were removed. Skill Tree's unverified 5,125 fallback and synthetic initial graph/count were removed. The Council is an explicit catalog of decision frameworks, not a claim that those persons/agents are alive.
- Marketing Intelligence retains company-scoped client selection, resets on company change and uses the API's entire `availableClients` list rather than silently hiding clients beyond the first 12 returned snapshots.

## Tests run

`npm run test:mvx-marketing-all`:
- 76 marketing workflow tests
- 18 dashboard/audit tests
- 29 transversal integrity tests
- 11 new Tier 1/antimock tests
- **134/134 PASS** (local Node/TS suite, 2026-10-16).

Syntax transpilation of edited React/TSX pages, CompanyContext, new server modules also passed. The new Tier 1 suite validates company mismatch, invalid UUID, insecure origin, absent keys, unauthorized provider, connection error, unscoped data, excessive rows, proof binding and absence of demo localhost sources.

## Still required for production

1. Install/resolve full pnpm 9.15.4 monorepo dependencies and run real UI+server TypeScript and build checks, official OpenAPI parity tests, production UI browser E2E tests and visual regressions. A green isolated esbuild syntax test is **not** a browser test.
2. Connect actual Tier 1 upstream with server-side credentials, deploy the new read contracts and verify a real company fixture. The old Tier 1 legacy API may need to add matching `companyId` response envelopes.
3. Implement durable, authorized **write** contracts for content schedule/publishing with owner approval, provider receipt, revocation, reconciliation, transaction retry and idempotent outbox. The current UI deliberately disallows false publication.
4. Integrate signed provider impressions, conversion, spend, fees, VAT, refunds and real agent/multimodal-review receipts. Numeric business KPIs must remain N/D until sourced.
5. Test Sentry, Vitest, E2E all 8 shards, responsive layouts, company switching, accessibility and security. Run full CI until required checks are green, then staging + rollback acceptance before merging/production.

**Status:** code corrections and contract tests completed locally; no production deployment, provider publishing, real 91-agent heartbeat fleet or verified ROI is claimed.
