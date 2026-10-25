import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = path.join(checkout, "evidence", "mvx-marketing-fleet");
const junctionType = process.platform === "win32" ? "junction" : "dir";

test("workspace links never delete installed directories and safely repair links", async () => {
  await fs.mkdir(evidence, { recursive: true });
  // Never use os.tmpdir(): all fixture writes stay inside the checked-out repo.
  const fixture = await fs.mkdtemp(path.join(evidence, "workspace-link-guard-"));
  const script = path.join(fixture, "scripts", "ensure-workspace-package-links.ts");
  const target = path.join(fixture, "packages", "core");
  const consumer = path.join(fixture, "packages", "consumer");
  const link = path.join(consumer, "node_modules", "@fixture", "core");
  const sentinel = path.join(link, "installed-file.txt");

  const run = (...args) => spawnSync(process.execPath, [script, ...args], {
    cwd: fixture,
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });

  try {
    await fs.mkdir(path.dirname(script), { recursive: true });
    await fs.copyFile(path.join(checkout, "scripts", "ensure-workspace-package-links.ts"), script);
    await fs.mkdir(target, { recursive: true });
    await fs.mkdir(consumer, { recursive: true });
    await fs.writeFile(path.join(target, "package.json"), JSON.stringify({ name: "@fixture/core", version: "1.0.0" }));
    await fs.writeFile(path.join(consumer, "package.json"), JSON.stringify({
      name: "@fixture/consumer", version: "1.0.0", dependencies: { "@fixture/core": "workspace:*" },
    }));

    // An installed directory is NOT a symlink; it must never be deleted.
    await fs.mkdir(link, { recursive: true });
    await fs.writeFile(sentinel, "important installed data");
    const check = run("--check");
    assert.equal(check.status, 1, check.stderr);
    assert.equal(await fs.readFile(sentinel, "utf8"), "important installed data");
    const refused = run();
    assert.notEqual(refused.status, 0, "normal mode must refuse to replace a physical directory");
    assert.match(refused.stderr, /Refusing to replace a non-symlink/);
    assert.equal(await fs.readFile(sentinel, "utf8"), "important installed data");

    // A missing link can be created, and the following audit must be clean.
    await fs.rm(link, { recursive: true });
    const repaired = run();
    assert.equal(repaired.status, 0, repaired.stderr);
    assert.equal(await fs.realpath(link), await fs.realpath(target));
    assert.equal(run("--check").status, 0);

    // A stale *symbolic link*, unlike a real directory, may be safely replaced.
    const other = path.join(fixture, "packages", "other");
    await fs.mkdir(other);
    await fs.rm(link, { force: true });
    await fs.symlink(other, link, junctionType);
    assert.equal(await fs.realpath(link), await fs.realpath(other));
    const corrected = run();
    assert.equal(corrected.status, 0, corrected.stderr);
    assert.equal(await fs.realpath(link), await fs.realpath(target));
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
