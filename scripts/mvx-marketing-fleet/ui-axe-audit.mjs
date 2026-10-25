import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(process.cwd());
if (!/[/\\]\.hermes[/\\]paperclip$/i.test(root)) {
  throw new Error("Only authorized .hermes/paperclip checkout");
}

const base = process.env.MVX_BROWSER_BASE || "http://127.0.0.1:3102";
const folder = path.join(root, "evidence", "mvx-marketing-fleet",
  "ui-axe-audit-" + new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(folder, { recursive: true });
process.env.TEMP = folder;
process.env.TMP = folder;
process.env.TMPDIR = folder;

const pnpmStore = path.join(root, "node_modules", ".pnpm");
const axePackage = (await fs.readdir(pnpmStore))
  .filter((name) => /^axe-core@/.test(name)).sort().at(-1);
if (!axePackage) throw new Error("axe-core not installed locally; do not download packages during QA");
const axeScript = path.join(pnpmStore, axePackage, "node_modules", "axe-core", "axe.min.js");
await fs.access(axeScript);

const routes = ["/content-planner", "/crm-contacts", "/council",
  "/marketing-intelligence", "/skill-tree"];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const browser = await chromium.launchPersistentContext(path.join(folder, "profile"), {
  channel: "chrome", headless: true, viewport: { width: 1440, height: 900 },
});
const page = browser.pages()[0] || await browser.newPage();
page.setDefaultTimeout(30000);
const results = [];

try {
  for (const route of routes) {
    const record = { route, status: "UNKNOWN", violations: [], incomplete: [],
      passedRules: 0, inapplicableRules: 0, elapsedMs: 0, error: null };
    const start = Date.now();
    try {
      const response = await page.goto(base + route, {
        waitUntil: "domcontentloaded", timeout: 45000,
      });
      if (!response || response.status() >= 400) {
        throw new Error("Navigation HTTP " + (response?.status() ?? "unknown"));
      }
      await page.locator("body").waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      await page.addScriptTag({ path: axeScript });
      const scan = await page.evaluate(async (wantedTags) => {
        if (!window.axe?.run) throw new Error("axe-core script unavailable");
        const out = await window.axe.run(document, {
          runOnly: { type: "tag", values: wantedTags },
          resultTypes: ["violations", "incomplete", "passes", "inapplicable"],
        });
        const project = (entry) => ({
          id: entry.id, impact: entry.impact, description: entry.help,
          helpUrl: entry.helpUrl, tags: entry.tags,
          nodes: entry.nodes.map((node) => ({
            target: node.target, html: node.html?.slice(0, 340),
            failureSummary: node.failureSummary?.slice(0, 850),
          })).slice(0, 20),
          affectedNodes: entry.nodes.length,
        });
        return {
          violations: out.violations.map(project),
          incomplete: out.incomplete.map(project),
          passedRules: out.passes.length,
          inapplicableRules: out.inapplicable.length,
        };
      }, tags);
      Object.assign(record, scan);
      record.status = scan.violations.length === 0 ? "PASS_AUTOMATED_AXE" : "FAIL_AXE";
    } catch (error) {
      record.status = "ERROR";
      record.error = String(error).slice(0, 1200);
    }
    record.elapsedMs = Date.now() - start;
    console.log("AXE " + route + " " + record.status
      + " violations=" + record.violations.length
      + " incomplete=" + record.incomplete.length);
    results.push(record);
  }
} finally {
  await browser.close();
}
const verdict = {
  routesTested: results.length,
  passedRoutes: results.filter((r) => r.status === "PASS_AUTOMATED_AXE").length,
  violations: results.reduce((n, r) => n + r.violations.length, 0),
  incomplete: results.reduce((n, r) => n + r.incomplete.length, 0),
  errors: results.filter((r) => r.status === "ERROR").length,
};
const report = {
  schema: "mvx-ui-axe-audit/v1", generatedAt: new Date().toISOString(), base,
  engine: axePackage, tags, verdict, results,
  limitations: "Automated Chromium/axe audit only. Does not certify WCAG AA, screen readers, native mobile behavior, authentication, or tenant integrations.",
  productionReady: false,
};
const reportPath = path.join(folder, "report.json");
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log("AXE_REPORT=" + reportPath);
console.log("AXE_TALLY=" + JSON.stringify(verdict));
if (verdict.violations || verdict.errors || verdict.passedRoutes !== routes.length) {
  process.exitCode = 1;
}
