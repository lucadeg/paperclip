# MVX Ads Master — browser, build and evidence-gated QA (25 October 2026)

**Repository:** `lucadeg/paperclip`; feature branch `feat/mvx-sovereign-marketing-30-evidence`; PR #1 draft. **Only working tree:** `C:\Users\Deglu\.hermes\paperclip` (mini-pc1). No production deployment, merge, spend or publication occurred.

## Actual tests executed on mini-pc1

| Gate | Verified outcome | Limit |
|---|---|---|
| PNPM workspace package links | `node scripts/ensure-workspace-package-links.ts --check` PASS (exit 0) | Validates links, not complete lockfile installation |
| Source whitespace | `git diff --check` PASS | CRLF warning on ContentPlanner remains non-blocking |
| Full UI production bundle | `pnpm --dir ui build` PASS (exit 0, 7424 transformed modules, 2m37s) | 5.86 MB principal JS bundle, oversized chunks / ineffective dynamic import warning |
| MVX marketing complete | `npm run test:mvx-marketing-all` PASS (exit 0): **76 + 18 + 29 + 11 = 134/134** | Controlled fixtures/signed mock probes; NOT 91 live agents or connected campaigns |
| Vite proxy + health unit tests | `pnpm --dir ui exec vitest run src/api/health.test.ts src/lib/vite-api-proxy.test.ts` PASS **11/11** | Unit tests, not real upstream |
| Chromium interactions, refreshed production build | `node scripts/mvx-marketing-fleet/ui-interactions.mjs` **12/12 interaction checks PASS**, viewport widths 360, 390, 768, 1024, 1440; no document-level horizontal overflow | Unauthenticated/error-state routes only; **productionReady: false** due HTTP 502 upstream |

## Tested workflows

Browser tests exercise Planner current date, zero real creative-count, Calendar > Pipeline > Studio tabs, previous/next month/today, CRM empty/unauthorized state and status filter, Council catalog labeling and search, Marketing Intelligence authorized-company gate and absence of fake ROAS, Skills matrix navigation, and screenshots at five widths.

### Regression reproducibility

- Existing Vite 8 development instance `http://127.0.0.1:3101/` accepted connections but did not return HTML during timeouts, so interactive tests were **blocked** on dev server.
- Serving built `ui/dist` using `vite preview` at `127.0.0.1:3102` returned HTTP 200. First Chromium run: **9/10 PASS**, stale 'Oggi (17 Set)' label in old dist; local source already had date correction. Rebuilt source and reran: **10/10 PASS**.
- Hardened `ui-interactions.mjs` with 360px and 1024px tests, document-level overflow assertions, and explicit production-readiness gates (JS errors, legacy localhost:8770 calls, browser failures, backend HTTP 5xx). Full final browser run: **12/12 interactions PASS; backendHttp5xxAbsent = false**. Added explicit non-passing gates for authenticated end-to-end, provider publication receipts and cross-browser accessibility, because this unauthenticated smoke suite cannot legitimately certify them. Do not interpret 12/12 as a production release approval.
- Browser reports stored under `evidence/mvx-marketing-fleet/ui-interactions-2026-10-25T09-08-10-382Z/report.json`, `.../ui-interactions-2026-10-25T09-16-28-722Z/report.json` and `.../ui-interactions-2026-10-25T09-22-41-819Z/report.json`; all within .hermes; build log `ui-build-20261025.log`, marketing log `marketing-all-native-20261025.log`.
- Browser javascriptErrors and legacyOriginRequests arrays are empty; multiple `502` from `/api/auth/get-session`, `/api/health`, instance settings and plugins prove **backend unavailable** in test environment. Do NOT label this as production end-to-end acceptance.
- Tier 1 TypeScript `Tier1ReadError` parameter property caused `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` with Node's strip-only TS loader; replaced with explicitly assigned fields without changing Error behavior. **11/11 Tier 1 tests PASS**.
- Root test commands for dashboard and Tier 1 no longer rely on network-dependent `npm exec --yes --package=tsx`; project engines already require `node >=24.11.0`. Direct Node 24 TS test runner passes.
- Follow-up bootstrap safety (same date): `scripts/ensure-workspace-package-links.ts` now refuses to delete an existing **physical** dependency directory/file. Only stale symlinks/junctions may be replaced. Dedicated regression `npm run test:workspace-links` creates isolated fixtures **inside this repo's evidence directory**, verifies an actual installed-file sentinel survives both `--check` and normal mode, repairs a missing link and a stale symlink, and removes only its own fixtures. Node test **1/1 PASS** and real-workspace `--check` **PASS**, both exit 0. This prevents destructive repairs in a sparse PNPM checkout.

## Remaining release blockers

1. UI full TypeScript check: attempted on mini-pc1 via `pnpm --dir ui typecheck`, and again via `pnpm --dir ui exec tsc -b --verbose --pretty false`, but neither returned an exit code or diagnostics within the observed period. The owned test terminal was terminated without killing unrelated services. A resource inspection showed **~0.33 GB free physical RAM of 15.75 GB** while TypeScript was active, with other work consuming memory; this is a plausible resource cause, not a proven compiler defect. `evidence/mvx-marketing-fleet/ui-typecheck-serial-20261025.log` and `ui-tsc-verbose-20261025.log` record attempts, **not PASS or FAIL**. System global `pnpm 8.15.9` also differs from repository `packageManager: pnpm@9.15.4`. Re-run with the pinned manager and adequate isolated memory, then validate frontend/server full typecheck and GitHub CI.
2. Configure real authenticated Paperclip API at 3100 and Tier 1 company-scoped connectors; verify CRM/calendar/appointments, 403/401, client switching, company UUID, zero-company and two-company account isolation.
3. Full Playwright multi-browser matrix (Chrome, Firefox, WebKit), mobile gestures, keyboard-only navigation, axe/WCAG AA, screenshot diff, all routes, all buttons, form submit persisted to DB and actual provider acknowledgment.
4. Reproduce and resolve Vite dev server hang at 3101 independently of preview, plus optimize large bundle and dynamic imports.
5. Verify valid source media rights, vision and agent runtime signed receipts, payment ledger/net VAT/gross, durable outbox/inbox idempotency, privacy controls, release rollback/canary and observability.
6. **Keep PR #1 draft; no merge or production publish while blockers remain.**

This report records observed facts and blocked gates, not an assertion that all UI flows or agent integrations have been implemented.
