import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tiff2nii } from "../dist/loader.js";
import * as nifti from "nifti-reader-js";

describe("TIFF Conversion Tests", () => {
  it("should convert TIFF to a NIfTI and test properties", async () => {
    const tifFilePath = join(__dirname, "testData", "shapes_deflate.tif");
    const fileBuffer = await fs.readFile(tifFilePath);
    const niidata = await tiff2nii(fileBuffer);
    const hdr = nifti.readHeader(niidata.buffer);
    expect(hdr.dims[1]).toEqual(128);
    expect(hdr.dims[2]).toEqual(72);
    expect(hdr.dims[3]).toEqual(1);
    expect(hdr.datatypeCode).toEqual(128);
    const niftiImageData = nifti.readImage(hdr, niidata);
  });
});
