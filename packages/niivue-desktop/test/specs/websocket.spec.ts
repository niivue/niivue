import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { fileURLToPath } from 'url'
import { WsTestClient } from '../helpers/ws-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RESOURCES = path.resolve(__dirname, '../../resources/images/standard')
const MNI152_PATH = path.join(RESOURCES, 'mni152.nii.gz')
const AAL_MESH_PATH = path.join(RESOURCES, 'aal.mz3')

// Visual regression tolerance: 10% pixel difference for GPU rendering variations
const VISUAL_TOLERANCE = 10

// Slice type numeric values (NiiVue SLICE_TYPE enum)
const SLICE_TYPE = {
  AXIAL: 0,
  CORONAL: 1,
  SAGITTAL: 2,
  MULTIPLANAR: 3,
  RENDER: 4
}

describe('WebSocket Integration', () => {
  const client = new WsTestClient()

  before(async () => {
    // Wait for renderer to mount (canvas visible = registerWsExecutor has been called)
    const canvas = await $('[data-testid="viewer-canvas"]')
    await canvas.waitForDisplayed({ timeout: 15000 })

    // Connect to the WebSocket server (polls for port file, then opens connection)
    await client.connect()
  })

  after(() => {
    client.close()
  })

  // ---------------------------------------------------------------------------
  // Group 1: Connection & Protocol
  // ---------------------------------------------------------------------------
  describe('Connection & Protocol', () => {
    it('should connect and receive a valid getScene response', async () => {
      const resp = await client.call('getScene')
      expect(resp.jsonrpc).toBe('2.0')
      expect(resp.error).toBeUndefined()
      expect(resp.result).toBeDefined()
    })

    it('should return parse error for malformed JSON', async () => {
      const resp = await client.sendRaw('not json at all')
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32700)
      expect(resp.error!.message).toContain('Parse error')
    })

    it('should return invalid request when jsonrpc field is missing', async () => {
      const resp = await client.sendRaw(JSON.stringify({ id: 9000, method: 'getScene' }))
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32600)
      expect(resp.id).toBe(9000)
    })

    it('should return invalid request when method field is missing', async () => {
      const resp = await client.sendRaw(JSON.stringify({ jsonrpc: '2.0', id: 9001 }))
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32600)
      expect(resp.id).toBe(9001)
    })

    it('should return error for unknown method', async () => {
      const resp = await client.call('nonExistentMethod')
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Unknown method')
    })
  })

  // ---------------------------------------------------------------------------
  // Group 2: Info Queries (read-only, no state mutations)
  // ---------------------------------------------------------------------------
  describe('Info Queries', () => {
    it('should return scene info with expected shape', async () => {
      const resp = await client.call('getScene')
      expect(resp.error).toBeUndefined()
      const scene = resp.result as {
        volumes: unknown[]
        meshCount: number
        sliceType: number
        crosshairWidth: number
      }
      expect(scene).toHaveProperty('volumes')
      expect(scene).toHaveProperty('meshCount')
      expect(scene).toHaveProperty('sliceType')
      expect(scene).toHaveProperty('crosshairWidth')
      expect(Array.isArray(scene.volumes)).toBe(true)
      expect(typeof scene.meshCount).toBe('number')
    })

    it('should return colormaps including gray', async () => {
      const resp = await client.call('getColormaps')
      expect(resp.error).toBeUndefined()
      const colormaps = resp.result as string[]
      expect(Array.isArray(colormaps)).toBe(true)
      expect(colormaps.length).toBeGreaterThan(0)
      expect(colormaps).toContain('gray')
    })

    it('should return empty volumes array when nothing loaded', async () => {
      const resp = await client.call('getVolumes')
      expect(resp.error).toBeUndefined()
      const volumes = resp.result as unknown[]
      expect(Array.isArray(volumes)).toBe(true)
      expect(volumes.length).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Group 3: Volume Operations
  // ---------------------------------------------------------------------------
  describe('Volume Operations', () => {
    after(async () => {
      // Clean up any remaining volumes
      const resp = await client.call('getVolumes')
      const volumes = (resp.result as Array<{ index: number }>) || []
      for (let i = volumes.length - 1; i >= 0; i--) {
        await client.call('removeVolume', { index: i })
      }
      await browser.pause(500)
    })

    it('should load MNI152 volume and return index and id', async () => {
      const resp = await client.call('loadVolume', { path: MNI152_PATH })
      expect(resp.error).toBeUndefined()
      const result = resp.result as { index: number; id: string }
      expect(result.index).toBe(0)
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)

      await browser.pause(2000)
      const vr = await browser.checkScreen('ws-load-volume')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should return loaded volume info via getVolumes', async () => {
      const resp = await client.call('getVolumes')
      expect(resp.error).toBeUndefined()
      const volumes = resp.result as Array<{
        index: number
        id: string
        name: string
        colormap: string
        opacity: number
        dims: number[]
      }>
      expect(volumes.length).toBe(1)
      expect(volumes[0].index).toBe(0)
      expect(volumes[0].name).toContain('mni152')
      expect(volumes[0].colormap).toBeDefined()
      expect(volumes[0].opacity).toBe(1)
      expect(Array.isArray(volumes[0].dims)).toBe(true)
    })

    it('should reflect 1 volume in getScene', async () => {
      const resp = await client.call('getScene')
      expect(resp.error).toBeUndefined()
      const scene = resp.result as { volumes: unknown[]; meshCount: number }
      expect(scene.volumes.length).toBe(1)
      expect(scene.meshCount).toBe(0)
    })

    it('should change colormap to hot', async () => {
      const resp = await client.call('setColormap', { volumeIndex: 0, colormap: 'hot' })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-colormap-hot')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)

      // Verify via getVolumes
      const volResp = await client.call('getVolumes')
      const volumes = volResp.result as Array<{ colormap: string }>
      expect(volumes[0].colormap).toBe('hot')
    })

    it('should change opacity to 0.5', async () => {
      const resp = await client.call('setOpacity', { volumeIndex: 0, opacity: 0.5 })
      expect(resp.error).toBeUndefined()

      await browser.pause(1000)

      const volResp = await client.call('getVolumes')
      const volumes = volResp.result as Array<{ opacity: number }>
      expect(volumes[0].opacity).toBe(0.5)
    })

    it('should error when setColormap targets out-of-range index', async () => {
      const resp = await client.call('setColormap', { volumeIndex: 99, colormap: 'gray' })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('out of range')
    })

    it('should remove volume via removeVolume', async () => {
      const resp = await client.call('removeVolume', { index: 0 })
      expect(resp.error).toBeUndefined()

      await browser.pause(500)

      const volResp = await client.call('getVolumes')
      const volumes = volResp.result as unknown[]
      expect(volumes.length).toBe(0)
    })

    it('should error when removeVolume targets invalid index', async () => {
      const resp = await client.call('removeVolume', { index: 0 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('out of range')
    })

    it('should error when loadVolume references nonexistent file', async () => {
      const resp = await client.call('loadVolume', { path: '/nonexistent/volume.nii.gz' })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32602)
      expect(resp.error!.message).toContain('File error')
    })
  })

  // ---------------------------------------------------------------------------
  // Group 4: Rendering Operations
  // ---------------------------------------------------------------------------
  describe('Rendering Operations', () => {
    before(async () => {
      const resp = await client.call('loadVolume', { path: MNI152_PATH })
      expect(resp.error).toBeUndefined()
      await browser.pause(2000)
    })

    after(async () => {
      // Reset to multiplanar and default crosshair width
      await client.call('setSliceType', { sliceType: SLICE_TYPE.MULTIPLANAR })
      await client.call('setCrosshairWidth', { width: 1 })
      // Remove volume
      const resp = await client.call('getVolumes')
      const volumes = (resp.result as Array<{ index: number }>) || []
      for (let i = volumes.length - 1; i >= 0; i--) {
        await client.call('removeVolume', { index: i })
      }
      await browser.pause(500)
    })

    it('should set slice type to sagittal', async () => {
      const resp = await client.call('setSliceType', { sliceType: SLICE_TYPE.SAGITTAL })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-slice-sagittal')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should set slice type to coronal', async () => {
      const resp = await client.call('setSliceType', { sliceType: SLICE_TYPE.CORONAL })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-slice-coronal')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should set slice type to axial', async () => {
      const resp = await client.call('setSliceType', { sliceType: SLICE_TYPE.AXIAL })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-slice-axial')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should set slice type to multiplanar', async () => {
      const resp = await client.call('setSliceType', { sliceType: SLICE_TYPE.MULTIPLANAR })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-slice-multiplanar')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should set slice type to 3D render', async () => {
      const resp = await client.call('setSliceType', { sliceType: SLICE_TYPE.RENDER })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-slice-3d-render')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should error when setSliceType param is missing', async () => {
      const resp = await client.call('setSliceType', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param')
    })

    it('should change render azimuth and elevation', async () => {
      // Ensure we're in 3D render mode
      await client.call('setSliceType', { sliceType: SLICE_TYPE.RENDER })
      await browser.pause(1000)

      const resp = await client.call('setRenderAzimuthElevation', {
        azimuth: 45,
        elevation: 30
      })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-render-azimuth-elevation')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should set clip plane', async () => {
      const resp = await client.call('setClipPlane', {
        depthAzimuthElevation: [0.1, 0, 120]
      })
      expect(resp.error).toBeUndefined()

      await browser.pause(1500)
      const vr = await browser.checkScreen('ws-clip-plane')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should hide crosshairs when width set to 0', async () => {
      // Switch to multiplanar to see crosshairs
      await client.call('setSliceType', { sliceType: SLICE_TYPE.MULTIPLANAR })
      await browser.pause(1000)

      const resp = await client.call('setCrosshairWidth', { width: 0 })
      expect(resp.error).toBeUndefined()

      await browser.pause(1000)
      const vr = await browser.checkScreen('ws-crosshair-hidden')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })
  })

  // ---------------------------------------------------------------------------
  // Group 5: Mesh Operations
  // ---------------------------------------------------------------------------
  describe('Mesh Operations', () => {
    after(async () => {
      // Clean up any remaining meshes via getScene
      const resp = await client.call('getScene')
      const scene = resp.result as { meshCount: number }
      for (let i = (scene?.meshCount ?? 0) - 1; i >= 0; i--) {
        await client.call('removeMesh', { index: i })
      }
      // Clean up any remaining volumes
      const volResp = await client.call('getVolumes')
      const volumes = (volResp.result as Array<{ index: number }>) || []
      for (let i = volumes.length - 1; i >= 0; i--) {
        await client.call('removeVolume', { index: i })
      }
      await browser.pause(500)
    })

    it('should load AAL mesh', async () => {
      const resp = await client.call('loadMesh', { path: AAL_MESH_PATH })
      expect(resp.error).toBeUndefined()
      const result = resp.result as { index: number }
      expect(result.index).toBe(0)

      await browser.pause(2000)
      const vr = await browser.checkScreen('ws-load-mesh')
      expect(vr).toBeLessThanOrEqual(VISUAL_TOLERANCE)
    })

    it('should show meshCount of 1 in getScene', async () => {
      const resp = await client.call('getScene')
      expect(resp.error).toBeUndefined()
      const scene = resp.result as { meshCount: number }
      expect(scene.meshCount).toBe(1)
    })

    it('should remove mesh via removeMesh', async () => {
      const resp = await client.call('removeMesh', { index: 0 })
      expect(resp.error).toBeUndefined()

      await browser.pause(500)

      const sceneResp = await client.call('getScene')
      const scene = sceneResp.result as { meshCount: number }
      expect(scene.meshCount).toBe(0)
    })

    it('should error when removeMesh targets invalid index', async () => {
      const resp = await client.call('removeMesh', { index: 0 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('out of range')
    })

    it('should error when loadMesh references nonexistent file', async () => {
      const resp = await client.call('loadMesh', { path: '/nonexistent/mesh.mz3' })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32602)
      expect(resp.error!.message).toContain('File error')
    })
  })

  // ---------------------------------------------------------------------------
  // Group 6: Screenshot & Save
  // ---------------------------------------------------------------------------
  describe('Screenshot & Save', () => {
    const tempFiles: string[] = []

    before(async () => {
      const resp = await client.call('loadVolume', { path: MNI152_PATH })
      expect(resp.error).toBeUndefined()
      await browser.pause(2000)
    })

    after(async () => {
      // Clean up temp files
      for (const f of tempFiles) {
        try {
          fs.unlinkSync(f)
        } catch {
          // Ignore
        }
      }
      // Remove volume
      const resp = await client.call('getVolumes')
      const volumes = (resp.result as Array<{ index: number }>) || []
      for (let i = volumes.length - 1; i >= 0; i--) {
        await client.call('removeVolume', { index: i })
      }
      await browser.pause(500)
    })

    it('should write screenshot PNG to disk when outputPath is provided', async () => {
      const outputPath = path.join(os.tmpdir(), `niivue-test-screenshot-${Date.now()}.png`)
      tempFiles.push(outputPath)

      const resp = await client.call('screenshot', { outputPath })
      expect(resp.error).toBeUndefined()

      // Main process writes the file; verify it exists and has PNG magic bytes
      expect(fs.existsSync(outputPath)).toBe(true)
      const data = fs.readFileSync(outputPath)
      expect(data.length).toBeGreaterThan(0)
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(data[0]).toBe(0x89)
      expect(data[1]).toBe(0x50)
      expect(data[2]).toBe(0x4e)
      expect(data[3]).toBe(0x47)
    })

    it('should return base64 screenshot when outputPath is omitted', async () => {
      const resp = await client.call('screenshot', {})
      expect(resp.error).toBeUndefined()
      const result = resp.result as { base64: string }
      expect(typeof result.base64).toBe('string')
      expect(result.base64.length).toBeGreaterThan(100)

      // Verify it decodes to valid PNG
      const buf = Buffer.from(result.base64, 'base64')
      expect(buf[0]).toBe(0x89)
      expect(buf[1]).toBe(0x50)
    })

    it('should save volume without error', async () => {
      const outputPath = path.join(os.tmpdir(), `niivue-test-save-${Date.now()}.nii`)
      tempFiles.push(outputPath)

      const resp = await client.call('saveVolume', { volumeIndex: 0, outputPath })
      // saveVolume calls nv.saveImage in the renderer which may trigger a download
      // rather than writing to outputPath directly. We verify no RPC-level error.
      expect(resp.error).toBeUndefined()
    })

    it('should error when saveVolume targets out-of-range index', async () => {
      const outputPath = path.join(os.tmpdir(), 'should-not-exist.nii')
      const resp = await client.call('saveVolume', { volumeIndex: 99, outputPath })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('out of range')
    })

    it('should error when saveVolume is missing outputPath', async () => {
      const resp = await client.call('saveVolume', { volumeIndex: 0 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param')
    })
  })

  // ---------------------------------------------------------------------------
  // Group 7: Parameter Validation
  // ---------------------------------------------------------------------------
  describe('Parameter Validation', () => {
    it('should error when setColormap is missing volumeIndex', async () => {
      const resp = await client.call('setColormap', { colormap: 'hot' })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: volumeIndex')
    })

    it('should error when setColormap is missing colormap', async () => {
      const resp = await client.call('setColormap', { volumeIndex: 0 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: colormap')
    })

    it('should error when setOpacity is missing volumeIndex', async () => {
      const resp = await client.call('setOpacity', { opacity: 0.5 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: volumeIndex')
    })

    it('should error when setOpacity is missing opacity', async () => {
      const resp = await client.call('setOpacity', { volumeIndex: 0 })
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: opacity')
    })

    it('should error when setClipPlane is missing depthAzimuthElevation', async () => {
      const resp = await client.call('setClipPlane', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: depthAzimuthElevation')
    })

    it('should error when setRenderAzimuthElevation is missing params', async () => {
      const resp = await client.call('setRenderAzimuthElevation', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: azimuth')
    })

    it('should error when setCrosshairWidth is missing width', async () => {
      const resp = await client.call('setCrosshairWidth', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: width')
    })

    it('should error when removeVolume is missing index', async () => {
      const resp = await client.call('removeVolume', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: index')
    })

    it('should error when removeMesh is missing index', async () => {
      const resp = await client.call('removeMesh', {})
      expect(resp.error).toBeDefined()
      expect(resp.error!.code).toBe(-32603)
      expect(resp.error!.message).toContain('Missing required param: index')
    })
  })
})
