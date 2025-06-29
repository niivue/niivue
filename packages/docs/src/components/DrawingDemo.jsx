import React, { useState, useEffect, useRef, useCallback } from "react";
import { Niivue, SHOW_RENDER } from "@niivue/niivue";

const baseUrl = "https://niivue.com/demos"

// Default image for demonstration
const defaultImage = {
  url: `${baseUrl}/images/FLAIR.nii.gz`,
  colormap: "gray",
  opacity: 1,
  visible: true,
};

// Default drawing for demonstration
const defaultDrawing = {
  url: `${baseUrl}/images/lesion.nii.gz`,
};

// Default Niivue options
const defaultNvOpts = {
  backColor: [1, 1, 1, 1],
  dragAndDropEnabled: true,
  drawingEnabled: false,
  multiplanarLayout: 2, // Grid layout
};

export const DrawingDemo = ({ nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for drawing settings
  const [drawPen, setDrawPen] = useState(-1);
  const [drawOpacity, setDrawOpacity] = useState(80);
  const [fillOverwrites, setFillOverwrites] = useState(true);
  const [isRadiological, setIsRadiological] = useState(false);
  const [isWorldSpace, setIsWorldSpace] = useState(false);
  const [isLinearInterpolation, setIsLinearInterpolation] = useState(true);
  const [isHighDPI, setIsHighDPI] = useState(true);
  const [locationText, setLocationText] = useState("");
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Memoized location change handler
  const handleLocationChange = useCallback((data) => {
    setLocationText(data.string);
  }, []);

  // Memoized event handlers
  const handleDrawPenChange = useCallback((event) => {
    setDrawPen(parseInt(event.target.value));
  }, []);
  
  const handleDrawOpacityChange = useCallback((event) => {
    setDrawOpacity(parseInt(event.target.value));
  }, []);
  
  const handleMove = useCallback((dx, dy, dz) => {
    if (!niivueRef.current) return;
    niivueRef.current.moveCrosshairInVox(dx, dy, dz);
  }, []);

  const handleUndo = useCallback(() => {
    if (!niivueRef.current) return;
    niivueRef.current.drawUndo();
  }, []);

  const handleSave = useCallback(() => {
    if (!niivueRef.current) return;
    niivueRef.current.saveImage({ filename: "drawing.nii", isSaveDrawing: true });
  }, []);

  // Create Niivue instance only once
  useEffect(() => {
    if (!niivueRef.current) {
      console.log("Creating Niivue instance...");
      niivueRef.current = new Niivue({
        ...mergedNvOpts,
        onLocationChange: handleLocationChange,
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
        
        niivueRef.current.setSliceType(niivueRef.current.sliceTypeMultiplanar);
        niivueRef.current.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS;
        
        // Load drawing volume
        await niivueRef.current.loadDrawingFromUrl(defaultDrawing.url);
        console.log("Drawing loaded in Niivue");
        
        // Apply initial settings
        niivueRef.current.setDrawingEnabled(drawPen >= 0);
        niivueRef.current.setDrawOpacity(drawOpacity * 0.01);
        niivueRef.current.drawFillOverwrites = fillOverwrites;
        niivueRef.current.setRadiologicalConvention(isRadiological);
        niivueRef.current.setSliceMM(isWorldSpace);
        niivueRef.current.setInterpolation(!isLinearInterpolation);
        niivueRef.current.setHighResolutionCapable(isHighDPI);
      } catch (error) {
        console.error("Error initializing Niivue:", error);
      }
    };

    attachAndLoadData();
  }, [isCanvasMounted]);

  // Effect for drawing pen
  useEffect(() => {
    if (!niivueRef.current) return;
    
    niivueRef.current.setDrawingEnabled(drawPen >= 0);
    if (drawPen >= 0) niivueRef.current.setPenValue(drawPen & 7, drawPen > 7);
    if (drawPen === 12) niivueRef.current.setPenValue(-0); // erase selected cluster
  }, [drawPen]);

  // Effect for drawing opacity
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.setDrawOpacity(drawOpacity * 0.01);
  }, [drawOpacity]);

  // Effect for fill overwrites
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.drawFillOverwrites = fillOverwrites;
  }, [fillOverwrites]);

  // Effect for radiological convention
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.setRadiologicalConvention(isRadiological);
  }, [isRadiological]);

  // Effect for world space
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.setSliceMM(isWorldSpace);
  }, [isWorldSpace]);

  // Effect for linear interpolation
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.setInterpolation(!isLinearInterpolation);
  }, [isLinearInterpolation]);

  // Effect for high DPI
  useEffect(() => {
    if (!niivueRef.current) return;
    niivueRef.current.setHighResolutionCapable(isHighDPI);
  }, [isHighDPI]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          const theme = document.documentElement.getAttribute("data-theme")
          const isDark = theme === "dark"
          console.log(">>>>>",isDark)
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
      {/* Drawing controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "15px",
          alignItems: "center",
          width: "100%",
          padding: "10px",
          backgroundColor: "#8f8f8f",
          borderRadius: "4px",
        }}
      >
        {/* Pen selection */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="drawPen">Draw color:</label>
          <select 
            id="drawPen" 
            value={drawPen} 
            onChange={handleDrawPenChange}
          >
            <option value="-1">Off</option>
            <option value="0">Erase</option>
            <option value="1">Red</option>
            <option value="2">Green</option>
            <option value="3">Blue</option>
            <option value="8">Filled Erase</option>
            <option value="9">Filled Red</option>
            <option value="10">Filled Green</option>
            <option value="11">Filled Blue</option>
            <option value="12">Erase Selected Cluster</option>
          </select>
        </div>

        {/* Opacity slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="drawOpacity">Opacity:</label>
          <input
            type="range"
            id="drawOpacity"
            min="0"
            max="100"
            value={drawOpacity}
            onChange={handleDrawOpacityChange}
          />
          <span>{drawOpacity}%</span>
        </div>
      </div>

      {/* Checkboxes */}
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
        <label>
          <input
            type="checkbox"
            checked={fillOverwrites}
            onChange={e => setFillOverwrites(e.target.checked)}
          />
          Fill overwrites
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={isRadiological}
            onChange={e => setIsRadiological(e.target.checked)}
          />
          Radiological
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={isWorldSpace}
            onChange={e => setIsWorldSpace(e.target.checked)}
          />
          World space
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={isLinearInterpolation}
            onChange={e => setIsLinearInterpolation(e.target.checked)}
          />
          Linear interpolation
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={isHighDPI}
            onChange={e => setIsHighDPI(e.target.checked)}
          />
          HighDPI
        </label>
      </div>

      {/* Navigation buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          width: "100%",
        }}
      >
        <button onClick={() => handleMove(-1, 0, 0)}>Left</button>
        <button onClick={() => handleMove(1, 0, 0)}>Right</button>
        <button onClick={() => handleMove(0, -1, 0)}>Posterior</button>
        <button onClick={() => handleMove(0, 1, 0)}>Anterior</button>
        <button onClick={() => handleMove(0, 0, -1)}>Inferior</button>
        <button onClick={() => handleMove(0, 0, 1)}>Superior</button>
      </div>
      
      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          width: "100%",
        }}
      >
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleSave}>Save Drawing</button>
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