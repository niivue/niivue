import React, { useState, useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

const baseUrl = 'https://niivue.com';
// Default images for demonstration
const defaultImages = [
  {
    url: `${baseUrl}/images/fslmean.nii.gz`,
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
  {
    url: `${baseUrl}/images/fslt.nii.gz`,
    colormap: "warm",
    colormapNegative: "winter",
    cal_min: 0.3,
    cal_max: 0.6,
    cal_minNeg: -0.6,
    cal_maxNeg: -0.3,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: true,
  backColor: [1, 1, 1, 1],
  show3Dcrosshair: true,
  multiplanarLayout: 2, // Grid layout
};

export const ThresholdingDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [posThreshold, setPosThreshold] = useState(3);
  const [posMax, setPosMax] = useState(6);
  const [negThreshold, setNegThreshold] = useState(3);
  const [negMax, setNegMax] = useState(6);
  const [outlineWidth, setOutlineWidth] = useState(1);
  const [colormapType, setColormapType] = useState(0);
  const [showNegative, setShowNegative] = useState(true);
  const [smooth, setSmooth] = useState(false);
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
          await nv.loadVolumes(defaultImages);
          console.log("Volumes loaded in Niivue.");
          
          // Hide colorbar for anatomical scan
          nv.volumes[0].colorbarVisible = false;
          
          // Set initial values
          updateThresholds();
          nv.setInterpolation(!smooth);
          nv.overlayOutlineWidth = outlineWidth * 0.25;
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

  // Update all threshold values
  const updateThresholds = () => {
    if (!niivueRef.current || !niivueRef.current.volumes || niivueRef.current.volumes.length < 2) {
      return;
    }
    
    const overlay = niivueRef.current.volumes[1];
    
    overlay.cal_min = posThreshold * 0.1;
    overlay.cal_max = posMax * 0.1;
    overlay.cal_minNeg = -negMax * 0.1;
    overlay.cal_maxNeg = -negThreshold * 0.1;
    
    niivueRef.current.updateGLVolume();
  };

  // Effect for positive threshold
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      niivueRef.current.volumes[1].cal_min = posThreshold * 0.1;
      niivueRef.current.updateGLVolume();
    }
  }, [posThreshold]);

  // Effect for positive max
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      niivueRef.current.volumes[1].cal_max = posMax * 0.1;
      niivueRef.current.updateGLVolume();
    }
  }, [posMax]);

  // Effect for negative threshold
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      niivueRef.current.volumes[1].cal_maxNeg = -negThreshold * 0.1;
      niivueRef.current.updateGLVolume();
    }
  }, [negThreshold]);

  // Effect for negative max
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      niivueRef.current.volumes[1].cal_minNeg = -negMax * 0.1;
      niivueRef.current.updateGLVolume();
    }
  }, [negMax]);

  // Effect for outline width
  useEffect(() => {
    if (niivueRef.current) {
      niivueRef.current.overlayOutlineWidth = outlineWidth * 0.25;
      niivueRef.current.updateGLVolume();
    }
  }, [outlineWidth]);

  // Effect for colormap type
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      niivueRef.current.volumes[1].colormapType = colormapType;
      niivueRef.current.updateGLVolume();
    }
  }, [colormapType]);

  // Effect for showing negative
  useEffect(() => {
    if (niivueRef.current && niivueRef.current.volumes && niivueRef.current.volumes.length > 1) {
      if (showNegative) {
        niivueRef.current.setColormapNegative(niivueRef.current.volumes[1].id, "winter");
      } else {
        niivueRef.current.setColormapNegative(niivueRef.current.volumes[1].id, "");
      }
      niivueRef.current.drawScene();
    }
  }, [showNegative]);

  // Effect for smoothing
  useEffect(() => {
    if (niivueRef.current) {
      niivueRef.current.setInterpolation(!smooth);
    }
  }, [smooth]);

  // Handlers for controls
  const handleColormapTypeChange = (event) => {
    setColormapType(parseInt(event.target.value));
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
        {/* Positive threshold controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="posThreshold">+Thresh:</label>
          <input
            type="range"
            id="posThreshold"
            min="1"
            max="50"
            value={posThreshold}
            onChange={(e) => setPosThreshold(parseInt(e.target.value))}
          />
          <span>{(posThreshold * 0.1).toFixed(1)}</span>
        </div>

        {/* Positive max controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="posMax">+Max:</label>
          <input
            type="range"
            id="posMax"
            min="51"
            max="150"
            value={posMax}
            onChange={(e) => setPosMax(parseInt(e.target.value))}
          />
          <span>{(posMax * 0.1).toFixed(1)}</span>
        </div>

        {/* Negative threshold controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="negThreshold">-Thresh:</label>
          <input
            type="range"
            id="negThreshold"
            min="1"
            max="50"
            value={negThreshold}
            onChange={(e) => setNegThreshold(parseInt(e.target.value))}
          />
          <span>{(negThreshold * 0.1).toFixed(1)}</span>
        </div>

        {/* Negative max controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="negMax">-Max:</label>
          <input
            type="range"
            id="negMax"
            min="51"
            max="150"
            value={negMax}
            onChange={(e) => setNegMax(parseInt(e.target.value))}
          />
          <span>{(negMax * 0.1).toFixed(1)}</span>
        </div>
      </div>

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
        {/* Outline width control */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="outlineWidth">Outline:</label>
          <input
            type="range"
            id="outlineWidth"
            min="0"
            max="4"
            value={outlineWidth}
            onChange={(e) => setOutlineWidth(parseInt(e.target.value))}
          />
          <span>{(outlineWidth * 0.25).toFixed(2)}</span>
        </div>

        {/* Colormap type selection */}
        <div>
          <label htmlFor="colormapType" style={{ marginRight: "5px" }}>Alpha Mode:</label>
          <select
            id="colormapType"
            value={colormapType}
            onChange={handleColormapTypeChange}
          >
            <option value="0">Restrict colorbar to range</option>
            <option value="1">Colorbar from 0, transparent subthreshold</option>
            <option value="2">Colorbar from 0, translucent subthreshold</option>
          </select>
        </div>

        {/* Negative colormap checkbox */}
        <div>
          <input
            type="checkbox"
            id="showNegative"
            checked={showNegative}
            onChange={(e) => setShowNegative(e.target.checked)}
          />
          <label htmlFor="showNegative">Negative Colors</label>
        </div>

        {/* Smooth checkbox */}
        <div>
          <input
            type="checkbox"
            id="smooth"
            checked={smooth}
            onChange={(e) => setSmooth(e.target.checked)}
          />
          <label htmlFor="smooth">Smooth</label>
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