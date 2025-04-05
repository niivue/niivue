import React from "react";
import { Niivue } from "@niivue/niivue";

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
    niivue.current.attachToCanvas(canvasRef.current);
    niivue.current.loadVolumes(images);
  }, []);

  return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <canvas ref={canvasRef} width={640} height={480}></canvas>
      </div>
  );
}