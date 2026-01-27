import React, { useState, useRef, useEffect } from "react";
import { Niivue } from "@niivue/niivue";

export const EventsDemo = () => {
  const canvasRef = useRef(null);
  const niivueRef = useRef(null);
  const [eventLog, setEventLog] = useState([]);
  const [abortController, setAbortController] = useState(null);
  const [listenerCount, setListenerCount] = useState(0);
  const maxLogEntries = 10;

  const addLog = (message, type = "info") => {
    setEventLog((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      const newLog = { message, type, timestamp, id: Date.now() };
      return [newLog, ...prev].slice(0, maxLogEntries);
    });
  };

  useEffect(() => {
    // Initialize Niivue
    const nv = new Niivue({
      textHeight: 0.05,
      colorbarHeight: 0.05,
      crosshairWidth: 1
    });
    nv.attachToCanvas(canvasRef.current);
    niivueRef.current = nv;

    // Load a sample volume
    const volumeList = [{
      url: "https://niivue.github.io/niivue-demo-images/mni152.nii.gz"
    }];
    nv.loadVolumes(volumeList);

    // Add event listeners to demonstrate the event system
    const locationChangeHandler = (event) => {
      const loc = event.detail;
      if (loc && loc.mm) {
        addLog(`📍 Location: [${loc.mm[0].toFixed(1)}, ${loc.mm[1].toFixed(1)}, ${loc.mm[2].toFixed(1)}]`, "event");
      }
    };

    const imageLoadedHandler = (event) => {
      addLog(`🖼️ Image loaded: ${event.detail.name}`, "success");
    };

    // Add listeners
    nv.addEventListener('locationChange', locationChangeHandler);
    nv.addEventListener('imageLoaded', imageLoadedHandler);

    return () => {
      // Cleanup
      if (niivueRef.current) {
        niivueRef.current.removeEventListener('locationChange', locationChangeHandler);
        niivueRef.current.removeEventListener('imageLoaded', imageLoadedHandler);
      }
    };
  }, []);

  const addMultipleListeners = () => {
    const nv = niivueRef.current;
    if (!nv) return;

    const listener1 = () => addLog("👂 Listener 1 called", "event");
    const listener2 = () => addLog("👂 Listener 2 called", "event");
    const listener3 = () => addLog("👂 Listener 3 called", "event");

    nv.addEventListener('intensityChange', listener1);
    nv.addEventListener('intensityChange', listener2);
    nv.addEventListener('intensityChange', listener3);

    setListenerCount(3);
    addLog("✅ Added 3 intensity change listeners", "success");
  };

  const useOnceOption = () => {
    const nv = niivueRef.current;
    if (!nv) return;

    nv.addEventListener('locationChange', (event) => {
      addLog("🔔 Once listener fired (won't fire again)", "info");
    }, { once: true });

    addLog("✅ Added 'once' listener - click the image to trigger", "success");
  };

  const useAbortController = () => {
    const nv = niivueRef.current;
    if (!nv) return;

    const controller = new AbortController();
    setAbortController(controller);

    nv.addEventListener('locationChange', () => {
      addLog("🎮 AbortController listener active", "event");
    }, { signal: controller.signal });

    addLog("✅ Added listener with AbortController", "success");
  };

  const abortListeners = () => {
    if (abortController) {
      abortController.abort();
      addLog("🛑 Aborted all listeners via AbortController", "warning");
      setAbortController(null);
    }
  };

  const mixCallbacksAndEvents = () => {
    const nv = niivueRef.current;
    if (!nv) return;

    // Add event listener
    nv.addEventListener('optsChange', (event) => {
      addLog(`⚙️ Event: ${event.detail.propertyName} changed`, "event");
    });

    // Add legacy callback
    const oldCallback = nv.onOptsChange;
    nv.onOptsChange = (propertyName, newValue, oldValue) => {
      addLog(`📞 Callback: ${propertyName} changed`, "info");
      if (oldCallback) oldCallback(propertyName, newValue, oldValue);
    };

    // Trigger change
    nv.opts.crosshairWidth = Math.random() * 3 + 1;

    addLog("✅ Both event listener and callback registered", "success");
  };

  const clearLog = () => {
    setEventLog([]);
  };

  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginBottom: "1rem"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "1rem",
          backgroundColor: "#f9f9f9"
        }}>
          <canvas ref={canvasRef} width={600} height={400}></canvas>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.5rem"
        }}>
          <button
            onClick={addMultipleListeners}
            style={{
              padding: "0.75rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Add Multiple Listeners
          </button>

          <button
            onClick={useOnceOption}
            style={{
              padding: "0.75rem",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Use {`{ once: true }`}
          </button>

          <button
            onClick={useAbortController}
            style={{
              padding: "0.75rem",
              backgroundColor: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Use AbortController
          </button>

          <button
            onClick={abortListeners}
            disabled={!abortController}
            style={{
              padding: "0.75rem",
              backgroundColor: abortController ? "#dc3545" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: abortController ? "pointer" : "not-allowed",
              fontSize: "0.9rem"
            }}
          >
            Abort Listeners
          </button>

          <button
            onClick={mixCallbacksAndEvents}
            style={{
              padding: "0.75rem",
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Mix Callbacks & Events
          </button>

          <button
            onClick={clearLog}
            style={{
              padding: "0.75rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Clear Log
          </button>
        </div>

        <div style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          minHeight: "200px",
          maxHeight: "300px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: "0.85rem"
        }}>
          <div style={{
            fontWeight: "bold",
            marginBottom: "0.5rem",
            color: "#495057"
          }}>
            Event Log (showing last {maxLogEntries} events):
          </div>
          {eventLog.length === 0 ? (
            <div style={{ color: "#6c757d", fontStyle: "italic" }}>
              Click on the image or use the buttons above to trigger events...
            </div>
          ) : (
            eventLog.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "0.25rem 0",
                  borderBottom: "1px solid #dee2e6",
                  color: log.type === "success" ? "#28a745" :
                         log.type === "warning" ? "#dc3545" :
                         log.type === "event" ? "#007bff" : "#495057"
                }}
              >
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                  [{log.timestamp}]
                </span>{" "}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "1rem",
        backgroundColor: "#e7f3ff",
        borderLeft: "4px solid #007bff",
        borderRadius: "4px"
      }}>
        <strong>💡 Try this:</strong>
        <ul style={{ marginBottom: 0, paddingLeft: "1.5rem" }}>
          <li>Click on the brain image to change location and see events</li>
          <li>Click "Add Multiple Listeners" then adjust the brightness slider</li>
          <li>Use the AbortController to dynamically remove listeners</li>
          <li>Mix callbacks and events to see backward compatibility</li>
        </ul>
      </div>
    </div>
  );
};
