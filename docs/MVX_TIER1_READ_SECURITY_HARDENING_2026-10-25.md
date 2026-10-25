# MVX Ads Master — Tier 1 authenticated read security hardening

**Date:** 2026-10-25. **Repository:** `lucadeg/paperclip`. **Branch:** `feat/mvx-sovereign-marketing-30-evidence`; PR #1 DRAFT. All work performed inside the pre-existing `C:\Users\Deglu\.hermes\paperclip` checkout on mini-pc1. No real Tier 1 credentials, customer data or marketing providers were used.

## Changes implemented

In `server/src/routes/mvx-tier1-read.ts`:

1. HTTPS must not be mistaken for proof that the outbound host is safe. Production origin validation now rejects literal IPv4/IPv6 addresses and `localhost`, `*.localhost`, `*.local` and `*.internal` hostnames. Explicit local `http://localhost` or `http://127.0.0.1` is allowed **only** under `NODE_ENV=development`. The existing restrictions on credentials, query/fragment/path and invalid service bearer-token characters remain.
2. A matching top-level `companyId` is necessary but not sufficient. Rows containing `companyId` or `company_id` must also match the requested company UUID; conflicting items fail closed instead of being served to the wrong company's CRM.
3. The maximum response size of 2,000,000 **bytes** is enforced before decoding an untrusted stream, not after reading an unlimited `response.text()`. An oversized declared `Content-Length` is rejected early, streamed data is measured incrementally and canceled on overflow, and malformed UTF-8 is rejected.
4. API behavior stays read-only; failures raise `Tier1ReadError` with bounded service error reasons, without inventing contacts, messages, appointments or performance results.

## Executed evidence

- `node --test scripts/mvx-marketing-fleet/tier1-read.test.ts`: **19/19 PASS**, exit 0 (latest). Added a second HTTP loopback scenario covering both company-scoped `content/phrases` and `content/calendar`; it checks the actual request path, `companyId` query, company authorization header, Bearer token, response rows, denial of forged cross-company rows and upstream HTTP 403. Prior checks cover internal/metadata origin denial, explicitly allowed local development, contradictory row ownership, oversized declared bodies, streamed overflow, invalid UTF-8 and the first real HTTP CRM loopback server.
- The local HTTP test uses an ephemeral `127.0.0.1` listening port with synthetic credentials. It verifies the actual `GET /api/crm/contacts` request, Bearer authorization and `X-MVX-Company-Id` headers, a valid company-attested response, then rejects a different-company response from the same server.
- `npm run test:mvx-marketing-all`: latest **142/142 PASS**, exit 0 (76 Fleet + 18 dashboard + 29 transversal + 19 Tier 1) including actual loopback HTTP tests for CRM, phrases and calendar. Latest log: `evidence/mvx-marketing-fleet/marketing-all-20261025-142.log`. Earlier 141/141 and 140/140 runs are archived as `marketing-all-20261025-tier1-http.log` and `marketing-all-20261025-tier1-guard.log`.
- All tests rely on synthetic fixture inputs and local memory/network loopback; **no actual MVX Tier 1 provider or real CRM authenticated integration has been certified.**

## Known limits and remaining gates

- The host check covers URL hostnames and literal IPs, **not DNS rebinding or DNS names that resolve to private addresses**. Network-level egress allowlisting, trusted DNS, TLS identity, and possibly an audited, configured allowlist of origins are still necessary before production.
- Company-level response attestation and optional row-field matches do not independently prove that every field actually belongs to the company. The upstream must enforce tenant authorization and schemas; audited auth integration and negative real-provider tests remain mandatory.
- Stream timeout for actual network fetch uses `AbortSignal.timeout(8000)`, but the synthetic injected fetcher used in tests is not a live network or authorization proof.
- Full UI/server typecheck, browser multi-tenant E2E, complete CI through the authorized FounderOS/Admin Gate, GDPR/privacy review, deployment and rollback remain blocked. **Do not merge, activate campaigns, advertise full production readiness or issue real marketing spend.**
