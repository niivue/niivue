#!/usr/bin/env node
// scripts/build-workspace-deps.cjs
// Full-featured workspace dependency builder.
// - local package.json workspaceBuildOrder (invocation cwd) takes precedence
// - otherwise root-level workspaceBuildOrder, otherwise auto-derived order
// - flags: --only=name1,name2  --dry-run
// - sets a re-entrancy guard to avoid recursion when child builds trigger this script

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const glob = require("glob");

const REENTRANCY_ENV = "BUILD_WORKSPACE_DEPS_RUNNING";

function log(...args) { console.log("[build-workspace-deps]", ...args); }
function fail(msg) { console.error("[build-workspace-deps] ERROR:", msg); process.exit(1); }

// re-entrancy guard
if (process.env[REENTRANCY_ENV]) {
  log("Detected re-entrant invocation — skipping to avoid recursion.");
  process.exit(0);
}
process.env[REENTRANCY_ENV] = "1";

// CLI args
const argv = process.argv.slice(2);
let onlyList = null;
let dryRun = false;
for (const arg of argv) {
  if (arg.startsWith("--only=")) {
    onlyList = arg.slice("--only=".length).split(",").map(s => s.trim()).filter(Boolean);
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: build-workspace-deps.cjs [--dry-run] [--only=name1,name2]");
    process.exit(0);
  }
}

// helpers
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
}
function normalizeWorkspaces(wsField) {
  if (!wsField) return [];
  if (Array.isArray(wsField)) return wsField;
  if (typeof wsField === "object" && Array.isArray(wsField.packages)) return wsField.packages;
  return [];
}
function expandPatterns(rootDir, patterns) {
  const found = new Set();
  for (const pattern of patterns) {
    try {
      const matches = glob.sync(pattern, { cwd: rootDir, absolute: true, dot: true });
      for (const m of matches) found.add(path.resolve(m));
      if (pattern.includes("..") || path.isAbsolute(pattern)) {
        const absPattern = path.resolve(rootDir, pattern);
        const matches2 = glob.sync(absPattern, { absolute: true, dot: true });
        for (const m of matches2) found.add(path.resolve(m));
      }
    } catch (e) {
      // ignore malformed globs
    }
  }
  return Array.from(found).sort();
}

// Walk up from a start directory and return the best candidate package.json that has workspaces
// "Best" = the one whose workspace globs expand to the most package dirs that contain package.json
function findBestWorkspaceRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  const candidates = [];
  const visited = new Set();
  let iter = 0;
  while (true) {
    if (iter++ > 200) break; // defensive
    if (visited.has(dir)) break;
    visited.add(dir);

    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = readJson(pkgPath);
      if (pkg && pkg.workspaces) {
        const patterns = normalizeWorkspaces(pkg.workspaces);
        const expanded = expandPatterns(dir, patterns).filter(d => fs.existsSync(path.join(d, "package.json")));
        candidates.push({ dir, pkg, patterns, expanded, count: expanded.length });
      }
    }

    if (dir === root) break;
    dir = path.dirname(dir);
  }

  if (!candidates.length) return null;
  // pick candidate with largest match count; if tie, prefer the one encountered later (closer to start)
  candidates.sort((a,b) => {
    if (b.count !== a.count) return b.count - a.count;
    return 0;
  });
  return candidates[0];
}

function getPkgInfo(dir) {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = readJson(pkgPath);
  if (!pkg) return null;
  return {
    dir,
    name: pkg.name || null,
    basename: path.basename(dir),
    scripts: pkg.scripts || {},
    deps: Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies),
  };
}

function topoSort(nodes, edges) {
  const inDeg = new Map();
  const adj = new Map();
  nodes.forEach(n => { inDeg.set(n, 0); adj.set(n, new Set()); });
  for (const [n, deps] of Object.entries(edges)) {
    for (const d of deps) {
      if (!inDeg.has(n) || !inDeg.has(d)) continue;
      inDeg.set(n, inDeg.get(n) + 1);
      adj.get(d).add(n);
    }
  }
  const q = [];
  for (const [n, deg] of inDeg.entries()) if (deg === 0) q.push(n);
  const out = [];
  while (q.length) {
    const cur = q.shift();
    out.push(cur);
    for (const nbr of adj.get(cur)) {
      inDeg.set(nbr, inDeg.get(nbr) - 1);
      if (inDeg.get(nbr) === 0) q.push(nbr);
    }
  }
  return { sorted: out, cyclic: out.length !== nodes.length };
}

function deriveOrder(pkgInfos) {
  const idByDir = pkgInfos.map(p => p.dir);
  const nameToDir = new Map(pkgInfos.map(p => [p.name, p.dir]).filter(Boolean));
  const edges = {};
  for (const p of pkgInfos) {
    const deps = new Set();
    for (const depName of Object.keys(p.deps || {})) {
      if (nameToDir.has(depName)) deps.add(nameToDir.get(depName));
    }
    edges[p.dir] = deps;
  }
  const { sorted, cyclic } = topoSort(idByDir, edges);
  if (cyclic) fail("Cycle detected in workspace dependencies — provide explicit workspaceBuildOrder in package.json.");
  return sorted;
}

function ensureInstalled(dir) {
  const nm = path.join(dir, "node_modules");
  if (!fs.existsSync(nm)) {
    log(`npm install -> ${dir}`);
    execSync("npm install", { stdio: "inherit", cwd: dir, env: process.env });
  } else {
    log(`node_modules exists for ${dir}, skipping install`);
  }
}

