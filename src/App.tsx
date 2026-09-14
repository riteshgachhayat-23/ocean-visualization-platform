import { useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
import OceanScene from "./OceanScene";

type Location = {
  latitude: number;
  longitude: number;
};

type Parameter =
  | "Temperature"
  | "Salinity"
  | "Current Speed";

type OceanData = {
  temperature: number | null;
  salinity: number | null;
  currentSpeed: number | null;
  currentDirection: number | null;
  actualLatitude: number | null;
  actualLongitude: number | null;
  time: string | null;
};

function App() {
  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null);

  const [parameter, setParameter] =
    useState<Parameter>("Temperature");

  const [depth, setDepth] = useState(100);

  const [time, setTime] = useState(12);

  const [oceanData, setOceanData] = useState<OceanData>({
    temperature: null,
    salinity: null,
    currentSpeed: null,
    currentDirection: null,
    actualLatitude: null,
    actualLongitude: null,
    time: null,
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [darkMode, setDarkMode] = useState(true);

  /* =========================================================
     EMPTY DATA
     ========================================================= */

  const emptyOceanData = (): OceanData => ({
    temperature: null,
    salinity: null,
    currentSpeed: null,
    currentDirection: null,
    actualLatitude: null,
    actualLongitude: null,
    time: null,
  });

  /* =========================================================
     FETCH OCEAN DATA
     ========================================================= */

  const fetchOceanData = async (
    location: Location,
    selectedDepth: number,
    selectedTime: number
  ) => {
    const response = await fetch(
      `https://ocean-visualization-platform-iuwn.onrender.com/api/ocean-data?lat=${encodeURIComponent(
        location.latitude
      )}&lon=${encodeURIComponent(
        location.longitude
      )}&depth=${encodeURIComponent(
        selectedDepth
      )}&time=${encodeURIComponent(selectedTime)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Ocean data request failed."
      );
    }

    return data;
  };

  /* =========================================================
     LOCATION SELECT
     ========================================================= */

  const handleLocationSelect = async (
    location: Location
  ) => {
    setSelectedLocation(location);

    setLoading(true);

    setError("");

    setOceanData(emptyOceanData());

    try {
      const data = await fetchOceanData(
        location,
        depth,
        time
      );

      setOceanData({
        temperature:
          typeof data.temperature === "number"
            ? data.temperature
            : null,

        salinity:
          typeof data.salinity === "number"
            ? data.salinity
            : null,

        currentSpeed:
          typeof data.currentSpeed === "number"
            ? data.currentSpeed
            : null,

        currentDirection:
          typeof data.currentDirection === "number"
            ? data.currentDirection
            : null,

        actualLatitude:
          typeof data.actualLatitude === "number"
            ? data.actualLatitude
            : null,

        actualLongitude:
          typeof data.actualLongitude === "number"
            ? data.actualLongitude
            : null,

        time: data.time ?? null,
      });
    } catch (err) {
      console.error(
        "Ocean data error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve ocean data."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     REFRESH DATA
     ========================================================= */

  const refreshData = async (
    newDepth: number = depth,
    newTime: number = time
  ) => {
    if (!selectedLocation) {
      return;
    }

    setLoading(true);

    setError("");

    try {
      const data = await fetchOceanData(
        selectedLocation,
        newDepth,
        newTime
      );

      setOceanData({
        temperature:
          typeof data.temperature === "number"
            ? data.temperature
            : null,

        salinity:
          typeof data.salinity === "number"
            ? data.salinity
            : null,

        currentSpeed:
          typeof data.currentSpeed === "number"
            ? data.currentSpeed
            : null,

        currentDirection:
          typeof data.currentDirection === "number"
            ? data.currentDirection
            : null,

        actualLatitude:
          typeof data.actualLatitude === "number"
            ? data.actualLatitude
            : null,

        actualLongitude:
          typeof data.actualLongitude === "number"
            ? data.actualLongitude
            : null,

        time: data.time ?? null,
      });
    } catch (err) {
      console.error(
        "Ocean data refresh error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh ocean data."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     DEPTH
     ========================================================= */

  const handleDepthChange = (
    value: number
  ) => {
    setDepth(value);

    if (selectedLocation) {
      refreshData(value, time);
    }
  };

  /* =========================================================
     TIME
     ========================================================= */

  const handleTimeChange = (
    value: number
  ) => {
    setTime(value);

    if (selectedLocation) {
      refreshData(depth, value);
    }
  };

  /* =========================================================
     PARAMETER VALUE
     ========================================================= */

  const getValue = () => {
    if (loading) {
      return "...";
    }

    if (
      parameter === "Temperature"
    ) {
      return oceanData.temperature !== null
        ? oceanData.temperature.toFixed(2)
        : "--";
    }

    if (
      parameter === "Salinity"
    ) {
      return oceanData.salinity !== null
        ? oceanData.salinity.toFixed(2)
        : "--";
    }

    return oceanData.currentSpeed !== null
      ? oceanData.currentSpeed.toFixed(2)
      : "--";
  };

  /* =========================================================
     PARAMETER UNIT
     ========================================================= */

  const getUnit = () => {
    if (
      parameter === "Temperature"
    ) {
      return "°C";
    }

    if (
      parameter === "Salinity"
    ) {
      return "PSU";
    }

    return "km/h";
  };

  /* =========================================================
     PDF HELPERS
     ========================================================= */

  const addFooter = (
    pdf: jsPDF,
    pageNumber: number
  ) => {
    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    pdf.setDrawColor(
      180,
      205,
      215
    );

    pdf.line(
      18,
      pageHeight - 18,
      pageWidth - 18,
      pageHeight - 18
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      100,
      120,
      130
    );

    pdf.text(
      "OceanVista3D • Interactive Ocean Visualization Platform",
      18,
      pageHeight - 10
    );

    pdf.text(
      `Page ${pageNumber}`,
      pageWidth - 35,
      pageHeight - 10
    );
  };

  const addSectionTitle = (
    pdf: jsPDF,
    title: string,
    y: number
  ) => {
    pdf.setFillColor(
      5,
      80,
      105
    );

    pdf.roundedRect(
      18,
      y - 7,
      174,
      10,
      2,
      2,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(11);

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.text(
      title,
      24,
      y
    );

    pdf.setTextColor(
      20,
      35,
      45
    );
  };

  const addKeyValue = (
    pdf: jsPDF,
    label: string,
    value: string,
    y: number
  ) => {
    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      90,
      110,
      120
    );

    pdf.text(
      label,
      25,
      y
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setTextColor(
      20,
      35,
      45
    );

    pdf.text(
      value,
      105,
      y
    );
  };

  const addPageHeader = (
    pdf: jsPDF,
    subtitle: string
  ) => {
    pdf.setFillColor(
      3,
      28,
      43
    );

    pdf.rect(
      0,
      0,
      210,
      27,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(16);

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.text(
      "OceanVista3D",
      18,
      12
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      150,
      220,
      235
    );

    pdf.text(
      subtitle.toUpperCase(),
      18,
      20
    );

    pdf.setTextColor(
      20,
      35,
      45
    );
  };

  /* =========================================================
     PROFESSIONAL PDF REPORT
     ========================================================= */

  const generatePDFReport = () => {
    if (!selectedLocation) {
      setError(
        "Please select an ocean location first."
      );

      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    const latitude =
      selectedLocation.latitude.toFixed(4);

    const longitude =
      selectedLocation.longitude.toFixed(4);

    const actualLatitude =
      oceanData.actualLatitude !== null
        ? oceanData.actualLatitude.toFixed(4)
        : "--";

    const actualLongitude =
      oceanData.actualLongitude !== null
        ? oceanData.actualLongitude.toFixed(4)
        : "--";

    const temperature =
      oceanData.temperature !== null
        ? `${oceanData.temperature.toFixed(2)} °C`
        : "--";

    const salinity =
      oceanData.salinity !== null
        ? `${oceanData.salinity.toFixed(2)} PSU`
        : "--";

    const currentSpeed =
      oceanData.currentSpeed !== null
        ? `${oceanData.currentSpeed.toFixed(2)} km/h`
        : "--";

    const currentDirection =
      oceanData.currentDirection !== null
        ? `${oceanData.currentDirection.toFixed(0)}°`
        : "--";

    /* =======================================================
       PAGE 1 — COVER
       ======================================================= */

    pdf.setFillColor(
      3,
      19,
      31
    );

    pdf.rect(
      0,
      0,
      pageWidth,
      pageHeight,
      "F"
    );

    /* Decorative ocean glow */

    pdf.setFillColor(
      0,
      105,
      135
    );

    pdf.circle(
      170,
      55,
      38,
      "F"
    );

    pdf.setFillColor(
      3,
      45,
      63
    );

    pdf.circle(
      170,
      55,
      30,
      "F"
    );

    /* Small brand */

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(13);

    pdf.setTextColor(
      90,
      220,
      240
    );

    pdf.text(
      "OCEANVISTA3D",
      20,
      28
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      150,
      180,
      190
    );

    pdf.text(
      "INTERACTIVE MARINE DATA PLATFORM",
      20,
      35
    );

    /* Main title */

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(27);

    pdf.setTextColor(
      245,
      252,
      255
    );

    pdf.text(
      "Ocean Location",
      20,
      105
    );

    pdf.text(
      "Research Report",
      20,
      118
    );

    /* Location box */

    pdf.setFillColor(
      8,
      42,
      57
    );

    pdf.roundedRect(
      20,
      140,
      170,
      45,
      4,
      4,
      "F"
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      110,
      220,
      235
    );

    pdf.text(
      "SELECTED LOCATION",
      28,
      151
    );

    pdf.setFontSize(15);

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.text(
      `${latitude}° N / ${longitude}° E`,
      28,
      163
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      165,
      190,
      200
    );

    pdf.text(
      `Observation depth: ${depth} m`,
      28,
      175
    );

    pdf.text(
      `Selected time: ${String(time).padStart(
        2,
        "0"
      )}:00`,
      110,
      175
    );

    /* Report info */

    pdf.setFontSize(9);

    pdf.setTextColor(
      130,
      155,
      165
    );

    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      20,
      245
    );

    pdf.text(
      "Marine environmental observation and visualization report",
      20,
      253
    );

    pdf.setDrawColor(
      60,
      125,
      145
    );

    pdf.line(
      20,
      260,
      190,
      260
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      105,
      135,
      145
    );

    pdf.text(
      "Generated by OceanVista3D",
      20,
      275
    );

    pdf.text(
      "Research visualization • Marine parameters • Spatial analysis",
      20,
      282
    );

    /* =======================================================
       PAGE 2 — LOCATION & OBSERVATION
       ======================================================= */

    pdf.addPage();

    addPageHeader(
      pdf,
      "Location and Observation"
    );

    addSectionTitle(
      pdf,
      "1. Selected Geographic Location",
      42
    );

    addKeyValue(
      pdf,
      "Requested latitude",
      `${latitude}°`,
      57
    );

    addKeyValue(
      pdf,
      "Requested longitude",
      `${longitude}°`,
      67
    );

    addKeyValue(
      pdf,
      "Sea-grid latitude",
      `${actualLatitude}°`,
      77
    );

    addKeyValue(
      pdf,
      "Sea-grid longitude",
      `${actualLongitude}°`,
      87
    );

    addSectionTitle(
      pdf,
      "2. Observation Configuration",
      108
    );

    addKeyValue(
      pdf,
      "Observation depth",
      `${depth} m`,
      123
    );

    addKeyValue(
      pdf,
      "Selected hour",
      `${String(time).padStart(
        2,
        "0"
      )}:00`,
      133
    );

    addKeyValue(
      pdf,
      "Marine data timestamp",
      oceanData.time || "--",
      143
    );

    addSectionTitle(
      pdf,
      "3. Spatial Interpretation",
      164
    );

    const spatialText =
      `The selected position represents the geographic point inspected through the OceanVista3D ` +
      `interactive 3D ocean visualization. The requested coordinates are mapped to an available ` +
      `marine data grid, represented in the report by the sea-grid latitude and longitude. ` +
      `This allows the selected location to be associated with the nearest available marine dataset.`;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      55,
      75,
      85
    );

    pdf.text(
      pdf.splitTextToSize(
        spatialText,
        165
      ),
      25,
      177
    );

    addSectionTitle(
      pdf,
      "4. Observation Purpose",
      216
    );

    const purposeText =
      `The purpose of the observation is to provide an interactive view of marine environmental ` +
      `conditions at a selected ocean location. Temperature, salinity, current speed and current ` +
      `direction are presented together to provide a broader physical description of the selected region.`;

    pdf.text(
      pdf.splitTextToSize(
        purposeText,
        165
      ),
      25,
      229
    );

    addFooter(
      pdf,
      2
    );

    /* =======================================================
       PAGE 3 — PARAMETER ANALYSIS
       ======================================================= */

    pdf.addPage();

    addPageHeader(
      pdf,
      "Marine Parameter Analysis"
    );

    addSectionTitle(
      pdf,
      "5. Marine Environmental Parameters",
      42
    );

    /* Parameter cards */

    const cards = [
      {
        title: "TEMPERATURE",
        value: temperature,
        description:
          "Thermal condition of the selected marine grid.",
      },
      {
        title: "SALINITY",
        value: salinity,
        description:
          "Salt concentration represented by the available dataset.",
      },
      {
        title: "CURRENT SPEED",
        value: currentSpeed,
        description:
          "Magnitude of the modeled marine current.",
      },
      {
        title: "CURRENT DIRECTION",
        value: currentDirection,
        description:
          "Direction associated with the marine current.",
      },
    ];

    let cardY = 55;

    cards.forEach((card) => {
      pdf.setFillColor(
        242,
        248,
        250
      );

      pdf.setDrawColor(
        185,
        215,
        225
      );

      pdf.roundedRect(
        20,
        cardY,
        170,
        28,
        3,
        3,
        "FD"
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(8);

      pdf.setTextColor(
        0,
        105,
        130
      );

      pdf.text(
        card.title,
        27,
        cardY + 8
      );

      pdf.setFontSize(17);

      pdf.setTextColor(
        20,
        40,
        50
      );

      pdf.text(
        card.value,
        27,
        cardY + 19
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(8);

      pdf.setTextColor(
        100,
        120,
        130
      );

      pdf.text(
        card.description,
        92,
        cardY + 16
      );

      cardY += 34;
    });

    addSectionTitle(
      pdf,
      "6. Combined Physical Interpretation",
      202
    );

    const interpretation =
      `The four reported parameters should be interpreted together rather than as isolated values. ` +
      `Temperature provides information about the thermal state of the marine environment, while salinity ` +
      `describes its salt concentration. Current speed and direction describe the movement of water at the ` +
      `selected location. Examining these variables simultaneously can help users understand spatial and ` +
      `temporal differences within the visualized ocean field.`;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      55,
      75,
      85
    );

    pdf.text(
      pdf.splitTextToSize(
        interpretation,
        165
      ),
      25,
      216
    );

    addFooter(
      pdf,
      3
    );

    /* =======================================================
       PAGE 4 — DEPTH / TIME STUDY
       ======================================================= */

    pdf.addPage();

    addPageHeader(
      pdf,
      "Depth and Temporal Analysis"
    );

    addSectionTitle(
      pdf,
      "7. Depth Analysis",
      42
    );

    const depthText =
      `The current observation has been requested at a depth of ${depth} metres. ` +
      `OceanVista3D allows the user to change the depth control and retrieve another observation ` +
      `for the same selected geographic location. This provides a simple method for examining how ` +
      `marine parameters change with depth within the available model or fallback representation.`;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      55,
      75,
      85
    );

    pdf.text(
      pdf.splitTextToSize(
        depthText,
        165
      ),
      25,
      55
    );

    addSectionTitle(
      pdf,
      "8. Time Analysis",
      105
    );

    const timeText =
      `The selected observation time is ${String(
        time
      ).padStart(
        2,
        "0"
      )}:00. The time control allows different hourly observations to be requested from the marine ` +
      `data service. Comparing observations at different times can help identify temporal variation in ` +
      `temperature, salinity and current-related parameters.`;

    pdf.text(
      pdf.splitTextToSize(
        timeText,
        165
      ),
      25,
      118
    );

    addSectionTitle(
      pdf,
      "9. Current Observation Snapshot",
      168
    );

    addKeyValue(
      pdf,
      "Temperature",
      temperature,
      183
    );

    addKeyValue(
      pdf,
      "Salinity",
      salinity,
      193
    );

    addKeyValue(
      pdf,
      "Current speed",
      currentSpeed,
      203
    );

    addKeyValue(
      pdf,
      "Current direction",
      currentDirection,
      213
    );

    addKeyValue(
      pdf,
      "Depth",
      `${depth} m`,
      223
    );

    addKeyValue(
      pdf,
      "Time",
      `${String(time).padStart(
        2,
        "0"
      )}:00`,
      233
    );

    addFooter(
      pdf,
      4
    );

    /* =======================================================
       PAGE 5 — SOURCES & LIMITATIONS
       ======================================================= */

    pdf.addPage();

    addPageHeader(
      pdf,
      "Sources and Research Notes"
    );

    addSectionTitle(
      pdf,
      "10. Data Sources",
      42
    );

    addKeyValue(
      pdf,
      "Temperature",
      "Open-Meteo Marine API",
      57
    );

    addKeyValue(
      pdf,
      "Current",
      "Open-Meteo Marine API",
      67
    );

    addKeyValue(
      pdf,
      "Salinity",
      "NOAA AOML / deterministic fallback",
      77
    );

    addSectionTitle(
      pdf,
      "11. Data Processing",
      100
    );

    const processingText =
      `The OceanVista3D frontend sends the selected latitude, longitude, depth and time to the local ` +
      `backend service. The backend retrieves or calculates the available marine parameters and returns ` +
      `the observation to the visualization interface. The frontend then presents the values in the ` +
      `telemetry panel and includes the same observation in this research report.`;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      55,
      75,
      85
    );

    pdf.text(
      pdf.splitTextToSize(
        processingText,
        165
      ),
      25,
      114
    );

    addSectionTitle(
      pdf,
      "12. Research Limitations",
      162
    );

    const limitationsText =
      `The report represents the data returned by the connected marine data services and the backend ` +
      `processing used by OceanVista3D. Values should therefore be treated as model or service-derived ` +
      `observations rather than direct measurements taken by a physical sensor at the selected point. ` +
      `The exact spatial resolution and temporal availability depend on the underlying data services. ` +
      `Where a deterministic fallback is used, this is identified in the data-source information.`;

    pdf.text(
      pdf.splitTextToSize(
        limitationsText,
        165
      ),
      25,
      176
    );

    addSectionTitle(
      pdf,
      "13. Conclusion",
      225
    );

    const conclusion =
      `OceanVista3D provides an interactive method for exploring marine environmental conditions through ` +
      `geographic selection, depth control, time control and multi-parameter telemetry. The generated ` +
      `report consolidates the selected observation into a structured research document that can be used ` +
      `for analysis, demonstration and project documentation.`;

    pdf.text(
      pdf.splitTextToSize(
        conclusion,
        165
      ),
      25,
      239
    );

    addFooter(
      pdf,
      5
    );

    /* =======================================================
       SAVE PDF
       ======================================================= */

    pdf.save(
      `OceanVista3D_Research_Report_${latitude}_${longitude}.pdf`
    );
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div
      className={`app ${
        darkMode
          ? "dark-mode"
          : "light-mode"
      }`}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <div className="brand-row">

          <span className="brand-mark">
            ◈
          </span>

          <div>

            <h1>
              OceanVista3D
            </h1>

            <p>
              Interactive ocean
              visualization platform
            </p>

          </div>

        </div>

        <div className="header-right">

          <button
            className="theme-toggle"
            onClick={() =>
              setDarkMode(
                !darkMode
              )
            }
          >
            {darkMode
              ? "☀ Light Mode"
              : "🌙 Dark Mode"}
          </button>

          <div className="telemetry">

            <span className="telemetry-dot" />

            {loading
              ? "FETCHING DATA"
              : "LIVE DATA FIELD"}

          </div>

          <div className="status">

            {error
              ? "DATA ERROR"
              : "SYSTEM READY"}

          </div>

        </div>

      </header>

      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      <main className="dashboard">

        {/* ===================================================
            LEFT
        =================================================== */}

        <section className="control-panel futuristic-panel">

          <div className="panel-label">
            CONTROL MATRIX
          </div>

          <h2>
            Data Controls
          </h2>

          <div className="field">

            <label>
              Parameter
            </label>

            <select
              value={parameter}
              onChange={(event) =>
                setParameter(
                  event.target
                    .value as Parameter
                )
              }
            >

              <option value="Temperature">
                Temperature
              </option>

              <option value="Salinity">
                Salinity
              </option>

              <option value="Current Speed">
                Current Speed
              </option>

            </select>

          </div>

          <div className="field">

            <div className="slider-header">

              <label>
                Depth
              </label>

              <span>
                {depth} m
              </span>

            </div>

            <input
              type="range"
              min="0"
              max="5000"
              step="50"
              value={depth}
              onChange={(event) =>
                handleDepthChange(
                  Number(
                    event.target.value
                  )
                )
              }
            />

          </div>

          <div className="field">

            <div className="slider-header">

              <label>
                Time
              </label>

              <span>
                {String(time).padStart(
                  2,
                  "0"
                )}
                :00
              </span>

            </div>

            <input
              type="range"
              min="0"
              max="24"
              value={time}
              onChange={(event) =>
                handleTimeChange(
                  Number(
                    event.target.value
                  )
                )
              }
            />

          </div>

          <div className="control-readout">

            <div>

              <span>
                ACTIVE PARAMETER
              </span>

              <strong>
                {parameter}
              </strong>

            </div>

            <div>

              <span>
                DEPTH
              </span>

              <strong>
                {depth} m
              </strong>

            </div>

            <div>

              <span>
                TIME
              </span>

              <strong>
                {String(time).padStart(
                  2,
                  "0"
                )}
                :00
              </strong>

            </div>

          </div>

          <button
            className="report-button"
            onClick={
              generatePDFReport
            }
            disabled={
              !selectedLocation ||
              loading
            }
          >
            📄 Generate Research PDF
          </button>

        </section>

        {/* ===================================================
            CENTER 3D
        =================================================== */}

        <section className="ocean-view futuristic-panel">

          <div className="globe">

            <OceanScene
              depth={depth}
              oceanData={oceanData}
              onLocationSelect={
                handleLocationSelect
              }
            />

          </div>

          <div className="view-footer">

            <div>

              <div className="panel-label">
                3D VISUALIZATION
              </div>

              <h2>
                Global Ocean Field
              </h2>

            </div>

            <div className="interaction-hint">

              {selectedLocation
                ? "LOCATION SELECTED"
                : "CLICK OCEAN TO INSPECT"}

            </div>

          </div>

        </section>

        {/* ===================================================
            RIGHT TELEMETRY
        =================================================== */}

        <section className="data-panel futuristic-panel">

          <div className="panel-label">
            LIVE TELEMETRY
          </div>

          <h2>
            Location Properties
          </h2>

          {!selectedLocation ? (

            <div className="location-card empty-state">

              <div className="location-title">
                NO LOCATION SELECTED
              </div>

              <p>
                Click the ocean to
                inspect its properties.
              </p>

            </div>

          ) : (

            <>

              <div className="metric-card">

                <span>
                  {parameter.toUpperCase()}
                </span>

                <strong>
                  {getValue()}
                </strong>

                <small>
                  {getUnit()}
                </small>

              </div>

              <div className="location-card">

                <div className="location-title">
                  OCEAN PROPERTIES
                </div>

                <div className="coordinate">

                  <span>
                    TEMPERATURE
                  </span>

                  <strong>
                    {oceanData.temperature !==
                    null
                      ? `${oceanData.temperature.toFixed(
                          2
                        )} °C`
                      : "--"}
                  </strong>

                </div>

                <div className="coordinate">

                  <span>
                    SALINITY
                  </span>

                  <strong>
                    {oceanData.salinity !==
                    null
                      ? `${oceanData.salinity.toFixed(
                          2
                        )} PSU`
                      : "--"}
                  </strong>

                </div>

                <div className="coordinate">

                  <span>
                    CURRENT SPEED
                  </span>

                  <strong>
                    {oceanData.currentSpeed !==
                    null
                      ? `${oceanData.currentSpeed.toFixed(
                          2
                        )} km/h`
                      : "--"}
                  </strong>

                </div>

                <div className="coordinate">

                  <span>
                    CURRENT DIRECTION
                  </span>

                  <strong>
                    {oceanData.currentDirection !==
                    null
                      ? `${oceanData.currentDirection.toFixed(
                          0
                        )}°`
                      : "--"}
                  </strong>

                </div>

              </div>

              <div className="location-card">

                <div className="location-title">
                  SELECTED LOCATION
                </div>

                <div className="coordinate">

                  <span>
                    LATITUDE
                  </span>

                  <strong>
                    {selectedLocation.latitude.toFixed(
                      4
                    )}°
                  </strong>

                </div>

                <div className="coordinate">

                  <span>
                    LONGITUDE
                  </span>

                  <strong>
                    {selectedLocation.longitude.toFixed(
                      4
                    )}°
                  </strong>

                </div>

                {oceanData.actualLatitude !==
                  null && (

                  <div className="coordinate">

                    <span>
                      SEA GRID LATITUDE
                    </span>

                    <strong>
                      {oceanData.actualLatitude.toFixed(
                        4
                      )}°
                    </strong>

                  </div>

                )}

                {oceanData.actualLongitude !==
                  null && (

                  <div className="coordinate">

                    <span>
                      SEA GRID LONGITUDE
                    </span>

                    <strong>
                      {oceanData.actualLongitude.toFixed(
                        4
                      )}°
                    </strong>

                  </div>

                )}

                <div className="coordinate">

                  <span>
                    DEPTH
                  </span>

                  <strong>
                    {depth} m
                  </strong>

                </div>

                <div className="coordinate">

                  <span>
                    TIME
                  </span>

                  <strong>
                    {String(time).padStart(
                      2,
                      "0"
                    )}
                    :00
                  </strong>

                </div>

              </div>

              <div className="location-card">

                <div className="location-title">
                  DATA SOURCES
                </div>

                <p>
                  Temperature:
                  Open-Meteo Marine
                </p>

                <p>
                  Current:
                  Open-Meteo Marine
                </p>

                <p>
                  Salinity:
                  NOAA AOML /
                  deterministic fallback
                </p>

                {oceanData.time && (

                  <p>
                    Marine timestamp:
                    {" "}
                    {oceanData.time}
                  </p>

                )}

                {error && (

                  <p
                    style={{
                      color:
                        "#ff7878",
                      marginTop:
                        "10px",
                    }}
                  >
                    {error}
                  </p>

                )}

              </div>

            </>

          )}

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        OCEANVISTA3D

        <span>
          / LIVE MARINE DATA
        </span>

      </footer>

    </div>
  );
}

export default App;