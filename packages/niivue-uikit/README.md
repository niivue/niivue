# @niivue/niivue-uikit

A medical imaging demo that showcases [NiiVue](../niivue) rendering together with
[@niivue/uikit](../uikit) UI components.

## Prerequisites

This demo does **not** import source files directly. Its [index.html](./index.html)
imports the **built** output of two sibling workspace packages:

- `@niivue/niivue` → `../niivue/dist/index.js`
- `@niivue/uikit` → `../uikit/dist/index.es.js`

On a fresh clone these `dist/` folders do not exist yet, so the Vite dev server
fails with an error such as:

```
Failed to resolve import "../niivue/dist/index.js"
Failed to resolve import "../uikit/dist/index.es.js"
```

You must build both packages before running the demo.

## Running the demo

From the **repository root**:

```bash
npm install
npm run dev:uikit
```

The `dev:uikit` script has a `predev:uikit` hook that automatically builds
`@niivue/niivue` and `@niivue/uikit` first, so the command above works on a clean
checkout.

If you prefer to run the steps manually (or are working from inside this package):

```bash
npm run build:niivue          # builds @niivue/niivue -> dist/index.js
npm run build:uikit           # builds @niivue/uikit  -> dist/index.es.js
npm run dev -w @niivue/niivue-uikit
```

> Note: because the demo consumes the built bundles, changes to the `@niivue/niivue`
> or `@niivue/uikit` source require rebuilding those packages to be reflected here.

## High-DPI / display-density handling

Each UIKit panel is its own WebGL canvas. To keep MSDF text and SDF shapes crisp,
the demo snaps every canvas backing store to `cssSize × devicePixelRatio` (see
`setupCanvas`) so the GPU draws at native display resolution instead of being
bilinearly upscaled. Components size their label text from these device-pixel
bounds via `UIKFont.fitTextScale`, which enforces a minimum on-screen size so
text stays sharp even on standard-resolution monitors.

Dragging the window between monitors of different pixel density is handled: a
RAF-debounced `resize` listener re-snaps the canvases and updates each
component's bounds **only when `devicePixelRatio` actually changes**, minimizing
the (relatively expensive) backing-buffer reallocation. The render loop redraws
the components every frame, so text re-scales on the next frame.
