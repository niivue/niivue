[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.15570926.svg)](https://doi.org/10.5281/zenodo.15570926) [![App Store](https://img.shields.io/badge/App%20Store-NiiVue-blue)](https://apps.apple.com/gb/app/niivue/id6497066801)

# NiiVue

[NiiVue](https://niivue.com/) is web-based visualization tool for neuroimaging that can run on any device (phone, tablet, computer). 

## Local Development

See the [Documentation](https://niivue.com/docs/) for usage. The easiest way to develop with NiiVue is to run a hot-loading page that is updated whenever you save changes to any source files:

```
git clone git@github.com:niivue/niivue.git
cd niivue
npm install
npm run dev
```


# Projects using NiiVue

- [Analysis of Functional NeuroImages (AFNI)](https://afni.nimh.nih.gov/) uses NiiVue for [afni_proc.py](https://pubmed.ncbi.nlm.nih.gov/39257641/)
- [BOOSTLET.js](https://boostlet.org/) image processing plugins work with NiiVue.
- [brain2print](https://brain2print.org/) uses NiiVue for showing both volume data and converted meshes
- [brainchop](https://github.com/neuroneural/brainchop) uses NiiVue for [drag-and-drop segmentation, brain extraction and parcellation tool](https://neuroneural.github.io/brainchop/)
- [BrainLife.io](https://brainlife.io/about/) integrates NiiVue into [ezbids](https://brainlife.io/ezbids/)
- [CACTAS](https://github.com/mpsych/CACTAS) is extending NiiVue drawing and segmentation capabilities
- [ChRIS Research Integration System (ChRIS)](https://chrisproject.org/) uses [NiiVue](https://app.chrisproject.org/niivue)
- [ct2print](https://ct2print.org/) uses NiiVue for showing volume and mesh data
- [deepsyence](https://iishiishii.github.io/deepsyence/) by [Thuy Dao](https://github.com/iishiishii/deepsyence)
- FMRIB's Software Library (FSL) uses NiiVue for cloud tools and [documentation](https://fsl.fmrib.ox.ac.uk/fsl/docs/#/structural/bet/)
- [FSL Clinical](https://fslclinical.com/) is using NiiVue in brain imaging reports
- [fideus](https://fideus.io/) has developed the [ITK-Wasm](https://docs.itk.org/projects/wasm/en/latest/) plugins.
- FreeSurfer [Laboratories for Computational Neuroimaging](https://lcn.martinos.org/) uses NiiVue for [FreeBrowse](https://github.com/freesurfer/freebrowse)
- [Galaxy](https://github.com/galaxyproject/galaxy) is a web platform for research that embeds [NiiVue](https://github.com/galaxyproject/galaxy/pull/19995)
- [huggingface](https://github.com/huggingface/datasets/pull/7885) integrates NiiVue.
- [The Insight Journal](https://insight-journal.org/) uses NiiVue to embed interactive illustrations
- [ipyniivue](https://github.com/niivue/ipyniivue) allows NiiVue to be used in Jupyter Notebooks including [py.cafe](https://py.cafe/kolibril13/niivue-neuroimaging-with-python)
- [LAMBADA (OpenBrainAtlas)](https://lambada.icm-institute.org/) – A reference [atlas](https://lambada.icm-institute.org/atlases/5) of the developing postnatal mouse brain, created using tissue clearing and light-sheet microscopy at the Paris Brain Institute (Institut du Cerveau). It uses NiiVue for 2D/3D visualization of brain structures, volume overlays, and mesh rendering.
- [neurodesk](https://www.neurodesk.org/) uses NiiVue for their [QSMxT Quantitative Susceptibility Mapping toolbox](https://github.com/QSMxT/QSMxT-UI)
- [NeuroFLAME](https://github.com/NeuroFlame/NeuroFLAME) uses federated learning to train models across locations while keeping data securely on-site.
- [Neuroinformatics Research and Development Group](http://neuroinformatics.uw.edu/) embeds NiiVue in [tractoscope](https://github.com/nrdg/tractoscope)
- [neurosift](https://github.com/flatironinstitute/neurosift) NWB visualization and DANDI exploration
- [neurosynth compose](https://compose.neurosynth.org/) uses NiiVue for [display](https://compose.neurosynth.org/meta-analyses/qKZkqm5STSqo)
- [nilearn](https://nilearn.github.io/stable/index.html) is extending [ipyniivue](https://github.com/niivue/ipyniivue)
- [niivue-vscode](https://github.com/niivue/niivue-vscode) is a VSCode extension for displaying images
- [NiiVue Desktop](https://github.com/niivue/desktop) uses NiiVue in a crossplatform Electron app
- [NiiVue iOS](https://github.com/niivue/ios) is a Swift tool [available on the Apple App store for MacOS and iOS](https://apps.apple.com/kw/app/niivue/id6497066801)
- [NiiVue Neglect](https://niivue.github.io/niivue-neglect/) uses NiiVue to visualise stroke lesion data in the spatial neglect severity prediction tool
- [OpenMedView](https://github.com/erosmontin/OpenMedView) uses NiiVue to valid [image registration](https://link.springer.com/article/10.1007/s11517-019-02109-4)
- [OpenNeuro.org](https://openneuro.org) uses NiiVue to visualize datasets
- [Plurimedia](https://www.plurimedia.it/) uses NiiVue in client work for medical image visualization
- [QuantCo](https://www.quantco.com/) is using NiiVue in medical imaging workflows
- [Slice:Drop Reloaded](https://gaiborjosue.github.io/slicedrop.github.com/reload/) uses NiiVue to extend the original [slicedrop](https://slicedrop.com/)
- [T2Lesion](https://niivue.github.io/T2lesion/) uses NiiVue to show input data and segmented lesion masks
- [VoxLogicA-UI](https://voxlogica-project.github.io/VoxLogicA-UI/) makes advanced medical imaging analysis intuitive

# Funding

- 2021-2022 [P50 DC014664](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10094384) NIH NIDCD [NOT-OD-21-091](https://grants.nih.gov/grants/guide/notice-files/NOT-OD-21-091.html#:~:text=NOT%2DOD%2D21%2D091,Software%20Tools%20for%20Open%20Science)
- 2023-2026 [RF1 MH133701](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10724895) NIH NIMH

# Supported Formats

NiiVue natively supports many popular brain imaging formats, with additional support for DICOM, MINC, and TIFF available via [plugins](https://niivue.com/docs/plugins):

- Voxel-based formats: [NIfTI](https://brainder.org/2012/09/23/the-nifti-file-format/), [NRRD](http://teem.sourceforge.net/nrrd/format.html), [MRtrix MIF](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats), [AFNI HEAD/BRIK](https://afni.nimh.nih.gov/pub/dist/doc/program_help/README.attributes.html), [MGH/MGZ](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/MghFormat), [ITK MHD](https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29), [ECAT7](https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info), [DSI-Studio SRC](https://dsi-studio.labsolver.org/doc/cli_data.html).
- Mesh-based formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [ASC](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BYU/GEO/G](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BrainSuite DFS](http://brainsuite.org/formats/dfs/), [ICO/TRI](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [PLY](<https://en.wikipedia.org/wiki/PLY_(file_format)>), [BrainNet NV](https://www.nitrc.org/projects/bnv/), [BrainVoyager SRF](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/344-users-guide-2-3-the-format-of-srf-files), [FreeSurfer](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [OFF](<https://en.wikipedia.org/wiki/OFF_(file_format)>), [Wavefront OBJ](https://brainder.org/tag/obj/), [STL](https://medium.com/3d-printing-stories/why-stl-format-is-bad-fea9ecf5e45), [Legacy VTK](https://vtk.org/wp-content/uploads/2015/04/file-formats.pdf), [WRL](https://en.wikipedia.org/wiki/VRML), [X3D](https://3dprint.nih.gov/).
- Mesh overlay formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [CIfTI-2](https://balsa.wustl.edu/about/fileTypes), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [SMP](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/40-the-format-of-smp-files), STC, FreeSurfer (CURV/ANNOT)
- Tractography formats: [TCK](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck), [TRK](http://trackvis.org/docs/?subsect=fileformat), [TRX](https://github.com/frheault/tractography_file_format), [TSF](https://mrtrix.readthedocs.io/en/dev/getting_started/image_data.html#track-scalar-file-format-tsf), [TT](https://dsi-studio.labsolver.org/doc/cli_data.html), VTK, AFNI .niml.tract