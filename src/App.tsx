import { useState, useMemo } from "react";
import "./App.css";
import OceanScene from "./OceanScene";
import { SAMPLE_OCEAN_DATA, OceanDataPoint } from "./data/oceandata";

type OceanParam = "Temperature" | "Salinity" | "Current Speed";

export default function App() {
  const [parameter, setParameter] = useState<OceanParam>("Temperature");
  const [depth, setDepth] = useState<number>(25);
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-05");
  const [selectedPoint, setSelectedPoint] = useState<OceanDataPoint | null>(null);

  // Filter points matching the chosen date
  const filteredPoints = useMemo(() => {
    return SAMPLE_OCEAN_DATA.filter((p) => p.time.startsWith(selectedDate));
  }, [selectedDate]);

  // Representative points for the daily cards
  const modelPoint = filteredPoints.find((p) => p.source === "model");
  const obsPoint = filteredPoints.find((p) => p.source === "observation");

  const getMetric = (val: number | undefined, unit: string) =>
    val !== undefined ? `${val.toFixed(1)} ${unit}` : "N/A";

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌊 Ocean Visualization Platform</h1>
          <p>Interactive numerical model &amp; in-situ observation viewer</p>
        </div>
        <div className="status">● System Ready</div>
      </header>

      <main className="dashboard">
        {/* Left Controls */}
        <section className="control-panel">
          <h2>Data Controls</h2>

          <label htmlFor="param-select">Parameter</label>
          <select
            id="param-select"
            value={parameter}
            onChange={(e) => setParameter(e.target.value as OceanParam)}
          >
            <option value="Temperature">Temperature</option>
            <option value="Salinity">Salinity</option>
            <option value="Current Speed">Current Speed</option>
          </select>

          <label htmlFor="date-picker">Date Filter</label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedPoint(null); // Reset selection when date changes
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #23415c",
              background: "#102a42",
              color: "white",
              fontSize: "14px",
            }}
          />

          <label htmlFor="depth-slider">Depth Slice</label>
          <input
            id="depth-slider"
            type="range"
            min="0"
            max="2000"
            step="10"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          />
          <p>Layer: {depth} m</p>
        </section>

        {/* Center 3D Globe */}
        <section className="ocean-view">
          <div className="globe">
            <OceanScene
              parameter={parameter}
              depth={depth}
              points={filteredPoints}
              selectedPointId={selectedPoint?.id}
              onSelectPoint={(pt) => setSelectedPoint(pt)}
            />
          </div>
          <h2>3D Ocean View</h2>
          <p>
            Rendering <strong>{filteredPoints.length}</strong> points on{" "}
            <strong>{selectedDate}</strong>. Click any marker to inspect.
          </p>
        </section>

        {/* Right Inspection Cards */}
        <section className="data-panel">
          <h2>Telemetry &amp; Analysis</h2>

          {selectedPoint ? (
            <div className="data-card" style={{ borderColor: "#ff0077" }}>
              <span>Inspected Float ({selectedPoint.source.toUpperCase()})</span>
              <strong>{selectedPoint.id}</strong>
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#9fb3c8", lineHeight: "1.6" }}>
                Lat: {selectedPoint.latitude}° | Lon: {selectedPoint.longitude}°<br />
                Depth: {selectedPoint.depth} m<br />
                Temp: {selectedPoint.temperature} °C<br />
                Salinity: {selectedPoint.salinity} PSU<br />
                Current: {selectedPoint.current_speed} m/s
              </p>
            </div>
          ) : (
            <div className="data-card">
              <span>Selected Float</span>
              <strong style={{ fontSize: "15px", color: "#9fb3c8" }}>Click a pin on the globe</strong>
            </div>
          )}

          <div className="data-card">
            <span>Daily Regional Model Avg</span>
            <strong>{getMetric(modelPoint?.temperature, "°C")}</strong>
          </div>

          <div className="data-card">
            <span>Daily In-Situ Reading</span>
            <strong>{getMetric(obsPoint?.temperature, "°C")}</strong>
          </div>
        </section>
      </main>

      <footer>Ocean Digital Twin Platform • React + Three.js</footer>
    </div>
  );
}