import React from "react";
import { Niivue } from "@niivue/niivue";

export default function NiivueCanvas({ images, nvOpts }) {
  // get the origin url and prepend it to the url propery of the images
  const origin = window.location.origin;
  const basePath = '/niivue'; // needed due to the way docusaurus serves static files with github orgs pages
  images = images.map((img) => {
    return { ...img, url: origin + basePath + img.url };
  });
  // canvas ref
  const canvasRef = React.useRef(null);
  const niivue = React.useRef(null);
  console.log('images', images);
  // on mount
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