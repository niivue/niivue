# Type Alias: MZ3

```ts
type MZ3 =
  | {
      colors: Float32Array | null;
      indices: Uint32Array | null;
      positions: Float32Array | null;
      scalars: Float32Array;
    }
  | {
      colormapLabel: LUT;
      scalars: Float32Array;
    }
  | {
      scalars: Float32Array;
    };
```

Defined in: [nvmesh-types.ts:70](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-types.ts#L70)
