import React, { useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

const defaultImages = [
  { url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz" },
];

const defaultNvOpts = {
  isColorbar: true,
  logLevel: "info",
};

export const GestureDemo = ({ images = defaultImages, nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  useEffect(() => {
    const init = async () => {
      if (!niivueRef.current && canvasRef.current) {
        const nv = new Niivue(mergedNvOpts);
        niivueRef.current = nv;
        await nv.attachToCanvas(canvasRef.current);
        nv.setSliceType(nv.sliceTypeAxial);
        await nv.loadVolumes(images);
      }
    };
    init();
    return () => {
      niivueRef.current = null;
    };
  }, []);

  const handleDrag1Change = (e) => {
    const isContrast = e.target.selectedIndex === 1;
    niivueRef.current.opts.dragMode = niivueRef.current.opts.dragModePrimary = isContrast ? 1 : 0;
  };

  const handleDrag2Change = (e) => {
    const mode = e.target.value;
    if (niivueRef.current.dragModes[mode]) {
      niivueRef.current.opts.dragMode = niivueRef.current.dragModes[mode];
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "8px" }}>
      <div style={{ width: 640, height: 480 }}>
        <canvas ref={canvasRef} width={640} height={480} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <label>
          Primary Drag
          &nbsp;
          <select onChange={handleDrag1Change}>
            <option>crosshair</option>
            <option>brightness/contrast</option>
          </select>
        </label>
        &nbsp;&nbsp;
        <label>
          Secondary Drag
          &nbsp;
          <select onChange={handleDrag2Change}>
            <option>contrast</option>
            <option>pan</option>
            <option>measurement</option>
            <option>slicer3D</option>
            <option>none</option>
          </select>
        </label>
      </div>
    </div>
  );
};
