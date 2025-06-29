import React, { useState, useEffect, useRef, useCallback } from "react";
import { Niivue, SHOW_RENDER } from "@niivue/niivue";

const baseUrl = 'https://niivue.com/demos/images/'

// Default image for demonstration
const defaultImage = {
  url: `${baseUrl}mni152.nii.gz`,
  colormap: "gray",
  opacity: 1,
  visible: true,
};

const meshLayer = [{
  url: `${baseUrl}BrainMesh_ICBM152.lh.motor.mz3`,
  cal_min: 5,
  cal_max: 8,
  colormap: "warm",
  opacity: 0.7,
},]

const defaultMeshes = [
  { url: `${baseUrl}BrainMesh_ICBM152.lh.mz3`, rgba255: [192, 242, 192, 255], layers: meshLayer  },
  { url: `${baseUrl}connectome.jcon`},
  { url: `${baseUrl}dpsv.trx`, rgba255: [0, 142, 0, 255] },
]

// Default Niivue options
const defaultNvOpts = {
  dragAndDropEnabled: true,
  logLevel: "info",
  backColor: [1, 1, 1, 1],
};


export const MeshDemo = ({ nvOpts = {}, showControls = true }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  
  // State for settings
  const [viewType, setViewType] = useState("Render");
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);
  const [isVoxel, setIsVoxel] = useState(true);
  const [isMesh, setIsMesh] = useState(true);
  const [connectRadius, setConnect] = useState(3);
  const [tractRadius, setTract] = useState(0);
  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };
  const handleVoxelChange = useCallback((event) => {
    const isChecked = event.target.checked;
    setIsVoxel(isChecked); // Update component state
    niivueRef.current.volumes[0].opacity = isChecked ? 1 : 0;
    niivueRef.current.updateGLVolume();
  }, []);
  const handleMeshChange = useCallback((event) => {
    const isChecked = event.target.checked;
    setIsMesh(isChecked); // Update component state
    niivueRef.current.setMeshProperty(0, 'visible', isChecked)
  }, []);
  const handleConnectChange = useCallback((event) => {
    const connect = parseFloat(event.target.value);
    setConnect(connect); // Update component state
    niivueRef.current.setMeshProperty(1, 'visible', connect > 0)
    if (connect > 0) {
      niivueRef.current.setMeshProperty(1, "nodeScale", connect)
    }
  }, []);
  const handleTractChange = useCallback((event) => {
    const tract = event.target.value;
    setTract(tract); // Update component state
    niivueRef.current.setMeshProperty(2, 'visible', tract >= 0)
    niivueRef.current.setMeshProperty(2, "fiberRadius", tract * 0.1)
  }, []);
  // Setup a memoized handler for view type changes
  const handleViewTypeChange = useCallback((event) => {
    setViewType(event.target.value);
  }, []);

  // Create Niivue instance only once
  useEffect(() => {
    if (!niivueRef.current) {
      console.log("Creating Niivue instance...");
      niivueRef.current = new Niivue(mergedNvOpts);
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
        await niivueRef.current.attachToCanvas(canvasRef.current);
        niivueRef.current.opts.showLegend = false;
        await niivueRef.current.loadVolumes([defaultImage]);
        await niivueRef.current.loadMeshes(defaultMeshes);
        niivueRef.current.setClipPlane([-0.2, 180, 20]);
        niivueRef.current.setRenderAzimuthElevation(245, 15);
        niivueRef.current.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS;
        niivueRef.current.setSliceType(niivueRef.current.sliceTypeRender);
      } catch (error) {
        console.error("Error initializing Niivue:", error);
      }
    };

    attachAndLoadData();
  }, [isCanvasMounted]);

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
            niivueRef.current.opts.backColor = isDark ? [27/255, 27/255, 27/255, 1] : [1, 1, 1, 1]
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
      niivueRef.current.opts.backColor = isDark ? [27/255, 27/255, 27/255, 1] : [1, 1, 1, 1]
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
        gap: "4px",
        padding: "4px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginBottom: "4px",

      }}
    >
      {/* Conditionally render controls */}
      {showControls && (
        <div
          className="themed-background"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "15px",
            alignItems: "center",
            width: "100%",
            borderRadius: "8px",
          }}
        >
        {/* View type selection */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <label htmlFor="voxelCheck">
            Voxel
          </label>
          <input
            type="checkbox"
            id="voxelCheck"
            checked={isVoxel}
            onChange={handleVoxelChange}
            disabled={!niivueRef.current}
          />
          &nbsp;
          <label htmlFor="meshCheck">
            Mesh
          </label>
          <input
            type="checkbox"
            id="meshCheck"
            checked={isMesh}
            onChange={handleMeshChange}
            disabled={!niivueRef.current}
          />
          &nbsp;
          <label htmlFor="connectSlider">Connectome</label>
          <input
            type="range"
            id="connectSlider"
            min="0"
            max="6.0"
            step="0.5"
            value={connectRadius}
            onChange={handleConnectChange}
            disabled={!niivueRef.current}
          />
          &nbsp;
          <label htmlFor="tractSlider">Tract</label>
          <input
            type="range"
            id="tractSlider"
            min="-2.0"
            max="16.0"
            step="2"
            value={tractRadius}
            onChange={handleTractChange}
            disabled={!niivueRef.current}
          />
          &nbsp;
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
      </div>
      )}
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
    </div>
  );
}; 