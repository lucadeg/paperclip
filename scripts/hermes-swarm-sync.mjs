#!/usr/bin/env node
import fs from "node:fs";

const argv = new Set(process.argv.slice(2));
const apply = argv.has("--apply");
const apiUrl = (process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
const registryPath = process.env.HERMES_SWARM_REGISTRY || "C:\\Users\\Deglu\\.hermes\\tools\\swarm_goals\\atomic_goals_registry.json";
const selector = process.env.PAPERCLIP_COMPANY_ID || process.env.COMPANY_ID || process.env.PAPERCLIP_COMPANY_SELECTOR || "";
const authHeader = process.env.PAPERCLIP_AUTH_HEADER || (process.env.PAPERCLIP_API_KEY ? `Bearer ${process.env.PAPERCLIP_API_KEY}` : "");
const cookie = process.env.PAPERCLIP_COOKIE || "";

function headers(json = false) {
  const h = {};
  if (json) h["content-type"] = "application/json";
  if (authHeader) h.authorization = authHeader;
  if (cookie) h.cookie = cookie;
  return h;
}
async function request(method, path, body) {
  const res = await fetch(`${apiUrl}/api${path}`, {
    method,
    headers: headers(body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${typeof data === "string" ? data.slice(0, 500) : JSON.stringify(data)}`);
  return data;
}
function normalizeRegistry(raw) {
  const goals = Array.isArray(raw.goals) ? raw.goals : [];
  const phases = Array.isArray(raw.workflow_phases) ? raw.workflow_phases : [];
  if (phases.length !== 14) throw new Error(`expected 14 workflow phases, got ${phases.length}`);
  if (goals.length !== 112) throw new Error(`expected 112 atomic goals, got ${goals.length}`);
  return { phases, goals };
}
function issueState(status) {
  if (status === "done" || status === "completed") return "done";
  if (status === "blocked") return "blocked";
  if (status === "in_progress" || status === "running") return "in_progress";
  return "todo";
}
async function resolveCompany() {
  const companies = await request("GET", "/companies");
  if (!Array.isArray(companies) || companies.length === 0) throw new Error("no Paperclip companies available");
  if (!selector) return companies[0];
  const found = companies.find((c) => c.id === selector || c.issuePrefix === selector || c.name === selector);
  if (!found) throw new Error(`no company matches selector ${selector}`);
  return found;
}
async function loadIssues(companyId) {
  try {
    const data = await request("GET", `/companies/${companyId}/issues?limit=500`);
    return Array.isArray(data) ? data : (Array.isArray(data?.issues) ? data.issues : []);
  } catch (err) {
    console.warn(`[hermes-swarm-sync] issue listing unavailable: ${err.message}`);
    return [];
  }
}
async function main() {
  if (!fs.existsSync(registryPath)) throw new Error(`registry not found: ${registryPath}`);
  const { phases, goals } = normalizeRegistry(JSON.parse(fs.readFileSync(registryPath, "utf8")));
  const health = await request("GET", "/health");
  const company = await resolveCompany();
  const existing = await loadIssues(company.id);
  const byTitle = new Map(existing.map((i) => [i.title, i]));
  const plan = [];

  for (const phase of phases) {
    const idx = Number(phase.index ?? phase.phase_index);
    const key = phase.key ?? phase.phase_key;
    const name = phase.name ?? phase.phase_name;
    const title = `[HERMES-WF-${String(idx).padStart(2, "0")}] ${name}`;
    plan.push({ kind: "phase", title, description: `Canonical Hermes sovereign swarm workflow phase.\n\nphase_index: ${idx}\nphase_key: ${key}\nsource: atomic_goals_registry.json`, status: "todo" });
  }
  for (const goal of goals) {
    const title = `[HERMES-${goal.id}] ${goal.title}`;
    const description = [
      "Canonical Hermes sovereign swarm atomic goal.",
      "",
      `phase_index: ${goal.phase_index}`,
      `phase_key: ${goal.phase_key}`,
      `lead_agent_id: ${goal.lead_agent_id || ""}`,
      `division: ${goal.division || ""}`,
      `expected_artifact: ${goal.expected_artifact || ""}`,
      `source_status: ${goal.status || ""}`,
    ].join("\n");
    plan.push({ kind: "goal", title, description, status: issueState(goal.status) });
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    apiUrl,
    deploymentMode: health?.deploymentMode ?? null,
    company: { id: company.id, name: company.name, issuePrefix: company.issuePrefix },
    phases: phases.length,
    goals: goals.length,
    intendedIssues: plan.length,
    existingMatches: plan.filter((p) => byTitle.has(p.title)).length,
  }, null, 2));
  if (!apply) return;

  let created = 0, updated = 0;
  for (const item of plan) {
    const current = byTitle.get(item.title);
    if (!current) {
      const made = await request("POST", `/companies/${company.id}/issues`, {
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.kind === "phase" ? "high" : "medium",
      });
      byTitle.set(item.title, made);
      created += 1;
    } else {
      const patch = {};
      if (current.description !== item.description) patch.description = item.description;
      if (current.status !== item.status) patch.status = item.status;
      if (Object.keys(patch).length) {
        await request("PATCH", `/issues/${current.id}`, patch);
        updated += 1;
      }
    }
  }
  console.log(JSON.stringify({ status: "PASS", created, updated, total: plan.length }, null, 2));
}
main().catch((err) => {
  console.error(`[hermes-swarm-sync] ${err.stack || err.message}`);
  process.exitCode = 1;
});
