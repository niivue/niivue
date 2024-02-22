// Concatenate all tck files in a folder to a single trx file
// each tck file is saved as a unique group
// Usage:
// node concat_tck2trx.mjs ./TCK

// requires several packages, which can be installed with npm
// npm install @types/archiver

import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'

/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stream = fs.createWriteStream(outPath)

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream)

    stream.on('close', () => resolve())
    archive.finalize()
  })
}

function readBrainLifeJSON(js) {
  const groupName = js.name
  const rgb255 = new Uint8Array(3)
  rgb255[0] = Math.round(js.color[0] * 255)
  rgb255[1] = Math.round(js.color[1] * 255)
  rgb255[2] = Math.round(js.color[2] * 255)
  let npt = 0
  const offsetPt0 = []
  const pts = []
  offsetPt0.push(npt) // index of first vertex in this streamline
  for (let o = 0; o < js.coords.length; o++) {
    for (let p = 0; p < js.coords[o][0].length; p++) {
      pts.push(js.coords[o][0][p])
      pts.push(js.coords[o][0][p])
      pts.push(js.coords[o][0][p])
      npt++
    }
    offsetPt0.push(npt) // index of last vertex
  }
  return {
    pts,
    offsetPt0,
    groupName,
    rgb255
  }
} // readBrainLifeJSON()

const writeFileSync = function (fnm, arr, permission) {
  permission = permission || 438 // 0666
  let fileDescriptor

  try {
    fileDescriptor = fs.openSync(fnm, 'w', permission)
  } catch (e) {
    fs.chmodSync(path, permission)
    fileDescriptor = fs.openSync(fnm, 'w', permission)
  }

  if (fileDescriptor) {
    const buf = new Uint8Array(arr.buffer)
    fs.writeSync(fileDescriptor, buf)
    // fs.writeSync(fileDescriptor, arr, 0, arr.length, 0)
    fs.closeSync(fileDescriptor)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const argc = argv.length
  if (argc < 1) {
    console.log("arguments required: 'node bench.mjs /path/to/jsons'")
    return
  }
  // output paths
  const outdir = './atlas/'
  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true, force: true })
  }

  fs.mkdirSync(outdir)
  // delete all contents
  //  fs.readdirSync(outdir, { withFileTypes: true }).forEach(f => { if (f.isFile()) fs.rmSync(path.join(outdir, f.name)) })
  const groupdir = outdir + 'groups/'
  fs.mkdirSync(groupdir)
  const dpgdir = outdir + 'dpg/'
  fs.mkdirSync(dpgdir)
  // check input filename
  const pth = argv[0]
  if (!fs.existsSync(pth)) {
    console.log('Unable to find input: ' + pth)
    return
  }
  const files = fs.readdirSync(pth)
  const nums = []
  for (let i = 0; i < files.length; i++) {
    const fnm = files[i]
    if (!fnm.endsWith('.json')) {
      continue
    }
    const num = parseInt(path.parse(fnm).name)
    if (isFinite(num)) {
      nums.push(num)
    }
  }
  if (nums.length < 1) {
    console.log('No files matching the format `1.json`')
    return
  }
  nums.sort(function (a, b) {
    return a - b
  })
  let pts = new Float32Array(0)
  let offsetPt0 = new Uint32Array(1)
  offsetPt0[0] = 0
  let nstreamlines = 0
  for (let i = 0; i < nums.length; i++) {
    const fnm = nums[i] + '.json'
    const pthfnm = path.join(pth, fnm)
    if (!fs.existsSync(pthfnm)) {
      continue
    }
    // const buf = fs.readFileSync(pthfnm) // Variable never used
    const js = JSON.parse(fs.readFileSync(pthfnm, 'utf8'))
    const obj = readBrainLifeJSON(js)
    console.log('Appending ' + obj.groupName)
    // ignore first index (fencepost)
    const newOffsetPt1 = obj.offsetPt0.slice(1)
    const newstreamlines = newOffsetPt1.length
    // increment offsets for concatenated points
    // each point/vertex has three elements (xyz)
    const nvtx = pts.length / 3
    for (let o = 0; o < newOffsetPt1.length; o++) {
      newOffsetPt1[o] += nvtx
    }
    // concatenate offsets
    const u32 = new Uint32Array(offsetPt0.length + newOffsetPt1.length)
    u32.set(offsetPt0, 0)
    u32.set(newOffsetPt1, offsetPt0.length)
    offsetPt0 = u32
    // concatenate positions
    // the simple way to concatenate will exhaust stack space
    // pts = Float32Array.of(...pts, ...obj.pts)
    const f32 = new Float32Array(pts.length + obj.pts.length)
    f32.set(pts, 0)
    f32.set(obj.pts, pts.length)
    pts = f32
    // save group
    const g32 = new Uint32Array(newstreamlines)
    for (let o = 0; o < newstreamlines; o++) {
      g32[o] = o + nstreamlines
    }
    nstreamlines += newstreamlines
    writeFileSync(groupdir + obj.groupName + '.uint32', g32)
    const groupddpgdir = dpgdir + obj.groupName + '/'
    fs.mkdirSync(groupddpgdir)
    writeFileSync(groupddpgdir + '/shuffle_colors.3.uint8', obj.rgb255)
  }
  writeFileSync(outdir + 'offsets.int32', offsetPt0)
  writeFileSync(outdir + 'positions.3.float32', pts)
  zipDirectory(outdir, 'concat.trx')
}
main().then(() => console.log('Done'))
