# Class: Zip

Defined in: [nvutilities.ts:71](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L71)

## Constructors

### Constructor

```ts
new Zip(arrayBuffer: ArrayBuffer): Zip;
```

Defined in: [nvutilities.ts:78](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L78)

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

Defined in: [nvutilities.ts:245](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L245)

##### Returns

`Entry`[]

## Methods

### extract()

```ts
extract(entry: Entry): Promise<Uint8Array>;
```

Defined in: [nvutilities.ts:83](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L83)

#### Parameters

| Parameter | Type    |
| --------- | ------- |
| `entry`   | `Entry` |

#### Returns

`Promise`\<`Uint8Array`\>
