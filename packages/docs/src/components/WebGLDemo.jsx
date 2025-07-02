import React, { useState, useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

const baseUrl = 'https://niivue.com/demos/images/'
const defaultMeshes = [
  { url: `${baseUrl}CIT168.mz3`},
  { url: `${baseUrl}BrainMesh_ICBM152.lh.mz3`, rgba255: [222, 164, 164, 255]},
]

// Default Niivue options
const defaultNvOpts = {
  logLevel: "info",
  backColor: [1, 1, 1, 1],
};

export const WebGLDemo = ({
  meshes = defaultMeshes,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null); // To store the Niivue instance

  // State for interactive controls
  const [currentShader, setCurrentShader] = useState("Phong");
  const [shaderOptions, setShaderOptions] = useState([]);
  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue and load volumes on mount
  useEffect(() => {
    const initializeNiivue = async () => {
      // Ensure Niivue instance doesn't already exist
      if (!niivueRef.current && canvasRef.current) {
        console.log("Initializing Niivue...");
        const nv = new Niivue(mergedNvOpts);
        const shaders = nv.meshShaderNames(true); // sorted list
        setShaderOptions(shaders);
        niivueRef.current = nv; // Store the instance

        await nv.attachToCanvas(canvasRef.current);
        nv.opts.backColor =[0.45, 0.55, 0.7, 1];
        
        nv.setSliceType(4);
        nv.opts.showLegend = false;
        
        try {
          await niivueRef.current.loadMeshes(meshes);
        

          // Set initial state based on loaded volume
          //if (nv.volumes.length > 0) {
          //  setCurrentShader(nv.volumes[0].colormap);
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


  useEffect(() => {
    if (shaderOptions.length > 0) {
      setCurrentShader("Phong") // or a default like "Phong"
    }
  }, [shaderOptions])
  // Handler for changing Shader
  const handleShaderChange = (event) => {
    const newShader = event.target.value;
    niivueRef.current.setMeshShader(1, newShader);
    setCurrentShader(newShader);
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
      {/* Niivue Canvas */}
      <div
        style={{
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ display: "block" }}
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
        {/* Shader Selector */}
        <label htmlFor="shaderSelect">Shader</label>
        <select
          id="shaderSelect"
          onChange={handleShaderChange}
          value={currentShader}
        >
          {shaderOptions.map((shader) => (
            <option key={shader} value={shader}>
              {shader}
            </option>
          ))}
        </select>

      </div>
    </div>
  );
};