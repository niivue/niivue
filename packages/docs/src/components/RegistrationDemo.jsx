import React, { useState, useEffect, useRef, useCallback } from "react";
import { Niivue, copyAffine } from "@niivue/niivue";

// Default images - underlay and overlay
const defaultImages = [
  {
    url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz",
    colormap: "gray",
    opacity: 1,
    visible: true,
  },
  {
    url: "https://niivue.github.io/niivue-demo-images/pcasl.nii.gz",
    colormap: "red",
    opacity: 0.7,
    visible: true,
  },
];

// Default Niivue options
const defaultNvOpts = {
  logLevel: "info",
  show3Dcrosshair: true,
};

// Axis colors
const AXIS_COLORS = { x: "#ff4444", y: "#44cc44", z: "#4488ff" };
const AXIS_HOVER_COLORS = { x: "#ff8888", y: "#88ee88", z: "#88bbff" };

// Sensitivity per pixel of drag
const SENSITIVITY = {
  translate: 0.5,
  rotate: 0.5,
  scale: 0.005,
};

/**
 * Transform Gizmo SVG Component
 */
const TransformGizmo = ({ mode, transform, onTransformChange, size = 180 }) => {
  const svgRef = useRef(null);
  const [activeAxis, setActiveAxis] = useState(null);
  const [hoveredAxis, setHoveredAxis] = useState(null);
  const dragStartRef = useRef(null);
  const initialTransformRef = useRef(null);

  const center = size / 2;
  const axisLength = size * 0.35;
  const arrowSize = 10;

  const getAxisEndpoint = useCallback(
    (axis) => {
      switch (axis) {
        case "x":
          return { x: center + axisLength, y: center };
        case "y":
          return { x: center, y: center - axisLength };
        case "z":
          return {
            x: center + axisLength * 0.6,
            y: center + axisLength * 0.6,
          };
        default:
          return { x: center, y: center };
      }
    },
    [center, axisLength]
  );

  const handlePointerDown = useCallback(
    (axis, e) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveAxis(axis);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialTransformRef.current = {
        translation: [...transform.translation],
        rotation: [...transform.rotation],
        scale: [...transform.scale],
      };
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [transform]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragStartRef.current || !activeAxis || !initialTransformRef.current)
        return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      let axisDelta;
      switch (activeAxis) {
        case "x":
          axisDelta = deltaX;
          break;
        case "y":
          axisDelta = -deltaY;
          break;
        case "z":
          axisDelta = (deltaX + deltaY) / 2;
          break;
        default:
          axisDelta = 0;
      }

      const axisIndex = { x: 0, y: 1, z: 2 }[activeAxis];
      const newTransform = { ...transform };

      switch (mode) {
        case "translate":
          newTransform.translation = [...initialTransformRef.current.translation];
          newTransform.translation[axisIndex] += axisDelta * SENSITIVITY.translate;
          break;
        case "rotate":
          newTransform.rotation = [...initialTransformRef.current.rotation];
          newTransform.rotation[axisIndex] += axisDelta * SENSITIVITY.rotate;
          break;
        case "scale":
          newTransform.scale = [...initialTransformRef.current.scale];
          newTransform.scale[axisIndex] = Math.max(
            0.1,
            initialTransformRef.current.scale[axisIndex] +
              axisDelta * SENSITIVITY.scale
          );
          break;
      }

      onTransformChange(newTransform);
    },
    [activeAxis, mode, transform, onTransformChange]
  );

  const handlePointerUp = useCallback((e) => {
    svgRef.current?.releasePointerCapture(e.pointerId);
    setActiveAxis(null);
    dragStartRef.current = null;
    initialTransformRef.current = null;
  }, []);

  const renderAxis = (axis) => {
    const endpoint = getAxisEndpoint(axis);
    const isActive = activeAxis === axis;
    const isHovered = hoveredAxis === axis;
    const color =
      isActive || isHovered ? AXIS_HOVER_COLORS[axis] : AXIS_COLORS[axis];

    const dx = endpoint.x - center;
    const dy = endpoint.y - center;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;

    const arrowBase1 = {
      x: endpoint.x - nx * arrowSize - ny * (arrowSize / 2),
      y: endpoint.y - ny * arrowSize + nx * (arrowSize / 2),
    };
    const arrowBase2 = {
      x: endpoint.x - nx * arrowSize + ny * (arrowSize / 2),
      y: endpoint.y - ny * arrowSize - nx * (arrowSize / 2),
    };

    return (
      <g
        key={axis}
        style={{ cursor: isActive ? "grabbing" : "grab" }}
        onPointerDown={(e) => handlePointerDown(axis, e)}
        onPointerEnter={() => setHoveredAxis(axis)}
        onPointerLeave={() => setHoveredAxis(null)}
      >
        <line
          x1={center}
          y1={center}
          x2={endpoint.x - nx * arrowSize}
          y2={endpoint.y - ny * arrowSize}
          stroke={color}
          strokeWidth={isActive || isHovered ? 4 : 3}
          strokeLinecap="round"
        />
        <polygon
          points={`${endpoint.x},${endpoint.y} ${arrowBase1.x},${arrowBase1.y} ${arrowBase2.x},${arrowBase2.y}`}
          fill={color}
        />
        <line
          x1={center}
          y1={center}
          x2={endpoint.x}
          y2={endpoint.y}
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
        />
        <text
          x={endpoint.x + nx * 15}
          y={endpoint.y + ny * 15}
          fill={color}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {axis.toUpperCase()}
        </text>
      </g>
    );
  };

  const renderRotationArc = (axis, startAngle, endAngle, svgTransform) => {
    const arcRadius = axisLength * 0.6;
    const isActive = activeAxis === axis;
    const isHovered = hoveredAxis === axis;
    const color =
      isActive || isHovered ? AXIS_HOVER_COLORS[axis] : AXIS_COLORS[axis];

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const startX = center + arcRadius * Math.cos(startRad);
    const startY = center + arcRadius * Math.sin(startRad);
    const endX = center + arcRadius * Math.cos(endRad);
    const endY = center + arcRadius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return (
      <g
        key={`rot-${axis}`}
        transform={svgTransform}
        style={{ cursor: isActive ? "grabbing" : "grab" }}
        onPointerDown={(e) => handlePointerDown(axis, e)}
        onPointerEnter={() => setHoveredAxis(axis)}
        onPointerLeave={() => setHoveredAxis(null)}
      >
        <path
          d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth={isActive || isHovered ? 4 : 2}
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke="transparent"
          strokeWidth={15}
        />
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ cursor: "default", userSelect: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <circle cx={center} cy={center} r={6} fill="#888" />
      {mode === "rotate" && (
        <>
          {renderRotationArc("x", -60, 60, `rotate(-90, ${center}, ${center})`)}
          {renderRotationArc("y", -60, 60, null)}
          {renderRotationArc("z", 120, 240, null)}
        </>
      )}
      {renderAxis("z")}
      {renderAxis("y")}
      {renderAxis("x")}
    </svg>
  );
};

