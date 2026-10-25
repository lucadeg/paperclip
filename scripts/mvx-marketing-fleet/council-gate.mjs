import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const roster = JSON.parse(await fs.readFile(path.join(root, 'roster.json'), 'utf8'));
const reviewers = new Set(roster.executives.map(x => x.id));
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const mutations = new Set(['spend', 'publish', 'outreach', 'delete']);

export function selectReviewers({ domains = [], action }) {
  const topics = new Set(domains);
  const chosen = new Set(['ceo-bezos', 'consulting-bower', 'critic-munger']);
  if (topics.includes?.('marketing') || topics.has('marketing')) chosen.add('marketing-godin');
  if (topics.has('creative')) chosen.add('story-duarte');
  if (topics.has('brand')) chosen.add('branding-neumeier');
  if (topics.has('growth') || topics.has('experiment')) chosen.add('growth-ellis');
  if (topics.has('crm') || topics.has('privacy') || topics.has('ugc')) chosen.add('legal-frankel');
  if (action === 'spend' || topics.has('finance')) chosen.add('cfo-campbell');
  if (topics.has('ai')) chosen.add('ai-karpathy');
  return [...chosen].sort();
}
export function evidenceErrors(e, context, now = Date.now()) {
  const errors = [];
  if (!e || !e.id || !e.sourceRef || !e.subjectId || !Number.isInteger(e.version) || e.version < 1)
    errors.push('missing evidence identity/source/version');
  if (e?.tenantId !== context.tenantId || e?.companyId !== context.companyId)
    errors.push('tenant or company mismatch');
  if (e?.sourceSystem !== 'mvx-growth-os') errors.push('not Tier 1 authoritative source');
  if (!/^[a-f0-9]{64}$/i.test(e?.contentSha256 ?? '')) errors.push('missing SHA-256');
  const time = Date.parse(e?.observedAt ?? '');
  if (!Number.isFinite(time) || time > now + 60000 || now - time > 30 * 86400000)
    errors.push('stale or invalid observation');
  return errors;
}
/* This engine returns recommendations only. verifyWithTier1 must be a trusted
 * server-side callback that verifies evidence IDs, digest, subject and version.
 * Never use a user-supplied Boolean as evidence verification.
 */
export async function deliberate(input, { verifyWithTier1 } = {}) {
  if (!input || !input.sessionId || !input.issueId || !input.tenantId || !input.companyId)
    throw new TypeError('session, issue, tenant and company are mandatory');
  if (!['read','draft','spend','publish','outreach','delete'].includes(input.action))
    throw new TypeError('unknown action');
  const faults = [], verified = new Set(), seen = new Set(), votes = input.votes ?? [];
  const evidence = input.evidence ?? [];
  if (!Array.isArray(evidence) || !Array.isArray(votes)) throw new TypeError('arrays required');
  if (!evidence.length) faults.push('no real evidence');
  if (typeof verifyWithTier1 !== 'function') faults.push('trusted Tier 1 verifier unavailable');
  for (const e of evidence) {
    if (seen.has(e.id)) faults.push('duplicate evidence id');
    seen.add(e.id);
    const bad = evidenceErrors(e, input);
    if (bad.length) { faults.push(...bad.map(x => String(e?.id) + ': ' + x)); continue; }
    if (typeof verifyWithTier1 === 'function') {
      try {
        if (await verifyWithTier1(e, input) === true) verified.add(e.id);
        else faults.push('Tier 1 rejected ' + e.id);
      } catch { faults.push('Tier 1 unavailable for ' + e.id); }
    }
  }
  const voted = new Set(), vetoes = [], dissent = [];
  for (const v of votes) {
    if (!reviewers.has(v.agentId) || voted.has(v.agentId)) {
      faults.push('duplicate or unknown council voter'); continue;
    }
    voted.add(v.agentId);
    if (!['SUPPORT','REVISE','VETO','ABSTAIN'].includes(v.position)
      || typeof v.reason !== 'string' || v.reason.trim().length < 20)
      faults.push('unexplained or invalid vote');
    if (!Array.isArray(v.evidenceIds) || v.evidenceIds.length < 1
      || v.evidenceIds.some(id => !verified.has(id)))
      faults.push('vote lacks Tier 1 verified evidence: ' + v.agentId);
    if (v.position === 'VETO') vetoes.push({ agentId: v.agentId, reason: v.reason });
    if (v.position === 'REVISE' || v.position === 'VETO')
      dissent.push({ agentId: v.agentId, reason: v.reason, position: v.position });
  }
  for (const key of ['ceo-bezos','critic-munger'])
    if (!voted.has(key)) faults.push('missing mandatory reviewer: ' + key);
  if (input.action === 'spend' && !voted.has('cfo-campbell'))
    faults.push('missing finance review');
  if (mutations.has(input.action))
    faults.push('side effects require a separate Tier 1 policy approval and receipt');
  const supports = votes.filter(v => v.position === 'SUPPORT').length;
  const verdict = vetoes.length ? 'VETO' : faults.length ? 'BLOCKED'
    : supports >= 2 ? 'DRAFT_RECOMMENDED' : 'REVISION_REQUIRED';
  const record = { schema: 'mvx-council/v1', sessionId: input.sessionId,
    tenantId: input.tenantId, companyId: input.companyId, issueId: input.issueId,
    action: input.action, verdict, faults: [...new Set(faults)], vetoes, dissent,
    reviewers: selectReviewers(input), votes, verifiedEvidence: [...verified].sort(),
    executionAuthorized: false };
  return { ...record, contentSha256: digest(record) };
}
