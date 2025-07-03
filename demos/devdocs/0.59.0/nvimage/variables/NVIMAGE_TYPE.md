# Variable: NVIMAGE_TYPE

```ts
const NVIMAGE_TYPE: Readonly<{
  BMP: BMP;
  DCM: DCM;
  DCM_FOLDER: DCM_FOLDER;
  DCM_MANIFEST: DCM_MANIFEST;
  FIB: FIB;
  HEAD: HEAD;
  MGH: MGH;
  MGZ: MGZ;
  MHA: MHA;
  MHD: MHD;
  MIF: MIF;
  MIH: MIH;
  NHDR: NHDR;
  NII: NII;
  NPY: NPY;
  NPZ: NPZ;
  NRRD: NRRD;
  parse: (
    ext: string,
  ) =>
    | UNKNOWN
    | NII
    | DCM
    | DCM_MANIFEST
    | MIH
    | MIF
    | NHDR
    | NRRD
    | MHD
    | MHA
    | MGH
    | MGZ
    | V
    | V16
    | VMR
    | HEAD
    | SRC
    | FIB
    | BMP
    | ZARR
    | NPY
    | NPZ;
  SRC: SRC;
  UNKNOWN: UNKNOWN;
  V: V;
  V16: V16;
  VMR: VMR;
  ZARR: ZARR;
}>;
```

Defined in: [nvimage/utils.ts:77](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/utils.ts#L77)
