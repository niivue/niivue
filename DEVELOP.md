# Development

All NiiVue development is public on GitHub. The `main` branch represents the most current state of NiiVue.

NiiVue is currently in a state of rapid development until we get to version `1.0.0`. Therefore, it may be a good idea to check back frequently if you are developing software that relies on NiiVue. NiiVue releases starting with `0` should be considered beta software.

**Note**: All PRs from a fork or feature branch to `main` will require the automated github actions test suite to pass.

# Contributing

Contributions to NiiVue are encouraged and welcomed. Feel free to update documentation, add features, fix bugs, or just ask questions on the [issue board](https://github.com/niivue/niivue/issues).

## Using Issues

**All** contributions should start as a new issue on the [NiiVue issue board](https://github.com/niivue/niivue/issues).

By starting a new issue for everything we ping everyone watching the project at the same time, and therefore alerting them to the feature, bug, or question. It also gives everyone a change to comment on new posts.

## Things to consider

When adding features please keep in mind that we want NiiVue to work on all devices that support WebGL 2.0 (laptops, desktops, tablets, and phones). Therefore, please do your best to test features on as many devices as you have access to.

When testing locally from other devices you can navigate to your development computer's local IP address (assuming your phone and computer are on the same local network) at the port specified in the URL you see when running `npm run demo`.

# API examples

## Load a volume

```js
import { Niivue } from "@niivue/niivue";
// make an array of volumes to load
let volumeList = [
  { url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz" },
];
const nv = new Niivue();
nv.attachTo("gl"); // attach to canvas with id="gl"
nv.loadVolumes(volumeList);
```

## Load a mesh

```js
import { Niivue } from "@niivue/niivue";
// make an array of meshes to load
let meshList = [
  { url: "https://niivue.github.io/niivue/images/BrainMesh_ICBM152.lh.mz3"},
];
const nv = new Niivue();
nv.attachTo("gl"); // attach to canvas with id="gl"
nv.loadMeshes(meshList);
```

## Load a volume and set the colormap

```js
import { Niivue } from "@niivue/niivue";
// make an array of volumes to load
let volumeList = [
  {
    url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz",
    colormap: "red", // see: https://niivue.github.io/niivue/colormaps.html
  },
];
const nv = new Niivue();
nv.attachTo("gl"); // attach to canvas with id="gl"
nv.loadVolumes(volumeList);
```

## Load multiple volumes

  ```js
  import { Niivue } from "@niivue/niivue";
  // make an array of volumes to load
  let volumeList = [
    {
      url: "https://niivue.github.io/niivue/images/mni152.nii.gz",
      colormap: "grey"
    },
    {
      url: "https://niivue.github.io/niivue/images/hippo.nii.gz",
      colormap: "red"
    },
  ]
  const nv = new Niivue();
  nv.attachTo("gl"); // attach to canvas with id="gl"
  nv.loadVolumes(volumeList);
  ```

## Load a volume and a mesh

  ```js
  import { Niivue } from "@niivue/niivue";
  // make an array of volumes to load
  let volumeList = [
    {
      url: "https://niivue.github.io/niivue/images/mni152.nii.gz",
      colormap: "grey"
    },
  ]
  // make an array of meshes to load
  let meshList = [
    { url: "https://niivue.github.io/niivue/images/BrainMesh_ICBM152.lh.mz3"},
  ]
  const nv = new Niivue();
  nv.attachTo("gl"); // attach to canvas with id="gl"
  nv.setSliceMM(true) // world space coordinates to be used by all images when loading volumes and meshes together
  nv.loadVolumes(volumeList); // async
  nv.loadMeshes(meshList); // async
  ```
## Set properties before loading images

  ```js
    import { Niivue } from "@niivue/niivue";
    // make an array of volumes to load
    let volumeList = [
      {
        url: "https://niivue.github.io/niivue/images/mni152.nii.gz",
        colormap: "grey"
      },
    ]
    const nv = new Niivue({
      isColorbar: true, // show colorbar
      isOrientationCube: true, // show orientation cube in bottom corner
      crosshairColor: [0, 1, 0, 0.5], // set crosshair color to green and 50% opacity
      show3Dcrosshair: true, // show crosshair in 3D view
      backColor: [1, 1, 1, 1], // set background color to white
      crosshairWidth: 4, // make crosshair thicker
      // for more options see: https://niivue.github.io/niivue/devdocs/global.html#NiivueOptions
    });
    nv.attachTo("gl"); // attach to canvas with id="gl"
    nv.loadVolumes(volumeList); // async
  ```

### Supported Nodejs versions for building/developing with NiiVue

NiiVue is built and tested using [Nodejs](https://nodejs.dev/en/) `20`. We recommend using the latest LTS version of Nodejs when building and developing with NiiVue.

### Install NiiVue using npm

Installs without the bloat of the development dependencies or testing frameworks

```
npm install --only=prod @niivue/niivue
```

# Framework Usage

NiiVue can be used with your favorite web framework - Vue, Angular, React or even pure HTML.

## Pure HTML

While NiiVue can be wrapped with frameworks (VueJS, React, Angular), you can also embed it directly into HTML web pages. Here is a minimal example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>NiiVue</title>
  </head>
  <body>
    <canvas id="gl" width="640" height="640"></canvas>
  </body>
  <script type="module" async>
    // uses the version of niivue from the main branch of the niivue repository.
    // This is the latest development version and may not be stable, and may not reflect
    // the functionality of the latest release on NPM.
    import * as niivue from "https://niivue.github.io/niivue/dist/index.js"
    var volumeList = [
      { url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz" },
    ];
    var nv = new niivue.Niivue({ isResizeCanvas: false });
    nv.attachTo("gl");
    nv.loadVolumes(volumeList);
  </script>
</html>
```

Note that the code above will load the latest current stable release of NiiVue. Alternatively, you can specify a specific NiiVue version. For example, to ensure compatibility with release 0.43.1, you could specify:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>NiiVue</title>
  </head>
  <body>
    <canvas id="gl" width="640" height="640"></canvas>
  </body>
  <script type="module" async>
    // select a specific version of NiiVue.
    import {Niivue} from "https://unpkg.com/@niivue/niivue@0.43.1/dist/index.js"
    import {esm} from "https://unpkg.com/@niivue/niivue@0.43.1/dist/index.min.js"
    var volumeList = [
      { url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz" },
    ];
    var nv = new Niivue({ isResizeCanvas: false });
    nv.attachTo("gl");
    nv.loadVolumes(volumeList);
  </script>
</html>
```

## VueJS example

install: `npm i @niivue/niivue`

```js
<script>
import {Niivue} from '@niivue/niivue'
const nv = new Niivue()


export default {
  name: 'App',
  props: {

  },
  data(){
    return {
      volumeList: [
        {
          url: "./mni152.nii.gz",
        }
      ]

    }
  },

  mounted() {

    nv.attachTo('gl')
    nv.loadVolumes(this.volumeList)
  }
}

</script>

<template>
<canvas id="gl" height="480" width="640">

</canvas>
</template>
```

## React example

install: `npm i @niivue/niivue`

```js
import { useRef, useEffect } from "react";
import { Niivue } from "@niivue/niivue";

const NiiVue = ({ imageUrl }) => {
  const canvas = useRef();
  useEffect(() => {
    const volumeList = [
      {
        url: imageUrl,
      },
    ];
    const nv = new Niivue();
    nv.attachToCanvas(canvas.current);
    nv.loadVolumes(volumeList);
  }, [imageUrl]);

  return <canvas ref={canvas} height={480} width={640} />;
};

// use as: <NiiVue imageUrl={someUrl}> </NiiVue>
```

## Angular example

Check our [Angular TypeScript development notes](docs/development-notes/angular-typescript.md) for instructions on building an Angular App with Niivue.

install: `npm i @niivue/niivue`

```ts
import { Component, OnInit, ViewChild } from "@angular/core";

import { Niivue } from "@niivue/niivue";

@Component({
  selector: "app-niivue-view",
  templateUrl: "./niivue-view.component.html",
  styleUrls: ["./niivue-view.component.sass"],
})
export class NiivueViewComponent implements OnInit {
  @ViewChild("gl") canvas: HTMLCanvasElement | undefined;

  constructor() {}

  ngOnInit(): void {
    const url = "/assets/mni152.nii.gz";
    const volumeList = [
      {
        url,
      },
    ];
    const niivue = new Niivue();
    niivue.attachTo("gl");
    niivue.loadVolumes(volumeList);
  }
}
```

# Core Dependencies

- [shader.js source](https://github.com/Twinklebear/webgl-util)
- [Daikon](https://github.com/rii-mango/Daikon)
- [NIFTI-Reader-JS source](https://github.com/rii-mango/NIFTI-Reader-JS)
- [glMatrix](https://glmatrix.net/)
- [fflate](https://github.com/101arrowz/fflate)

## Install NiiVue into your project via NPM

Each version of NiiVue is published to NPM

https://www.npmjs.com/package/@niivue/niivue

Do the following to install NiiVue as a dependency in your project

```
npm install --save-dev @niivue/niivue
```

## Local Development

Make sure you have nodejs and npm installed.

```
git clone git@github.com:niivue/niivue.git
cd niivue
npm install
npm run dev
```

## Launch included demos

Launching the demos will format, build, and serve niivue demo pages. Open the demo URL in your browser to view the demo web pages. You can find the demo URL in your terminal after running `npm run demo`. The demos are intentionally simple, and each canvas showcases different NiiVue features.

**When viewing the demos during development, be sure to shift + click the refresh button in your browser in order to avoid using cached versions of files.**

### On macOS and Linux

```
npm run demo
```

### On Windows

```
npm run demo-win
```

## Build NiiVue

Building NiiVue will format, build, and copy the bundled `niivue.js` to the `tests` and `demos` folders.

### on macOS and Linux

```
npm run build
```

### on Windows

```
npm run build-win
```

## Versioning

NiiVue uses [semantic versioning](https://semver.org/).

To update the version run:

```
npm version patch # options are: major | minor | patch
```

## Run unit tests

Running the tests will format, build, and copy the bundled `niivue.js` to the `tests` and `demos` folders, then automatically begin the test suite.

### on macOS and Linux

```
npm install
npm run test-playwright
npm run test:unit
```

### on Windows

```
npm run test-win
```

### Running a specific test

```
npm run test-playwright -- -g "test name"
```

see more playwright options [here](https://playwright.dev/docs/test-cli)

## Creating fonts

NiiVue fonts are based on signed distance fields. [See the developer notes for more details](https://github.com/niivue/niivue/blob/main/docs/development-notes/font.md).

```
{ echo "data:image/png;base64,"; openssl enc -base64 -in fnt.png; } > fnt.txt

# then copy the contents of fnt.txt to the font string in src/fnt.js
```

## Creating colormaps

Colormaps convert image intensities to a color gradient. The [developer notes describe the format and provide live demos for evaluating new colormaps](https://github.com/niivue/niivue/blob/main/docs/development-notes/colormaps.md).

## Adding tests

NiiVue relies on Playwright and vitest

If you add a feature, or fix a bug please try to add a test for it. You can find unit tests in the `tests/unit` folder within the niivue project. Rendering based tests use Playwright, and those tests can be found in the `playwright/e2e` folder. There are numerous existing tests, so you can probably use one of those as a template.

Some tests generate screenshots of the WebGL canvas in order to compare renderings to previous snapshots. Please have a look at the current tests in order to see how you can add this to your new tests if needed.

## Automated CI/CD

We rely heavily on GitHub's actions to automate testing and checks.

These automated tests only test in a Linux desktop environment. So do please try to visually check that things work on other devices like tablets and phones when needed.

Each PR to the main branch must pass the automated checks, and must be reviewed and signed off by at least one other person.

If all checks and tests pass then PRs will be merged into main.

You can edit a feature branch as many times as needed to fix broken tests in order to get them passing and merged into main.

## Protected branches

The `main` branch is protected. This means that no one can commit to main directly. All edits must be merged in from forks or feature branches.

## Making colormap loader

```
cd src/cmaps

for f in ls *.json; do echo "export { default as `basename $f .json` } from './$f';" >> index.js; done;
```

## macOS kill test server if kept alive because of failing tests

```
sudo lsof -iTCP -sTCP:LISTEN -n -P | grep 8888 # 8888 is the test server used by jest

# the process id is the second column in the result

kill <pid> # kill the node process running the server if needed (when tests fail locally)
```
