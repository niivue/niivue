import React, { useState, useEffect, useRef } from "react";
import { MULTIPLANAR_TYPE, Niivue, SHOW_RENDER } from "@niivue/niivue";

const baseUrl = 'https://niivue.com/demos/fonts/'
// Default image if none provided via props
const defaultImages = [
  {
    url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz",
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true, // Show colorbar by default for demo
  logLevel: "info",
  multiplanarShowRender: SHOW_RENDER.ALWAYS, 
  multiplanarLayout: MULTIPLANAR_TYPE.GRID
};

export const FontDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null); // To store the Niivue instance

  // State for interactive controls
  const [currentFont, setCurrentFont] = useState("Roboto");
  const [fontSize, setFontSize] = useState(13.0);

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
        nv.opts.fontSizeScaling = 0;
        nv.setSliceType(0)
        try {
          console.log("Loading volumes:", images);
          await nv.loadVolumes(images);
          console.log("Volumes loaded.");


          // Set initial state based on loaded volume
          //if (nv.volumes.length > 0) {
          //  setCurrentFont(nv.volumes[0].colormap);
          //}
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

  // Handler for changing Font
  const handleFontChange = (event) => {
    const newFont = event.target.value;
    console.log(`Loading: ${baseUrl}${newFont}.png`)
    niivueRef.current.loadFont(`${baseUrl}${newFont}.png`, `${baseUrl}${newFont}.json`)

  };


  // Handler for changing FontSize
  const handleFontSizeChange = (event) => {
    const newFontSize = parseFloat(event.target.value);
    if (niivueRef.current) {
      console.log(`Setting size to: ${newFontSize}`);
      niivueRef.current.opts.fontMinPx = newFontSize
      niivueRef.current.resizeListener()
      niivueRef.current.drawScene()
      setFontSize(newFontSize); // Update component state
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
        {/* Font Selector */}
        <label htmlFor="fontSelect">Font </label>
        <select id="fontSelect" onChange={handleFontChange}>
          <option value="Roboto-Regular">Roboto-Regular</option>
          <option value="Garamond">Garamond</option>
          <option value="Ubuntu">Ubuntu</option>
          <option value="UbuntuBold">UbuntuBold</option>
        </select>
        {/* FontSize Slider */}
          <label htmlFor="fontSizeSlider">FontSize:</label>
          <input
            type="range"
            id="fontSizeSlider"
            min="8"
            max="64"
            step="1"
            value={fontSize}
            onChange={handleFontSizeChange}
          />
          <span>{fontSize.toFixed(1)}</span>

      </div>
    </div>
  );
};