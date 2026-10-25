#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Bootstrap must not import the server before workspace package links are repaired.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
let unresolvedLinkCount = 0;

type WorkspaceLinkMismatch = {
  workspaceDir: string;
  packageName: string;
  expectedPath: string;
  actualPath: string | null;
};

function readJsonFile(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function discoverWorkspacePackagePaths(rootDir: string): Map<string, string> {
  const packagePaths = new Map<string, string>();
  const ignoredDirNames = new Set([".git", ".paperclip", "dist", "node_modules"]);

  function visit(dirPath: string) {
    // A sparse worktree may omit cli or optional package directories.
    if (!existsSync(dirPath)) return;
    const packageJsonPath = path.join(dirPath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = readJsonFile(packageJsonPath);
      if (typeof packageJson.name === "string" && packageJson.name.length > 0) {
        packagePaths.set(packageJson.name, dirPath);
      }
    }

    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (ignoredDirNames.has(entry.name)) continue;
      visit(path.join(dirPath, entry.name));
    }
  }

  visit(path.join(rootDir, "packages"));
  visit(path.join(rootDir, "server"));
  visit(path.join(rootDir, "ui"));
  visit(path.join(rootDir, "cli"));

  return packagePaths;
}

const workspacePackagePaths = discoverWorkspacePackagePaths(repoRoot);
const workspaceDirs = Array.from(
  new Set(
    Array.from(workspacePackagePaths.values())
      .map((packagePath) => path.relative(repoRoot, packagePath))
      .filter((workspaceDir) => workspaceDir.length > 0),
  ),
).sort();

function findWorkspaceLinkMismatches(workspaceDir: string): WorkspaceLinkMismatch[] {
  const nodeModulesDir = path.join(repoRoot, workspaceDir, "node_modules");
  // Sparse worktrees may have a workspace package but no node_modules yet.
  // Workspace-only links can still be restored without reinstalling packages.
  const packageJson = readJsonFile(path.join(repoRoot, workspaceDir, "package.json"));
  const dependencies = {
    ...(packageJson.dependencies as Record<string, unknown> | undefined),
    ...(packageJson.devDependencies as Record<string, unknown> | undefined),
  };
  const mismatches: WorkspaceLinkMismatch[] = [];

  for (const [packageName, version] of Object.entries(dependencies)) {
    if (typeof version !== "string" || !version.startsWith("workspace:")) continue;

    const expectedPath = workspacePackagePaths.get(packageName);
    if (!expectedPath) continue;

    const linkPath = path.join(repoRoot, workspaceDir, "node_modules", ...packageName.split("/"));
    const actualPath = existsSync(linkPath) ? path.resolve(realpathSync(linkPath)) : null;
    if (actualPath === path.resolve(expectedPath)) continue;

    mismatches.push({
      workspaceDir,
      packageName,
      expectedPath: path.resolve(expectedPath),
      actualPath,
    });
  }

  return mismatches;
}

async function ensureWorkspaceLinksCurrent(workspaceDir: string) {
  const mismatches = findWorkspaceLinkMismatches(workspaceDir);
  if (mismatches.length === 0) return;

  console.log(`[paperclip] stale workspace package links for ${workspaceDir}; ${checkOnly ? "checking only" : "relinking dependencies"}...`);
  for (const mismatch of mismatches) {
    console.log(
      `[paperclip]   ${mismatch.packageName}: ${mismatch.actualPath ?? "missing"} -> ${mismatch.expectedPath}`,
    );
  }

  if (checkOnly) {
    unresolvedLinkCount += mismatches.length;
    console.log(`[paperclip] check-only: ${mismatches.length} workspace links need repair in ${workspaceDir}`);
    return;
  }

  for (const mismatch of mismatches) {
    const linkPath = path.join(repoRoot, mismatch.workspaceDir, "node_modules", ...mismatch.packageName.split("/"));
    // Never recursively delete a real package directory or file. An existing
    // non-link may contain user data or installed dependencies: fail closed.
    let existingLink: Awaited<ReturnType<typeof fs.lstat>> | null = null;
    try {
      existingLink = await fs.lstat(linkPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (existingLink && !existingLink.isSymbolicLink()) {
      throw new Error(`Refusing to replace a non-symlink workspace dependency: ${linkPath}`);
    }

    await fs.mkdir(path.dirname(linkPath), { recursive: true });
    if (existingLink) {
      await fs.rm(linkPath, { force: true });
    }
    await fs.symlink(mismatch.expectedPath, linkPath, process.platform === "win32" ? "junction" : "dir");
  }

  const remainingMismatches = findWorkspaceLinkMismatches(workspaceDir);
  if (remainingMismatches.length === 0) return;

  throw new Error(
    `Workspace relink did not repair all ${workspaceDir} package links: ${remainingMismatches.map((item) => item.packageName).join(", ")}`,
  );
}

for (const workspaceDir of workspaceDirs) {
  await ensureWorkspaceLinksCurrent(workspaceDir);
}
if (checkOnly && unresolvedLinkCount > 0) {
  console.error(`[paperclip] workspace-link check failed: ${unresolvedLinkCount} stale or missing links`);
  process.exitCode = 1;
}
