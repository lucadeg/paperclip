# MVX Branding, Placement, Conversion & Social Automation — Evidence-Based E2E

**Target branch:** `feat/mvx-sovereign-marketing-30-evidence` (PR #1 against `mvx-sovereign-master`).
**Scope:** 27 existing executive analytical frameworks + 30 original marketing specialists + **15 additional marketing specialists**, 72 importable Paperclip definitions. 45 operational initial-task templates and 5 recurring governance templates.

## Specialist roles added (15)

Brand DNA researcher, category positioning, visual identity guardian, product placement and contextual distribution, creator integration and sponsorships, affiliate commissions and attribution, customer referral loops, value/offer stack, sales objections and JTBD, checkout journey, hook/CTA optimization, free lead magnet production, permission-based comment/DM automation, consented persona personalization and short video storyboarding.

Each definition includes supervision, data input, deliverable, measurable KPI, falsifiable test, maximum requested tool class, provenance, privacy restrictions and issue handoff; imports **do not automatically start** agents, subscribe webhooks or grant third-party credentials.

## Live public website E2E scenario (14 Oct 2026)

**Reference only:** Oatly `https://www.oatly.com/products` and `https://www.oatly.com/products/oat-drink/oat-drink-barista-edition-1l`. No Oatly affiliation, trademark license, collaboration, account access or authorization to post content is implied.

### Real source acquisition
- Catalog page: HTML captured with HTTP 200, ~863 KB, raw SHA-256 `7794fb55ed84b37d7122bb6e7648fb947065866ecaff07334e382b9783add4c1`.
- Oat Drink Barista Edition product: HTML captured with HTTP 200, ~350 KB, raw SHA-256 `299ce8ab11200350e1d9e78cfe38f792e25cd153b0d1b855edacec0f6154ebcd`.
- Identified Oatly name from page title as **extracted hypothesis**, product `Oat Drink Barista Edition` from the public page, and a public description. Localized pricing was **not verified**. Website is not a verified representation of actual customer cohorts, product rights or stock.
- HTTPS domain/operator allowlist, reject redirects, block local/private DNS, use validated socket IP for real TLS request, restrict content type/size, bounded timeout, SHA-256 provenance. Anti-SSRF should also be controlled at the deployment egress firewall.

### Target scenario supplied for testing (not inferred personal data)
Adults preparing coffee at home in the Italian market, seeking to assess whether an oat drink fits their routines. This is an operator **hypothesis** requiring real audience research before segment-specific targeting or legal-personalization decisions.

### Generated workflow artifacts
- 24 **draft** native post variants: four channels × three hook families (curiosity, demonstration, objection) × two CTAs (save / user-requested guide). Each carries distinct channel opening, source-backed product, caption, CTA, accessible visual direction, shot list, provenance IDs, specific KPI, guardrails and pre-test status.
- 8 **uncontracted** product placement options: owned PDP, educational article, creator video, hospitality demonstration, retail display, permissioned newsletter, social carousel and search landing page, each with rights/disclosure/cost/measurement gates.
- Four sales objections with evidence-required responses; five offer ladder stages (free post -> requested guide -> FAQ/PDP -> merchant checkout -> opt-in loyalty).
- 12 preregistration experiment designs pairing hooks/CTAs; holdout, randomization, sample-ratio mismatch, guardrails and CI mandatory. No measured winner or uplift was fabricated.
- Automatically generated free `.md` checklist with cited public product references and a user's own comparison table. Status: draft, not public.
- Affiliate HMAC tracking link logic, commission proposals net of VAT/refunds, signed ledger verification callback, anti-fraud and bound checks; referral design requires verified customers, explicit opt-in, merchant limits and legal approval. No live affiliate links, commissions or payouts issued.
- 24/24 post drafts passed **limited structural/claim gate**, not production brand/legal/visual QA.

### Real vs simulated interaction behavior
- Public comment `GUIDA`: yields **public reply requiring review**, **zero unsolicited private messages**.
- Signed synthetic DM event `GUIDA` with exact, recent asset-scoped opt-in + explicitly permitted test adapter: one free checklist delivered to an in-memory **mock** provider with receipt `sandbox-delivery-1`.
- Replay of the same synthetic event yields the same receipt; zero duplicate deliveries in the single-process test. No actual customer was messaged, no third-party account called.
- Platform comment/DM webhooks, human/tenant permission, approved content, persistence across restarts and real provider receipts remain required for live service. The in-memory ledger is **not** a production durable outbox; use Tier 1's transactional event ledger in deployment.

## Generalized client workflow runner

Input: a per-client JSON with `clientId`, `tenantId`, `companyId`, `mode=research_draft_only`, allowlisted HTTPS site URLs, operator-supplied audience `target` and desired channels.

```powershell
node scripts/mvx-marketing-fleet/run-client-workflow.mjs scripts/mvx-marketing-fleet/sample-client-oatly.json
node scripts/mvx-marketing-fleet/demo-live-oatly.mjs
npm run test:mvx-marketing-fleet
```

Creates SHA-256 integrity manifest and reproducible assets **inside the authorized existing `.hermes/paperclip/evidence/mvx-marketing-fleet` checkout**, organized by client and UTC run. It never modifies source websites or social accounts.

## Evidence and acceptance boundaries

- **Actual:** two live official website HTTP reads, source digests, extracted product information, generated/deterministic marketing drafts, brand audit hypothesis, marketing strategy and local simulated messaging workflow.
- **Unit/integration:** typed catalog packages, agent manifest hash validation, consent/malformed signatures, tenant mismatch, replay, HTTP mock gateway, authorization, pricing/IVA, partner economics, content source checks and statistical validation.
- **Not tested live:** real brand-owner approvals, agency contracts, asset rights, direct Meta/Instagram/TikTok/LinkedIn APIs, inbound signed platform webhooks, advertiser spend, actual conversions, real automation scheduling, persistent transactional outbox, real LLM runtime quality, full production E2E.
- **Promotion requires:** Tier 1 Growth OS real signed evidence connector, approved client/tenant roles, per-platform API grants, GDPR/ePrivacy policy, creator and brand rights, budgets, real delivery receipts, monitoring and release rollback. Never substitute a simulated provider acknowledgement for a real receipt.

Customer-specific campaign performance and best-performing hook/CTA cannot be known before collecting real measurements and experiments.
