import React, { useState, useEffect, useRef } from "react";
import { MULTIPLANAR_TYPE, Niivue, SHOW_RENDER } from "@niivue/niivue";

const defaultImages = [
  {
    url: "https://niivue.com/demos/images/mni152.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  multiplanarShowRender: SHOW_RENDER.ALWAYS,
  show3Dcrosshair: true,
  backColor: [0.2, 0.2, 0.2, 1],
};

export const ClipDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null); // To store the Niivue instance

  // State for interactive controls
  const [currentClip, setCurrentClip] = useState("2");
  const [currentShade, setCurrentShade] = useState("2");
  const [isCutaway, setIsCutaway] = useState(false);

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue and load volumes on mount
  useEffect(() => {
    const initializeNiivue = async () => {
      // Ensure Niivue instance doesn't already exist
      if (!niivueRef.current && canvasRef.current) {
        console.log("Initializing Niivue...");
        const nv = new Niivue(mergedNvOpts);
        niivueRef.current = nv; // Store the instance
        nv.setSliceType(nv.sliceTypeRender)
        await nv.attachToCanvas(canvasRef.current);
        console.log("Niivue attached to canvas.");

        try {
          console.log("Loading volumes:", images);
          await nv.loadVolumes(images);
          console.log("Volumes loaded.");
          handleClipChange({ target: { value: currentClip } });
          handleShadeChange({ target: { value: currentShade } });

          // Set initial state based on loaded volume
          if (nv.volumes.length > 0) {
            //setCurrentColormap(nv.volumes[0].colormap);
            // setIsInverted(nv.volumes[0].colormapInvert || false);
          }
        } catch (error) {
          console.error("Error loading volumes:", error);
        }
      }
    };

    initializeNiivue();

    return () => {
      console.log("Cleaning up Niivue instance...");
      niivueRef.current = null; // Clear the ref
    };
  }, []); // Run only once on mount

  // Handler for changing clip plane number
  const handleClipChange = (event) => {
    const newClip = event.target.value;
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      const index = parseInt(newClip);
      console.log(`Setting clip planes to: ${newClip}`);
      let clr = niivueRef.current.opts.clipPlaneColor.slice()
      let planes = [[2.0, 180, 20]]
      switch (index) {
        case 1:
          planes = [[0.1, 180, 20]]
          break
        case 2:
          planes = [
            [0.1, 180, 20],
            [0.1, 0, -20],
          ]
          break
        case 3:
          planes = [
            [0.0, 90,  0], //right center
            [0.0, 0, -20], //posterior oblique
            [0.1, 0, -90], //inferior
          ]
          break
        case 4:
          planes = [
            [0.3, 270,  0], //left
            [0.3, 90,  0], //right
            [0.0, 180,  0], //anterior
            [0.1, 0,  0], //posterior
          ]
          break
        case 5:
          planes = [
            [0.4, 270,  0], //left
            [0.3, 90,  0], //right
            [0.4, 180,  0], //anterior
            [0.3, 0,  0], //posterior
            [0.1, 0, -90], //inferior
          ]
          break
        case 6:
          planes = [
            [0.4, 270,  0], //left
            [-0.1, 90,  0], //right
            [0.4, 180,  0], //anterior
            [0.2, 0,  0], //posterior
            [0.1, 0, -90], //inferior
            [0.3, 0, 90] //superior
          ]
          break
      }
      niivueRef.current.setClipPlanes(planes)
      setCurrentClip(newClip); // Update component state
    }
  };

  // Handler for changing clip shading
  const handleShadeChange = (event) => {
    const newShade = event.target.value;
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      const index = parseInt(newShade);
      console.log(`Setting clip shade to: ${newShade}`);
      let clr = niivueRef.current.opts.clipPlaneColor.slice()
      switch (index) {
        case 0:
          clr[3] = 0.0
          break
        case 1:
          clr[3] = 0.5
          break
        case 2:
          clr[3] = -0.5
          break
      }
      niivueRef.current.setClipPlaneColor(clr)
      setCurrentShade(newShade); // Update component state
    }
  };

  // Handler for Cutaway clipping
  const handleCutawayChange = (event) => {
    const isCutaway = event.target.checked;
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      console.log(`Setting isCutaway to: ${isCutaway}`);
      niivueRef.current.opts.isClipPlanesCutaway = isCutaway;
      niivueRef.current.drawScene(); 
      setIsCutaway(isCutaway); // Update component state
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginBottom: "15px",
      }}
    >
      {/* Niivue Canvas */}
      <div
        style={{
          borderRadius: "8px",
          overflow: "hidden", // actually clips child content
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            minWidth: "384px",
            minHeight: "384px",
            width: "100%", // optional: ensures it stretches horizontally
          }}
        ></canvas>
      </div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "15px",
          alignItems: "center",
        }}
      >
        {/* Number of Clip planes Selector */}
        <div>
          <label htmlFor="clipSelect" style={{ marginRight: "5px" }}>
            Clip Planes:
          </label>
          <select
            id="clipSelect"
            value={currentClip}
            onChange={handleClipChange}
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
          </select>
        </div>
        {/* Shade Selector */}
        <div>
          <label htmlFor="shadeSelect" style={{ marginRight: "5px" }}>
            Shade:
          </label>
          <select
            id="shadeSelect"
            value={currentShade}
            onChange={handleShadeChange}
          >
            <option value="0">Transparent</option>
            <option value="1">Shade Outside</option>
            <option value="2">Shade Inside</option>
          </select>
        </div>
        {/* CutawayCheck Checkbox */}
        <div>
          <label htmlFor="cutawayCheck" style={{ marginLeft: "5px" }}>
            Cutaway
          </label>
          <input
            type="checkbox"
            id="cutawayCheck"
            checked={isCutaway}
            onChange={handleCutawayChange}
          />
        </div>
      </div>
    </div>
  );
};