function runBuildIfPresent(dir) {
  const pkg = readJson(path.join(dir, "package.json")) || {};
  if (pkg.scripts && pkg.scripts.build) {
    log(`npm run build -> ${pkg.name || path.basename(dir)}`);
    execSync("npm run build", { stdio: "inherit", cwd: dir, env: process.env });
  } else {
    log(`No build script for ${pkg.name || path.basename(dir)}, skipping build`);
  }
}

// MAIN
(function main() {
  const scriptDir = path.resolve(__dirname);
  const invocationCwd = process.cwd(); // important: where npm run was invoked from (e.g. packages/niivue-desktop)
  log("Script dir:", scriptDir);
  log("Invocation cwd:", invocationCwd);

  // First: try to get local package.json from invocation cwd (highest priority workspaceBuildOrder)
  let localPkg = null;
  const localPkgPath = path.join(invocationCwd, "package.json");
  if (fs.existsSync(localPkgPath)) {
    localPkg = readJson(localPkgPath);
    if (localPkg) log("Found local package.json at invocation cwd");
  }

  // Find the best workspace root by walking up from the script dir (so script can be in root/scripts or package/scripts)
  const best = findBestWorkspaceRoot(scriptDir);
  if (!best) fail("Could not find any package.json with workspace patterns that match workspace packages.");

  const rootDir = best.dir;
  const rootPkg = best.pkg;
  log("Chosen workspace root:", rootDir);
  log("Root workspace patterns:", JSON.stringify(best.patterns));
  if (!best.count) fail("Workspace globs expanded to no directories. Check your workspace patterns.");

  // discover workspace package dirs and infos
  const expandedDirs = best.expanded.filter(d => fs.existsSync(path.join(d, "package.json")));
  const pkgInfos = expandedDirs.map(getPkgInfo).filter(Boolean);
  if (!pkgInfos.length) fail("No valid workspace package.json files found under expanded dirs.");

  // Decide build order:
  // Priority A: localPkg.workspaceBuildOrder (invocation cwd package.json)
  // Priority B: rootPkg.workspaceBuildOrder
  // Priority C: derive order from inter-workspace deps
  let orderedDirs;
  if (localPkg && Array.isArray(localPkg.workspaceBuildOrder) && localPkg.workspaceBuildOrder.length) {
    log("Using local workspaceBuildOrder from invocation package.json (highest priority)");
    const nameToDir = new Map(pkgInfos.map(p => [p.name, p.dir]).filter(Boolean));
    const baseToDir = new Map(pkgInfos.map(p => [p.basename, p.dir]));
    orderedDirs = [];
    for (const item of localPkg.workspaceBuildOrder) {
      const resolved = nameToDir.get(item) || baseToDir.get(item);
      if (!resolved) fail(`workspaceBuildOrder entry "${item}" not found among workspace packages.`);
      orderedDirs.push(resolved);
    }
    // append any remaining packages not listed
    for (const p of pkgInfos) if (!orderedDirs.includes(p.dir)) orderedDirs.push(p.dir);
  } else if (rootPkg && Array.isArray(rootPkg.workspaceBuildOrder) && rootPkg.workspaceBuildOrder.length) {
    log("Using root workspaceBuildOrder from workspace root package.json");
    const nameToDir = new Map(pkgInfos.map(p => [p.name, p.dir]).filter(Boolean));
    const baseToDir = new Map(pkgInfos.map(p => [p.basename, p.dir]));
    orderedDirs = [];
    for (const item of rootPkg.workspaceBuildOrder) {
      const resolved = nameToDir.get(item) || baseToDir.get(item);
      if (!resolved) fail(`root workspaceBuildOrder entry "${item}" not found among workspace packages.`);
      orderedDirs.push(resolved);
    }
    for (const p of pkgInfos) if (!orderedDirs.includes(p.dir)) orderedDirs.push(p.dir);
  } else {
    log("No explicit workspaceBuildOrder found — deriving order from workspace package dependencies");
    orderedDirs = deriveOrder(pkgInfos);
  }

  // If --only provided, filter orderedDirs (preserve order)
  if (onlyList && onlyList.length) {
    const nameMap = new Map(pkgInfos.map(p => [p.name, p.dir]).filter(Boolean));
    const baseMap = new Map(pkgInfos.map(p => [p.basename, p.dir]));
    const wantDirs = new Set();
    for (const item of onlyList) {
      const resolved = nameMap.get(item) || baseMap.get(item);
      if (!resolved) fail(`--only item "${item}" not found among workspace packages.`);
      wantDirs.add(resolved);
    }
    orderedDirs = orderedDirs.filter(d => wantDirs.has(d));
    if (!orderedDirs.length) fail("--only produced an empty build list.");
  }

  log("Final build order:");
  orderedDirs.forEach(d => {
    const p = pkgInfos.find(x => x.dir === d) || { name: path.basename(d) };
    log("-", p.name || path.basename(d), "@", d);
  });

  if (dryRun) {
    log("--dry-run specified; exiting without running installs/builds.");
    delete process.env[REENTRANCY_ENV];
    process.exit(0);
  }

  // Install + build in order
  for (const d of orderedDirs) {
    // install if needed
    ensureInstalled(d);
    // build if present
    runBuildIfPresent(d);
  }

  log("All workspace installs & builds finished.");
  delete process.env[REENTRANCY_ENV];
})();
