import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const snapshotsRoot = path.join(repoRoot, "evidence", "mvx-marketing-fleet", "dashboards");
const ALLOWED = /^[a-z0-9_-]{3,80}$/i;
export const MAX_SNAPSHOT_BYTES = 3_000_000;
export function isSafeDashboardId(id: unknown): id is string {
  return typeof id === "string" && ALLOWED.test(id);
}
export function validateResearchDashboardShape(snapshot: Record<string, unknown>): boolean {
  if (!isSafeDashboardId(snapshot.companyId)||!isSafeDashboardId(snapshot.tenantId)||
      !isSafeDashboardId(snapshot.clientId)||snapshot.provenance!=="UNSIGNED_LOCAL_RESEARCH_NOT_PRODUCTION_PERFORMANCE"||
      typeof snapshot.generatedAt!=="string" || !Number.isFinite(Date.parse(snapshot.generatedAt))) return false;
  const campaign = snapshot.campaign as Record<string,unknown>|undefined;
  if (!campaign || typeof campaign.id!=="string"||!campaign.id ||
      campaign.approved!==false||campaign.providerPublishing!==false) return false;
  const metrics=snapshot.kpis as Record<string,unknown>|undefined;
  const draftCount = metrics?.postDrafts;
  if (typeof draftCount !== "number" || !Number.isSafeInteger(draftCount) || draftCount < 1 || draftCount > 500)
    return false;
  if(metrics.actualAgentExecutions!==0||metrics.completedVisualAgentAudits!==0) return false;
  for(const key of ["impressions","reach","clicks","ctr","conversions","cvr","cpa","roas",
      "customerAcquisitionCost","revenueNet","spendNet","vat","spendGross","incrementalProfit"])
    if(metrics[key]!==null)return false;
  const posts=snapshot.posts;
  if(!Array.isArray(posts)||posts.length!==draftCount)return false;
  const ids=new Set<string>();
  for(const entry of posts) {
    if(!entry||typeof entry!=="object")return false;
    const post=entry as Record<string,unknown>;
    if(typeof post.id!=="string"||ids.has(post.id)||post.providerPublished!==false) return false;
    ids.add(post.id);
    const kpis=post.kpis as Record<string,unknown>|undefined;
    if(!kpis||Object.values(kpis).some(v=>v!==null))return false;
    const agents=post.agents;
    if(!Array.isArray(agents)||agents.length>100||agents.some(a=>
      !a||a.actualAgentRunId!==null||a.approved!==false))return false;
  }
  const sources=snapshot.evidence;
  if(!Array.isArray(sources)||!sources.length||sources.length>20)return false;
  for(const row of sources) {
    if(!row||typeof row!=="object"||typeof row.url!=="string"||
       typeof row.sha256!=="string"||!/^[a-f0-9]{64}$/i.test(row.sha256))return false;
    try{
      const url=new URL(row.url);
      if(url.protocol!=="https:"||url.username||url.password||url.hostname==="localhost")return false;
    } catch{return false;}
  }
  const competitorRows=snapshot.competitors;
  if(!Array.isArray(competitorRows)||competitorRows.length>100) return false;
  for(const row of competitorRows) {
    if(!row||typeof row.url!=="string")return false;
    try{if(new URL(row.url).protocol!=="https:")return false;}catch{return false;}
  }
  return true;
}

