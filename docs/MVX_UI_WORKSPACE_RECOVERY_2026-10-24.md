# MVX Ads Master — Windows workspace recovery and UI validation (2026-10-24)

Repository: `lucadeg/paperclip`, PR #1 (draft), branch `feat/mvx-sovereign-marketing-30-evidence`. Work performed exclusively in existing `C:\Users\Deglu\.hermes\paperclip` on mini-pc1. Base head on entry: `496a07e`. **Not production-ready.**

## Verified interventions

1. Expanded *existing* Git sparse checkout to include `cli` and `ui/public` (no clone). The former was needed by bootstrap command paths; the latter restores the absent web manifest and other required public assets.
2. `scripts/ensure-workspace-package-links.ts`: remove bootstrap dependency on server imports and on preinstalled `tsx` (Node 24 supports TS stripping). Scan workspace packages even if their `node_modules` directory is missing after sparse checkout. Add `--check` audit mode that exits nonzero on missing/stale links, and create Windows `junction` links (POSIX `dir` symlinks otherwise). Keep all paths inside the checkout.
3. Repair **62 missing workspace links across 27 package workspaces** using the authorized local script; repair command exit code 0. A subsequent `node scripts/ensure-workspace-package-links.ts --check` returned exit code 0. No destructive reinstall.
4. Restore missing third-party links to exact already present local PNPM store versions: `packages/shared/node_modules/zod` → `zod@4.4.3`, and `packages/plugins/sdk/node_modules/react` → `react@19.2.8`. These are untracked QA environment links, not a replacement for a reproducible PNPM install.
5. Root `preflight:workspace-links` now executes `node scripts/ensure-workspace-package-links.ts`, avoiding an unavailable `cli/node_modules/tsx` path on sparse-checkout bootstrap.
6. `ui/src/lib/vite-api-proxy.ts` default local backend moved from erroneous legacy `localhost:8770` to Paperclip server `127.0.0.1:3100`. Confirmed project default in `server/src/config.ts` and `scripts/dev-runner.ts`. Custom `VITE_API_TARGET` remains supported.
7. `ui/vite.config.ts` and `ui/vitest.config.ts` use Node's `import.meta.dirname` rather than `__dirname`; Vite-config relative imports use explicit `.ts` extensions. This addresses Vite 8 native-loader compatibility warnings.
8. Browser smoke now uses immutable UTC run directories within `evidence/mvx-marketing-fleet`, navigates with `waitUntil: 'commit'`, independently checks `domcontentloaded`, and distinguishes `FAIL_DOM_NOT_READY` from `FAIL_BLANK` rather than implying success on HTTP 200.

## Tests and evidence

- `node --test scripts/mvx-marketing-fleet/cross-workflow.test.mjs`: **29/29 PASS**.
- `ui: vitest run src/lib/vite-api-proxy.test.ts`: **6/6 PASS**, including the new Paperclip proxy-default assertion.
- `node scripts/ensure-workspace-package-links.ts --check`: **PASS** after link repair; `git diff --check`: **PASS**.
- Full UI `tsc` before package relinking: **531 diagnostics**. After restoring the 62 workspace links: **496 diagnostics**. Primarily unresolved third-party types (especially missing `zod`, plus ensuing inferred-type errors). A further typecheck after restoring `zod` and `react` is being logged separately; do not assume a pass.
- First real Chromium UI run on October 24: `evidence/mvx-marketing-fleet/ui-browser-20261024/report.json`: **0/6 pages passed**. DOMContentLoaded navigation timed out. Next diagnostic run: `ui-browser-2026-10-24T17-54-56-395Z/report.json`, likewise **0/6** but splits blank/DOM-not-ready states. Screenshots and logs (where available) are preserved in run-specific locations.
- Vite 8.2.2 was observed answering direct HTTP requests (including `/src/main.tsx` and the restored manifest), but browser navigation is NOT certified. Earlier Vite logs disclosed numerous missing `zod` imports; imports have now been linked and require browser rerun.

## Mandatory gates before promotion

1. Complete reproducible PNPM workspace dependency installation (correct package-manager version, frozen lockfile), then **zero-error frontend/server typecheck and production build**.
2. Run actual authenticated Playwright workflows for all navigational UI surfaces, roles, six Marketing Intelligence tabs, CRM, planner, Council and Skill Tree; verify keyboard/touch, responsive 360–1440 px, WCAG/axe, visual screenshots, console/network and offline/error states.
3. Test zero company, stale selected company ID, two real tenant UUIDs, logout/relogin, company-switch isolation; never reintroduce fabricated companies, campaigns, agents or metrics.
4. Connect real authorized Tier 1 service credentials/UUID-scoped CRM & calendar; add durable content publishing write contracts, human approval, provider ACKs/outbox, signed evidence, finance net/IVA/gross and consent/privacy.
5. Require full green CI, a verified staging deployment and rollback before merging. **No live publish, spending or production deployment was performed in this pass.**
