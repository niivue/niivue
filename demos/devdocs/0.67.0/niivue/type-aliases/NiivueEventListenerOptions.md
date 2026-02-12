# Type Alias: NiivueEventListenerOptions

```ts
type NiivueEventListenerOptions = boolean | AddEventListenerOptions;
```

Defined in: [events.ts:144](https://github.com/niivue/niivue/blob/main/packages/niivue/src/events.ts#L144)

Options for addEventListener/removeEventListener.
Supports all standard EventTarget options including:

- capture: boolean - Use capture phase
- once: boolean - Remove listener after first invocation
- passive: boolean - Listener will never call preventDefault()
- signal: AbortSignal - Remove listener when signal is aborted
