import React from 'react'
import Layout from '@theme/Layout'
import styles from './gallery.module.css'


const demoRoot = 'https://niivue.com/demos/features/'

const demos = [
  {
    name: 'Basic multiplanar',
    file: 'basic.multiplanar.html',
    tags: ['Voxel']
  },
  {
    name: 'Sync mesh',
    file: 'sync.mesh.html',
    tags: ['Voxel', 'Mesh']
  },
  {
    name: 'Bidirectional Sync',
    file: 'sync.bidirectional.html',
    tags: ['Voxel']
  },
  {
    name: 'Voxel Colormaps',
    file: 'colormaps.html',
    tags: ['Voxel']
  },
  {
    name: 'Mesh Colormaps',
    file: 'colormaps.mesh.html',
    tags: ['Mesh']
  },
  {
    name: 'Background masks overlays',
    file: 'mask.html',
    tags: ['Voxel']
  },
  {
    name: 'Alpha and asymmetric statistical thresholds',
    file: 'alphathreshold.html',
    tags: ['Voxel', 'Stat']
  },
  {
    name: 'Test images',
    file: 'test_images.html',
    tags: ['Voxel']
  },
  {
    name: 'Select font',
    file: 'selectfont.html',
    tags: []
  },
  {
    name: 'Connectome',
    file: 'connectome.html',
    tags: ['Voxel', 'Connectome'],
  },
  {
    name: 'Connectome API',
    file: 'connectome.api.html',
    tags: ['Voxel', 'Connectome']
  },
  {
    name: 'Minimal user interface with menus',
    file: 'ui.html',
    tags: ['Voxel']
  },
  {
    name: 'Meshes',
    file: 'meshes.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Mesh MatCaps',
    file: 'mesh.matcap.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Drag and drop',
    file: 'draganddrop.html',
    tags: []
  },
  {
    name: 'Mesh Statistics',
    file: 'mesh.stats.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Generate and save meshes',
    file: 'mesh.create.html',
    tags: ['Mesh']
  },
  {
    name: 'Mesh layer',
    file: 'mesh.layers.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Load Mesh Layers',
    file: 'mesh.loader.html',
    tags: ['Mesh']
  },
  {
    name: '4D mesh time series (GIfTI, FreeSurfer, MZ3)',
    file: 'mesh.4D.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'annot mesh atlases',
    file: 'mesh.atlas.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'onavg mesh atlases',
    file: 'mesh.atlas.onavg.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'GIFTI mesh atlases',
    file: 'mesh.atlas.gii.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'SUIT cerebellar atlases',
    file: 'mesh.atlas.suit.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'MGH mesh atlases',
    file: 'mesh.atlas.mgh.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'GIfTI Meshes with NIfTI2 Curvature',
    file: 'mesh.curv.html',
    tags: ['Mesh']
  },
  {
    name: 'Mesh (auto Anti-Alias)',
    file: 'mesh.freesurfer.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Voxel (auto Anti-Alias)',
    file: 'vox.aaAUTO.html',
    tags: ['Voxel', 'Stat', 'Atlas']
  },
  {
    name: 'Mesh (no Anti-Alias)',
    file: 'mesh.freesurfer.aaOFF.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Voxel (no Anti-Alias)',
    file: 'vox.aaOFF.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Mesh  (force Anti-Alias)',
    file: 'mesh.freesurfer.aaON.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Voxel  (force Anti-Alias)',
    file: 'vox.aaON.html',
    tags: ['Voxel', 'Stat', 'Atlas']
  },
  {
    name: 'FreeSurfer mask editing',
    file: 'freesurfer.html',
    tags: ['Voxel']
  },
  {
    name: 'FreeSurfer point sets',
    file: 'pointset.html',
    tags: ['Voxel']
  },
  {
    name: '4D mesh time series (CIFTI-2)',
    file: 'cifti.4D.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Tractography (TCK, TRK, TRX, VTK)',
    file: 'tracts.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'Tractography groups (TRX)',
    file: 'tracts.group.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'Tractography as cylinder tubes',
    file: 'tracts.cylinder.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'MRtrix3 tracts and Track Scalar File (TSF) overlays',
    file: 'tracts.mrtrix.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'DSI-Studio tiny-tract files (TT)',
    file: 'tracts.dsi.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'Tract atlas',
    file: 'tracts.atlas.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'Advanced tractography (TCK, TRK, TRX, VTK)',
    file: 'tracts2.html',
    tags: ['Voxel']
  },
  {
    name: 'DSI-Studio SRC files',
    file: 'dsistudio.html',
    tags: ['Voxel', 'Mesh', 'Tract']
  },
  {
    name: '4D Time series with thumbnail for rapid loading',
    file: 'timeseries.html',
    tags: ['Voxel']
  },
  {
    name: '4D Time series with few volumes for rapid loading',
    file: 'timeseries2.html',
    tags: ['Voxel']
  },
  {
    name: 'AFNI volumes',
    file: 'afni.html',
    tags: ['Voxel']
  },
  {
    name: 'Connected component clusters',
    file: 'clusterize.html',
    tags: ['Voxel']
  },
  {
    name: 'BrainVoyager meshes',
    file: 'brainvoyager.html',
    tags: ['Mesh']
  },
  {
    name: 'x3d meshes',
    file: 'x3d.html',
    tags: ['Mesh']
  },
  {
    name: 'Clip planes',
    file: 'clipplanes.html',
    tags: ['Voxel', 'Mesh', 'Connectome', 'Tract']
  },
  {
    name: 'Advanced clip planes',
    file: 'clipplanes2.html',
    tags: ['Voxel']
  },
  {
    name: 'Drawing',
    file: 'draw2.html',
    tags: ['Voxel']
  },
  {
    name: 'Drawing user interface',
    file: 'draw.ui.html',
    tags: ['Voxel']
  },
  {
    name: 'Torso regions',
    file: 'torso.html',
    tags: ['Voxel']
  },
  {
    name: 'Carotid Artery-Computed Tomographic Angiography Scoring',
    file: 'cactus.html',
    tags: ['Voxel']
  },
  {
    name: 'Voxel atlas',
    file: 'atlas.html',
    tags: ['Voxel']
  },
  {
    name: 'Sparse voxel atlas',
    file: 'atlas.sparse.html',
    tags: ['Voxel']
  },
  {
    name: 'Denoise dark voxels',
    file: 'denoise.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of FSL diffusion FA and V1',
    file: 'modulate.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of DSI-Studio diffusion FA and V1',
    file: 'modulateDSI.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of MRtrix diffusion FA and V1',
    file: 'modulateTrix.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of AFNI diffusion FA and V1',
    file: 'modulateAfniDTI.html',
    tags: ['Voxel']
  },
  {
    name: 'Layout (Auto, Column, Grid, Row)',
    file: 'layout.html',
    tags: ['Voxel']
  },
  {
    name: 'Hero image',
    file: 'hero.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of scalar volumes',
    file: 'modulateScalar.html',
    tags: ['Voxel']
  },
  {
    name: 'Modulation of AFNI statistics',
    file: 'modulateAfni.html',
    tags: ['Voxel']
  },
  {
    name: 'Fixed canvas size',
    file: 'fixedsize.html',
    tags: ['Voxel']
  },
  {
    name: 'Segmented image with named labels',
    file: 'segment.html',
    tags: ['Voxel']
  },
  {
    name: 'Mosaics',
    file: 'mosaics.html',
    tags: ['Voxel']
  },
  {
    name: 'Advanced mosaics',
    file: 'mosaics2.html',
    tags: ['Voxel']
  },
  {
    name: 'Cortical mesh mosaics',
    file: 'mosaics2.mesh.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Cerebellar mesh mosaics',
    file: 'mosaics.mesh.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'World space',
    file: 'worldspace.html',
    tags: ['Voxel']
  },
  {
    name: 'Advanced world space',
    file: 'worldspace2.html',
    tags: ['Voxel', 'Mesh']
  },
  {
    name: 'Images with shear',
    file: 'shear.html',
    tags: ['Voxel', 'Connectome']
  },
  {
    name: 'User scripting',
    file: 'scripts.html',
    tags: ['Voxel', 'Mesh']
  },
  {
    name: 'Shiny volume rendering',
    file: 'shiny.volumes.html',
    tags: ['Voxel', 'Mesh', 'Connectome', 'Tract']
  },
  {
    name: 'Dragging callbacks',
    file: 'dragCallback.html',
    tags: ['Voxel']
  },
  {
    name: 'Voxels with complex numbers',
    file: 'complex.html',
    tags: ['Voxel']
  },
  {
    name: 'Additive voxel overlays',
    file: 'additive.voxels.html',
    tags: ['Voxel', 'Stat']
  },
  {
    name: 'mesh',
    file: 'additive.mesh.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Inverse colormaps',
    file: 'additive.mesh.negative.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'DICOM Manifest',
    file: 'dicom.manifest.html',
    tags: ['Voxel']
  },
  {
    name: 'Load a document',
    file: 'document.load.html',
    tags: []
  },
  {
    name: 'Download a document with 3D render',
    file: 'document.3d.html',
    tags: ['Voxel']
  },
  {
    name: 'Download a document with drawing',
    file: 'document.drawing.html',
    tags: ['Voxel']
  },
  {
    name: 'Download a document with meshes',
    file: 'document.meshes.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Download a document with an atlas',
    file: 'document.atlas.html',
    tags: []
  },
  {
    name: 'Download a document with custom data',
    file: 'document.customdata.html',
    tags: []
  },
  {
    name: 'Label voxel clusters',
    file: 'label_clusters.html',
    tags: ['Voxel']
  },
  {
    name: 'Conform, reslice and generate volumes',
    file: 'conform.html',
    tags: ['Voxel']
  },
  {
    name: 'Slab selection for image processing',
    file: 'slab_selection.html',
    tags: ['Voxel']
  },
  {
    name: 'Save a scene as HTML',
    file: 'save.html.html',
    tags: ['Voxel']
  },
  {
    name: 'Save a scene with custom HTML',
    file: 'save.custom.html.html',
    tags: ['Voxel']
  },
  {
    name: 'Show labels',
    file: 'labels.html',
    tags: ['Voxel']
  },
  {
    name: 'Connectome labels',
    file: 'labels.s.html',
    tags: ['Voxel', 'Connectome']
  },
  {
    name: 'Anchored labels',
    file: 'labels.anchored.html',
    tags: ['Voxel']
  },
  {
    name: 'Gradient Order',
    file: 'gradient.order.html',
    tags: ['Voxel']
  },
  {
    name: 'Gradient Opacity',
    file: 'gradient.opacity.html',
    tags: ['Voxel']
  },
  {
    name: 'Magic wand',
    file: 'magic_wand.html',
    tags: ['Voxel']
  }
];

export default function Gallery() {
  return (
    <Layout title="Gallery" description="Interactive NiiVue Demos">
      <main className={`${styles.gallery} ${styles.fullWidth}`}>
        <div className={styles.grid}>
          {demos.map(demo => (
            <div
              key={demo.file}
              className={styles.card}
              style={{
                '--bg-image': `url(/img/thumbs/${demo.file.replace(/\.html$/, '.jpg')})`,
              }}
            >
              <div className={styles.cardContent}>
                <a
                  href={demoRoot + demo.file}
                  className={styles.cardTitle}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {demo.name}
                </a>
                <div className={styles.tags}>
                  {demo.tags.map(tag => (
                    <span
                      key={tag}
                      className={`${styles.tag} ${styles['tag_' + tag.toLowerCase()]}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  )
}

