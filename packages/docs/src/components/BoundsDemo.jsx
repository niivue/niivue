import React, { useRef, useEffect, useState } from "react";
import { Niivue, SLICE_TYPE } from "@niivue/niivue";

const defaultImages = [
  {
    url: "https://niivue.com/demos/images/mni152.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
];

export const BoundsDemo = ({ images = defaultImages }) => {
  const canvasRef = useRef(null);
  const nv1Ref = useRef(null);
  const nv2Ref = useRef(null);

  const [nv1Bounds, setNv1Bounds] = useState("0,0,0.5,0.5"); // bottom-left
  const [nv2Bounds, setNv2Bounds] = useState("0.5,0.5,1,1"); // top-right

  // Initialize two instances
  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current) return;

      const nv1 = new Niivue({ bounds: [[0, 0], [0.5, 0.5]], isColorbar: false });
      const nv2 = new Niivue({ bounds: [[0.5, 0.5], [1.0, 1.0]], isColorbar: false });

      nv1Ref.current = nv1;
      nv2Ref.current = nv2;

      await nv1.attachToCanvas(canvasRef.current);
      await nv2.attachToCanvas(canvasRef.current);

      await nv1.loadVolumes(images);
      await nv2.loadVolumes([{ ...images[0], colormap: "hot" }]);

      nv1.setSliceType(SLICE_TYPE.MULTIPLANAR);
      nv2.setSliceType(SLICE_TYPE.MULTIPLANAR);

      nv1.drawScene();
      nv2.drawScene();
    };

    init();

    return () => {
      nv1Ref.current = null;
      nv2Ref.current = null;
    };
  }, [images]);

  // Helper to parse and apply bounds
  const applyBounds = (nv, value) => {
    const parts = value.split(",").map(parseFloat);
    nv.setBounds(parts);

    // Redraw both (shared canvas)
    nv1Ref.current?.drawScene();
    nv2Ref.current?.drawScene();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="boundsCanvas"
        width={640}
        height={480}
        style={{ display: "block", width: "640px", height: "480px" }}
      ></canvas>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <div>
          <label>Instance 1 Bounds: </label>
          <select
            value={nv1Bounds}
            onChange={(e) => {
              setNv1Bounds(e.target.value);
              applyBounds(nv1Ref.current, e.target.value);
            }}
          >
            <option value="0,0.5,0.5,1">Top-left</option>
            <option value="0.5,0.5,1,1">Top-right</option>
            <option value="0,0,0.5,0.5">Bottom-left</option>
            <option value="0.5,0,1,0.5">Bottom-right</option>
            <option value="0,0,1,1">Full canvas</option>
          </select>
        </div>
        <div>
          <label>Instance 2 Bounds: </label>
          <select
            value={nv2Bounds}
            onChange={(e) => {
              setNv2Bounds(e.target.value);
              applyBounds(nv2Ref.current, e.target.value);
            }}
          >
            <option value="0,0.5,0.5,1">Top-left</option>
            <option value="0.5,0.5,1,1">Top-right</option>
            <option value="0,0,0.5,0.5">Bottom-left</option>
            <option value="0.5,0,1,0.5">Bottom-right</option>
            <option value="0,0,1,1">Full canvas</option>
          </select>
        </div>
      </div>
    </div>
  );
};
