# Class: NiivueEvent\<K\>

Defined in: [events.ts:124](https://github.com/niivue/niivue/blob/main/packages/niivue/src/events.ts#L124)

Type-safe event class for Niivue events.
Extends CustomEvent with typed detail property.

## Extends

- `CustomEvent`\<[`NiivueEventMap`](../interfaces/NiivueEventMap.md)\[`K`\]\>

## Type Parameters

| Type Parameter                                                          |
| ----------------------------------------------------------------------- |
| `K` _extends_ keyof [`NiivueEventMap`](../interfaces/NiivueEventMap.md) |

## Constructors

### Constructor

```ts
new NiivueEvent<K>(type: K, detail: NiivueEventMap[K]): NiivueEvent<K>;
```

Defined in: [events.ts:125](https://github.com/niivue/niivue/blob/main/packages/niivue/src/events.ts#L125)

#### Parameters

| Parameter | Type                                                       |
| --------- | ---------------------------------------------------------- |
| `type`    | `K`                                                        |
| `detail`  | [`NiivueEventMap`](../interfaces/NiivueEventMap.md)\[`K`\] |

#### Returns

`NiivueEvent`\<`K`\>

#### Overrides

```ts
CustomEvent<NiivueEventMap[K]>.constructor
```

## Properties

| Property                                         | Modifier   | Type                                                       | Description                                                                                                                                                                                                                                                                                                                             | Inherited from                 | Defined in                                             |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| <a id="at_target"></a> `AT_TARGET`               | `readonly` | `2`                                                        | -                                                                                                                                                                                                                                                                                                                                       | `CustomEvent.AT_TARGET`        | ../../../node_modules/typescript/lib/lib.dom.d.ts:8192 |
| <a id="bubbles"></a> `bubbles`                   | `readonly` | `boolean`                                                  | Returns true or false depending on how event was initialized. True if event goes through its target's ancestors in reverse tree order, and false otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/bubbles)                                                                                                   | `CustomEvent.bubbles`          | ../../../node_modules/typescript/lib/lib.dom.d.ts:8087 |
| <a id="bubbling_phase"></a> `BUBBLING_PHASE`     | `readonly` | `3`                                                        | -                                                                                                                                                                                                                                                                                                                                       | `CustomEvent.BUBBLING_PHASE`   | ../../../node_modules/typescript/lib/lib.dom.d.ts:8193 |
| <a id="cancelable"></a> `cancelable`             | `readonly` | `boolean`                                                  | Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelable) | `CustomEvent.cancelable`       | ../../../node_modules/typescript/lib/lib.dom.d.ts:8099 |
| <a id="cancelbubble"></a> ~~`cancelBubble`~~     | `public`   | `boolean`                                                  | **Deprecated** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelBubble)                                                                                                                                                                                                                                           | `CustomEvent.cancelBubble`     | ../../../node_modules/typescript/lib/lib.dom.d.ts:8093 |
| <a id="capturing_phase"></a> `CAPTURING_PHASE`   | `readonly` | `1`                                                        | -                                                                                                                                                                                                                                                                                                                                       | `CustomEvent.CAPTURING_PHASE`  | ../../../node_modules/typescript/lib/lib.dom.d.ts:8191 |
| <a id="composed"></a> `composed`                 | `readonly` | `boolean`                                                  | Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composed)                                                                                    | `CustomEvent.composed`         | ../../../node_modules/typescript/lib/lib.dom.d.ts:8105 |
| <a id="currenttarget"></a> `currentTarget`       | `readonly` | `EventTarget`                                              | Returns the object whose event listener's callback is currently being invoked. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/currentTarget)                                                                                                                                                                          | `CustomEvent.currentTarget`    | ../../../node_modules/typescript/lib/lib.dom.d.ts:8111 |
| <a id="defaultprevented"></a> `defaultPrevented` | `readonly` | `boolean`                                                  | Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/defaultPrevented)                                                                                                                                              | `CustomEvent.defaultPrevented` | ../../../node_modules/typescript/lib/lib.dom.d.ts:8117 |
| <a id="detail"></a> `detail`                     | `readonly` | [`NiivueEventMap`](../interfaces/NiivueEventMap.md)\[`K`\] | Returns any custom data event was created with. Typically used for synthetic events. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)                                                                                                                                                                     | `CustomEvent.detail`           | ../../../node_modules/typescript/lib/lib.dom.d.ts:6045 |
| <a id="eventphase"></a> `eventPhase`             | `readonly` | `number`                                                   | Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/eventPhase)                                                                                                                                                           | `CustomEvent.eventPhase`       | ../../../node_modules/typescript/lib/lib.dom.d.ts:8123 |
| <a id="istrusted"></a> `isTrusted`               | `readonly` | `boolean`                                                  | Returns true if event was dispatched by the user agent, and false otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/isTrusted)                                                                                                                                                                                | `CustomEvent.isTrusted`        | ../../../node_modules/typescript/lib/lib.dom.d.ts:8129 |
| <a id="none"></a> `NONE`                         | `readonly` | `0`                                                        | -                                                                                                                                                                                                                                                                                                                                       | `CustomEvent.NONE`             | ../../../node_modules/typescript/lib/lib.dom.d.ts:8190 |
| <a id="returnvalue"></a> ~~`returnValue`~~       | `public`   | `boolean`                                                  | **Deprecated** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/returnValue)                                                                                                                                                                                                                                            | `CustomEvent.returnValue`      | ../../../node_modules/typescript/lib/lib.dom.d.ts:8135 |
| <a id="srcelement"></a> ~~`srcElement`~~         | `readonly` | `EventTarget`                                              | **Deprecated** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/srcElement)                                                                                                                                                                                                                                             | `CustomEvent.srcElement`       | ../../../node_modules/typescript/lib/lib.dom.d.ts:8141 |
| <a id="target"></a> `target`                     | `readonly` | `EventTarget`                                              | Returns the object to which event is dispatched (its target). [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/target)                                                                                                                                                                                                  | `CustomEvent.target`           | ../../../node_modules/typescript/lib/lib.dom.d.ts:8147 |
| <a id="timestamp"></a> `timeStamp`               | `readonly` | `number`                                                   | Returns the event's timestamp as the number of milliseconds measured relative to the time origin. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/timeStamp)                                                                                                                                                           | `CustomEvent.timeStamp`        | ../../../node_modules/typescript/lib/lib.dom.d.ts:8153 |
| <a id="type"></a> `type`                         | `readonly` | `string`                                                   | Returns the type of event, e.g. "click", "hashchange", or "submit". [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/type)                                                                                                                                                                                              | `CustomEvent.type`             | ../../../node_modules/typescript/lib/lib.dom.d.ts:8159 |

