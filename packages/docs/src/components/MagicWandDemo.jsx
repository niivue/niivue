import React, { useState, useEffect, useRef, useCallback } from "react";
import { Niivue, SHOW_RENDER } from "@niivue/niivue";

const baseUrl = 'https://niivue.com/demos'

// Default image for demonstration
const defaultImage = {
  url: `${baseUrl}/images/FLAIR.nii.gz`,
  colormap: "gray",
  opacity: 1,
  visible: true,
};

// Default Niivue options
const defaultNvOpts = {
  clickToSegmentIs2D: true,
  clickToSegment: true,
  clickToSegmentAutoIntensity: true,
  dragAndDropEnabled: true,
  logLevel: "info",
  backColor: [1, 1, 1, 1],
};

export const MagicWandDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [viewType, setViewType] = useState("MultiPlanarRender");
  const [locationText, setLocationText] = useState("");
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Setup a memoized handler for view type changes
  const handleViewTypeChange = useCallback((event) => {
    setViewType(event.target.value);
  }, []);

  // Setup a memoized handler for location changes
  const handleLocationChange = useCallback((data) => {
    setLocationText(data.string);
  }, []);

  // Create Niivue instance only once
  useEffect(() => {
    if (!niivueRef.current) {
      console.log("Creating Niivue instance...");
      niivueRef.current = new Niivue({
        ...mergedNvOpts,
        onLocationChange: handleLocationChange
      });
    }

    return () => {
      console.log("Cleaning up Niivue instance...");
      niivueRef.current = null;
    };
  }, []);

  // Set up a ref callback to detect when the canvas is actually in the DOM
  const canvasRefCallback = useCallback(node => {
    canvasRef.current = node;
    setIsCanvasMounted(!!node);
  }, []);

  // Attach to canvas and load data when canvas is mounted and available
  useEffect(() => {
    if (!isCanvasMounted || !canvasRef.current || !niivueRef.current) return;
    
    // Ensure canvas dimensions are set before attachment
    if (canvasRef.current && !canvasRef.current.width) {
      canvasRef.current.width = canvasRef.current.clientWidth;
      canvasRef.current.height = canvasRef.current.clientHeight;
    }

    const attachAndLoadData = async () => {
      try {
        // Add a small delay to ensure DOM is fully processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("Attaching Niivue to canvas...");
        await niivueRef.current.attachToCanvas(canvasRef.current);
        console.log("Niivue attached to canvas successfully");
        
        console.log("Loading volume data...");
        await niivueRef.current.loadVolumes([defaultImage]);
        console.log("Volume loaded in Niivue");
        
        // Setup for magic wand segmentation
        niivueRef.current.setDrawingEnabled(true);
        niivueRef.current.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS;
        niivueRef.current.setSliceType(niivueRef.current.sliceTypeMultiplanar);
        niivueRef.current.drawOpacity = 0.5;
      } catch (error) {
        console.error("Error initializing Niivue:", error);
      }
    };

    attachAndLoadData();
  }, [isCanvasMounted]);

  // Set up keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!niivueRef.current) return;

      if (e.key === "ArrowUp") {
        niivueRef.current.moveCrosshairInVox(0, 0, 1);
      } else if (e.key === "ArrowDown") {
        niivueRef.current.moveCrosshairInVox(0, 0, -1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle view type changes
  useEffect(() => {
    if (!niivueRef.current) return;
    
    const nv = niivueRef.current;
    
    switch (viewType) {
      case "Axial":
        nv.setSliceType(nv.sliceTypeAxial);
        break;
      case "Sagittal":
        nv.setSliceType(nv.sliceTypeSagittal);
        break;
      case "Coronal":
        nv.setSliceType(nv.sliceTypeCoronal);
        break;
      case "Render":
        nv.setSliceType(nv.sliceTypeRender);
        break;
      case "MultiPlanar":
        nv.opts.multiplanarShowRender = SHOW_RENDER.NEVER;
        nv.setSliceType(nv.sliceTypeMultiplanar);
        break;
      case "MultiPlanarRender":
        nv.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS;
        nv.setSliceType(nv.sliceTypeMultiplanar);
        break;
      default:
        break;
    }
  }, [viewType]);

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
        {/* View type selection */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="viewType">View:</label>
          <select 
            id="viewType" 
            value={viewType} 
            onChange={handleViewTypeChange}
          >
            <option value="Axial">Axial</option>
            <option value="Sagittal">Sagittal</option>
            <option value="Coronal">Coronal</option>
            <option value="Render">Render</option>
            <option value="MultiPlanar">A+C+S</option>
            <option value="MultiPlanarRender">A+C+S+R</option>
          </select>
        </div>

        {/* Instructions */}
        <div>
          <span style={{ fontSize: "0.9rem" }}>
            Use Up/Down arrow keys to change slice. Click to segment similar regions.
          </span>
        </div>
      </div>

      {/* Canvas container */}
      <div style={{ 
        width: "100%",
        height: 512,
      }}>
        <canvas
          ref={canvasRefCallback}
          style={{ width: "100%", height: "100%" }}
        ></canvas>
      </div>

      {/* Intensity display */}
      <div style={{ fontFamily: "monospace" }}>{locationText}</div>
    </div>
  );
}; 