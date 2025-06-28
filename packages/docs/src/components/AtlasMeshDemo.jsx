import React, { useState, useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

const baseUrl = 'https://niivue.com/demos/images';


const meshLayer = [{
  url: `${baseUrl}/lh.Yeo2011.gii`,
  opacity: 0.5,
},]

const defaultMeshes = [
  { url: `${baseUrl}/lh.pial`, rgba255: [255, 255, 255, 255], layers: meshLayer  },
]

// Default Niivue options
const defaultNvOpts = {
  backColor: [1, 1, 1, 1],
  show3Dcrosshair: true,
};

export const AtlasMeshDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [alpha, setAlpha] = useState(5);
  const [intensity, setIntensity] = useState("");

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue instance and load volumes on mount
  useEffect(() => {
    const initializeNiivue = async () => {
      if (!niivueRef.current && canvasRef.current) {
        console.log("Initializing Niivue...");
        const nv = new Niivue({
          ...mergedNvOpts,
          onLocationChange: (data) => setIntensity(data.string)
        });
        niivueRef.current = nv;

        await nv.attachToCanvas(canvasRef.current);
        console.log("Niivue attached to canvas.");

        try {
          await niivueRef.current.loadMeshes(defaultMeshes);
          nv.updateGLVolume();
        } catch (error) {
          console.error("Error loading volumes:", error);
        }
      }
    };

    initializeNiivue();

    return () => {
      console.log("Cleaning up Niivue instance...");
      niivueRef.current = null;
    };
  }, []);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          const theme = document.documentElement.getAttribute("data-theme")
          const isDark = theme === "dark"
          if (niivueRef.current) {
            niivueRef.current.opts.backColor = isDark ? [27/255, 27/255, 27/255, 1] : [0.60, 0.65, 0.7, 1]
            niivueRef.current.drawScene() // refresh render
          }
        }
      }
    })
  
    observer.observe(document.documentElement, { attributes: true })
  
    // Optional: set initial theme immediately
    const initialTheme = document.documentElement.getAttribute("data-theme")
    const isDark = initialTheme === "dark"
    if (niivueRef.current) {
      niivueRef.current.opts.backColor = isDark ? [27/255, 27/255, 27/255, 1] : [0.60, 0.65, 0.7, 1]
      niivueRef.current.drawScene()
    }
  
    return () => observer.disconnect()
  }, [])


  // Handlers for controls
  
  // Handler for changing mesh layer opacity
  const handleAlphaChange = (event) => {
    const newAlpha = parseFloat(event.target.value);
    if (niivueRef.current) {
      niivueRef.current.setMeshLayerProperty(0, 0, "opacity", newAlpha * 0.1)
      niivueRef.current.updateGLVolume();
      setAlpha(newAlpha); // Update component state
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "4px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        minWidth: "640px",
        margin: "0 auto 4px auto",
      }}
    >
      {/* Controls above viewer */}
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
        {/* Alpha slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="alpha">Opacity:</label>
          <input
            type="range"
            id="alpha"
            min="0"
            max="10"
            step="1"
            value={alpha}
            onChange={handleAlphaChange}
          />
          <span>{(alpha * 0.1).toFixed(1)}</span>
        </div>
      </div>
      {/* Canvas container */}
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
            minWidth: "512px",
            minHeight: "384px",
            width: "100%", // optional: ensures it stretches horizontally
          }}
        ></canvas>
      </div>

      {/* Intensity display */}
      <div style={{ fontFamily: "monospace" }}>{intensity}</div>
    </div>
  );
}; 