# Type Alias: NiivueEventListener()\<K\>

```ts
type NiivueEventListener<K> = (event: NiivueEvent<K>) => void | Promise<void>;
```

Defined in: [events.ts:134](https://github.com/niivue/niivue/blob/main/packages/niivue/src/events.ts#L134)

Type-safe event listener for Niivue events.
Listeners can be synchronous or asynchronous.

## Type Parameters

| Type Parameter                                                          |
| ----------------------------------------------------------------------- |
| `K` _extends_ keyof [`NiivueEventMap`](../interfaces/NiivueEventMap.md) |

## Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `event`   | [`NiivueEvent`](../classes/NiivueEvent.md)\<`K`\> |

## Returns

`void` \| `Promise`\<`void`\>
