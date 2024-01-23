import { NVUtilities } from '../../src/niivue/index.js' // note the js extension
import { expect, test } from "vitest"

test('nvutilities sph2cartDe', () => {
  const xyz = NVUtilities.sph2cartDeg(42, 42)
  expect(xyz).toEqual([0.4972609476841367, -0.5522642316338268, -0.6691306063588582])
})