import http from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT || 5000;

// ============================================================
// CACHE
// ============================================================

const DATA_CACHE = new Map();

// ============================================================
// RESPONSE HELPER
// ============================================================

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(JSON.stringify(data));
}

// ============================================================
// NUMBER HELPERS
// ============================================================

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(longitude) {
  return ((longitude + 540) % 360) - 180;
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

// ============================================================
// REAL MARINE DATA FROM OPEN-METEO
// ============================================================

async function getMarineData(latitude, longitude) {
  const url =
    "https://marine-api.open-meteo.com/v1/marine" +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    "&current=sea_surface_temperature,ocean_current_velocity,ocean_current_direction" +
    "&hourly=sea_surface_temperature,ocean_current_velocity,ocean_current_direction" +
    "&forecast_days=1" +
    "&timezone=UTC" +
    "&cell_selection=sea";

  const response = await fetch(url);

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }

  const data = JSON.parse(text);

  if (data.error) {
    throw new Error(data.reason || "Open-Meteo error");
  }

  return {
    temperature:
      data.current?.sea_surface_temperature ?? null,

    currentSpeed:
      data.current?.ocean_current_velocity ?? null,

    currentDirection:
      data.current?.ocean_current_direction ?? null,

    actualLatitude:
      data.latitude ?? latitude,

    actualLongitude:
      data.longitude ?? longitude,

    time:
      data.current?.time ?? null,
  };
}

// ============================================================
// TRY NEARBY MARINE GRID CELLS
// ============================================================

async function getMarineWithFallback(latitude, longitude) {
  const offsets = [
    [0, 0],

    [0.25, 0],
    [-0.25, 0],

    [0, 0.25],
    [0, -0.25],

    [0.5, 0],
    [-0.5, 0],

    [0, 0.5],
    [0, -0.5],

    [1, 0],
    [-1, 0],

    [0, 1],
    [0, -1],
  ];

  for (const [dLat, dLon] of offsets) {
    const testLat = clamp(
      latitude + dLat,
      -90,
      90
    );

    const testLon = normalizeLongitude(
      longitude + dLon
    );

    try {
      const data =
        await getMarineData(
          testLat,
          testLon
        );

      if (
        data.temperature !== null ||
        data.currentSpeed !== null
      ) {
        return data;
      }
    } catch {
      // Try next nearby grid cell
    }
  }

  return {
    temperature: null,
    currentSpeed: null,
    currentDirection: null,
    actualLatitude: null,
    actualLongitude: null,
    time: null,
  };
}

// ============================================================
// DEPTH + TIME MODEL
//
// This is used because Open-Meteo's marine endpoint gives
// surface/current information rather than a complete
// 0-5000 m ocean profile for every location.
//
// The model is deterministic:
// same location + same depth + same time
// = same result.
//
// Therefore changing depth/time produces smooth,
// repeatable changes.
// ============================================================

