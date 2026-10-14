# MVX Growth OS / Tier 2 — Competitive Intelligence, Marketing Red Team and Needs–Solution Matching

**Implementation status:** code and test implementation on `feat/mvx-sovereign-marketing-30-evidence`, against `mvx-sovereign-master` (Draft PR #1).

## Workforce and accountability

Preserves 27 conceptual executive profiles, original 45 marketing operators, 13 independent critics, and introduces 6 dedicated visual reviewers. New total: **91 Paperclip agent templates = 27 council + 64 marketing agents**, 64 initial tasks and 10 scheduled-routine templates. Additional routines: weekly competitive ads evidence QA, weekly customer-pains verification, daily campaign and offer criticism. These are importable templates; no assertion of 91 live executing jobs.

Specialist roles: `communication-redteam`, `brand-reputation-auditor`, `product-truth-auditor`, `offer-terms-auditor`, `competitor-discovery-analyst`, `ad-library-intelligence-analyst`, `creative-originality-critic`, `audience-voice-researcher`, `need-solution-fit-validator`, `conversion-redteam`, `placement-ethics-auditor`, `evidence-provenance-auditor`, `post-release-learnings-critic`.

## Operational workflow

**Tenant-bound campaign -> product/category query expansion -> authorized SERP search or explicitly labeled dated source seed -> HTTPS source verification -> relevance and domain dedup -> official ad library link discovery -> signed/authorized ad feed when available -> exact advertiser-domain verification -> source-backed target pains and unvalidated hypotheses -> product proof/gap matching -> adversarial communication/offer/product/placement/copycat checks -> blocked/major/minor issues with accountable owner -> differentiated concept drafts -> real A/B experiment (only after Tier 1 governance approval).**

### Source classification and trust levels

- Website source captures: dated, SHA-256 content evidence, source URL and title/description. Competing products are **potential alternatives** according to verified textual overlap, not established market share.
- Search results: `BRAVE_SEARCH_API_KEY` enables authenticated Brave Search (market and category query expansion, bounded result count and parsing); if absent, `makeSeededResearchAdapter` uses explicitly *operator-curated replay* URLs, which must NEVER be represented as live autonomous SERP discovery. The latter is used in this live-web research acceptance run.
- Meta EU Ad Library: `META_AD_LIBRARY_ACCESS_TOKEN` required for authorized `graph.facebook.com/<version>/ads_archive` retrieval for ads delivered in an eligible country. The connector uses a bearer header, bounded reads, no redirects; outputs ad ID, advertiser, creative text, official snapshot, dated evidence hash, and **never** asserts verified CTR/CVR/ROAS from visibility. Meta API access and field availability vary.
- Google Ads Transparency Center: official public advertiser search. No undocumented wholesale scraping/API is assumed.
- TikTok Creative Center Top Ads: *curated opt-in ads*, not a complete universe; no ad observations may be synthesized from library search links.
- Connected AdKit library: the connector can browse competitors' ad library records; `adkit-competitor-adapter.mjs` enforces *exact verified advertiser website domain* before treating search hits as competitor candidates. AdKit's estimated spend/score are **provider-proxy estimates, not proven attributable incremental profit**. Ad creative body and valid source record are separately required before use in originality comparison. The authorized ChatGPT AdKit library was queried for Alpro/Oatly/Minor Figures: no verified matching advertiser was returned. Free-text queries produced unrelated advertiser hits, correctly excluded. A future Paperclip-to-AdKit run adapter remains needed to execute those connected calls autonomously.

### Independent criticism and voice-of-customer

`redteam-needs.mjs` treats customer voice differently from company marketing. It accepts dated, source-linked permitted feedback (consented interviews, authorized support tickets, public reviews only where reproduction permitted); redacts obvious contact fields, separates frequent qualitative observations from prevalence claims and labels small or biased samples inconclusive. In absence of such evidence, pains are **target hypotheses**, not verified customer frustration.

Product-fit mapping checks whether the specific declared product description could address each need; unproved price/shipping/fitness becomes an explicit gap. Independent critic findings are assigned to the responsible specialists and sorted `BLOCKER / MAJOR / MINOR`, with exact remediation. The review does not authorize external publishing, spending or messaging. Dated competitor public marketing claims may generate research hypotheses but are not treated as customer interviews.

`assessCreativeDifferentiation` performs documented **lexical/theme overlap** against *actually observed and source-supported* third-party ad text. It is a conservative warning, not an IP clearance engine or proof of better ROAS. New ads are hypotheses, submitted to fresh randomization and a brand/legal review. Copying competitor materials is not a permitted creative production path.

## Real website integration acceptance — 14 October 2026

- **Client demonstration:** Oatly, read-only public product source.
- **Competitor candidate 1:** Alpro — live page `https://www.alpro.com/it/prodotti/bevande/barista-avena`; textual category similarity **0.467** under a heuristic, marked `POTENTIAL_DIRECT_OR_CATEGORY_COMPETITOR`.
- **Candidate 2:** Minor Figures — live `https://minorfigures.com/products/barista-oat`; overlap heuristic **0.095**, `ALTERNATIVE_OR_UNVERIFIED`. No market-share inference.
- **Source seed:** dated operator-curated public search links in `sample-competitor-search-seeds.json` derived from publicly verifiable external references, not a production autonomous search index. The product pages were nonetheless **fetched and parsed live** by the workflow with verified source hashes.
- **Proposed pain research topics:** foaming for coffee, taste/texture, ingredients/preference. All classified as **competitor-message-derived hypotheses**, not observed customer complaints.
- **Competitor ad findings:** **0 verified actual ads**. Meta official API blocked on missing authorized credentials; connected AdKit library search did not yield advertiser-domain-verified records; Google and TikTok UI links are research pointers, not observed ads.
- **Critic report:** **0 critical**, **4 major**, **2 minor** items for verified market readiness. Issues include unverified total Italian customer price/terms, missing customer interviews, missing verified rival ad creative and placement rights.
- **New concepts:** 4 distinct source-bound positioning angles to test, not declared winners.
- **Storage:** only within `.hermes/paperclip/evidence/mvx-marketing-fleet/competitive/<client>/<UTC run>`, private from Git, with per-file SHA-256 manifest; no user data or scraped raw creative committed.

## Reproduction

```powershell
npm run test:mvx-marketing-fleet
node scripts/mvx-marketing-fleet/run-competitive-audit.mjs scripts/mvx-marketing-fleet/sample-client-oatly.json scripts/mvx-marketing-fleet/sample-competitor-search-seeds.json
```

Set `BRAVE_SEARCH_API_KEY` in a **secrets manager**, not a repository file, to enable a real authorized search feed and omit the seed replay argument. Set `META_AD_LIBRARY_ACCESS_TOKEN` only with appropriate Meta API access, scope, retention and consent controls. A genuine Paperclip runtime and Tier 1 Growth OS client approval are required before externally mutating ads or mailing users.

## Tested contracts and remaining release gates

Full fleet test suite includes role graph integrity, compiled catalog source digests, search provenance and duplicates, cross-domain security, authorized Meta API response/credential handling, false positives in AdKit free-text search, evidence-anchored ad creative, source-linked VOC/consent, offer criticism, copycat detection, draft differentiation and full Oatly integration run.

**Not yet certified:** live full ad corpus retrieval, live scraped/social comments, real brand-owned creative assets, verified ad effectiveness, legitimate referral commission payouts, model-graded semantic originality, production persistent cross-process dedup, autonomous Paperclip instantiation or real platform publishing. Do not claim winner ads without experimental business outcomes.
