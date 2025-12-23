// preplaywrighttest.cjs
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')

const srcDir = path.join(__dirname, 'playwright', 'e2e')
const destDir = path.join(__dirname, 'playwright', 'tests-out')

// ensure dest exists; if not, create it; else empty it
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
} else {
  for (const file of fs.readdirSync(destDir)) {
    const fp = path.join(destDir, file)
    try {
      fs.unlinkSync(fp)
    } catch (err) {
      console.error('Failed to remove', fp, err)
    }
  }
}

// helper to rewrite import paths so they are relative to tests-out
function rewriteImportsAndWrite(srcPath, destPath) {
  let content = fs.readFileSync(srcPath, 'utf8')

  // Normalize imports that reference helpers (absolute paths) to './helpers.js'
  content = content.replace(
    /([iI]mport\s+[^'"]+['"])(?:\/[^'"]*\/)?helpers(?:\.js)?(['"])/g,
    "$1./helpers.js$2"
  )
  content = content.replace(
    /(require\(\s*['"])(?:\/[^'"]*\/)?helpers(?:\.js)?(['"]\s*\))/g,
    "$1./helpers.js$2"
  )

  fs.writeFileSync(destPath, content, 'utf8')
}

// Copy files we care about EXCLUDING TypeScript source files (.ts).
// This avoids copying .ts into tests-out and then having tsc emit .js there,
// which would produce duplicate test files (.ts + .js) and duplicate titles.
fs.readdirSync(srcDir).forEach((file) => {
  const lower = file.toLowerCase()
  // Skip .ts sources; allow everything else (images, json, .js helpers if present, etc.)
  if (lower.endsWith('.ts')) {
    // skip TypeScript source files to avoid duplicates
    return
  }

  const src = path.join(srcDir, file)
  const dest = path.join(destDir, file)

  try {
    // For text files (.js, .json, .html, etc.) try to rewrite imports and write
    const stat = fs.statSync(src)
    if (stat.isFile()) {
      // attempt a rewrite for text files; if binary, fallback to copy
      try {
        rewriteImportsAndWrite(src, dest)
        console.log('copied (rewrote)', src, '->', dest)
      } catch (err) {
        // fallback to raw copy (binary files, etc.)
        fs.copyFileSync(src, dest)
        console.log('copied (raw)', src, '->', dest)
      }
    }
  } catch (err) {
    console.warn('skipping', src, 'error:', err)
  }
})
