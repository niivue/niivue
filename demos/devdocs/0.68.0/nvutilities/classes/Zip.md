# Class: Zip

Defined in: [nvutilities.ts:63](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L63)

## Constructors

### Constructor

```ts
new Zip(arrayBuffer: ArrayBuffer): Zip;
```

Defined in: [nvutilities.ts:70](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L70)

#### Parameters

| Parameter     | Type          |
| ------------- | ------------- |
| `arrayBuffer` | `ArrayBuffer` |

#### Returns

`Zip`

## Accessors

### entries

#### Get Signature

```ts
get entries(): Entry[];
```

Defined in: [nvutilities.ts:235](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L235)

##### Returns

`Entry`[]

## Methods

### extract()

```ts
extract(entry: Entry): Promise<Uint8Array>;
```

Defined in: [nvutilities.ts:75](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L75)

#### Parameters

| Parameter | Type    |
| --------- | ------- |
| `entry`   | `Entry` |

#### Returns

`Promise`\<`Uint8Array`\>
