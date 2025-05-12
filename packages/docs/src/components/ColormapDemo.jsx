import React, { useState, useEffect, useRef } from "react";
import { MULTIPLANAR_TYPE, Niivue, SHOW_RENDER } from "@niivue/niivue";

// Default image if none provided via props
const defaultImages = [
  {
    url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz",
    colormap: "gray", // Start with gray
    opacity: 1,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true, // Show colorbar by default for demo
  logLevel: "info",
  multiplanarShowRender: SHOW_RENDER.ALWAYS, 
  multiplanarLayout: MULTIPLANAR_TYPE.GRID
};

export const ColormapDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null); // To store the Niivue instance

  // State for interactive controls
  const [availableColormaps, setAvailableColormaps] = useState([]);
  const [currentColormap, setCurrentColormap] = useState(
    images[0]?.colormap || "gray"
  );
  const [gamma, setGamma] = useState(1.0);
  const [isInverted, setIsInverted] = useState(false);
  const [isColorbarVisible, setIsColorbarVisible] = useState(defaultNvOpts.isColorbar);

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

        await nv.attachToCanvas(canvasRef.current);
        console.log("Niivue attached to canvas.");

        try {
          console.log("Loading volumes:", images);
          await nv.loadVolumes(images);
          console.log("Volumes loaded.");

          // After loading, get available colormaps
          const maps = nv.colormaps();
          console.log("Available colormaps:", maps);
          setAvailableColormaps(maps);

          // Sync colorbar state with Niivue instance
          setIsColorbarVisible(nv.opts.isColorbar);

          // Set initial state based on loaded volume
          if (nv.volumes.length > 0) {
            setCurrentColormap(nv.volumes[0].colormap);
            setIsInverted(nv.volumes[0].colormapInvert || false);
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

  // Handler for changing colormap
  const handleColormapChange = (event) => {
    const newColormap = event.target.value;
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      const volumeId = niivueRef.current.volumes[0].id;
      console.log(`Setting colormap to: ${newColormap}`);
      niivueRef.current.setColormap(volumeId, newColormap);
      setCurrentColormap(newColormap); // Update component state
    }
  };

  // Handler for inverting colormap
  const handleInvertChange = (event) => {
    const inverted = event.target.checked;
    if (niivueRef.current && niivueRef.current.volumes.length > 0) {
      console.log(`Setting colormap invert to: ${inverted}`);
      niivueRef.current.volumes[0].colormapInvert = inverted;
      niivueRef.current.updateGLVolume(); // Required after changing colormapInvert
      setIsInverted(inverted); // Update component state
    }
  };

  // Handler for changing gamma
  const handleGammaChange = (event) => {
    const newGamma = parseFloat(event.target.value);
    if (niivueRef.current) {
      console.log(`Setting gamma to: ${newGamma}`);
      niivueRef.current.setGamma(newGamma);
      setGamma(newGamma); // Update component state
    }
  };

  // Handler to toggle colorbar
  const handleToggleColorbar = () => {
    if (niivueRef.current) {
      const nv = niivueRef.current;
      nv.opts.isColorbar = !nv.opts.isColorbar;
      setIsColorbarVisible(nv.opts.isColorbar);
      nv.drawScene();
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
      <div style={{ width: 640, height: 480 }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ border: "1px solid lightgray", display: "block" }}
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
        {/* Toggle Colorbar Button */}
        <button onClick={handleToggleColorbar} disabled={!niivueRef.current}>
          {isColorbarVisible ? "Hide Colorbar" : "Show Colorbar"}
        </button>

        {/* Colormap Selector */}
        <div>
          <label htmlFor="colormapSelect" style={{ marginRight: "5px" }}>
            Colormap:
          </label>
          <select
            id="colormapSelect"
            value={currentColormap}
            onChange={handleColormapChange}
            disabled={availableColormaps.length === 0}
          >
            {availableColormaps.length === 0 ? (
              <option>Loading...</option>
            ) : (
              availableColormaps.map((map) => (
                <option key={map} value={map}>
                  {map}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Invert Checkbox */}
        <div>
          <input
            type="checkbox"
            id="invertCheck"
            checked={isInverted}
            onChange={handleInvertChange}
            disabled={!niivueRef.current || niivueRef.current.volumes.length === 0}
          />
          <label htmlFor="invertCheck" style={{ marginLeft: "5px" }}>
            Invert
          </label>
        </div>

        {/* Gamma Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="gammaSlider">Gamma:</label>
          <input
            type="range"
            id="gammaSlider"
            min="0.1"
            max="3.0"
            step="0.1"
            value={gamma}
            onChange={handleGammaChange}
            disabled={!niivueRef.current}
          />
          <span>{gamma.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};