## Methods

### composedPath()

```ts
composedPath(): EventTarget[];
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:8165

Returns the invocation target objects of event's path (objects on which listeners will be invoked), except for any nodes in shadow trees of which the shadow root's mode is "closed" that are not reachable from event's currentTarget.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composedPath)

#### Returns

`EventTarget`[]

#### Inherited from

```ts
CustomEvent.composedPath;
```

---

### ~~initCustomEvent()~~

```ts
initCustomEvent(
   type: string,
   bubbles?: boolean,
   cancelable?: boolean,
   detail?: NiivueEventMap[K]): void;
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:6051

#### Parameters

| Parameter     | Type                                                       |
| ------------- | ---------------------------------------------------------- |
| `type`        | `string`                                                   |
| `bubbles?`    | `boolean`                                                  |
| `cancelable?` | `boolean`                                                  |
| `detail?`     | [`NiivueEventMap`](../interfaces/NiivueEventMap.md)\[`K`\] |

#### Returns

`void`

#### Deprecated

[MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/initCustomEvent)

#### Inherited from

```ts
CustomEvent.initCustomEvent;
```

---

### ~~initEvent()~~

```ts
initEvent(
   type: string,
   bubbles?: boolean,
   cancelable?: boolean): void;
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:8171

#### Parameters

| Parameter     | Type      |
| ------------- | --------- |
| `type`        | `string`  |
| `bubbles?`    | `boolean` |
| `cancelable?` | `boolean` |

#### Returns

`void`

#### Deprecated

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/initEvent)

#### Inherited from

```ts
CustomEvent.initEvent;
```

---

### preventDefault()

```ts
preventDefault(): void;
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:8177

If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/preventDefault)

#### Returns

`void`

#### Inherited from

```ts
CustomEvent.preventDefault;
```

---

### stopImmediatePropagation()

```ts
stopImmediatePropagation(): void;
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:8183

Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopImmediatePropagation)

#### Returns

`void`

#### Inherited from

```ts
CustomEvent.stopImmediatePropagation;
```

---

### stopPropagation()

```ts
stopPropagation(): void;
```

Defined in: ../../../node_modules/typescript/lib/lib.dom.d.ts:8189

When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopPropagation)

#### Returns

`void`

#### Inherited from

```ts
CustomEvent.stopPropagation;
```
