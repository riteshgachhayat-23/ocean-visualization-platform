import "./App.css";
import OceanScene from "./OceanScene";

function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌊 Ocean Visualization Platform</h1>
          <p>Interactive numerical model & in-situ observation viewer</p>
        </div>

        <div className="status">
          ● System Ready
        </div>
      </header>

      <main className="dashboard">

        <section className="control-panel">
          <h2>Data Controls</h2>

          <label>Parameter</label>
          <select>
            <option>Temperature</option>
            <option>Salinity</option>
            <option>Current Speed</option>
          </select>

          <label>Depth</label>
          <input type="range" min="0" max="5000" defaultValue="100" />
          <p>Depth: 100 m</p>

          <label>Time</label>
          <input type="range" min="0" max="24" defaultValue="12" />
          <p>Time: 12:00</p>
        </section>

        <section className="ocean-view">
          <div className="globe">
            <OceanScene />
          </div>

          <h2>3D Ocean View</h2>
          <p>
            Interactive ocean visualization will appear here.
          </p>
        </section>

        <section className="data-panel">
          <h2>Observation Data</h2>

          <div className="data-card">
            <span>Model Value</span>
            <strong>24.6 °C</strong>
          </div>

          <div className="data-card">
            <span>Observed Value</span>
            <strong>24.1 °C</strong>
          </div>

          <div className="data-card">
            <span>Difference</span>
            <strong>0.5 °C</strong>
          </div>
        </section>

      </main>

      <footer>
        SIH 2026 • Ocean Data Visualization Platform
      </footer>
    </div>
  );
}

export default App;