export function validateMarketingSnapshotEnvelope(value: unknown, companyId: string): boolean {
  if (!value || typeof value !== "object") return false;
  const envelope = value as {
    schema?: unknown; snapshot?: Record<string, unknown>; payloadSha256?: unknown;
  };
  if (envelope.schema !== "mvx-marketing-dashboard-envelope/v1" ||
      !envelope.snapshot || envelope.snapshot.schema !== "mvx-marketing-dashboard/v1" ||
      envelope.snapshot.companyId !== companyId ||
      !validateResearchDashboardShape(envelope.snapshot) ||
      typeof envelope.payloadSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(envelope.payloadSha256)) return false;
  const expected = createHash("sha256").update(JSON.stringify(envelope.snapshot)).digest("hex");
  return expected === envelope.payloadSha256;
}
async function safeDirectory(folder: string, root: string): Promise<boolean> {
  if (!path.resolve(folder).startsWith(path.resolve(root) + path.sep)) return false;
  try {
    const stat = await fs.lstat(folder);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
    const real = await fs.realpath(folder);
    return real.startsWith(path.resolve(root) + path.sep);
  } catch { return false; }
}
async function loadSnapshot(file: string, companyId: string, root: string) {
  if (!path.resolve(file).startsWith(path.resolve(root) + path.sep)) return null;
  try {
    const s = await fs.lstat(file);
    if (!s.isFile() || s.isSymbolicLink() || s.size < 50 || s.size > MAX_SNAPSHOT_BYTES) return null;
    const raw = await fs.readFile(file, "utf8");
    const value: unknown = JSON.parse(raw);
    if (!validateMarketingSnapshotEnvelope(value, companyId)) return null;
    return (value as { snapshot: Record<string, unknown> }).snapshot;
  } catch { return null; }
}
export async function readMarketingDashboard(companyId: string, options: {
  clientId?: string;
  root?: string;
  maxClients?: number;
  maxRuns?: number;
} = {}) {
  if (!isSafeDashboardId(companyId) || (options.clientId != null && !isSafeDashboardId(options.clientId))) {
    throw new Error("Invalid dashboard company/client ID");
  }
  const root = options.root ?? snapshotsRoot;
  const companyDir = path.join(root, companyId);
  const empty = { schema: "mvx-marketing-dashboard-response/v1", companyId,
    status: "NO_VERIFIED_SNAPSHOTS", snapshots: [], history: [], availableClients: [],
    sourcePolicy: "COMPANY_SCOPED_LOCAL_SHA256_NOT_SIGNED_PROVIDER_DATA" };
  if (!await safeDirectory(companyDir, root)) return empty;
  const clientNames = (await fs.readdir(companyDir)).filter(isSafeDashboardId).sort();
  const allowedNames = options.clientId != null ? clientNames.filter(x => x === options.clientId) : clientNames;
  const snapshots: Record<string, unknown>[] = [];
  const history: Record<string, unknown>[] = [];
  const maxClients = Math.min(Math.max(options.maxClients ?? 12, 1), 25);
  const maxRuns = Math.min(Math.max(options.maxRuns ?? 20, 1), 50);
  for (const name of allowedNames.slice(0, maxClients)) {
    const clientDir = path.join(companyDir, name);
    if (!await safeDirectory(clientDir, root)) continue;
    const dirs = (await fs.readdir(clientDir)).filter(x => /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(x))
      .sort().reverse().slice(0, maxRuns);
    let first = true;
    for (const runName of dirs) {
      const runDir = path.join(clientDir, runName);
      if (!await safeDirectory(runDir, root)) continue;
      const snapshot = await loadSnapshot(path.join(runDir, "snapshot.json"), companyId, root);
      if (!snapshot || snapshot.clientId !== name) continue;
      const kpis = snapshot.kpis as Record<string, unknown> | undefined;
      history.push({ clientId:name, runAt:snapshot.generatedAt,
        campaignId:(snapshot.campaign as Record<string, unknown> | undefined)?.id,
        drafts:kpis?.postDrafts,major:kpis?.majorFindings,
        sourceCoverage:kpis?.sourceCoverage,realROAS:kpis?.roas });
      if (first) {
        snapshots.push(snapshot);
        first = false;
      }
    }
  }
  return { ...empty, status:snapshots.length?"LOCAL_EVIDENCE_SNAPSHOTS":"NO_VERIFIED_SNAPSHOTS",
    snapshots, history:history.sort((a,b)=>String(a.runAt).localeCompare(String(b.runAt))),
    availableClients:clientNames };
}

export async function resolveMarketingDashboardQuery(
  companyId: unknown,
  clientId: unknown,
  authorizeCompany: (companyId: string) => void,
  reader: typeof readMarketingDashboard = readMarketingDashboard,
) {
  // Authorization is intentionally enforced BEFORE input validation or any file I/O.
  authorizeCompany(String(companyId ?? ""));
  if (!isSafeDashboardId(companyId) ||
      (clientId != null && !isSafeDashboardId(clientId))) {
    return { status: 400, body: { error: "Invalid dashboard scope" },
      cacheControl: "private, no-store" };
  }
  const body = await reader(companyId, { clientId: clientId as string | undefined });
  return { status: 200, body, cacheControl: "private, no-store" };
}
