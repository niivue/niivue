import { NVUtilities } from '../../src/niivue/index.js' // note the js extension
import { expect, test } from "vitest"
import { mat4 } from "gl-matrix"

test('nvutilities sph2cartDeg', () => {
  const xyz = NVUtilities.sph2cartDeg(42, 42)
  expect(xyz).toEqual([0.4972609476841367, -0.5522642316338268, -0.6691306063588582])
})

test('nvutilities vox2mm', () => {
    const vox = [103, 128, 129]
    const xfm = mat4.fromValues(0.7375, 0, 0, -75.76, 0, 0.7375, 0, -110.8, 0, 0, 0.7375, -71.76, 0, 0, 0, 1)
    const mm = NVUtilities.vox2mm(vox, xfm)
    const expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
    for (let i = 0; i < mm.length; i++) {
        expect(mm[i]).toBeCloseTo(expected[i])
    }
})