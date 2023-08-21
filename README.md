# NiiVue

NiiVue is web-based visualization tool for neuroimaging that can run on any operating system and any web device (phone, tablet, computer). This repository contains only the **core NiiVue package** that can be embedded into other projects. We have additional [repositories](https://github.com/niivue) that wrap NiiVue for use in jupyter notebooks, vscode, and electron applications. 

[Click here to see NiiVue live demos](https://niivue.github.io/niivue/)

What makes NiiVue unique is its ability to simultaneously display all the datatypes popular with neuroimaging: voxels, meshes, tractography streamlines, statistical maps and connectomes. Alternative voxel-based web tools include [ami](https://fnndsc.github.io/ami/), [BioImage Suite Web](https://bioimagesuiteweb.github.io/webapp/viewer.html), [BrainBrowser](https://brainbrowser.cbrain.mcgill.ca/volume-viewer), [nifti-drop](http://vsoch.github.io/nifti-drop), [OHIF DICOM Viewer](https://viewer.ohif.org/), [Papaya](https://www.fmrib.ox.ac.uk/ukbiobank/group_means/index.html), [VTK.js](https://kitware.github.io/paraview-glance/app/), and [slicedrop](https://slicedrop.com/).

## Local Development

To run a hot-loading development that is updated whenever you save changes to any source files, you can run:

```
git clone git@github.com:niivue/niivue.git
cd niivue
npm install
npm run dev
```

The command `npm run demo` will minify the project and locally host all of the [live demos](https://niivue.github.io/niivue/). The [DEVELOP.md file provides more details for developers](./DEVELOP.md).

# Developer Documentation

[Click here for the docs web page](https://niivue.github.io/niivue/devdocs/)

# Projects and People using NiiVue

- Analysis of Functional NeuroImages (AFNI) [Scientific and Statistical Computing Core](https://afni.nimh.nih.gov/) (National Institutes of Health)
- [Center for the Study of Aphasia Recovery](https://cstar.sc.edu/) (University of South Carolina)
- FMRIB's Software Library (FSL) [Wellcome Centre for Integrative Neuroimaging](https://www.win.ox.ac.uk/) (University of Oxford)
- FreeSurfer [Laboratories for Computational Neuroimaging](https://lcn.martinos.org/) (Massachusetts General Hospital)
- [OpenNeuro.org](https://openneuro.org) uses NiiVue to visualize datasets
- [BrainLife.io](https://brainlife.io/about/) integrates NiiVue into [ezbids](https://brainlife.io/ezbids/)
- [nilearn](https://nilearn.github.io/stable/index.html) is extending [ipyniivue](https://github.com/niivue/ipyniivue)
- [neurodesk](https://www.neurodesk.org/) uses NiiVue for their [QSMxT Quantitative Susceptibility Mapping toolbox](https://github.com/QSMxT/QSMxT-UI)
- [niivue-vscode](https://github.com/niivue/niivue-vscode) is a VSCode extension for displaying images
- [Neuroinformatics Research and Development Group](http://neuroinformatics.uw.edu/) embeds NiiVue in [tractoscope](https://github.com/nrdg/tractoscope)
- [CACTAS](https://github.com/mpsych/CACTAS) from [Daniel Haehn's team](https://danielhaehn.com/) is extending NiiVue drawing and segmentation capabilities
- [Digital Brain Bank](https://elifesciences.org/articles/73153) for navigating MRI datasets

# Funding

- 2021-2022 [P50 DC014664](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10094384) NIH NIDCD [NOT-OD-21-091](https://grants.nih.gov/grants/guide/notice-files/NOT-OD-21-091.html#:~:text=NOT%2DOD%2D21%2D091,Software%20Tools%20for%20Open%20Science)
- 2023-2026 [RF1 MH133701](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10724895) NIH NIMH

# Supported Formats

NiiVue supports many popular brain imaging formats:

- Voxel-based formats: [NIfTI](https://brainder.org/2012/09/23/the-nifti-file-format/), [NRRD](http://teem.sourceforge.net/nrrd/format.html), [MRtrix MIF](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats), [AFNI HEAD/BRIK](https://afni.nimh.nih.gov/pub/dist/doc/program_help/README.attributes.html), [MGH/MGZ](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/MghFormat), [ITK MHD](https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29), [ECAT7](https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info).
- Mesh-based formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [ASC](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BYU/GEO/G](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BrainSuite DFS](http://brainsuite.org/formats/dfs/), [ICO/TRI](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [PLY](<https://en.wikipedia.org/wiki/PLY_(file_format)>), [BrainNet NV](https://www.nitrc.org/projects/bnv/), [BrainVoyager SRF](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/344-users-guide-2-3-the-format-of-srf-files), [FreeSurfer](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [OFF](<https://en.wikipedia.org/wiki/OFF_(file_format)>), [Wavefront OBJ](https://brainder.org/tag/obj/), [STL](https://medium.com/3d-printing-stories/why-stl-format-is-bad-fea9ecf5e45), [Legacy VTK](https://vtk.org/wp-content/uploads/2015/04/file-formats.pdf), [X3D](https://3dprint.nih.gov/).
- Mesh overlay formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [CIfTI-2](https://balsa.wustl.edu/about/fileTypes), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [SMP](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/40-the-format-of-smp-files), STC, FreeSurfer (CURV/ANNOT)
- Tractography formats: [TCK](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck), [TRK](http://trackvis.org/docs/?subsect=fileformat), [TRX](https://github.com/frheault/tractography_file_format), VTK, AFNI .niml.tract
- DICOM: [DICOM](https://dicom.nema.org/medical/dicom/current/output/chtml/part10/chapter_7.html) and [DICOM Manifests](docs/development-notes/dicom-manifests.md)
