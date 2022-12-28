# NiiVue

NiiVue is a WebGL 2.0 medical image viewer. This repository contains the **core NiiVue package**. We have additional projects under development that will demonstrate a [web-based user interface implementation](https://github.com/niivue/niivue-ui), and a [desktop application](https://github.com/niivue/niivue-desktop) built using web technologies.

NiiVue allows developers to create interactive web pages for visualizing  [nifti](https://nifti.nimh.nih.gov) and other formats popular in neuroimaging. NiiVue includes many mouse and keyboard interactions that enable browsing and manipulating images displayed in the canvas. This core package does not include a comprehensive user interface outside of the canvas (e.g. buttons, and other widgets). However, developers who wish to build custom user interfaces around the NiiVue canvas can manipulate the rendered images and change settings via the API. Our [UI wrapper](https://github.com/niivue/niivue-ui) demonstrates how the modular core NiiVue can be embedded into a rich user interface.  

# Getting started Docs and References

[click here to go to the docs web page](https://niivue.github.io/niivue/devdocs/)

### Install NiiVue using npm

Installs without the bloat of the development dependencies or testing frameworks

```
npm install --only=prod @niivue/niivue
```

# Overview/Mission

NiiVue brings the features of the widely used native desktop applications ([AFNI](https://afni.nimh.nih.gov/about_afni), [FSLeyes](https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FSLeyes), [MRIcroGL](https://github.com/rordenlab/MRIcroGL), [Surfice](https://github.com/neurolabusc/surf-ice),  [SUMA](https://afni.nimh.nih.gov/Suma)) to the web. The developers of these tools developed NiiVue in collaboration, allowing us to benefit from collective wisdom. This will enable other researchers and developers to build cloud-based medical imaging tools with a powerful viewer that can operate on any device (desktop, tablet, mobile).  

# Projects and People using NiiVue

- Analysis of Functional NeuroImages (AFNI) [Scientific and Statistical Computing Core](https://afni.nimh.nih.gov/) (National Institutes of Health)
- [Center for the Study of Aphasia Recovery](https://cstar.sc.edu/) (University of South Carolina)
- FMRIB's Software Library (FSL) [Wellcome Centre for Integrative Neuroimaging](https://www.win.ox.ac.uk/) (University of Oxford)
- [OpenNeuro.org](https://openneuro.org)
- [BrainLife.io](https://brainlife.io/about/)

# Live View

We host many NiiVue examples via github pages. These are updated and deployed automatically. All live views reflect the capabilities of the NiiVue version in the main branch.

[See the examples here](https://niivue.github.io/niivue/)

# Requirements for NiiVue to work  

- [WebGL 2.0 capable](https://caniuse.com/webgl2) web browser (Chrome, FireFox, Safari).

# Usage

## Pure HTML

While NiiVue can be wrapped with frameworks (VueJS, React, Angular), you can also embed it directly into HTML web pages. Here is a minimal example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>NiiVue</title>
  </head>
  <body>
    <canvas id="gl"></canvas>
  </body>
<script src="https://unpkg.com/@niivue/niivue@0.29.0/dist/niivue.umd.js"></script>
<script>
 var volumeList = [{url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz"}]
 var nv = new niivue.Niivue()
 nv.attachTo('gl') 
 nv.loadVolumes(volumeList)
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
import { useRef, useEffect } from 'react'
import { Niivue } from '@niivue/niivue'

const NiiVue = ({ imageUrl }) => {
  const canvas = useRef()
  useEffect(() => {
    const volumeList = [
      {
        url: imageUrl,
      },
    ]
    const nv = new Niivue()
    nv.attachToCanvas(canvas.current)
    nv.loadVolumes(volumeList)
  }, [imageUrl])

  return (
    <canvas ref={canvas} height={480} width={640} />
  )
}

// use as: <NiiVue imageUrl={someUrl}> </NiiVue>
```
## Angular example
Check our [Angular TypeScript development notes](docs/development-notes/angular-typescript.md) for instructions on building an Angular App with Niivue.

install: `npm i @niivue/niivue`

```ts
import { Component, OnInit,  ViewChild} from '@angular/core';

import {Niivue} from '@niivue/niivue';

@Component({
  selector: 'app-niivue-view',
  templateUrl: './niivue-view.component.html',
  styleUrls: ['./niivue-view.component.sass']
})
export class NiivueViewComponent implements OnInit {
  @ViewChild('gl') canvas:HTMLCanvasElement|undefined;

  constructor() { }

  ngOnInit(): void {
    const url = '/assets/mni152.nii.gz';
    const volumeList = [
    {
      url,
    },
  ]
    const niivue = new Niivue();
    niivue.attachTo('gl');
    niivue.loadVolumes(volumeList);
  }
  
}
```

# Core Libraries

- [shader.js source](https://github.com/Twinklebear/webgl-util)
- [Daikon](https://github.com/rii-mango/Daikon)
- [NIFTI-Reader-JS source](https://github.com/rii-mango/NIFTI-Reader-JS)
- [glMatrix](https://glmatrix.net/)
- [fflate](https://github.com/101arrowz/fflate)

# Funding

- 2021-2022
  - P50 DC014664/DC/NIDCD NIH HHS/United States

# Supported Formats

NiiVue can open several formats popular with brain imaging:

 - Voxel-based formats: [NIfTI](https://brainder.org/2012/09/23/the-nifti-file-format/), [NRRD](http://teem.sourceforge.net/nrrd/format.html), [MRtrix MIF](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats), [AFNI HEAD/BRIK](https://afni.nimh.nih.gov/pub/dist/doc/program_help/README.attributes.html), [MGH/MGZ](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/MghFormat), [ITK MHD](https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29), [ECAT7](https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info).
 - Mesh-based formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [ASC](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BrainSuite DFS](http://brainsuite.org/formats/dfs/), [PLY](https://en.wikipedia.org/wiki/PLY_(file_format)), [BrainNet NV](https://www.nitrc.org/projects/bnv/), [BrainVoyager SRF](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/344-users-guide-2-3-the-format-of-srf-files), [FreeSurfer](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [OFF](https://en.wikipedia.org/wiki/OFF_(file_format)), [Wavefront OBJ](https://brainder.org/tag/obj/), [STL](https://medium.com/3d-printing-stories/why-stl-format-is-bad-fea9ecf5e45), [Legacy VTK](https://vtk.org/wp-content/uploads/2015/04/file-formats.pdf), [X3D](https://3dprint.nih.gov/).
 - Mesh overlay formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [CIfTI-2](https://balsa.wustl.edu/about/fileTypes), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [SMP](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/40-the-format-of-smp-files), STC, FreeSurfer (CURV/ANNOT)
 - Tractography formats: [TCK](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck), [TRK](http://trackvis.org/docs/?subsect=fileformat), [TRX](https://github.com/frheault/tractography_file_format), VTK, AFNI .niml.tract
 - DICOM: [DICOM](https://dicom.nema.org/medical/dicom/current/output/chtml/part10/chapter_7.html) and [DICOM Manifests](docs/development-notes/dicom-manifests.md)

# Alternatives

There are several open source JavaScript NIfTI viewers. What makes NiiVue unique is how it leverages the shaders functions and 3D textures introduced with WebGL 2.0. The minimal design makes it easy to integrate with existing web pages quickly in order to build powerful web-based viewers and support cloud-based analysis pipelines. Unlike many alternatives, NiiVue does **not** use [three.js](https://threejs.org). This means the screen is only refreshed when needed (preserving battery life and helping your computer do other tasks). On the other hand, NiiVue does not have access to the three.js user interface widgets, requiring developers to create their own custom widgets (e.g. using VueJS, React, Angular or pure HTML). Since there are numerous free alternatives, you can choose the optimal tool for your task.
[Francesco Giorlando](https://f.giorlando.org/2018/07/web-viewers-for-fmri/) describes some of the differences between different tools.

| Tool                                                                     | Live Demos                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [AMI](https://github.com/FNNDSC/ami)                                     | [live demo](https://fnndsc.github.io/ami/)                               |
| [BioImage Suite Web Project](https://github.com/bioimagesuiteweb/bisweb) | [live demo](https://bioimagesuiteweb.github.io/webapp/viewer.html)       |
| [BrainBrowser](https://brainbrowser.cbrain.mcgill.ca/)                   | [live demo](https://brainbrowser.cbrain.mcgill.ca/volume-viewer)         |
| [nifti-drop](https://github.com/vsoch/nifti-drop)                        | [live demo](http://vsoch.github.io/nifti-drop)                           |
| [Papaya](https://github.com/rii-mango/Papaya)                            | [live demo](https://www.fmrib.ox.ac.uk/ukbiobank/group_means/index.html) |
| [VTK.js](https://github.com/Kitware/vtk-js)                              | [live demo](https://kitware.github.io/paraview-glance/app/)              |
| [slicedrop](https://github.com/slicedrop/slicedrop.github.com)           | [live demo](https://slicedrop.com/)                                      |

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

Contributions to NiiVue are encouraged and welcomed. Feel free to update documentation, add features, fix bugs, or just ask questions on the [issue board](https://github.com/niivue/niivue/issues). 

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