function calculateDepthTimeModel({
  latitude,
  longitude,
  depth,
  time,
  baseTemperature,
  baseSalinity,
  baseCurrentSpeed,
  baseCurrentDirection,
}) {
  // ----------------------------------------------------------
  // LIMIT DEPTH
  // ----------------------------------------------------------

  const safeDepth = clamp(
    Number(depth) || 0,
    0,
    5000
  );

  // ----------------------------------------------------------
  // LIMIT TIME
  // ----------------------------------------------------------

  const safeTime = clamp(
    Number(time) || 0,
    0,
    24
  );

  // ----------------------------------------------------------
  // LOCATION VARIATION
  //
  // Makes different ocean locations naturally different.
  // ----------------------------------------------------------

  const locationWave =
    Math.sin(
      (latitude * Math.PI) / 180
    ) * 0.8 +
    Math.cos(
      (longitude * Math.PI) / 180
    ) * 0.6;

  // ==========================================================
  // TEMPERATURE
  // ==========================================================

  let temperature =
    baseTemperature;

  if (
    temperature === null ||
    !Number.isFinite(temperature)
  ) {
    temperature =
      28 +
      locationWave;
  }

  // Temperature decreases with depth.
  //
  // Stronger change near surface,
  // slower change at greater depth.

  const depthCooling =
    0.0008 * safeDepth +
    0.00000012 *
      safeDepth *
      safeDepth;

  // Daily temperature cycle.

  const timeTemperature =
    0.7 *
    Math.sin(
      ((safeTime - 6) * Math.PI) / 12
    );

  temperature =
    temperature -
    depthCooling +
    timeTemperature;

  // ==========================================================
  // SALINITY
  // ==========================================================

  let salinity =
    baseSalinity;

  if (
    salinity === null ||
    !Number.isFinite(salinity)
  ) {
    // Global ocean baseline

    salinity =
      35 +
      0.4 * locationWave;
  }

  // Salinity generally changes gradually with depth.

  const depthSalinity =
    0.00045 * safeDepth;

  // Small time-related variation.

  const timeSalinity =
    0.12 *
    Math.cos(
      ((safeTime - 3) * Math.PI) / 12
    );

  salinity =
    salinity +
    depthSalinity +
    timeSalinity;

  // Keep within reasonable ocean range.

  salinity =
    clamp(
      salinity,
      30,
      40
    );

  // ==========================================================
  // CURRENT SPEED
  // ==========================================================

  let currentSpeed =
    baseCurrentSpeed;

  if (
    currentSpeed === null ||
    !Number.isFinite(currentSpeed)
  ) {
    currentSpeed =
      0.5 +
      0.1 * Math.abs(locationWave);
  }

  // Current generally becomes weaker with depth.

  const depthCurrentFactor =
    Math.exp(
      -safeDepth / 2200
    );

  // Tidal / time variation.

  const timeCurrentFactor =
    1 +
    0.35 *
      Math.sin(
        ((safeTime + 2) * Math.PI) / 12
      );

  currentSpeed =
    currentSpeed *
    depthCurrentFactor *
    timeCurrentFactor;

  // Location-dependent variation.

  currentSpeed +=
    0.08 *
    Math.sin(
      (latitude + longitude) *
        Math.PI /
        90
    );

  currentSpeed =
    clamp(
      currentSpeed,
      0.02,
      4
    );

  // ==========================================================
  // CURRENT DIRECTION
  // ==========================================================

  let currentDirection =
    baseCurrentDirection;

  if (
    currentDirection === null ||
    !Number.isFinite(currentDirection)
  ) {
    currentDirection =
      180 +
      locationWave * 20;
  }

  // Direction changes with depth.

  const depthDirectionChange =
    safeDepth *
    0.025;

  // Direction changes with time.

  const timeDirectionChange =
    18 *
    Math.sin(
      ((safeTime - 4) * Math.PI) / 12
    );

  // Location variation.

  const locationDirectionChange =
    12 *
    Math.sin(
      (latitude - longitude) *
        Math.PI /
        180
    );

  currentDirection =
    currentDirection +
    depthDirectionChange +
    timeDirectionChange +
    locationDirectionChange;

  // Keep direction between 0 and 360.

  currentDirection =
    ((currentDirection % 360) + 360) %
    360;

  // ==========================================================
  // RETURN FINAL MODEL
  // ==========================================================

  return {
    temperature:
      round(temperature, 2),

    salinity:
      round(salinity, 2),

    currentSpeed:
      round(currentSpeed, 2),

    currentDirection:
      round(currentDirection, 1),
  };
}

// ============================================================
// MAIN OCEAN DATA FUNCTION
// ============================================================

async function buildOceanData(
  latitude,
  longitude,
  depth,
  time
) {
  // ----------------------------------------------------------
  // GET REAL MARINE DATA
  // ----------------------------------------------------------

  const marine =
    await getMarineWithFallback(
      latitude,
      longitude
    );

  // ----------------------------------------------------------
  // BASE SALINITY
  //
  // NOAA ERDDAP can be slow/unavailable during demos, so
  // deterministic location-based salinity is used as the base.
  // ----------------------------------------------------------

  let baseSalinity = null;

  try {
    const absLat =
      Math.abs(
        marine.actualLatitude ??
          latitude
      );

    if (absLat < 10) {
      baseSalinity = 34.5;
    } else if (absLat < 30) {
      baseSalinity = 36.5;
    } else if (absLat < 60) {
      baseSalinity = 34.0;
    } else {
      baseSalinity = 33.0;
    }

    // Add deterministic geographic variation.
    //
    // IMPORTANT:
    // No Math.random() here.
    //
    // That means the same location/depth/time
    // always gives the same result.

    const lat =
      marine.actualLatitude ??
      latitude;

    const lon =
      marine.actualLongitude ??
      longitude;

    const deterministicVariation =
      0.35 *
      Math.sin(
        (lat * 3 + lon * 2) *
          Math.PI /
          180
      );

    baseSalinity +=
      deterministicVariation;
  } catch {
    baseSalinity = 35;
  }

  // ----------------------------------------------------------
  // CALCULATE ALL PARAMETERS
  // ----------------------------------------------------------

  const modeled =
    calculateDepthTimeModel({
      latitude:
        marine.actualLatitude ??
        latitude,

      longitude:
        marine.actualLongitude ??
        longitude,

      depth,

      time,

      baseTemperature:
        marine.temperature,

      baseSalinity,

      baseCurrentSpeed:
        marine.currentSpeed,

      baseCurrentDirection:
        marine.currentDirection,
    });

  // ----------------------------------------------------------
  // RETURN COMPLETE DATASET
  // ----------------------------------------------------------

  return {
    requestedLatitude:
      latitude,

    requestedLongitude:
      longitude,

    actualLatitude:
      marine.actualLatitude,

    actualLongitude:
      marine.actualLongitude,

    // ALL PARAMETERS

    temperature:
      modeled.temperature,

    temperatureUnit:
      "°C",

    salinity:
      modeled.salinity,

    salinityUnit:
      "PSU",

    currentSpeed:
      modeled.currentSpeed,

    currentSpeedUnit:
      "km/h",

    currentDirection:
      modeled.currentDirection,

    currentDirectionUnit:
      "°",

    // CONTROLS

    depth:
      Number(depth),

    requestedTime:
      Number(time),

    time:
      marine.time,

    depthMode:
      "DEPTH-DEPENDENT DEMO OCEAN MODEL",

    timeMode:
      "TIME-DEPENDENT MARINE MODEL",

    sources: {
      temperature:
        "Open-Meteo Marine API + depth/time model",

      current:
        "Open-Meteo Marine API + depth/time model",

      salinity:
        "NOAA AOML / deterministic ocean model",
    },
  };
}

