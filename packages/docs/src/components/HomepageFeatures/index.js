import clsx from 'clsx';
import Heading from '@theme/Heading';
import { NiivueBrowserWrapper } from '../NiivueBrowserWrapper';
import { BasicNiivueCanvas } from '../BasicNiivueCanvas';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Cross-Platform',
    description: (
      <>
        Runs seamlessly across all modern browsers and mobile devices.
      </>
    ),
  },
  {
    title: 'Developer-Friendly',
    description: (
      <>
        Intuitive API designed for rapid integration and development.
      </>
    ),
  },
  {
    title: 'Extensible',
    description: (
      <>
        Community adoption with <a style={{textDecoration: 'underline'}} href='https://github.com/niivue/niivue?tab=readme-ov-file#projects-and-people-using-niivue' target='_blank' rel='noopener noreferrer'>plugins, extensions, and integrations</a>.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
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
        <NiivueBrowserWrapper>
          <BasicNiivueCanvas
            images={[
              { url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz" }
            ]}
            nvOpts={{}}
          />
        </NiivueBrowserWrapper>
      </div>
    </section>
  );
}
