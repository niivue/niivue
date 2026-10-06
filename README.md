> [!IMPORTANT]
> **NiiVue is moving to [niivue/mono](https://github.com/niivue/mono).** The new monorepo contains a rewritten `@niivue/niivue` package with WebGPU and WebGL2 support, smaller bundle sizes, and a more extensible architecture. The monorepo package will be our **v1.0.0** release candidate. All releases in this repository will remain below v1.0.0 so the two packages can co-exist. Most functionality has been ported and new development will focus on the monorepo. We will continue to maintain this repository for a transition period, but encourage users to migrate when ready.

[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.5786269-blue)](https://doi.org/10.5281/zenodo.5786269) [![App Store](https://img.shields.io/badge/App%20Store-NiiVue-blue)](https://apps.apple.com/gb/app/niivue/id6497066801) [![npm](https://img.shields.io/npm/v/@niivue/niivue)](https://www.npmjs.com/package/@niivue/niivue)

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

- [Analysis of Functional NeuroImages (AFNI)](https://afni.nimh.nih.gov/) neuroimaging analysis suite that uses NiiVue for [afni_proc.py](https://pubmed.ncbi.nlm.nih.gov/39257641/)
- [aoa-neuro-demos](https://nickriccardi.github.io/aoa-neuro-demos/) in-browser brain demos for an Academy of Aphasia workshop ([source](https://github.com/NickRiccardi/aoa-neuro-demos))
- [BIDSvue](https://bidsvue.org/) create, curate, de-identify, and share BIDS datasets
- [BOOSTLET.js](https://boostlet.org/) image processing plugins for NiiVue
- [brain-tumor-segmentation](https://github.com/Kushall-07/brain-tumor-segmentation) SwinUNETR brain tumor segmentation with 2D/3D visualization
- [brain-tumour-neuropsychology-atlas](https://atlas-of-neuropsychology-on-brain-t.vercel.app/) maps postoperative outcomes of brain tumour surgery to MNI152 regions ([source](https://github.com/muhanailyas/brain-tumour-neuropsychology-atlas))
- [brain2print](https://brain2print.org/) browser-based conversion of voxels to printable meshes
- [brainchop](https://github.com/neuroneural/brainchop) [drag-and-drop segmentation, brain extraction and parcellation](https://neuroneural.github.io/brainchop/)
- [BrainLife.io](https://brainlife.io/about/) cloud platform that embeds NiiVue in [ezbids](https://brainlife.io/ezbids/)
- [BrowserQC](https://browserqc.org/) quality metrics for NIfTI and DICOM images
- [CACTAS](https://github.com/mpsych/CACTAS) extends NiiVue drawing and segmentation
- [CALMaR](https://calmar.neurodesk.org/) co-designed automated lesion mapping and reporting
- [CanlabCore](https://github.com/canlab/canlabcore) MATLAB toolbox for interactive analysis of neuroimaging data
- [ChRIS](https://chrisproject.org/) research integration system with a [NiiVue viewer](https://app.chrisproject.org/niivue)
- [ct2print](https://ct2print.org/) browser-based viewing of volume and mesh data
- [deepsyence](https://iishiishii.github.io/deepsyence/) by [Thuy Dao](https://github.com/iishiishii/deepsyence)
- [deface](https://niivue.github.io/deface/) browser-based drag-and-drop defacing for DICOM and NIfTI images
- [dwi2trx](https://rordenlab.github.io/dwi2trx/) browser-based diffusion visualization and streamline creation
- [Easy-MP2RAGE-T1-Map](https://mp2rage.neurodesk.org/) B1-corrected T1 mapping at 3T and 7T
- [EdgeReg](https://www.edgereg.org/) fast client-side medical image registration
- [faraday](https://thegreataxios.github.io/faraday/) agent-native volumetric reading room for CT and MRI ([source](https://github.com/TheGreatAxios/faraday))
- [fideus](https://fideus.io/) develops the [ITK-Wasm](https://docs.itk.org/projects/wasm/en/latest/) plugins
- [FMRIB's Software Library (FSL)](https://fsl.fmrib.ox.ac.uk/) cloud tools and [documentation](https://fsl.fmrib.ox.ac.uk/fsl/docs/#/structural/bet/)
- [FreeBrowse](https://github.com/freesurfer/freebrowse) FreeSurfer viewer from the [Laboratories for Computational Neuroimaging](https://lcn.martinos.org/)
- [FSL Clinical](https://fslclinical.com/) brain imaging reports
- [Galaxy](https://github.com/galaxyproject/galaxy) web platform for research that embeds [NiiVue](https://github.com/galaxyproject/galaxy/pull/19995)
- [huggingface](https://github.com/huggingface/datasets/pull/7885) dataset previews with NiiVue
- [The Insight Journal](https://insight-journal.org/) interactive illustrations embedded in articles
- [ipyniivue](https://github.com/niivue/ipyniivue) NiiVue for Jupyter notebooks, including [py.cafe](https://py.cafe/kolibril13/niivue-neuroimaging-with-python)
- [JetBrains NiiVue viewer](https://plugins.jetbrains.com/plugin/32824-niivue-viewer) plugin for IntelliJ IDEs ([source](https://github.com/felixstieglitz/niivue-jetbrains))
- [JHUdemo](https://josephreggy23-coder.github.io/JHUdemo/) CT scan and per-voxel segmentation viewer for JHU BodyMaps ([source](https://github.com/josephreggy23-coder/JHUdemo))
- [LAMBADA (OpenBrainAtlas)](https://lambada.icm-institute.org/) [atlas](https://lambada.icm-institute.org/atlases/5) of the developing postnatal mouse brain from the Paris Brain Institute
- [LINC Gallery](https://gallery.lincbrain.org) showcases data from [LINC](https://connects.mgh.harvard.edu), an [NIH BRAIN CONNECTS](https://www.brain-connects.org) center
- [MuscleMap](https://musclemap.neurodesk.org/) whole-body muscle MRI segmentation in your browser
- [neurodesk](https://www.neurodesk.org/) browser-based [QSMxT quantitative susceptibility mapping](https://github.com/QSMxT/QSMxT-UI)
- [Neurodesk WebApps](https://webapps.neurodesk.org/) browser-based neuroimaging applications
- [NeuroFLAME](https://github.com/NeuroFlame/NeuroFLAME) federated learning across sites while keeping data securely on-site
- [Neuroimaging Pattern Masks](https://github.com/canlab/Neuroimaging_Pattern_Masks) atlases and pattern-based brain signatures from CANlab
- [Neuroinformatics Research and Development Group](http://neuroinformatics.uw.edu/) embeds NiiVue in [tractoscope](https://github.com/nrdg/tractoscope)
- [neurosift](https://github.com/flatironinstitute/neurosift) NWB visualization and DANDI exploration
- [neurosynth compose](https://compose.neurosynth.org/) meta-analysis [display](https://compose.neurosynth.org/meta-analyses/qKZkqm5STSqo)
- [niftier](https://github.com/jan-scholz/niftier) small viewer with interactive intensity thresholding
- [niimath](https://niivue.github.io/niimath/) fast image processing
- [NiiNav](https://niivue.github.io/niinav/) brain stimulation navigation
- [nilearn](https://nilearn.github.io/stable/index.html) extends [ipyniivue](https://github.com/niivue/ipyniivue)
- [niivue-vscode](https://github.com/niivue/niivue-vscode) VSCode extension for displaying images
- [NiiVue Desktop](https://github.com/niivue/desktop) crossplatform Electron app
- [NiiVue iOS](https://github.com/niivue/ios) Swift app [on the Apple App Store for macOS and iOS](https://apps.apple.com/kw/app/niivue/id6497066801)
- [NiiVue Neglect](https://niivue.github.io/niivue-neglect/) stroke lesion data in a spatial neglect severity prediction tool
- [nltools](https://nltools.org/quickstart/) Python neuroimaging analysis toolbox built on nilearn
- [nmrview](https://nmrview.fly.dev/) MRI and 1D NMR spectroscopy workstation for research and education ([source](https://github.com/thepacket/nmrview))
- [OpenMedView](https://github.com/erosmontin/OpenMedView) validates [image registration](https://link.springer.com/article/10.1007/s11517-019-02109-4)
- [OpenMRI](https://github.com/lev1nson/OpenMRI) local viewer for personal MRI and CT studies with rigid registration across dates
- [OpenNeuro.org](https://openneuro.org) visualizes shared datasets
- [Plurimedia](https://www.plurimedia.it/) medical image visualization in client work
- [qmrust](https://qmrlab.org/qmrust/app/) native-Rust toolkit for quantitative MRI
- [QSMbly](https://qsmbly.neurodesk.org/) quantitative susceptibility mapping in your browser
- [QuantCo](https://www.quantco.com/) medical imaging workflows
- [readyourscan](https://readyourscan.com/tools/dicom-viewer) in-browser DICOM and NIfTI viewer with MPR and volume rendering ([source](https://github.com/lgdesignee/readyourscan-viewer))
- [scanspeak](https://github.com/Mohith26/scanspeak) local LLM drives a NiiVue viewer of mouse micro-CT through tool calls
- [SeedSeg](https://seedseg.neurodesk.org/) prostate gold seed segmentation
- [Slice:Drop Reloaded](https://gaiborjosue.github.io/slicedrop.github.com/reload/) extends the original [slicedrop](https://slicedrop.com/)
- [SpinalCordToolbox](https://sct.neurodesk.org/) spinal cord MRI segmentation in the browser
- [system-onco](https://github.com/krishxchowta/system-onco) brain MRI research dashboard with MONAI segmentation and Grad-CAM
- [T2Lesion](https://niivue.github.io/T2lesion/) input data and segmented lesion masks
- [VesselBoost](https://vesselboost.neurodesk.org/) blood vessel segmentation
- [VoxLogicA-UI](https://voxlogica-project.github.io/VoxLogicA-UI/) makes advanced medical imaging analysis intuitive
- [Web-based CT viewer](https://web-based-applications-ct-viewer.vercel.app/) CT and organ-segmentation viewer for BodyMaps ([source](https://github.com/jayshreek2511-cloud/Web-based-applications-CT-viewer))

# Funding

- 2021-2022 [P50 DC014664](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10094384) NIH NIDCD [NOT-OD-21-091](https://grants.nih.gov/grants/guide/notice-files/NOT-OD-21-091.html#:~:text=NOT%2DOD%2D21%2D091,Software%20Tools%20for%20Open%20Science)
- 2023-2026 [RF1 MH133701](https://reporter.nih.gov/search/D3sOjJtXwkSRKLpYf1ctBg/project-details/10724895) NIH NIMH

# Supported Formats

NiiVue natively supports many popular brain imaging formats, with additional support for DICOM, MINC, and TIFF available via [plugins](https://niivue.com/docs/plugins):

- Voxel-based formats: [NIfTI](https://brainder.org/2012/09/23/the-nifti-file-format/), [NRRD](http://teem.sourceforge.net/nrrd/format.html), [MRtrix MIF](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats), [AFNI HEAD/BRIK](https://afni.nimh.nih.gov/pub/dist/doc/program_help/README.attributes.html), [MGH/MGZ](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/MghFormat), [ITK MHD](https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29), [ECAT7](https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info), [DSI-Studio SRC](https://dsi-studio.labsolver.org/doc/cli_data.html).
- Mesh-based formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [ASC](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BYU/GEO/G](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [BrainSuite DFS](http://brainsuite.org/formats/dfs/), [ICO/TRI](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [PLY](<https://en.wikipedia.org/wiki/PLY_(file_format)>), [BrainNet NV](https://www.nitrc.org/projects/bnv/), [BrainVoyager SRF](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/344-users-guide-2-3-the-format-of-srf-files), [FreeSurfer](http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [OFF](<https://en.wikipedia.org/wiki/OFF_(file_format)>), [Wavefront OBJ](https://brainder.org/tag/obj/), [STL](https://medium.com/3d-printing-stories/why-stl-format-is-bad-fea9ecf5e45), [Legacy VTK](https://vtk.org/wp-content/uploads/2015/04/file-formats.pdf), [WRL](https://en.wikipedia.org/wiki/VRML), [X3D](https://3dprint.nih.gov/).
- Mesh overlay formats: [GIfTI](https://www.nitrc.org/projects/gifti/), [CIfTI-2](https://balsa.wustl.edu/about/fileTypes), [MZ3](https://github.com/neurolabusc/surf-ice/tree/master/mz3), [SMP](https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/40-the-format-of-smp-files), STC, FreeSurfer (CURV/ANNOT)
- Tractography formats: [TCK](https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck), [TRK](http://trackvis.org/docs/?subsect=fileformat), [TRX](https://github.com/frheault/tractography_file_format), [TSF](https://mrtrix.readthedocs.io/en/dev/getting_started/image_data.html#track-scalar-file-format-tsf), [TT](https://dsi-studio.labsolver.org/doc/cli_data.html), VTK, AFNI .niml.tract
