import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Niivue } from '@niivue/niivue';

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
  crosshairWidth: 1,
  textHeight: 0.03,
  crosshairColor: [0, 1, 0, 1],
};

export const OptionsDemo = ({
  images = defaultImages,
  nvOpts = {},
}) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);

  // State for interactive controls
  const [crosshairWidth, setCrosshairWidth] = useState(1);
  const [textHeight, setTextHeight] = useState(0.03);
  const [isColorbar, setIsColorbar] = useState(false);
  const [backColor, setBackColor] = useState([0, 0, 0, 1]);
  const [crosshairColor, setCrosshairColor] = useState([0, 1, 0, 1]);
  const [isRuler, setIsRuler] = useState(false);
  const [isRadiological, setIsRadiological] = useState(false);
  const [changeLog, setChangeLog] = useState([]);

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
          
          // Set up options change watching
          nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            const timestamp = new Date().toLocaleTimeString();
            setChangeLog(prev => [{
              timestamp,
              property: propertyName,
              oldValue: JSON.stringify(oldValue),
              newValue: JSON.stringify(newValue)
            }, ...prev.slice(0, 9)]); // Keep last 10 changes
          });
          
        } catch (error) {
          console.error("Failed to initialize Niivue:", error);
        }
      }
    };

    initializeNiivue();

    return () => {
      console.log("Cleaning up Niivue instance...");
      if (niivueRef.current) {
        niivueRef.current.unwatchOptsChanges();
        niivueRef.current = null;
      }
    };
  }, []);

  // Handler for crosshair width changes
  const handleCrosshairWidthChange = useCallback((event) => {
    const value = parseInt(event.target.value);
    setCrosshairWidth(value);
    
    if (niivueRef.current) {
      niivueRef.current.opts.crosshairWidth = value;
    }
  }, []);

  // Handler for text height changes
  const handleTextHeightChange = useCallback((event) => {
    const value = parseFloat(event.target.value);
    setTextHeight(value);
    
    if (niivueRef.current) {
      niivueRef.current.opts.textHeight = value;
    }
  }, []);

  // Handler for colorbar toggle
  const handleColorbarChange = useCallback((event) => {
    const checked = event.target.checked;
    setIsColorbar(checked);
    
    if (niivueRef.current) {
      niivueRef.current.opts.isColorbar = checked;
    }
  }, []);

  // Handler for background color changes
  const handleBackColorChange = useCallback((color, index) => {
    const newBackColor = [...backColor];
    newBackColor[index] = parseFloat(color);
    setBackColor(newBackColor);
    
    if (niivueRef.current) {
      niivueRef.current.opts.backColor = newBackColor;
    }
  }, [backColor]);

  // Handler for crosshair color changes
  const handleCrosshairColorChange = useCallback((color, index) => {
    const newCrosshairColor = [...crosshairColor];
    newCrosshairColor[index] = parseFloat(color);
    setCrosshairColor(newCrosshairColor);
    
    if (niivueRef.current) {
      niivueRef.current.opts.crosshairColor = newCrosshairColor;
    }
  }, [crosshairColor]);

  // Handler for ruler toggle
  const handleRulerChange = useCallback((event) => {
    const checked = event.target.checked;
    setIsRuler(checked);
    
    if (niivueRef.current) {
      niivueRef.current.opts.isRuler = checked;
    }
  }, []);

  // Handler for radiological convention toggle
  const handleRadiologicalChange = useCallback((event) => {
    const checked = event.target.checked;
    setIsRadiological(checked);
    
    if (niivueRef.current) {
      niivueRef.current.opts.isRadiologicalConvention = checked;
    }
  }, []);

  // Handler to apply random changes for demonstration
  const handleRandomChanges = useCallback(() => {
    if (!niivueRef.current) return;
    
    // Apply multiple random changes to demonstrate batched events
    const randomWidth = Math.floor(Math.random() * 5) + 1;
    const randomR = Math.random();
    const randomG = Math.random();
    const randomB = Math.random();
    const randomTextHeight = Math.random() * 0.1 + 0.01;
    
    // Update state to keep UI in sync
    setCrosshairWidth(randomWidth);
    setBackColor([randomR, randomG, randomB, 1]);
    setTextHeight(randomTextHeight);
    setIsColorbar(!isColorbar);
    
    // Apply changes to Niivue (these will trigger the watcher)
    niivueRef.current.opts.crosshairWidth = randomWidth;
    niivueRef.current.opts.backColor = [randomR, randomG, randomB, 1];
    niivueRef.current.opts.textHeight = randomTextHeight;
    niivueRef.current.opts.isColorbar = !isColorbar;
  }, [isColorbar]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Canvas */}
      <div style={{ 
        width: '100%', 
        height: '400px', 
        border: '1px solid #ccc', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        {/* Crosshair Controls */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#ffffff'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>Crosshair</h4>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Width: {crosshairWidth}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={crosshairWidth}
              onChange={handleCrosshairWidthChange}
              style={{ 
                width: '100%',
                height: '6px',
                marginBottom: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Color (RGB):
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['R', 'G', 'B'].map((label, index) => (
                <div key={index} style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textAlign: 'center' }}>
                    {label}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={crosshairColor[index]}
                    onChange={(e) => handleCrosshairColorChange(e.target.value, index)}
                    style={{ 
                      width: '100%',
                      height: '6px'
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              [{crosshairColor.slice(0, 3).map(v => v.toFixed(2)).join(', ')}]
            </div>
          </div>
        </div>

        {/* Background Color */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#ffffff'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>Background</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Color (RGB):
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['R', 'G', 'B'].map((label, index) => (
                <div key={index} style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textAlign: 'center' }}>
                    {label}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={backColor[index]}
                    onChange={(e) => handleBackColorChange(e.target.value, index)}
                    style={{ 
                      width: '100%',
                      height: '6px'
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              [{backColor.slice(0, 3).map(v => v.toFixed(2)).join(', ')}]
            </div>
          </div>
        </div>

        {/* Text and Display Options */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#ffffff'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>Display Options</h4>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Text Height: {textHeight.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.005"
              max="0.1"
              step="0.005"
              value={textHeight}
              onChange={handleTextHeightChange}
              style={{ 
                width: '100%',
                height: '6px',
                marginBottom: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 0'
            }}>
              <input
                type="checkbox"
                checked={isColorbar}
                onChange={handleColorbarChange}
                style={{ transform: 'scale(1.2)' }}
              />
              Show Colorbar
            </label>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 0'
            }}>
              <input
                type="checkbox"
                checked={isRuler}
                onChange={handleRulerChange}
                style={{ transform: 'scale(1.2)' }}
              />
              Show Ruler
            </label>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 0'
            }}>
              <input
                type="checkbox"
                checked={isRadiological}
                onChange={handleRadiologicalChange}
                style={{ transform: 'scale(1.2)' }}
              />
              Radiological Convention
            </label>
          </div>
        </div>

        {/* Demo Controls */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#ffffff'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>Demo Actions</h4>
          <button
            onClick={handleRandomChanges}
            style={{
              padding: '12px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: '100%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Apply Random Changes
          </button>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '12px',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            Click to see multiple option changes trigger the watcher
          </div>
        </div>
      </div>

      {/* Change Log */}
      <div style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        padding: '16px'
      }}>
        <h4 style={{ margin: '0 0 12px 0' }}>Options Change Log</h4>
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px'
        }}>
          {changeLog.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              No changes yet. Interact with the controls above to see option change events.
            </div>
          ) : (
            changeLog.map((change, index) => (
              <div
                key={index}
                style={{
                  borderBottom: index < changeLog.length - 1 ? '1px solid #eee' : 'none',
                  paddingBottom: '8px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {change.timestamp} - {change.property}
                </div>
                <div style={{ color: '#666', marginLeft: '8px' }}>
                  <span style={{ color: '#d73a49' }}>Old:</span> {change.oldValue}
                  {' → '}
                  <span style={{ color: '#28a745' }}>New:</span> {change.newValue}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};