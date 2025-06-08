import React from 'react'
import Layout from '@theme/Layout'
import styles from './gallery.module.css'


const demoRoot = 'https://niivue.com/demos/features/'

const demos = [
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
    name: 'Statistical thresholds',
    file: 'alphathreshold.html',
    tags: ['Voxel', 'Stat']
  },
  {
    name: 'Voxel formats',
    file: 'test_images.html',
    tags: ['Voxel']
  },
  {
    name: 'Connectome',
    file: 'connectome.html',
    tags: ['Voxel', 'Connectome'],
  },
  {
    name: 'User Interface',
    file: 'ui.html',
    tags: ['Voxel']
  },
  {
    name: 'Mesh Formats',
    file: 'meshes.html',
    tags: ['Mesh']
  },
  {
    name: 'Mesh Statistics',
    file: 'mesh.stats.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Cerebellar atlases',
    file: 'mesh.atlas.suit.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Mesh performance tradeoffs',
    file: 'mesh.tradeoffs.html',
    tags: ['Mesh', 'Stat', 'Atlas']
  },
  {
    name: 'Voxel performance tradeoffs',
    file: 'vox.tradeoffs.html',
    tags: ['Voxel', 'Stat', 'Atlas']
  },

  {
    name: 'DSI-Studio tracts',
    file: 'tracts.dsi.html',
    tags: ['Voxel', 'Tract', 'Atlas']
  },
  {
    name: 'Tract atlas',
    file: 'tracts.atlas.html',
    tags: ['Voxel', 'Tract']
  },
  {
    name: 'Drawing',
    file: 'draw.ui.html',
    tags: ['Voxel']
  },
  {
    name: 'Diffusion FA and V1',
    file: 'modulateAfniDTI.html',
    tags: ['Voxel']
  },
  {
    name: 'Hero image',
    file: 'hero.html',
    tags: ['Voxel']
  },
  {
    name: 'Mosaics',
    file: 'mosaics.html',
    tags: ['Voxel', 'Stat']
  },
  {
    name: 'Mesh mosaics',
    file: 'mosaics2.mesh.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'Cerebellar mosaics',
    file: 'mosaics.mesh.html',
    tags: ['Mesh', 'Stat']
  },
  {
    name: 'World space',
    file: 'worldspace.html',
    tags: ['Voxel']
  },
  {
    name: 'Advanced rendering',
    file: 'shiny.volumes.html',
    tags: ['Voxel', 'Mesh', 'Connectome', 'Tract']
  },
  {
    name: 'Save a scenes',
    file: 'document.load.html',
    tags: ['Voxel']
  },
  {
    name: 'Gradient Opacity',
    file: 'gradient.opacity.html',
    tags: ['Voxel']
  },
  {
    name: 'More demos...',
    file: 'index.html',
    url: 'https://niivue.com/demos/',
    tags: ['Voxel', 'Stat', 'Atlas', 'Mesh', 'Connectome']
  }
];

export default function Gallery() {
  return (
    <Layout title="Gallery" description="Interactive NiiVue Demos">
      <main className={`${styles.gallery} ${styles.fullWidth}`}>
        <div className={styles.grid}>
          {demos.map(demo => (
            <a
              key={demo.file}
              href={demo.url || demoRoot + demo.file}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  {demo.name}
                </div>
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
              <div 
                className={styles.cardThumbnail}
                style={{
                  backgroundImage: `url(/img/thumbs/${demo.file.replace(/\.html$/, '.jpg')})`,
                }}
              ></div>
            </a>
          ))}
        </div>
      </main>
    </Layout>
  )
}

