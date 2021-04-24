# NiiVue

** WARNING: THIS IS A WORK IN PROGRESS. HIGHLY VOLATILE CODE **

This is the core NiiVue library. Just import NiiVue and use it with your webgl2 canvas. No UI is included (but examples are coming soon). 

- [Overview](#overview)
- [Development Environment](#development-environment)
- [Usage](#usage)

## Overview

NiiVue is a minimalist webgl [nifti](https://nifti.nimh.nih.gov) image viewer.

The goal is to have a simple viewer component that can be embedded in an existing web page. Optionally, the component can be controlled by other widgets on the web page. For example, controls that allow the user to set the contrast, color scheme and other properties. 

## Live View 

[Load a NiiVue web page](https://hanayik.github.io/niivue/)

## Requirements

- WebGL2 enabled browser (Chrome, FireFox or Safari Technology Preview).
- Several node modules should be automatically installed, including the [NIFTI-Reader-JS](https://github.com/rii-mango/NIFTI-Reader-JS).
 
## Contributors

- [Taylor Hanayik](https://github.com/hanayik)
- [Chris Rorden](https://github.com/neurolabusc)
- [Christopher Drake](https://github.com/cdrake)

## Acknowledgements 

- [shader.js source](https://github.com/Twinklebear/webgl-util)

## Alternatives

There are several open source JavaScript NIfTI viewers. What makes niivue unique is that it is a self contained Vue.js component. This makes it easy to integrate with Vue web pages. Unlike many alternatives, niivue does not use [three.js](https://threejs.org). This means the WebGL calls are tuned for voxel display, and the screen is only refreshed when needed (preserving battery life and helping your computer do other tasks). On the other hand, niivue does not have access to the three.js user interface widgets, requiring the developer to use vue.js components. Since there are numerous free alternatives, you can choose the optimal tool for your task.
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

## Development Environment

### Development Installation

```
# You must install nodejs on your system FIRST!

# Use https protocol also if you want
git clone git@github.com:niivue/niivue.git

cd niivue

npm install
```

### Serves for development (be sure to shift click reload to avoid cache)
```
# npm install -g http-server
# must run: `npm run build` before serving for development
http-server test/
```

### Compiles and minifies for production
```
npm run build
```

More documentation to come soon!