/**
 * Main Registration Demo Component
 */
export const RegistrationDemo = ({ images = defaultImages, nvOpts = {} }) => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const originalAffineRef = useRef(null);

  const [mode, setMode] = useState("translate");
  const [transform, setTransform] = useState({
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const mergedNvOpts = { ...defaultNvOpts, ...nvOpts };

  // Initialize Niivue
  useEffect(() => {
    const initializeNiivue = async () => {
      if (!niivueRef.current && canvasRef.current) {
        const nv = new Niivue(mergedNvOpts);
        niivueRef.current = nv;

        await nv.attachToCanvas(canvasRef.current);

        try {
          await nv.loadVolumes(images);
          nv.setSliceType(nv.sliceTypeMultiplanar);

          // Store original affine of overlay (index 1)
          if (nv.volumes.length > 1) {
            originalAffineRef.current = nv.getVolumeAffine(1);
          }
          setIsLoaded(true);
        } catch (error) {
          console.error("Error loading volumes:", error);
        }
      }
    };

    initializeNiivue();

    return () => {
      niivueRef.current = null;
    };
  }, []);

  // Apply transform when it changes
  const handleTransformChange = useCallback((newTransform) => {
    setTransform(newTransform);

    if (niivueRef.current && originalAffineRef.current) {
      const nv = niivueRef.current;

      // Reset to original affine first
      nv.volumes[1].hdr.affine = copyAffine(originalAffineRef.current);
      nv.volumes[1].calculateRAS();

      // Apply cumulative transform
      nv.applyVolumeTransform(1, newTransform);
    }
  }, []);

  // Reset transform
  const handleReset = useCallback(() => {
    setTransform({
      translation: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });

    if (niivueRef.current && niivueRef.current.volumes.length > 1) {
      niivueRef.current.resetVolumeAffine(1);
      originalAffineRef.current = niivueRef.current.getVolumeAffine(1);
    }
  }, []);

  const modeHints = {
    translate: "Drag arrows to move the overlay",
    rotate: "Drag arcs to rotate the overlay",
    scale: "Drag arrows to scale the overlay",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        padding: "15px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginBottom: "15px",
      }}
    >
      {/* Main content: Canvas + Gizmo side by side */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Niivue Canvas */}
        <div
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            flex: "1 1 400px",
            maxWidth: "500px",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              minWidth: "350px",
              minHeight: "350px",
              width: "100%",
            }}
          />
        </div>

        {/* Gizmo Panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "15px",
            background: "var(--ifm-background-surface-color, #f5f5f5)",
            borderRadius: "8px",
            minWidth: "220px",
          }}
        >
          <h4 style={{ margin: 0, fontSize: "14px" }}>Transform Gizmo</h4>

          {/* Mode buttons */}
          <div style={{ display: "flex", gap: "5px" }}>
            {["translate", "rotate", "scale"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "4px",
                  background: mode === m ? "#5a5" : "#ddd",
                  color: mode === m ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: "12px",
                  textTransform: "capitalize",
                }}
              >
                {m === "translate" ? "Move" : m}
              </button>
            ))}
          </div>

          {/* Gizmo SVG */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              background: "#252525",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <TransformGizmo
              mode={mode}
              transform={transform}
              onTransformChange={handleTransformChange}
            />
          </div>

          {/* Hint */}
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              color: "#888",
              textAlign: "center",
            }}
          >
            {modeHints[mode]}
          </p>

          {/* Transform values display */}
          <div
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Translation:</strong>
              <span style={{ minWidth: "140px", textAlign: "right" }}>
                [{transform.translation.map((v) => v.toFixed(1).padStart(7)).join(",")}] mm
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Rotation:</strong>
              <span style={{ minWidth: "140px", textAlign: "right" }}>
                [{transform.rotation.map((v) => v.toFixed(1).padStart(7)).join(",")}] deg
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Scale:</strong>
              <span style={{ minWidth: "140px", textAlign: "right" }}>
                [{transform.scale.map((v) => v.toFixed(2).padStart(6)).join(",")}]
              </span>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={!isLoaded}
            style={{
              padding: "8px",
              border: "none",
              borderRadius: "4px",
              background: "#664",
              color: "#fff",
              cursor: isLoaded ? "pointer" : "not-allowed",
              fontSize: "12px",
            }}
          >
            Reset Transform
          </button>
        </div>
      </div>
    </div>
  );
};
