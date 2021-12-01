# NiiVue

NiiVue is a WebGL 2.0 medical image viewer. This repository contains the **core NiiVue package**. We have additional projects under development that will demonstrate a [web-based user interface implementation](https://github.com/niivue/niivue-ui), and a [desktop application](https://github.com/niivue/niivue-desktop) built using web technologies.

The NiiVue package is intented to be used by individuals developing interactive web pages related to showing [nifti](https://nifti.nimh.nih.gov) images. NiiVue includes many mouse and keyboard interactions that enable browsing and manipulating images displayed in the canvas. This core package does not include a comprehensive user interface outside of the canvas (e.g. buttons, and other widgets). However, developers who wish to build custom user interfaces around the NiiVue canvas can manipulate the rendered images and change settings via the API. Our [web-based user interface implementation](https://github.com/niivue/niivue-ui) (under development) will demonstrate how to integrate NiiVue into a more comprehensive [VueJS](https://vuejs.org/) UI.  

# Getting started Docs and References

[click here to go to the docs web page](https://niivue.github.io/niivue/devdocs/)

# Active Projects

[See our active projects here](https://github.com/orgs/niivue/projects)

# Overview/Mission

The primary aim of NiiVue is to translate the features of the widely used native desktop applications ([MRIcroGL](https://github.com/rordenlab/MRIcroGL), [Surfice](https://github.com/neurolabusc/surf-ice)) to their web-based equivalents. This will enable other researchers and developers to build cloud-based medical imaging tools with a powerful viewer that can operate on any device (desktop, tablet, mobile).  

# Projects and People using NiiVue

- [Center for the Study of Aphasia Recovery](https://cstar.sc.edu/) (University of South Carolina)
- [Wellcome Centre for Integrative Neuroimaging](https://www.win.ox.ac.uk/) (University of Oxford)

# Live View 

We host many NiiVue examples via github pages. These are updated and deployed automatically. All live views reflect the capabilities of the NiiVue version in the main branch.

[See the examples here](https://niivue.github.io/niivue/)

**Note**: macOS and iOS users that try to load the examples in Safari may need to enable WebGL 2.0 in their Safari settings. 

# Requirements for NiiVue to work  

- WebGL 2.0 enabled web browser (Chrome, FireFox or Safari Technology Preview).
- macOS and iOS users/developers may need to enable WebGL 2.0 in their Safari settings.

# Usage

## existing html page
```html
<script src="https://unpkg.com/@niivue/niivue@0.12.1/dist/niivue.umd.js"></script>

<canvas id="gl" height=480 width=640></canvas>

<script>
  var volumeList = [
    // first object in array is brackground image
      {
        url: "./some_image.nii.gz",
        volume: {hdr: null, img: null},
        name: "some_image",
        colorMap: "gray",
        opacity: 1,
        visible: true,
      }
   ]

 // Niivue will adjust the canvas to 100% of its parent container's size 
 // the parent element can be any size you want (small or large)
 var nv = new niivue.Niivue()
 nv.attachTo('gl') // the canvas element id
 nv.loadVolumes(volumeList)
 nv.setSliceType(nv.sliceTypeMultiPlanar) // press the "v" key to cycle through views
</script>
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
          volume: {hdr: null, img: null},
          colorMap: "gray",
          opacity: 1,
          visible: true,
        }
      ]

    }
  },

  mounted() {

    nv.attachTo('gl')
    nv.loadVolumes(this.volumeList) // press the "v" key to cycle through views

  }
}

</script>

<template>
<canvas id="gl" height="480" width="640">

</canvas>
</template>

<style>
#app {
}
</style>
```

## React example

install: `npm i @niivue/niivue`

```js
import { useRef, useState } from 'react'
import { Niivue } from '@niivue/niivue'

const NiiVue = ({ imageUrl }) => {
  const canvas = useRef()
  useEffect(() => {
    const volumeList = [
      {
        url: imageUrl,
        volume: { hdr: null, img: null },
        colorMap: 'gray',
        opacity: 1,
        visible: true,
      },
    ]
    const nv = new Niivue()
    nv.attachToCanvas(canvas)
    nv.loadVolumes(volumeList) // press the "v" key to cycle through volumes
  }, [imageUrl])

  return (
    <canvas ref={canvas} height={480} width={640} />
  )
}
```

# Contributors

- [Taylor Hanayik](https://github.com/hanayik)
- [Chris Rorden](https://github.com/neurolabusc)
- [Christopher Drake](https://github.com/cdrake)
- [Nell Hardcastle](https://github.com/nellh)

*To add yourself please create a PR

# Acknowledgements 

- [shader.js source](https://github.com/Twinklebear/webgl-util)

# Funding

- 2021-2022
  - P50 DC014664/DC/NIDCD NIH HHS/United States

# Alternatives

There are several open source JavaScript NIfTI viewers. What makes NiiVue unique is its use of WebGL 2.0, MRIcroGL inspired shaders, and its minimal design. This makes it easy to integrate with existing web pages quicky in order to build powerful web-based viewers and support cloud-based analysis pipelines. Unlike many alternatives, NiiVue does **not** use [three.js](https://threejs.org). This means the WebGL calls are tuned for voxel display, and the screen is only refreshed when needed (preserving battery life and helping your computer do other tasks). On the other hand, niivue does not have access to the three.js user interface widgets, requiring developers to create their own custom widgets. However, there are popular UI frameworks such as [Vuetifyjs](https://vuetifyjs.com/en/) that greatly reduce this burden. Since there are numerous free alternatives, you can choose the optimal tool for your task.
[Francesco Giorlando](https://f.giorlando.org/2018/07/web-viewers-for-fmri/) describes some of the differences between different tools.


| Tool                                                                     | Live Demos                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [AMI](https://github.com/FNNDSC/ami)                                     | [live demo](https://fnndsc.github.io/ami/)                         |
| [BioImage Suite Web Project](https://github.com/bioimagesuiteweb/bisweb) | [live demo](https://bioimagesuiteweb.github.io/webapp/viewer.html) | 
|  [BrainBrowser](https://brainbrowser.cbrain.mcgill.ca/)                  | [live demo](https://brainbrowser.cbrain.mcgill.ca/volume-viewer)   | 
|  [nifti-drop](https://github.com/vsoch/nifti-drop)                       | [live demo](http://vsoch.github.io/nifti-drop)                     | 
|  [Med3web](https://lifescience.opensource.epam.com/mri/)                 | [live demo](https://med3web.opensource.epam.com/)                  | 
|  [MRIcroWeb](https://github.com/rordenlab/MRIcroWeb)                     | [live demo](https://rordenlab.github.io)                           |  
|  [Papaya](https://github.com/rii-mango/Papaya)                           | [live demo](https://papaya.greenant.net/)                          | 
|  [VTK.js](https://github.com/Kitware/vtk-js)                             | [live demo](https://kitware.github.io/paraview-glance/app/)        | 

# Development

All NiiVue development is public on GitHub. The `main` branch represents the most current state of NiiVue.

NiiVue is currently in a state of rapid development until we get to version `1.0.0`. Therefore, it may be a good idea to check back frequently if you are developing software that relies on NiiVue. NiiVue releases starting with `0` should be considered beta software.

**Note**: All PRs from a fork or feature branch to `main` will require the automated github actions test suite to pass.

## Install NiiVue into your project via NPM

Each version of NiiVue is published to NPM

https://www.npmjs.com/package/@niivue/niivue

Do the following to install NiiVue as a dependency in your project

```
npm install --save-dev @niivue/niivue
```

## Local Development

- Make sure you have nodejs and npm installed
- `git clone git@github.com:niivue/niivue.git`
- `cd niivue`
- `npm install`

Source code can be found in `src/`.

You can edit the sources and then launch demos to see the effect of your changes. See the "Launch inlcluded demos" section.

## Run hot module reload development mode

This will run the vite HMR dev server. Open a browser to the URL output in your terminal. changes made to the source code will be immediately reflected in the browser. 

```
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

**If using macOS with Apple Silicon add this to your .zshrc (if zsh). Also ensure Chrome is installed at that location:**

```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

```
npm install
npm run test
```

### on Windows

```
npm run test-win
```

### Running a specific test

```
npm run test -- -t 'test string'
# on windows use npm run test-win
```

## Creating fonts
```
{ echo "data:image/png;base64,"; openssl enc -base64 -in fnt.png; } > fnt.txt

# then copy the contents of fnt.txt to the font string in src/fnt.js
```

# Contributing

All contributions to NiiVue are encouraged and welcomed. Feel free to update documentation, add features, fix bugs, or just ask questions on the [issue board](https://github.com/niivue/niivue/issues). 

## Using Issues

**All** contributions should start as a new issue on the [NiiVue issue board](https://github.com/niivue/niivue/issues). 

By starting a new issue for everything we ping everyone watching the project at the same time, and therefore alerting them to the feature, bug, or question. It also gives everyone a change to comment on new posts. 

## Things to consider

When adding features please keep in mind that we want NiiVue to work on all devices that support WebGL 2.0 (laptops, desktops, tablets, and phones). Therefore, please do your best to test features on as many devices as you have access to. 

When testing locally from other devices you can navigate to your development computer's local IP address (assuming your phone and computer are on the same local network) at the port specified in the URL you see when running `npm run demo`.

## Adding tests

NiiVue relies on [Jest](https://jestjs.io/)

If you add a feature, or fix a bug please try to add a test for it. You can find tests in the `tests` folder within the niivue project. There are numerous existing tests, so you can probably use one of those as a template. Generally, a test is contained with an `it('test name')` block in the `tests/test.niivue.js` file.

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


