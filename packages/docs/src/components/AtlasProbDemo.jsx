import React, { useState, useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

const baseUrl = 'https://niivue.github.io/niivue-demo-images/Cerebellum/';
// Default images for demonstration
const defaultImages = [
  {
    url: `${baseUrl}/MNI152NLin6AsymC.nii.gz`,
  },
  {
    url: `${baseUrl}/atl-Anatom.nii.gz`,
    opacity: 0.5,
  },
];

// Default Niivue options
const defaultNvOpts = {
  backColor: [1, 1, 1, 1],
  show3Dcrosshair: true,
  multiplanarLayout: 2, // Grid layout
};

export const AtlasProbDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [currentEase, setCurrentEase] = useState(0);
  const [intensity, setIntensity] = useState("");

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  let activeIdx = - 1
  function handleLocationChange(data) {
    setIntensity(data.string)
    let idx = data.values[1].value
    if ((isFinite(idx)) && (idx !== activeIdx)) {
      activeIdx = idx
      niivueRef.current.opts.atlasActiveIndex = activeIdx
      niivueRef.current.updateGLVolume()
    }
  }
  // Initialize Niivue instance and load volumes on mount
  useEffect(() => {
    const initializeNiivue = async () => {
      if (!niivueRef.current && canvasRef.current) {
        console.log("Initializing Niivue...");
        const nv = new Niivue({
          ...mergedNvOpts,
          onLocationChange: handleLocationChange
        });
        niivueRef.current = nv;
        await nv.attachToCanvas(canvasRef.current);
        try {
          await nv.loadVolumes(defaultImages);
          console.log("Volumes loaded in Niivue.");
          let cmap = await (await fetch(`${baseUrl}/atl-Anatom.json`)).json();
          nv.volumes[1].setColormapLabel(cmap)
          // nv.setVolumeRenderIllumination(0.6)
          nv.opts.dragMode = nv.dragModes['pan'];
          setEase(currentEase);
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
            niivueRef.current.opts.backColor = isDark ? [0, 0, 0, 1] : [1, 1, 1, 1]
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
      niivueRef.current.opts.backColor = isDark ? [0, 0, 0, 1] : [1, 1, 1, 1]
      niivueRef.current.drawScene()
    }
  
    return () => observer.disconnect()
  }, [])
  
  const setEase = (newEase) => {
    console.log(`>>> setEase`, newEase)
    let paqdUniforms = [0.4, 0.6, 0.6, 0.8]; // Default: Translucency
    if (newEase === 0) {
      paqdUniforms = [0.2, 0.7, 0.9, 0.4]; // Rim
    }
    if (niivueRef.current) {
      niivueRef.current.opts.paqdUniforms = paqdUniforms;
      niivueRef.current.updateGLVolume();
    }
    setCurrentEase(newEase);
  };
  // Handlers for controls
  const handleEaseChange = (event) => {
    const newEase = event.target.selectedIndex;
    setEase(newEase);
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
        marginBottom: "4px",
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
        {/* Ease drop down */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <select
            id="easeSelect"
            value={currentEase}
            onChange={handleEaseChange}
          >
            <option value={0}>Rim</option>
            <option value={1}>Translucent</option>
          </select>
        </div>
      </div>
      {/* Canvas container */}
      <div style={{ 
        width: "100%",
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%" , minHeight: "512px",}}
        ></canvas>
      </div>

      {/* Intensity display */}
      <div style={{ fontFamily: "monospace" }}>{intensity || "\u00A0"}</div>
    </div>
  );
}; 