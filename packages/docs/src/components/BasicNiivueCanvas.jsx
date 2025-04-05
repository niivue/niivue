import React, { useRef, useEffect } from "react";
import { Niivue } from "@niivue/niivue";
import BrowserOnly from "@docusaurus/BrowserOnly";

<<<<<<< HEAD
export const NiivueApp = ({ images, nvOpts }) => {
  const canvasRef = useRef(null);
  const niivue = useRef(null);

  useEffect(() => {
    niivue.current = new Niivue({ logLevel: "debug", ...nvOpts });
=======
export const BasicNiivueCanvas = ({ images, nvOpts }) => {
  // get the origin url and prepend it to the url property of the images
  const origin = window.location.origin;
  // needed due to the way docusaurus serves static files with github orgs pages.
  // Only needed if serving files from static/niivue folder, but using images from
  // the niivue-demo-images repo is preferred. 
  // const basePath = '/niivue'; 
  // images = images.map((img) => {
  //   return { ...img, url: origin + basePath + img.url };
  // });
  // canvas ref
  const canvasRef = React.useRef(null);
  const niivue = React.useRef(null);
  // initialise niivue instance on first mount
  React.useEffect(() => {
    niivue.current = new Niivue({logLevel: 'debug', ...nvOpts});
>>>>>>> origin/main
    niivue.current.attachToCanvas(canvasRef.current);
    niivue.current.loadVolumes(images);
  }, []);

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div style={styles.container}>
          <div style={styles.controls}>
            <button onClick={() => niivue.current.setSliceType(1)}>Axial</button>
            <button onClick={() => niivue.current.setSliceType(2)}>Coronal</button>
            <button onClick={() => niivue.current.setSliceType(3)}>Sagittal</button>
          </div>
          <canvas ref={canvasRef} width={640} height={480} style={styles.canvas}></canvas>
        </div>
      )}
    </BrowserOnly>
  );
};

// Styles
const styles = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c2c2c",
    color: "white",
    padding: "20px",
    borderRadius: "10px",
  },
  controls: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  canvas: {
    border: "2px solid #5aaf7b",
    borderRadius: "10px",
  },
};
