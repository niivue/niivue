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
      // be noisy but continue
      console.error('Failed to remove', fp, err)
    }
  }
}

// helper to rewrite import paths so they are relative to tests-out
function rewriteImportsAndWrite(srcPath, destPath) {
  let content = fs.readFileSync(srcPath, 'utf8')

  // Replace absolute (or repo-rooted) imports referencing helpers with a relative import.
  // Examples matched:
  //   import helpers from '/Users/.../playwright/tests-out/helpers.js'
  //   import * as helpers from '/absolute/path/helpers'
  //   const helpers = require('/abs/path/helpers.js')
  // We replace them with: import helpers from './helpers.js' (or require('./helpers.js'))
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

// Copy files we care about (.js and .ts). Keep same filename.
fs.readdirSync(srcDir).forEach((file) => {
  const lower = file.toLowerCase()
  if (lower.endsWith('.js') || lower.endsWith('.ts')) {
    const src = path.join(srcDir, file)
    const dest = path.join(destDir, file)

    try {
      // rewrite imports in text files to prefer ./helpers.js
      rewriteImportsAndWrite(src, dest)
      console.log('copied', src, '->', dest)
    } catch (err) {
      // fallback to a raw copy if something goes wrong
      console.warn('rewrite failed for', src, '; falling back to copy. error:', err)
      fs.copyFileSync(src, dest)
    }
  }
})
