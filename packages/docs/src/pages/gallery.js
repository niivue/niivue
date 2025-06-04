import React from 'react'
import Layout from '@theme/Layout'
import styles from './gallery.module.css'


const demoRoot = 'https://niivue.com/demos/features/'

const demos = [
  {
    key: 'basic-multiplanar',
    name: 'Basic multiplanar',
    file: 'basic.multiplanar.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'sync-mesh',
    name: 'Sync mesh',
    file: 'sync.mesh.html',
    description: '',
    tags: ['Voxel', 'Mesh']
  },
  {
    key: 'bidirectional-sync',
    name: 'Bidirectional Sync',
    file: 'sync.bidirectional.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'color-maps-for-voxels',
    name: 'Color maps for voxels',
    file: 'colormaps.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'meshes',
    name: 'meshes',
    file: 'colormaps.mesh.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: 'background-masks-overlays',
    name: 'Background masks overlays',
    file: 'mask.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'alpha-and-asymmetric-statistical-thresholds',
    name: 'Alpha and asymmetric statistical thresholds',
    file: 'alphathreshold.html',
    description: '',
    tags: ['Voxel', 'Stat']
  },
  {
    key: 'test-images',
    name: 'Test images',
    file: 'test_images.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'drag-and-drop',
    name: 'Drag and drop',
    file: 'draganddrop.html',
    description: '',
    tags: []
  },
  {
    key: 'select-font',
    name: 'Select font',
    file: 'selectfont.html',
    description: '',
    tags: []
  },
  {
    key: 'connectome',
    name: 'Connectome',
    file: 'connectome.html',
    description: '',
    tags: ['Voxel', 'Connectome']
  },
  {
    key: 'connectome-api',
    name: 'Connectome API',
    file: 'connectome.api.html',
    description: '',
    tags: ['Voxel', 'Connectome']
  },
  {
    key: 'minimal-user-interface-with-menus',
    name: 'Minimal user interface with menus',
    file: 'ui.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'meshes-gifti-freesurfer-mz3-obj-stl-legacy-vtk',
    name: 'Meshes',
    file: 'meshes.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'mesh-matcaps',
    name: 'Mesh MatCaps',
    file: 'mesh.matcap.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'mesh-statistics',
    name: 'Mesh Statistics',
    file: 'mesh.stats.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'generate-and-save-meshes',
    name: 'Generate and save meshes',
    file: 'mesh.create.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: 'mesh-layers-gifti-freesurfer-mz3',
    name: 'Mesh layer',
    file: 'mesh.layers.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'load-mesh-layers',
    name: 'Load Mesh Layers',
    file: 'mesh.loader.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: '4d-mesh-time-series-gifti-freesurfer-mz3',
    name: '4D mesh time series (GIfTI, FreeSurfer, MZ3)',
    file: 'mesh.4D.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'annot-mesh-atlases',
    name: 'annot mesh atlases',
    file: 'mesh.atlas.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'onavg-mesh-atlases',
    name: 'onavg mesh atlases',
    file: 'mesh.atlas.onavg.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'gifti-mesh-atlases',
    name: 'GIFTI mesh atlases',
    file: 'mesh.atlas.gii.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'suit-cerebellar-atlases',
    name: 'SUIT cerebellar atlases',
    file: 'mesh.atlas.suit.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'mgh-mesh-atlases',
    name: 'MGH mesh atlases',
    file: 'mesh.atlas.mgh.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'gifti-meshes-with-nifti2-curvature',
    name: 'GIfTI Meshes with NIfTI2 Curvature',
    file: 'mesh.curv.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: 'mesh',
    name: 'Mesh (auto Anti-Alias)',
    file: 'mesh.freesurfer.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'voxel',
    name: 'Voxel (auto Anti-Alias)',
    file: 'vox.aaAUTO.html',
    description: '',
    tags: ['Voxel', 'Stat', 'Atlas']
  },
  {
    key: 'mesh',
    name: 'Mesh (no Anti-Alias)',
    file: 'mesh.freesurfer.aaOFF.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'voxel',
    name: 'Voxel (no Anti-Alias)',
    file: 'vox.aaOFF.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'mesh',
    name: 'Mesh  (force Anti-Alias)',
    file: 'mesh.freesurfer.aaON.html',
    description: '',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    key: 'voxel',
    name: 'Voxel  (force Anti-Alias)',
    file: 'vox.aaON.html',
    description: '',
    tags: ['Voxel', 'Stat', 'Atlas']
  },
  {
    key: 'freesurfer-mask-editing',
    name: 'FreeSurfer mask editing',
    file: 'freesurfer.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'freesurfer-point-sets',
    name: 'FreeSurfer point sets',
    file: 'pointset.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: '4d-mesh-time-series-cifti-2',
    name: '4D mesh time series (CIFTI-2)',
    file: 'cifti.4D.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'tractography-tck-trk-trx-vtk',
    name: 'Tractography (TCK, TRK, TRX, VTK)',
    file: 'tracts.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'tractography-groups-trx',
    name: 'Tractography groups (TRX)',
    file: 'tracts.group.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'tractography-as-cylinder-tubes',
    name: 'Tractography as cylinder tubes',
    file: 'tracts.cylinder.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'mrtrix3-tracts-and-track-scalar-file-tsf-overlays',
    name: 'MRtrix3 tracts and Track Scalar File (TSF) overlays',
    file: 'tracts.mrtrix.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'dsi-studio-tiny-tract-files-tt',
    name: 'DSI-Studio tiny-tract files (TT)',
    file: 'tracts.dsi.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'tract-atlas',
    name: 'Tract atlas',
    file: 'tracts.atlas.html',
    description: '',
    tags: ['Voxel', 'Tract']
  },
  {
    key: 'advanced-tractography-tck-trk-trx-vtk',
    name: 'Advanced tractography (TCK, TRK, TRX, VTK)',
    file: 'tracts2.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'dsi-studio-src-files',
    name: 'DSI-Studio SRC files',
    file: 'dsistudio.html',
    description: '',
    tags: ['Voxel', 'Mesh', 'Tract']
  },
  {
    key: '4d-time-series-data-fmri-dti-asl-etc-using-thumbnail-for-rapid-loading',
    name: '4D Time series with thumbnail for rapid loading',
    file: 'timeseries.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: '4d-time-series-data-fmri-dti-asl-etc-initially-showing-only-the-first-volumes-for-rapid-loading',
    name: '4D Time series with few volumes for rapid loading',
    file: 'timeseries2.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'afni-volumes',
    name: 'AFNI volumes',
    file: 'afni.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'connected-component-clusters',
    name: 'Connected component clusters',
    file: 'clusterize.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'brainvoyager-meshes',
    name: 'BrainVoyager meshes',
    file: 'brainvoyager.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: 'x3d-meshes',
    name: 'x3d meshes',
    file: 'x3d.html',
    description: '',
    tags: ['Mesh']
  },
  {
    key: 'clip-planes',
    name: 'Clip planes',
    file: 'clipplanes.html',
    description: '',
    tags: ['Voxel', 'Mesh', 'Connectome', 'Tract']
  },
  {
    key: 'advanced-clip-planes',
    name: 'Advanced clip planes',
    file: 'clipplanes2.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'drawing',
    name: 'Drawing',
    file: 'draw2.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'drawing-user-interface',
    name: 'Drawing user interface',
    file: 'draw.ui.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'torso-regions',
    name: 'Torso regions',
    file: 'torso.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'carotid-artery-computed-tomographic-angiography-scoring',
    name: 'Carotid Artery-Computed Tomographic Angiography Scoring',
    file: 'cactus.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'voxel-atlas',
    name: 'Voxel atlas',
    file: 'atlas.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'sparse-voxel-atlas',
    name: 'Sparse voxel atlas',
    file: 'atlas.sparse.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'denoise-dark-voxels',
    name: 'Denoise dark voxels',
    file: 'denoise.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-fsl-diffusion-fa-and-v1',
    name: 'Modulation of FSL diffusion FA and V1',
    file: 'modulate.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-dsi-studio-diffusion-fa-and-v1',
    name: 'Modulation of DSI-Studio diffusion FA and V1',
    file: 'modulateDSI.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-mrtrix-diffusion-fa-and-v1',
    name: 'Modulation of MRtrix diffusion FA and V1',
    file: 'modulateTrix.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-afni-diffusion-fa-and-v1',
    name: 'Modulation of AFNI diffusion FA and V1',
    file: 'modulateAfniDTI.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'multiplanar-layout-auto-column-grid-row',
    name: 'Layout (Auto, Column, Grid, Row)',
    file: 'layout.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'hero-image',
    name: 'Hero image',
    file: 'hero.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-scalar-volumes',
    name: 'Modulation of scalar volumes',
    file: 'modulateScalar.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'modulation-of-afni-statistics',
    name: 'Modulation of AFNI statistics',
    file: 'modulateAfni.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'fixed-canvas-size',
    name: 'Fixed canvas size',
    file: 'fixedsize.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'segmented-image-with-named-labels',
    name: 'Segmented image with named labels',
    file: 'segment.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'mosaics',
    name: 'Mosaics',
    file: 'mosaics.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'advanced-mosaics',
    name: 'Advanced mosaics',
    file: 'mosaics2.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'cortical-mesh-mosaics',
    name: 'Cortical mesh mosaics',
    file: 'mosaics2.mesh.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'cerebellar-mesh-mosaics',
    name: 'Cerebellar mesh mosaics',
    file: 'mosaics.mesh.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'world-space',
    name: 'World space',
    file: 'worldspace.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'advanced-world-space',
    name: 'Advanced world space',
    file: 'worldspace2.html',
    description: '',
    tags: ['Voxel', 'Mesh']
  },
  {
    key: 'images-with-shear',
    name: 'Images with shear',
    file: 'shear.html',
    description: '',
    tags: ['Voxel', 'Connectome']
  },
  {
    key: 'user-scripting',
    name: 'User scripting',
    file: 'scripts.html',
    description: '',
    tags: ['Voxel', 'Mesh']
  },
  {
    key: 'shiny-volume-rendering',
    name: 'Shiny volume rendering',
    file: 'shiny.volumes.html',
    description: '',
    tags: ['Voxel', 'Mesh', 'Connectome', 'Tract']
  },
  {
    key: 'dragging-callbacks',
    name: 'Dragging callbacks',
    file: 'dragCallback.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'voxels-with-complex-numbers',
    name: 'Voxels with complex numbers',
    file: 'complex.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'voxels',
    name: 'Additive voxel overlays',
    file: 'additive.voxels.html',
    description: '',
    tags: ['Voxel', 'Stat']
  },
  {
    key: 'Additive mesh overlays',
    name: 'mesh',
    file: 'additive.mesh.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'negative-colormaps',
    name: 'Inverse colormaps',
    file: 'additive.mesh.negative.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'dicom-manifest',
    name: 'DICOM Manifest',
    file: 'dicom.manifest.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'load-a-document',
    name: 'Load a document',
    file: 'document.load.html',
    description: '',
    tags: []
  },
  {
    key: 'download-a-document-with-3d-render',
    name: 'Download a document with 3D render',
    file: 'document.3d.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'download-a-document-with-drawing',
    name: 'Download a document with drawing',
    file: 'document.drawing.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'download-a-document-with-meshes',
    name: 'Download a document with meshes',
    file: 'document.meshes.html',
    description: '',
    tags: ['Mesh', 'Stat']
  },
  {
    key: 'download-a-document-with-an-atlas',
    name: 'Download a document with an atlas',
    file: 'document.atlas.html',
    description: '',
    tags: []
  },
  {
    key: 'download-a-document-with-custom-data',
    name: 'Download a document with custom data',
    file: 'document.customdata.html',
    description: '',
    tags: []
  },
  {
    key: 'label-voxel-clusters',
    name: 'Label voxel clusters',
    file: 'label_clusters.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'conform-reslice-and-generate-volumes',
    name: 'Conform, reslice and generate volumes',
    file: 'conform.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'slab-selection-for-image-processing',
    name: 'Slab selection for image processing',
    file: 'slab_selection.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'save-a-scene-as-html',
    name: 'Save a scene as HTML',
    file: 'save.html.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'save-a-scene-with-custom-html',
    name: 'Save a scene with custom HTML',
    file: 'save.custom.html.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'show-labels',
    name: 'Show labels',
    file: 'labels.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'connectome-labels',
    name: 'Connectome labels',
    file: 'labels.s.html',
    description: '',
    tags: ['Voxel', 'Connectome']
  },
  {
    key: 'anchored-labels',
    name: 'Anchored labels',
    file: 'labels.anchored.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'gradient-order',
    name: 'Gradient Order',
    file: 'gradient.order.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'gradient-opacity',
    name: 'Gradient Opacity',
    file: 'gradient.opacity.html',
    description: '',
    tags: ['Voxel']
  },
  {
    key: 'magic-wand',
    name: 'Magic wand',
    file: 'magic_wand.html',
    description: '',
    tags: ['Voxel']
  }
];


export default function Gallery() {
  return (
    <Layout title="Gallery" description="Interactive NiiVue Demos">
      <main className={`${styles.gallery} ${styles.fullWidth}`}>
        <div className={styles.grid}>
          {demos.map(demo => (
            <div key={demo.key} className={styles.card}>
              <a href={demoRoot + demo.file} className={styles.cardTitle} target="_blank" rel="noopener noreferrer">
                {demo.name}
              </a>
              <p className={styles.cardDescription}>{demo.description}</p>
              <div className={styles.tags}>
                {demo.tags.map(tag => (
                  <span key={tag} className={`${styles.tag} ${styles['tag_' + tag.toLowerCase()]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  )
}
