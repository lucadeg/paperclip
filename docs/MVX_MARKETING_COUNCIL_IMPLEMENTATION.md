# MVX Tier 2 — Evidence-Governed Marketing Council and 30 Specialists

**Implementation branch:** `feat/mvx-sovereign-marketing-30-evidence` (base `mvx-sovereign-master`).
**Product boundary:** Agentic Company / Paperclip manages tasks, delegation, approvals, agent costs and audit. Tier 1 Growth OS remains the authoritative source of campaigns, CRM, conversions, provider state, spend and receipts.

## Implemented components

- `scripts/mvx-marketing-fleet/roster.json`: 27 executive **decision frameworks** aligned by exact ID to the existing Sovereign Council UI, plus 30 new distinct marketing specialist roles with a single manager, source data, KPI, real deliverable, acceptance check and maximum requested tool profile.
- `scripts/mvx-marketing-fleet/build.mjs`: reproducible compiler; verifies exact workforce size, unique IDs, manager references, acyclic reporting and materializes Agent Companies v1 markdown.
- `packages/teams-catalog/catalog/optional/marketing/mvx-evidence-growth-council/`: installable **optional** team package with 57 AGENTS.md files, 30 initial work issues, 5 recurring review templates, one project and TEAM.md. No executable scripts or automatic installs in the portable package.
- `scripts/mvx-marketing-fleet/council-gate.mjs`: deterministic, domain-specific council selection; independent risk critique; required evidence source/tenant/hash/version/freshness; trusted **server-side** Tier 1 evidence verifier interface; explicit dissent and veto; SHA-256 record digest; fail-closed for side effects.
- `scripts/mvx-marketing-fleet/experiment-economics.mjs`: preregistered fixed-horizon holdout conversion analysis with confidence intervals, sample ratio mismatch, guardrails, minimum sample, early-peeking stop. EUR accounting estimate includes net/gross values, IVA on sales and media spend, refunds and fees.
- `scripts/mvx-marketing-fleet/fleet.test.mjs`: negative and positive Node.js tests without external services.

The old declaration of **199** OpenClaw specialists was in a structurally invalid catalog directory and has been preserved at `packages/teams-catalog/legacy/openclaw-sovereign-fleet/DECLARATION.md`. It is a taxonomy, not 199 installed/running agents; it refers to 26 leaders whereas the UI has 27. Do **not** add 199 to the live workforce count. The current 30 specialist definitions are **additional** and do not imply activation of the legacy fleet.

The 27 managerial lenses reference frameworks associated with known individuals in the UI; **they do not impersonate those individuals and are not real-world endorsements or board attendees.** Never display them as leaders who actually joined a meeting.

## Workflows and operating contract

The specialists implement measured work in marketing data and tracking/consent, attribution, randomized incrementality, experimentation and budget pacing; Google/Meta/TikTok/LinkedIn and retail/programmatic advertising; technical/content/local SEO; editorial, copywriting, creative, authentic UGC and organic social; community, influencer sponsorships, landing CRO, funnel analysis, CRM/email/loyalty, offers, competition, marketing mix and financial forecasts.

**Operational DAG:** Board objective -> Paperclip issue with tenant scope and budgets -> select only relevant reviewers -> retrieve verified, immutable Tier 1 evidence IDs -> hypothesis/baseline/guardrails preregistration -> assigned specialist produces a dated analysis/draft with a source or BLOCKED verdict -> statistical/finance/consent QA -> independent veto and dissent -> human approval when needed -> only governed Tier 1 provider API may execute -> provider receipt reconciliation -> accepted outcome and audit.

Each agent heartbeat must atomically claim assigned work, respect Paperclip agent/tool allowlists, budget and hierarchy, produce an evidence-bearing artifact on that run, and post a durable issue comment. If Tier 1 is disconnected or credentials/consent missing, return a precise blocked issue. NEVER invent KPI performance, fake testimonials, publish unauthorized assets, message without valid consent, or spend without budget and approvals.

**Council is advisory:** The pure `deliberate()` function cannot publish, email, spend, delete, or grant permissions; even a positive outcome is only `DRAFT_RECOMMENDED`. The SHA-256 output is an integrity *digest*, not a cryptographic signature, append-only audit proof or trusted provider receipt. Caller must implement a privileged Tier 1 verifier; trusting `verified=true` from arbitrary input would be unsafe.

## Real activation runbook

1. Within authorized `.hermes` checkout: `node scripts/mvx-marketing-fleet/build.mjs --check`; `node --test scripts/mvx-marketing-fleet/fleet.test.mjs`.
2. Regenerate and validate `@paperclipai/teams-catalog` manifest and run the repository's catalog tests. Ensure newly generated catalog content hash covers all agent and task files.
3. In the real Paperclip service, GET `/api/teams/catalog?category=marketing` and locate key `paperclipai/optional/marketing/mvx-evidence-growth-council`.
4. As authenticated board/service identity with `agents:create`, POST `/api/companies/{companyId}/teams/catalog/{catalogId}/preview`. To attach to an existing company use `targetManagerAgentId`; examine collision and permission plans before POST `/api/companies/{companyId}/teams/catalog/{catalogId}/install`. Confirm exact agent IDs and hierarchy by querying `/api/companies/{companyId}/teams/catalog/installed` and native agent APIs.
5. Configure adapter/model credentials, read-only Tier 1 connectors with tenant/role binding, per-agent/company monthly budgets, approval classes, kill switches, and explicit heartbeat/schedule enablement for the five recurring routines. The package does NOT turn the routines on by itself.
6. Smoke-test one real read-only marketing issue end to end. Validate Paperclip run ID, source evidence, issue transition, budget/cost record, independent review and blocked cross-tenant access. For proposed advertising spend or publication, separately prove approved scope, budget reserve, executed Tier 1 adapter, provider-signed receipt, exact correlation ID and reconciliation before broad rollout.

## Mathematical and financial limits

The fixed-horizon two-proportion normal approximation is appropriate only under its tested assumptions. It deliberately blocks observational-only causal claims, missing holdouts, ratio mismatch, missing guardrails, or peeking before the end date. It does **not** implement sequential alpha spending or multiple-comparison correction, and `WINNER_CANDIDATE` is never automatic rollout authorization.

Financial projections distinguish sales gross, sales IVA, net revenue, refunds, net media, media IVA, platform fees, net contribution and actual gross media cash need. VAT deductibility, tax jurisdiction, settlement, income taxes, chargebacks and other financial treatments must be reconciled with the authoritative ledgers; sample 22% IVA is not a universal rate.

## Truthful deployment status

Code and package templates can be independently compiled and tested; company import, model adapter configuration, real Tier 1 evidence verification, active recurring schedules, provider mutation receipts, production monitoring and customer-specific consent policies **are separate operational acceptance gates**. Do not label all 57 agents as active from a catalog count or display fabricated business outcomes.
