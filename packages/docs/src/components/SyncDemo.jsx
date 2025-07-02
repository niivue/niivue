import React, { useState, useEffect, useRef } from "react";
import { MULTIPLANAR_TYPE, Niivue, SHOW_RENDER } from "@niivue/niivue";

// Default images for our two viewers
const defaultImages1 = [
  {
    url: "https://niivue.github.io/niivue-demo-images/pcasl.nii.gz",
    colormap: "turbo",
    opacity: 1,
    visible: true,
  },
];

const defaultImages2 = [
  {
    url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true,
  logLevel: "info",
  multiplanarShowRender: SHOW_RENDER.ALWAYS,
  multiplanarLayout: MULTIPLANAR_TYPE.GRID,
  show3Dcrosshair: true,
  backColor: [1, 1, 1, 1],
};

export const SyncDemo = ({
  nvOpts = {},
}) => {

  //functions match background color for theme
  function cssColorToRgbaArray(color) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return [0, 0, 0, 1]
    try {
      ctx.fillStyle = color
      const computed = ctx.fillStyle
      // Case 1: rgb(...) or rgba(...)
      if (computed.startsWith('rgb')) {
        const match = computed.match(/\d+(\.\d+)?/g)
        if (match && match.length >= 3) {
          const [r, g, b, a = 1] = match.map(Number)
          console.log(`${color} -> ${computed} -> ${r} ${g} ${b}`)
          return [r / 255, g / 255, b / 255, Number(a)]
        }
      }
      // Case 2: fallback hex format like "#1b1b1d"
      if (computed.startsWith('#') && computed.length === 7) {
        const r = parseInt(computed.slice(1, 3), 16)
        const g = parseInt(computed.slice(3, 5), 16)
        const b = parseInt(computed.slice(5, 7), 16)
        console.log(`${color} -> ${computed} -> ${r} ${g} ${b}`)
        return [r / 255, g / 255, b / 255, 1]
      }
      throw new Error(`Unrecognized color format: '${computed}'`)
    } catch (e) {
      console.warn(`cssColorToRgbaArray fallback for color '${color}': ${e.message}`)
      return [0, 0, 0, 1]
    }
  }

  function updateBackgroundColor() {
    const computedColor = getComputedStyle(document.documentElement).backgroundColor
    const rgbaArray = cssColorToRgbaArray(computedColor)
    if (niivue2Ref.current) {
      niivue2Ref.current.opts.backColor = rgbaArray
      niivue2Ref.current.drawScene()
    }
    if (niivue1Ref.current) {
      niivue1Ref.current.opts.backColor = rgbaArray
      niivue1Ref.current.drawScene()
    }
  }

  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const niivue1Ref = useRef(null);
  const niivue2Ref = useRef(null);
  
  // State for sync settings and display
  const [syncMode, setSyncMode] = useState(3); // 0=none, 1=2D, 2=3D, 3=both
  const [layout, setLayout] = useState(0); // 0=auto, 1=column, 2=grid, 3=row
  const [canvasHeight, setCanvasHeight] = useState(256);
  const [gamma, setGamma] = useState(1.0);
  const [intensity1, setIntensity1] = useState("");
  const [intensity2, setIntensity2] = useState("");

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue instances and load volumes on mount
  useEffect(() => {
    const initializeNiivueInstances = async () => {
      // Initialize first Niivue instance
      if (!niivue1Ref.current && canvas1Ref.current) {
        console.log("Initializing Niivue 1...");
        const nv1 = new Niivue({
          ...mergedNvOpts,
          onLocationChange: (data) => setIntensity1(data.string)
        });
        niivue1Ref.current = nv1;

        await nv1.attachToCanvas(canvas1Ref.current);
        console.log("Niivue 1 attached to canvas.");

        try {
          await nv1.loadVolumes(defaultImages1);
          console.log("Volumes loaded in Niivue 1.");
        } catch (error) {
          console.error("Error loading volumes in Niivue 1:", error);
        }
      }

      // Initialize second Niivue instance
      if (!niivue2Ref.current && canvas2Ref.current) {
        console.log("Initializing Niivue 2...");
        const nv2 = new Niivue({
          ...mergedNvOpts,
          onLocationChange: (data) => setIntensity2(data.string)
        });
        niivue2Ref.current = nv2;

        await nv2.attachToCanvas(canvas2Ref.current);
        console.log("Niivue 2 attached to canvas.");

        try {
          await nv2.loadVolumes(defaultImages2);
          console.log("Volumes loaded in Niivue 2.");
          updateBackgroundColor()
          // Initial synchronization setup once both instances are initialized
          setupSynchronization(syncMode);
        } catch (error) {
          console.error("Error loading volumes in Niivue 2:", error);
        }
      }
    };

    initializeNiivueInstances();

    return () => {
      console.log("Cleaning up Niivue instances...");
      niivue1Ref.current = null;
      niivue2Ref.current = null;
    };
  }, []);

  // Setup synchronization between the two viewers
  const setupSynchronization = (mode) => {
    if (!niivue1Ref.current || !niivue2Ref.current) return;

    const nv1 = niivue1Ref.current;
    const nv2 = niivue2Ref.current;

    // Determine sync configuration based on mode
    // 0: None, 1: 2D only, 2: 3D only, 3: Both 2D and 3D
    let sync2D = (mode % 2) === 1; // Odd numbers include 2D
    let sync3D = mode >= 2; // 2 or higher includes 3D

    // Set up bidirectional sync
    nv1.broadcastTo([nv2], { "2d": sync2D, "3d": sync3D });
    nv2.broadcastTo([nv1], { "2d": sync2D, "3d": sync3D });
  };

  // Update synchronization when mode changes
  useEffect(() => {
    setupSynchronization(syncMode);
  }, [syncMode]);

  // Update layout when it changes
  useEffect(() => {
    if (niivue1Ref.current && niivue2Ref.current) {
      niivue1Ref.current.setMultiplanarLayout(layout);
      niivue2Ref.current.setMultiplanarLayout(layout);
    }
  }, [layout]);

  // Update canvas height when it changes
  useEffect(() => {
    if (canvas1Ref.current && canvas2Ref.current && niivue1Ref.current && niivue2Ref.current) {
      canvas1Ref.current.height = canvasHeight;
      canvas2Ref.current.height = canvasHeight;
      niivue1Ref.current.resizeListener();
      niivue2Ref.current.resizeListener();
    }
  }, [canvasHeight]);

  // Handler for sync mode change
  const handleSyncModeChange = (event) => {
    const mode = parseInt(event.target.value);
    setSyncMode(mode);
  };

  // Handler for layout change
  const handleLayoutChange = (event) => {
    const newLayout = parseInt(event.target.value);
    setLayout(newLayout);
  };

  // Handler for canvas height change
  const handleCanvasHeightChange = (event) => {
    const height = parseInt(event.target.value);
    setCanvasHeight(height);
  };

  // Handler for gamma change
  const handleGammaChange = (event) => {
    const newGamma = parseFloat(event.target.value);
    if (niivue1Ref.current) {
      niivue1Ref.current.setGamma(newGamma);
      // This will sync to the other viewer if 3D sync is enabled
      const canvas = niivue1Ref.current.gl.canvas;
      canvas.focus();
      niivue1Ref.current.sync();
      canvas.blur();
      setGamma(newGamma);
    }
  };

  // Effect to set back color to match theme
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
        updateBackgroundColor()
      }
    }
  })

  observer.observe(document.documentElement, { attributes: true })

  updateBackgroundColor()

  return () => observer.disconnect()
}, [])


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginBottom: "15px",
      }}
    >
      {/* Controls above viewers */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "15px",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Layout Selection */}
        <div>
          <label htmlFor="layout" style={{ marginRight: "5px" }}>Layout:</label>
          <select
            id="layout"
            value={layout}
            onChange={handleLayoutChange}
          >
            <option value="0">Auto</option>
            <option value="1">Column</option>
            <option value="2">Grid</option>
            <option value="3">Row</option>
          </select>
        </div>

        {/* Canvas Height Selection */}
        <div>
          <label htmlFor="canvasHeight" style={{ marginRight: "5px" }}>Height:</label>
          <select
            id="canvasHeight"
            value={canvasHeight}
            onChange={handleCanvasHeightChange}
          >
            <option value="256">256</option>
            <option value="512">512</option>
            <option value="768">768</option>
          </select>
        </div>

        {/* Sync Mode Selection */}
        <div>
          <label htmlFor="syncMode" style={{ marginRight: "5px" }}>Broadcast:</label>
          <select
            id="syncMode"
            value={syncMode}
            onChange={handleSyncModeChange}
          >
            <option value="0">Sync Disabled</option>
            <option value="1">Sync 2D</option>
            <option value="2">Sync 3D</option>
            <option value="3">Sync 2D and 3D</option>
          </select>
        </div>

        {/* Gamma Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="gammaSlider">Gamma:</label>
          <input
            type="range"
            id="gammaSlider"
            min="0.1"
            max="4.0"
            step="0.1"
            value={gamma}
            onChange={handleGammaChange}
          />
          <span>{gamma.toFixed(1)}</span>
        </div>
      </div>

      {/* Canvas container for two Niivue instances side by side */}
      <div style={{ 
        display: "flex", 
        flexDirection: "row", 
        gap: "10px",
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%"
      }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ height: "100%", width: "100%" }}>
            <canvas
              ref={canvas1Ref}
              style={{minHeight: "256px"}}
            ></canvas>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ height: "100%", width: "100%" }}>
            <canvas
              ref={canvas2Ref}
              style={{minHeight: "256px"}}
            ></canvas>
          </div>
        </div>
      </div>

      {/* Intensity display */}
      <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
        <div style={{ fontFamily: "monospace" }}>{intensity1}</div>
        <div style={{ fontFamily: "monospace" }}>{intensity2}</div>
      </div>
    </div>
  );
}; 