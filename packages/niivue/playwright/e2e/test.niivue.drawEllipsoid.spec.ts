import {test, expect} from '@playwright/test'
import {Niivue} from '../../dist/index.js'
import {httpServerAddress} from './helpers.js'
import {TEST_OPTIONS} from './test.types.js'


test.beforeEach(async ({page}) => {
  await page.goto(httpServerAddress)
})

test('niivue drawEllipsoid - sphere draws correctly in multiple layers', async ({page}) => {


  const setupNiiVueDrawEnabled = async (page) => {
    return await page.evaluate(
      async ({testOptions}) => {
        const nv = new Niivue({
          ...testOptions,
          show3Dcrosshair: true,
          backColor: [0.5, 0.5, 0.6, 1],
          penType: (globalThis as any).niivue.PEN_TYPE.PEN_BALL_3D,
          penSize: 5,
          penValue: 1,


        })
        await nv.attachTo('gl')

        const volumeList = [
          {
            url: './images/mni152.nii.gz',
            volume: {hdr: null, img: null},
            name: 'mni152.nii.gz',
            colormap: 'gray',
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(volumeList)
        nv.setDrawingEnabled(true)
        nv.setSliceType(0) //SLICE_TYPE.AXIAL

        window.nv = nv
        return true
      },
      {testOptions: TEST_OPTIONS}
    )
  }

  await setupNiiVueDrawEnabled(page)
  await page.waitForTimeout(500)

  // Get canvas bounds
  const canvas = page.locator('#gl')
  const box = await canvas.boundingBox()
  if (!box) {
    throw new Error('Canvas not found')
  }

  // Start drag in center of canvas (full 3D render mode)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  // Perform right-drag to rotate clip plane
  await page.mouse.move(x,y)
  await page.mouse.down({button: 'left'})
  await page.mouse.up({button: 'left'})
  await page.waitForTimeout(500)

  // Get the position in voxels where we clicked
  const result = await page.evaluate(async () => {
    const nv = window.nv
    const clickedPointFrac = nv.scene.crosshairPos
    const clickedPointVox = nv.frac2vox(clickedPointFrac, 0)

    const dims = nv.volumes[0].dims
    const radius = Math.floor(nv.opts.penSize / 2)
    const penValue = nv.opts.penValue

    // Helper function to calculate voxel index
    const voxelIndex = (x: number, y: number, z: number): number => {
      return x + y * dims[1] + z * dims[1] * dims[2]
    }

    // Get the center point in voxels (rounded)
    const centerX = Math.round(clickedPointVox[0])
    const centerY = Math.round(clickedPointVox[1])
    const centerZ = Math.round(clickedPointVox[2])

    // Test 1: Count total voxels drawn
    let totalDrawnVoxels = 0
    const minBound = [
      Math.max(0, centerX - radius - 1),
      Math.max(0, centerY - radius - 1),
      Math.max(0, centerZ - radius - 1)
    ]
    const maxBound = [
      Math.min(dims[1] - 1, centerX + radius + 1),
      Math.min(dims[2] - 1, centerY + radius + 1),
      Math.min(dims[3] - 1, centerZ + radius + 1)
    ]

    for (let z = minBound[2]; z <= maxBound[2]; z++) {
      for (let y = minBound[1]; y <= maxBound[1]; y++) {
        for (let x = minBound[0]; x <= maxBound[0]; x++) {
          const idx = voxelIndex(x, y, z)
          if (nv.drawBitmap[idx] === penValue) {
            totalDrawnVoxels++
          }
        }
      }
    }

    // Test 2: Check center voxel is drawn
    const centerIdx = voxelIndex(centerX, centerY, centerZ)
    const centerIsDrawn = nv.drawBitmap[centerIdx] === penValue

    // Test 3: Check voxels around the center (within radius) are drawn
    const testPointsInside = []
    const directions = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
      [1, 1, 0], [1, 1, 1]
    ]

    for (const dir of directions) {
      const testX = centerX + Math.round(dir[0] * (radius - 1))
      const testY = centerY + Math.round(dir[1] * (radius - 1))
      const testZ = centerZ + Math.round(dir[2] * (radius - 1))

      if (testX >= 0 && testX < dims[1] &&
          testY >= 0 && testY < dims[2] &&
          testZ >= 0 && testZ < dims[3]) {
        const idx = voxelIndex(testX, testY, testZ)
        const isDrawn = nv.drawBitmap[idx] === penValue
        const dx = (testX - centerX) / radius
        const dy = (testY - centerY) / radius
        const dz = (testZ - centerZ) / radius
        const distSq = dx * dx + dy * dy + dz * dz

        testPointsInside.push({
          pos: [testX, testY, testZ],
          isDrawn,
          distSq,
          shouldBeDrawn: distSq <= 1
        })
      }
    }

    // Test 4: Check voxels far from the center (outside radius) are NOT drawn
    const testPointsOutside = []
    for (const dir of directions) {
      const testX = centerX + Math.round(dir[0] * (radius + 2))
      const testY = centerY + Math.round(dir[1] * (radius + 2))
      const testZ = centerZ + Math.round(dir[2] * (radius + 2))

      if (testX >= 0 && testX < dims[1] &&
          testY >= 0 && testY < dims[2] &&
          testZ >= 0 && testZ < dims[3]) {
        const idx = voxelIndex(testX, testY, testZ)
        const isDrawn = nv.drawBitmap[idx] === penValue
        const dx = (testX - centerX) / radius
        const dy = (testY - centerY) / radius
        const dz = (testZ - centerZ) / radius
        const distSq = dx * dx + dy * dy + dz * dz

        testPointsOutside.push({
          pos: [testX, testY, testZ],
          isDrawn,
          distSq,
          shouldBeDrawn: distSq <= 1
        })
      }
    }

    return {
      centerVox: [centerX, centerY, centerZ],
      centerIsDrawn,
      totalDrawnVoxels,
      radius,
      dims: [dims[1], dims[2], dims[3]],
      testPointsInside,
      testPointsOutside
    }
  })

  // The center should be drawn
  expect(result.centerIsDrawn).toBe(true)

  // Should have drawn a reasonable number of voxels (rough sphere volume: 4/3 * pi * r^3)
  const expectedMinVoxels = Math.floor((4/3) * Math.PI * Math.pow(result.radius - 1, 3))
  const expectedMaxVoxels = Math.ceil((4/3) * Math.PI * Math.pow(result.radius + 1, 3))
  expect(result.totalDrawnVoxels).toBeGreaterThanOrEqual(expectedMinVoxels)
  expect(result.totalDrawnVoxels).toBeLessThanOrEqual(expectedMaxVoxels)

  // Points inside the sphere should be drawn
  for (const pt of result.testPointsInside) {
    if (pt.shouldBeDrawn) {
      expect(pt.isDrawn).toBe(true)
    }
  }

  // Points outside the sphere should NOT be drawn
  for (const pt of result.testPointsOutside) {
    if (!pt.shouldBeDrawn) {
      expect(pt.isDrawn).toBe(false)
    }
  }

})
