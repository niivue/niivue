// preplaywrighttest.cjs  (suggested)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'playwright', 'e2e');
const destDir = path.join(__dirname, 'playwright', 'tests-out');

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// try esbuild (fast, bundles TS -> ESM)
try {
  console.log('Trying esbuild to compile TS -> tests-out');
  execSync(
  'npx esbuild "playwright/e2e/**/*.ts" ' +
  '--bundle ' +
  '--platform=node ' +
  '--packages=external ' +                          // externalize most node_modules automatically
  '--external:fsevents ' +                          // native addon -> leave to Node
  '--external:playwright-core ' +                   // Playwright internals
  '--external:chromium-bidi ' +                     // base package external
  '--external:chromium-bidi/lib/cjs/bidiMapper/BidiMapper ' + // exact problematic path
  '--external:chromium-bidi/lib/cjs/cdp/CdpConnection ' +    // exact problematic path
  '--external:@playwright/* ' +                     // single-wildcard for @playwright scoped pkgs
  '--format=esm ' +
  '--outdir=playwright/tests-out ' +
  '--target=es2020 ' +
  '--sourcemap',
  { stdio: 'inherit' }
);



} catch (err) {
  console.log('esbuild failed or not available, falling back to tsc');
  // ensure tsc outputs into tests-out
  try {
    execSync('npx tsc --project playwright/e2e/tsconfig.json --outDir playwright/tests-out --rootDir playwright/e2e', { stdio: 'inherit' });
  } catch (e) {
    console.warn('tsc compile failed; continuing to copy existing compiled files if any');
  }
}

// copy non-ts assets (helpers.js, static files)
function copyAll(src, dest) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      copyAll(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}
copyAll(srcDir, destDir);

// sanitize all .js files (rewrite imports and strip stray % in sourceMappingURL)
const files = fs.readdirSync(destDir);
for (const f of files) {
  const fp = path.join(destDir, f);
  if (!fp.endsWith('.js')) continue;
  let c = fs.readFileSync(fp, 'utf8');
  c = c.replace(/([iI]mport\s+[^'"]+['"])(?:\/[^'"]*\/)?helpers(?:\.js)?(['"])/g, "$1./helpers.js$2");
  c = c.replace(/(require\(['"])(?:\/[^'"]*\/)?helpers(?:\.js)?(['"]\))/g, "$1./helpers.js$2");
  c = c.replace(/(\/\/#\s*sourceMappingURL=.*?)(%+)\s*$/m, '$1');
  c = c.replace(/[\u0000-\u001F\u007F]+$/m, '');
  fs.writeFileSync(fp, c, 'utf8');
  console.log('sanitized', fp);
}
console.log('preplaywrighttest complete. files in', destDir);
