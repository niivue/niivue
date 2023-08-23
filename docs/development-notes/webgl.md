## Introduction

This project requires WebGL2. This specification was [finalized in January 2017](https://en.wikipedia.org/wiki/WebGL). It is supported by [all popular modern browsers](https://caniuse.com/webgl2). NiiVue exploits WebGL2 features that [are not available in WebGL1](https://webgl2fundamentals.org/webgl/lessons/webgl2-whats-new.html). Specifically, the images are represented using non-Power of two 3D textures. The shaders used by WebGL2 are written using the [OpenGL ES 3.0](https://en.wikipedia.org/wiki/OpenGL_ES) version of the [OpenGL Shading Language (GLSL)](https://en.wikipedia.org/wiki/OpenGL_Shading_Language). WebGL2 added additional texture formats that provide native support for most [NIfTI format data types](https://brainder.org/2012/09/23/the-nifti-file-format/).

NiiVue uses WebGL not only to display images but also to accelerate many of the functions. For example, the [grow cut](http://pieper.github.io/sites/glimp/growcut.html) drawings and the image reslicing described below.

##### Strengths and Weaknesses

WebGL is a modern shader-based language. It lacks the fixed function pipeline, quad primitives and helper functions of legacy OpenGL. The benefit of this approach is that it forces the developer to use efficient methods that map closely to modern hardware design. However, it does have a steep learning curve. The minimal design of WebGL allows [ANGLE](https://en.wikipedia.org/wiki/ANGLE) to map it directly to the most efficient graphics library available (METAL, Vulkan, DirectX or Modern OpenGL). However, as it was designed as the least common denominator between these competing libraries, it does lack some useful features like geometry shaders. Therefore, one must adopt alternative approaches to implement features such as [wireframes and illuminated streamlines](https://github.com/niivue/niivue/issues/458). It also lacks [clip planes](https://github.com/niivue/niivue/issues/447) and the [depth buffer is read only](https://github.com/niivue/niivue/issues/345).

##### Textures

The term Textures refers to bitmap images that are stored on the graphics card. WebGL2 can support 1D, 2D, and 3D textures. The WebGL context can only have a limited number of textures active at one time (with the command `activeTexture` deterimining which textures are available). WebGL provides a minimum of [8 MAX_COMBINED_TEXTURE_IMAGE_UNITS](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/activeTexture). You can think of these active textures as slots that are available for the shaders to access. NiiVue consistently uses the same slots for specific textures. This means that each draw call does not need to explicitly set the active textures. Therefore, these slots should be considered reserved and not used for other functions.

- TEXTURE0: Background volume. This 3D scalar bitmap stores the voxel intensities of the background image.
- TEXTURE1: Active colormaps. This 2D RGBA bitmap converts the scalar volume voxel intensities to RGBA values (e.g. Grayscale, Viridis). Note that each voxelwise layer can have two unique colormaps (for positive and negative values) and meshes can also have colormaps.
- TEXTURE2: Overlay volumes. This 3D RGBA bitmap stores the blended values of all loaded overlays.
- TEXTURE3: Font. This is a 2D bitmap that stores the [multi-channel signed distance field typeface](https://github.com/Chlumsky/msdfgen).
- TEXTURE4: Thumbnail. This is a 2D bitmap that can be rapidly displayed. When a user clicks on the thumbnail the (large and slow) volumes and meshes will be loaded.
- TEXTURE5: Matcap. This is a 2D bitmap used for exclusively by the matcap mesh shader (transiently enabled with the shader, so available for other functions). It is also used as a temporary 2D texture: this is used to blend multiple overlays into a single texture (TEXTURE2). 
- TEXTURE6: Temporary 3D texture: this is used for compute shaders to reorient volumes (e.g. reformat an image from ASR to LIP orientation). It is also used as for volume rendering shaders that use a gradient map for lighting.
- TEXTURE7: Drawing texture: this stores any active drawing, having the same resolution as TEXTURE0.

##### Color Schemes

The user can choose different colormaps for displaying dark to bright voxels. In addition to grayscale, one can choose from the [viridis color palettes](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html) (Cividis, Inferno, Plasma and Viridis) which are designed to be both salient and compatible with the most common forms of colorblindness. Since WebGL2 does not support 1D textures, these are codes as 2D bitmap textures (sampler2D, with a width of 256 pixels and a height of one pixel). This explains the GLSL definition `sampler2D colormap`, with reading using `texture(colormap, vec2(f, 0.5))` (where f is a fraction from 0..1, and 0.5 indicates sampling in the vertical middle of the bitmap).

##### Overlays

Overlay images are resliced to match the resolution of the background image. Multiple overlays may be loaded, but they are all blended together to generate a single RGBA texture. This overcomes OpenGL limits on the number of active textures loaded, and improves the speed of rendering.

JavaScript is slower than natively compiled programs for many computations, [using WebGL can dramatically increase peformance providing near native performance](http://openglinsights.com/discovering.html#WebGLforOpenGLDevelopers). Therefore, while using the GPU instead of the CPU can accelerate performance regardless of language, the benefits are greater for JavaScript. Reslicing 3D volumes is compute intensive. Specifically, the GPU-based WebGL reslicing algorithm is also about an order of magnitude faster than the standard JavaScript code.

The reslicing algorithm uses the [R8UI, R16I, R16UI and R32F](https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexStorage3D.xhtml) base formats for the [NIfTI](https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h) `DT_UINT8`, `DT_INT16`, `DT_UINT16`, and `DT_FLOAT32` datatypes. One limitation of WebGL is that these texture formats are not [filterable](https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html), meaning that only [nearest](https://open.gl/textures) interpolation is available. Therefore, overlays may appear blocky if there is not a one-to-one correspondence between the background image and an overlay. On the other hand, this is often desired for thresholded statistical maps (where many voxels are artificially zeroed). Another quirk of WebGL is that three shader programs are requied to support unsigned integer, signed integer and floating point textures (using `usampler3D`, `isampler3D` and `sampler3D` respectively).

The algorithm of the reslicing shader is shown in the Figure below. Each texture is a unit normalized cube (with the voxels accessed in the range 0..1 in the X,Y,Z dimensions, regardless of the number of voxels in the column, row and slice dimension). A 4x4 matrix provides the [affine transformation](https://en.wikipedia.org/wiki/Transformation_matrix) mapping the overlay (red in figure below) to the background image (black in image below). Since WebGL works with 2D framebuffers, the shader is run for every 2D slice of the background image's 3D volume. Thefore, this compute shader requires only the standard WebGL2 functions, without requiring the nascent [compute extensions](https://www.khronos.org/registry/webgl/specs/latest/2.0-compute/).

![alt tag](overlay.png)

##### Future Directions

This section describes methods that could enhance NiiVue visualization. Each will require development resources and the complexity impacts the simplicity and maintainability of NiiVue. Further, each impacts performance which may impact the experience on low-powered devices. Therefore, if implemented they would likely be optional effects.

 - [Barycentric Effects](https://github.com/niivue/niivue/issues/458) could allow wire-frame visualization. As WebGL lacks geometry shaders, implementing these effects is possible but has performance implications.
 - [Streamline Effects](https://github.com/niivue/niivue/issues/458) can enhance the appearance of fibers. As WebGL does not include geometry shaders, [imposters could be used](https://www.researchgate.net/publication/319441378_A_Simple_and_Efficient_Cylinder_Imposter_Approach_to_Visualize_DTI_Fiber_Tracts). This method has performance implications.
 - Ambient Occlusion models how valleys (e.g. sulci) are more shaded from light than ridges (gyri). [VolView](https://volview.netlify.app/) provides [one JavaScript approach](https://github.com/Kitware/vtk-js/blob/dd45c408217e5d632de0ff98f45765abf92daba8/Sources/Rendering/OpenGL/glsl/vtkVolumeFS.glsl#L768), [Hernell](https://ieeexplore.ieee.org/abstract/document/4840341) provides another approach. One method may be to use a blurred opacity map to simulate shading. All these approaches have performance implications.
 - The desktop-based [mrtrix](https://community.mrtrix.org/t/streamlines-tractography-output-problem/903/8) and [dsi-studio](https://sites.google.com/a/labsolver.org/dsi-studio/Manual/odf-visualization) can display Orientation Distribution Functions that allow users to evaluate the quality of diffusion data. Developing similar functionality for the web would be useful. These methods have performance implications.
 
 
##### Links

- [WebGL Insights](https://webglinsights.github.io/index.html) is free and a terrific resource.
- [WebGL2 Fundamentals](https://webgl2fundamentals.org/) provides outstanding tutorials.
