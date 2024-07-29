import clsx from 'clsx';
import Heading from '@theme/Heading';
import NiivueCanvas from '../NiivueCanvas';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Runs everywhere',
    description: (
      <>
        NiiVue is a JavaScript library that can be used in any modern web
        environment. It works in all modern browsers, and can be easily
        embedded in any web framework including iOS/Android apps and desktop apps using Electron.
      </>
    ),
  },
  {
    title: 'Simple API',
    description: (
      <>
        NiiVue is designed to be easy to use. Just include the library in your 
        project and start rendering over <strong>30 medical image formats</strong>. 
        NiiVue is platform and framework agnostic.
      </>
    ),
  },
  {
    title: 'Used by the community',
    // Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        The NiiVue library is used by the neuroimaging community by
        both large and small projects. It is used by OpenNeuro, FSL, AFNI, Freesurfer, and BrainLife. 
        Community members have made VS Code extensions, and Jupyter notebook plugins for NiiVue. 
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        {/* <Svg className={styles.featureSvg} role="img" /> */}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <NiivueCanvas
          images={[
            { url: "/niivue/mni152.nii.gz" }
          ]}
          nvOpts={{
            // option to set the initial scene when the viewer is loaded
          }}
        >
        </NiivueCanvas>
      </div>
    </section>
  );
}