// ============================================================
// HTTP SERVER
// ============================================================

const server =
  http.createServer(
    async (req, res) => {
      // --------------------------------------------------------
      // CORS PREFLIGHT
      // --------------------------------------------------------

      if (
        req.method ===
        "OPTIONS"
      ) {
        return sendJson(
          res,
          204,
          {}
        );
      }

      // --------------------------------------------------------
      // URL
      // --------------------------------------------------------

      const url =
        new URL(
          req.url || "/",
          `http://localhost:${PORT}`
        );

      // --------------------------------------------------------
      // HEALTH CHECK
      // --------------------------------------------------------

      if (
        url.pathname ===
        "/api/health"
      ) {
        return sendJson(
          res,
          200,
          {
            status:
              "OceanVista backend running",
          }
        );
      }

      // --------------------------------------------------------
      // OCEAN DATA
      // --------------------------------------------------------

      if (
        url.pathname ===
        "/api/ocean-data"
      ) {
        const latitude =
          Number(
            url.searchParams.get(
              "lat"
            )
          );

        const longitude =
          Number(
            url.searchParams.get(
              "lon"
            )
          );

        const depth =
          Number(
            url.searchParams.get(
              "depth"
            ) ?? 0
          );

        const time =
          Number(
            url.searchParams.get(
              "time"
            ) ?? 12
          );

        // ------------------------------------------------------
        // VALIDATE COORDINATES
        // ------------------------------------------------------

        if (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          ) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return sendJson(
            res,
            400,
            {
              error:
                "Invalid coordinates.",
            }
          );
        }

        // ------------------------------------------------------
        // VALIDATE DEPTH
        // ------------------------------------------------------

        if (
          !Number.isFinite(
            depth
          ) ||
          depth < 0 ||
          depth > 5000
        ) {
          return sendJson(
            res,
            400,
            {
              error:
                "Depth must be between 0 and 5000 meters.",
            }
          );
        }

        // ------------------------------------------------------
        // VALIDATE TIME
        // ------------------------------------------------------

        if (
          !Number.isFinite(
            time
          ) ||
          time < 0 ||
          time > 24
        ) {
          return sendJson(
            res,
            400,
            {
              error:
                "Time must be between 0 and 24 hours.",
            }
          );
        }

        // ------------------------------------------------------
        // CACHE KEY
        //
        // IMPORTANT:
        // Depth and time are included.
        //
        // Therefore:
        //
        // 20.5,87.5,100,12
        //
        // and
        //
        // 20.5,87.5,500,12
        //
        // are different datasets.
        // ------------------------------------------------------

        const cacheKey =
          [
            latitude.toFixed(2),
            longitude.toFixed(2),
            depth.toFixed(0),
            time.toFixed(0),
          ].join("_");

        if (
          DATA_CACHE.has(
            cacheKey
          )
        ) {
          console.log(
            `CACHE → ${cacheKey}`
          );

          return sendJson(
            res,
            200,
            DATA_CACHE.get(
              cacheKey
            )
          );
        }

        // ------------------------------------------------------
        // FETCH + CALCULATE
        // ------------------------------------------------------

        try {
          console.log(
            `OCEAN → lat=${latitude.toFixed(
              4
            )}, lon=${longitude.toFixed(
              4
            )}, depth=${depth}m, time=${time}:00`
          );

          const responsePayload =
            await buildOceanData(
              latitude,
              longitude,
              depth,
              time
            );

          // ----------------------------------------------------
          // CACHE
          // ----------------------------------------------------

          DATA_CACHE.set(
            cacheKey,
            responsePayload
          );

          // ----------------------------------------------------
          // RESPONSE
          // ----------------------------------------------------

          return sendJson(
            res,
            200,
            responsePayload
          );
        } catch (error) {
          console.error(
            "Ocean data error:",
            error
          );

          return sendJson(
            res,
            500,
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Ocean data request failed.",
            }
          );
        }
      }

      // --------------------------------------------------------
      // UNKNOWN ROUTE
      // --------------------------------------------------------

      return sendJson(
        res,
        404,
        {
          error:
            "Route not found.",
        }
      );
    }
  );

// ============================================================
// START SERVER
// ============================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `OceanVista backend running on port ${PORT}`
    );
  }
);