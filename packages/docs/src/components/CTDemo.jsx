import React, { useState, useEffect, useRef } from "react";
import { MULTIPLANAR_TYPE, Niivue, SHOW_RENDER } from "@niivue/niivue";

// Default image if none provided via props
const defaultImages = [
  {
    url: "https://niivue.github.io/niivue-demo-images/CT_Abdo.nii.gz",
    colormap: "ct_kidneys", // Start with gray
    opacity: 1,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true, // Show colorbar by default for demo
  logLevel: "info",
  multiplanarShowRender: SHOW_RENDER.ALWAYS, 
  show3Dcrosshair: true,
};

export const CTDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null); // To store the Niivue instance

  // State for interactive controls
  const [availableColormaps, setAvailableColormaps] = useState([]);
  const [currentRender, setCurrentRender] = useState(0);
  const [currentColormap, setCurrentColormap] = useState(
    images[0]?.colormap || "ct_kidneys"
  );
  const [gamma, setGamma] = useState(1.0);
  const [isInverted, setIsInverted] = useState(false);
  const [clipDark, setClipDark] = useState(false);

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
        nv.opts.backColor = [0.2, 0.2, 0.2, 1];
        nv.isAlphaClipDark = clipDark;
        try {
          console.log("Loading volumes:", images);
          await nv.loadVolumes(images);
          console.log("Volumes loaded.");

          // After loading, get available colormaps
          const maps = nv.colormaps().filter((name) => name.startsWith("ct_"));
          // console.log("Filtered colormaps:", maps);
          setAvailableColormaps(maps);

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

  // Handler for changing rendering mode
  const handleRenderChange = (event) => {
    const newRender = parseFloat(event.target.value);
     niivueRef.current.setVolumeRenderIllumination(newRender)
    setCurrentRender(newRender);
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

  // Effect for clip dark
  useEffect(() => {
    if (niivueRef.current) {
      niivueRef.current.isAlphaClipDark = clipDark;
      niivueRef.current.updateGLVolume();
    }
  }, [clipDark]);

  // Handler for changing gamma
  const handleGammaChange = (event) => {
    const newGamma = parseFloat(event.target.value);
    if (niivueRef.current) {
      console.log(`Setting gamma to: ${newGamma}`);
      niivueRef.current.setGamma(newGamma);
      setGamma(newGamma); // Update component state
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
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            minWidth: "384px",
            minHeight: "512px",
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

        {/* Clip dark checkbox */}
        <div>
          <input
            type="checkbox"
            id="clipDark"
            checked={clipDark}
            onChange={(e) => setClipDark(e.target.checked)}
          />
          <label htmlFor="clipDark">Clip Dark</label>
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

        <div>
          <label htmlFor="renderSelect" style={{ marginRight: "5px" }}>
            Render:
          </label>
          <select
            id="renderSelect"
            value={currentRender}
            onChange={handleRenderChange}
          >
            <option value="-1">slices</option>
            <option value="0">matte</option>
            <option value="0.6">glossy</option>
          </select>
        </div>
      </div>
    </div>
  );
};