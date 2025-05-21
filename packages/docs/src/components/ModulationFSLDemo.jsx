import React, { useState, useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

// Default images for demonstration
const defaultImages = [
  {
    url: "https://niivue.github.io/niivue/images/FA.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: false,
  },
  {
    url: "https://niivue.github.io/niivue/images/V1.nii.gz",
    colormap: "winter",
    opacity: 0,
    visible: false,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true,
  backColor: [0.0, 0.0, 0.2, 1],
  show3Dcrosshair: true,
  multiplanarLayout: 2, // Grid layout
};

export const ModulationFSLDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [displayMode, setDisplayMode] = useState(4); // Default to Lines modulated by FA
  const [faMin, setFaMin] = useState(0);
  const [faMax, setFaMax] = useState(100);
  const [clipDark, setClipDark] = useState(true);
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

        // Set drag mode to pan
        nv.opts.dragMode = nv.dragModes.pan;
        nv.opts.yoke3Dto2DZoom = true;
        nv.setCrosshairWidth(0.1);
        
        // V1 aided if all views show voxel centers
        nv.opts.isForceMouseClickToVoxelCenters = true;

        await nv.attachToCanvas(canvasRef.current);
        console.log("Niivue attached to canvas.");

        try {
          await nv.loadVolumes(defaultImages);
          console.log("Volumes loaded in Niivue.");
          
          // V1 lines requires nearest neighbor interpolation
          nv.setInterpolation(true);
          
          // Set initial values
          updateDisplayMode(displayMode);
          updateThresholds();
          nv.isAlphaClipDark = clipDark;
          
          // Set initial crosshair position
          nv.scene.crosshairPos = nv.vox2frac([41, 46, 28]);
          
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

  // Update display mode
  const updateDisplayMode = (mode) => {
    if (!niivueRef.current || !niivueRef.current.volumes || niivueRef.current.volumes.length < 2) {
      return;
    }
    
    const nv = niivueRef.current;
    
    if (mode === 0) {
      // Show FA only
      nv.setOpacity(0, 1.0);
      nv.setOpacity(1, 0.0);
    } else if (mode > 2) {
      // Show both (for lines or modulation)
      nv.setOpacity(0, 1.0);
      nv.setOpacity(1, 1.0);
    } else {
      // Show V1 only
      nv.setOpacity(0, 0.0);
      nv.setOpacity(1, 1.0);
    }
    
    // Apply modulation if needed
    if (mode === 2 || mode === 4) {
      nv.setModulationImage(nv.volumes[1].id, nv.volumes[0].id);
    } else {
      nv.setModulationImage(nv.volumes[1].id, '');
    }
    
    // Set V1 slice shader for line modes
    nv.opts.isV1SliceShader = (mode > 2);
    
    nv.updateGLVolume();
  };

  // Update FA thresholds
  const updateThresholds = () => {
    if (!niivueRef.current || !niivueRef.current.volumes || niivueRef.current.volumes.length < 2) {
      return;
    }
    
    // Convert percent values to actual FA values (0-1)
    const min = Math.min(faMin, faMax) * 0.01;
    const max = Math.max(faMin, faMax) * 0.01;
    
    niivueRef.current.volumes[0].cal_min = min;
    niivueRef.current.volumes[0].cal_max = max;
    niivueRef.current.updateGLVolume();
  };

  // Effect for display mode
  useEffect(() => {
    updateDisplayMode(displayMode);
  }, [displayMode]);

  // Effect for FA min/max
  useEffect(() => {
    updateThresholds();
  }, [faMin, faMax]);

  // Effect for clip dark
  useEffect(() => {
    if (niivueRef.current) {
      niivueRef.current.isAlphaClipDark = clipDark;
      niivueRef.current.updateGLVolume();
    }
  }, [clipDark]);

  // Handler for display mode change
  const handleDisplayModeChange = (event) => {
    setDisplayMode(parseInt(event.target.value));
  };

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
        {/* Display mode selection */}
        <div>
          <label htmlFor="displayMode" style={{ marginRight: "5px" }}>Display:</label>
          <select
            id="displayMode"
            value={displayMode}
            onChange={handleDisplayModeChange}
          >
            <option value="0">FA</option>
            <option value="1">V1</option>
            <option value="2">V1 modulated by FA</option>
            <option value="3">Lines</option>
            <option value="4">Lines modulated by FA</option>
          </select>
        </div>

        {/* FA min slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="faMin">FA min:</label>
          <input
            type="range"
            id="faMin"
            min="0"
            max="100"
            value={faMin}
            onChange={(e) => setFaMin(parseInt(e.target.value))}
          />
          <span>{(faMin * 0.01).toFixed(2)}</span>
        </div>

        {/* FA max slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="faMax">FA max:</label>
          <input
            type="range"
            id="faMax"
            min="0"
            max="100"
            value={faMax}
            onChange={(e) => setFaMax(parseInt(e.target.value))}
          />
          <span>{(faMax * 0.01).toFixed(2)}</span>
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
      </div>

      {/* Canvas container */}
      <div style={{ 
        width: "100%",
        height: 512,
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%" }}
        ></canvas>
      </div>

      {/* Intensity display */}
      <div style={{ fontFamily: "monospace" }}>{intensity}</div>
    </div>
  );
}; 