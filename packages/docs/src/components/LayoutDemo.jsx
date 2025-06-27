import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Niivue, SLICE_TYPE, MULTIPLANAR_TYPE, SHOW_RENDER } from '@niivue/niivue';

// Default image if none provided via props
const defaultImages = [
  {
    url: "https://niivue.com/demos/images/FLAIR.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  isColorbar: false,
  logLevel: "info",
  show3Dcrosshair: true,
  backColor: [0, 0, 0, 1],
  multiplanarShowRender: SHOW_RENDER.AUTO,
};

export const LayoutDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);

  // State for interactive controls
  const [sliceType, setSliceType] = useState(SLICE_TYPE.MULTIPLANAR);
  const [layout, setLayout] = useState(MULTIPLANAR_TYPE.AUTO);
  const [showRender, setShowRender] = useState(SHOW_RENDER.AUTO);
  const [isEqualSize, setIsEqualSize] = useState(false);
  const [isCornerText, setIsCornerText] = useState(false);
  const [heroImageFraction, setHeroImageFraction] = useState(0);
  const [customLayoutActive, setCustomLayoutActive] = useState(false);
  const [customLayoutInput, setCustomLayoutInput] = useState('');
  const [showCustomLayoutInput, setShowCustomLayoutInput] = useState(false);

  // Merge default and passed options
  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue and load volumes on mount
  useEffect(() => {
    const initializeNiivue = async () => {
      if (!niivueRef.current && canvasRef.current) {
        console.log("Initializing Niivue...");
        const nv = new Niivue(mergedNvOpts);
        niivueRef.current = nv;
        
        try {
          await nv.attachToCanvas(canvasRef.current);
          await nv.loadVolumes(images);
          nv.setSliceType(sliceType);
        } catch (error) {
          console.error("Failed to initialize Niivue:", error);
        }
      }
    };

    initializeNiivue();

    return () => {
      console.log("Cleaning up Niivue instance...");
      niivueRef.current = null;
    };
  }, []);

  // Handler for slice type changes
  const handleSliceTypeChange = useCallback((event) => {
    const newSliceType = parseInt(event.target.value);
    setSliceType(newSliceType);
    
    if (niivueRef.current) {
      // Clear custom layout when changing slice types
      if (customLayoutActive) {
        niivueRef.current.clearCustomLayout();
        setCustomLayoutActive(false);
      }
      
      if (newSliceType === SLICE_TYPE.MULTIPLANAR) {
        niivueRef.current.opts.multiplanarShowRender = showRender;
      }
      niivueRef.current.setSliceType(newSliceType);
    }
  }, [showRender, customLayoutActive]);

  // Handler for layout changes
  const handleLayoutChange = useCallback((event) => {
    const newLayout = parseInt(event.target.value);
    setLayout(newLayout);
    
    if (niivueRef.current && sliceType === SLICE_TYPE.MULTIPLANAR && !customLayoutActive) {
      niivueRef.current.setMultiplanarLayout(newLayout);
    }
  }, [sliceType, customLayoutActive]);

  // Handler for show render changes
  const handleShowRenderChange = useCallback((event) => {
    const newShowRender = parseInt(event.target.value);
    setShowRender(newShowRender);
    
    if (niivueRef.current) {
      niivueRef.current.opts.multiplanarShowRender = newShowRender;
      niivueRef.current.drawScene();
    }
  }, []);

  // Handler for equal size toggle
  const handleEqualSizeChange = useCallback((event) => {
    const checked = event.target.checked;
    setIsEqualSize(checked);
    
    if (niivueRef.current) {
      niivueRef.current.opts.multiplanarEqualSize = checked;
      niivueRef.current.drawScene();
    }
  }, []);

  // Handler for corner text toggle
  const handleCornerTextChange = useCallback((event) => {
    const checked = event.target.checked;
    setIsCornerText(checked);
    
    if (niivueRef.current) {
      niivueRef.current.setCornerOrientationText(checked);
    }
  }, []);

  // Handler for hero image fraction
  const handleHeroImageChange = useCallback((event) => {
    const value = parseFloat(event.target.value);
    setHeroImageFraction(value);
    
    if (niivueRef.current && sliceType === SLICE_TYPE.MULTIPLANAR) {
      niivueRef.current.setHeroImage(value);
    }
  }, [sliceType]);

  // Handler for custom layout toggle
  const handleCustomLayoutToggle = useCallback(() => {
    if (!niivueRef.current) return;
    
    if (customLayoutActive) {
      // Clear custom layout and return to standard multiplanar
      niivueRef.current.clearCustomLayout();
      niivueRef.current.setSliceType(SLICE_TYPE.MULTIPLANAR);
      setCustomLayoutActive(false);
      setShowCustomLayoutInput(false);
    } else {
      // Apply predefined custom layout
      const customLayout = [
        // Left 50% - Sagittal
        { sliceType: SLICE_TYPE.SAGITTAL, position: [0, 0, 0.5, 1.0] },
        // Top right - Coronal
        { sliceType: SLICE_TYPE.CORONAL, position: [0.5, 0, 0.5, 0.5] },
        // Bottom right - Axial
        { sliceType: SLICE_TYPE.AXIAL, position: [0.5, 0.5, 0.5, 0.5] }
      ];
      niivueRef.current.setCustomLayout(customLayout);
      setCustomLayoutActive(true);
      
      // Set the text area to show the current layout
      setCustomLayoutInput(JSON.stringify(customLayout, null, 2));
    }
  }, [customLayoutActive]);

  // Handler for applying user-input custom layout
  const handleApplyCustomLayout = useCallback(() => {
    if (!niivueRef.current || !customLayoutInput.trim()) return;
    
    try {
      const layoutData = JSON.parse(customLayoutInput);
      
      // Validate the layout data
      if (!Array.isArray(layoutData)) {
        alert('Layout must be an array of layout objects');
        return;
      }
      
      for (const item of layoutData) {
        if (item.sliceType === undefined || item.sliceType === null || !Array.isArray(item.position) || item.position.length !== 4) {
          alert('Each layout item must have sliceType and position [left, top, width, height]');
          return;
        }
      }
      
      // Try to apply the layout - NiiVue will validate for overlaps and other issues
      try {
        niivueRef.current.setCustomLayout(layoutData);
        setCustomLayoutActive(true);
      } catch (niivueError) {
        // Handle NiiVue-specific validation errors
        alert('Layout validation failed: ' + niivueError.message);
        return;
      }
    } catch (error) {
      alert('Invalid JSON format: ' + error.message);
    }
  }, [customLayoutInput]);

  // Handler for showing/hiding custom layout input
  const handleToggleCustomInput = useCallback(() => {
    if (!showCustomLayoutInput) {
      // Show input with example layout
      const exampleLayout = [
        { sliceType: SLICE_TYPE.SAGITTAL, position: [0, 0, 0.5, 1.0] },
        { sliceType: SLICE_TYPE.CORONAL, position: [0.5, 0, 0.5, 0.5] },
        { sliceType: SLICE_TYPE.AXIAL, position: [0.5, 0.5, 0.5, 0.5] }
      ];
      setCustomLayoutInput(JSON.stringify(exampleLayout, null, 2));
    }
    setShowCustomLayoutInput(!showCustomLayoutInput);
  }, [showCustomLayoutInput]);

  // Get slice type name for display
  const getSliceTypeName = (type) => {
    switch (type) {
      case SLICE_TYPE.AXIAL: return "Axial";
      case SLICE_TYPE.CORONAL: return "Coronal";
      case SLICE_TYPE.SAGITTAL: return "Sagittal";
      case SLICE_TYPE.MULTIPLANAR: return "Multiplanar";
      case SLICE_TYPE.RENDER: return "Volume Render";
      default: return "Unknown";
    }
  };

  // Get layout name for display
  const getLayoutName = (layoutType) => {
    switch (layoutType) {
      case MULTIPLANAR_TYPE.AUTO: return "Auto";
      case MULTIPLANAR_TYPE.COLUMN: return "Column";
      case MULTIPLANAR_TYPE.GRID: return "Grid";
      case MULTIPLANAR_TYPE.ROW: return "Row";
      default: return "Unknown";
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
        {/* Slice Type Selector */}
        {!customLayoutActive && (
          <div>
            <label htmlFor="sliceTypeSelect" style={{ marginRight: "5px" }}>
              Slice Type:
            </label>
            <select
              id="sliceTypeSelect"
              value={sliceType}
              onChange={handleSliceTypeChange}
            >
              <option value={SLICE_TYPE.AXIAL}>Axial</option>
              <option value={SLICE_TYPE.CORONAL}>Coronal</option>
              <option value={SLICE_TYPE.SAGITTAL}>Sagittal</option>
              <option value={SLICE_TYPE.MULTIPLANAR}>Multiplanar</option>
              <option value={SLICE_TYPE.RENDER}>Volume Render</option>
            </select>
          </div>
        )}

        {/* Layout Selector - only show for multiplanar */}
        {sliceType === SLICE_TYPE.MULTIPLANAR && !customLayoutActive && (
          <div>
            <label htmlFor="layoutSelect" style={{ marginRight: "5px" }}>
              Layout:
            </label>
            <select
              id="layoutSelect"
              value={layout}
              onChange={handleLayoutChange}
            >
              <option value={MULTIPLANAR_TYPE.AUTO}>Auto</option>
              <option value={MULTIPLANAR_TYPE.COLUMN}>Column</option>
              <option value={MULTIPLANAR_TYPE.GRID}>Grid</option>
              <option value={MULTIPLANAR_TYPE.ROW}>Row</option>
            </select>
          </div>
        )}

        {/* Show Render - only show for multiplanar and not custom layout */}
        {sliceType === SLICE_TYPE.MULTIPLANAR && !customLayoutActive && (
          <div>
            <label htmlFor="showRenderSelect" style={{ marginRight: "5px" }}>
              Show Render:
            </label>
            <select
              id="showRenderSelect"
              value={showRender}
              onChange={handleShowRenderChange}
            >
              <option value={SHOW_RENDER.NEVER}>Never</option>
              <option value={SHOW_RENDER.ALWAYS}>Always</option>
              <option value={SHOW_RENDER.AUTO}>Auto</option>
            </select>
          </div>
        )}

        {/* Equal Size - only show for multiplanar and not custom layout */}
        {sliceType === SLICE_TYPE.MULTIPLANAR && !customLayoutActive && (
          <div>
            <input
              type="checkbox"
              id="equalSizeCheck"
              checked={isEqualSize}
              onChange={handleEqualSizeChange}
            />
            <label htmlFor="equalSizeCheck" style={{ marginLeft: "5px" }}>
              Equal Size
            </label>
          </div>
        )}

        {/* Corner Text - only show when not using custom layout */}
        {!customLayoutActive && (
          <div>
            <input
              type="checkbox"
              id="cornerTextCheck"
              checked={isCornerText}
              onChange={handleCornerTextChange}
            />
            <label htmlFor="cornerTextCheck" style={{ marginLeft: "5px" }}>
              Corner Text
            </label>
          </div>
        )}

        {/* Hero Image - only show for multiplanar and not custom layout */}
        {sliceType === SLICE_TYPE.MULTIPLANAR && !customLayoutActive && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label htmlFor="heroSlider">Hero Image:</label>
            <input
              type="range"
              id="heroSlider"
              min="0"
              max="1"
              step="0.1"
              value={heroImageFraction}
              onChange={handleHeroImageChange}
            />
            <span>{heroImageFraction.toFixed(1)}</span>
          </div>
        )}

        {/* Custom Layout Toggle - only show for multiplanar */}
        {sliceType === SLICE_TYPE.MULTIPLANAR && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={handleCustomLayoutToggle}>
              {customLayoutActive ? "Use Standard Layout" : "Use Custom Layout"}
            </button>
            <button onClick={handleToggleCustomInput}>
              {showCustomLayoutInput ? "Hide Layout Editor" : "Edit Custom Layout"}
            </button>
          </div>
        )}
      </div>

      {/* Custom Layout Input - only show when editing */}
      {showCustomLayoutInput && sliceType === SLICE_TYPE.MULTIPLANAR && (
        <div style={{ 
          width: "100%", 
          maxWidth: "600px", 
          margin: "10px 0",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#f9f9f9"
        }}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "5px", 
              fontWeight: "bold",
              fontSize: "14px"
            }}>
              Custom Layout JSON:
            </label>
            <div style={{ 
              fontSize: "12px", 
              color: "#666", 
              marginBottom: "5px" 
            }}>
              Define an array of layout objects. Each object needs:
              <br />• <code>sliceType</code>: {SLICE_TYPE.AXIAL} (Axial), {SLICE_TYPE.CORONAL} (Coronal), {SLICE_TYPE.SAGITTAL} (Sagittal), or {SLICE_TYPE.RENDER} (Volume Render)
              <br />• <code>position</code>: [left, top, width, height] as fractions (0.0 to 1.0)
            </div>
          </div>
          <textarea
            value={customLayoutInput}
            onChange={(e) => setCustomLayoutInput(e.target.value)}
            style={{
              width: "100%",
              height: "150px",
              fontFamily: "monospace",
              fontSize: "12px",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              resize: "vertical"
            }}
            placeholder="Enter custom layout JSON..."
          />
          <div style={{ 
            marginTop: "10px", 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button 
              onClick={handleApplyCustomLayout}
              style={{
                padding: "6px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Apply Layout
            </button>
            <button 
              onClick={() => {
                const exampleLayouts = [
                  // Large render with small axial
                  [
                    { sliceType: SLICE_TYPE.RENDER, position: [0, 0, 0.7, 1.0] },
                    { sliceType: SLICE_TYPE.AXIAL, position: [0.7, 0, 0.3, 1.0] }
                  ],
                  // Vertical split
                  [
                    { sliceType: SLICE_TYPE.SAGITTAL, position: [0, 0, 0.5, 1.0] },
                    { sliceType: SLICE_TYPE.AXIAL, position: [0.5, 0, 0.5, 1.0] }
                  ],
                  // Four quadrants
                  [
                    { sliceType: SLICE_TYPE.AXIAL, position: [0, 0, 0.5, 0.5] },
                    { sliceType: SLICE_TYPE.CORONAL, position: [0.5, 0, 0.5, 0.5] },
                    { sliceType: SLICE_TYPE.SAGITTAL, position: [0, 0.5, 0.5, 0.5] },
                    { sliceType: SLICE_TYPE.RENDER, position: [0.5, 0.5, 0.5, 0.5] }
                  ]
                ];
                const randomLayout = exampleLayouts[Math.floor(Math.random() * exampleLayouts.length)];
                setCustomLayoutInput(JSON.stringify(randomLayout, null, 2));
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Load Example
            </button>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
        <strong>Current:</strong> {getSliceTypeName(sliceType)}
        {sliceType === SLICE_TYPE.MULTIPLANAR && (
          <>
            {customLayoutActive ? " (Custom Layout)" : ` (${getLayoutName(layout)} Layout)`}
          </>
        )}
      </div>
    </div>
  );
};
