# Angular and TypeScript

## Toolchain

To use Niivue in Angular a few development modules are needed.

Expose webpack config for Angular: `npm install -D -E @angular-builders/custom-webpack`
Check the [npm package](https://www.npmjs.com/package/@angular-builders/custom-webpack) and this [site](https://developer.okta.com/blog/2019/12/09/angular-webpack) for documentation on getting started. Ensure you have updated angular.json according to the documentation.

Add a handler image file types in Niivue.

`npm install file-loader --save-dev`

Configure the module rules in the webpack.config.js file.

```js
const webpack = require("webpack");

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      STABLE_FEATURE: JSON.stringify(true),
      EXPERIMENTAL_FEATURE: JSON.stringify(false),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
    ],
  },
};
```

## Generate type info

Use npx and typescript to generate the type info. You can download the source or use the src from the node_modules directory.

```console
foo@bar:~niivue$ npx -p typescript tsc src/*.js --lib ES7 --declaration --allowJs --emitDeclarationOnly --outDir types
```

## Create a module to import type info

At the top of the niivue.d.ts file that is generated, export the namespace so that it can be referenced by your code.

```ts
/**
 * @typedef {Object} NiivueOptions
 * @property {number} [options.textHeight=0.3] the text height for orientation labels (0 to 1). Zero for no text labels
 * @property {number} [options.colorBarMargin=0.05] padding around colorbar when displayed
 * @property {number} [options.crosshairWidth=1] crosshair size. Zero for no crosshair
 * @property {array}  [options.backColor=[0,0,0,1]] the background color. RGBA values from 0 to 1. Default is black
 * @property {array}  [options.crosshairColor=[1,0,0,1]] the crosshair color. RGBA values from 0 to 1. Default is red
 * @property {array}  [options.selectionBoxColor=[1,1,1,0.5]] the selection box color when the intensty selection box is shown (right click and drag). RGBA values from 0 to 1. Default is transparent white
 * @property {array}  [options.clipPlaneColor=[1,1,1,0.5]] the color of the visible clip plane. RGBA values from 0 to 1. Default is white
 * @property {boolean} [options.trustCalMinMax=true] true/false whether to trust the nifti header values for cal_min and cal_max. Trusting them results in faster loading because we skip computing these values from the data
 * @property {string} [options.clipPlaneHotKey="KeyC"] the keyboard key used to cycle through clip plane orientations. The default is "c"
 * @property {string} [options.viewModeHotKey="KeyV"] the keyboard key used to cycle through view modes. The default is "v"
 * @property {number} [options.keyDebounceTime=50] the keyUp debounce time in milliseconds. The default is 50 ms. You must wait this long before a new hot-key keystroke will be registered by the event listener
 * @property {boolean} [options.isRadiologicalConvention=false] whether or not to use radiological convention in the display
 * @property {string} [options.logging=false] turn on logging or not (true/false)
 * @property {string} [options.loadingText="waiting on images..."] the loading text to display when there is a blank canvas and no images
 * @property {boolean} [options.dragAndDropEnabled=true] whether or not to allow file and url drag and drop on the canvas
 */
/**
 * @class Niivue
 * @type Niivue
 * @description
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 * @constructor
 * @param {NiivueOptions} [options={}] options object to set modifiable Niivue properties
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
export function Niivue(options?: NiivueOptions): void;
```

Here is the [documentation](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html) if you are interested in how this works.
