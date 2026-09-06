/* ============================================================
   Aither Weather V31 — NOAA-only radar source
   ============================================================ */

const WTWRadarSource = (() => {
  // NOAA/NWS MRMS time-enabled national radar mosaic only.
  // No RainViewer, no third-party radar imagery, no simulated frames.
  const NOAA_WMS = 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer';

  function latestObservedIndex(frames) {
    if (!frames || !frames.length) return -1;
    let best = -1;
    let bestTime = -Infinity;
    frames.forEach((f, i) => {
      if (!f.forecast && f.time instanceof Date && f.time.getTime() > bestTime) {
        best = i;
        bestTime = f.time.getTime();
      }
    });
    return best;
  }

  function ageMinutes(frames) {
    const i = latestObservedIndex(frames);
    if (i < 0) return null;
    return Math.max(0, (Date.now() - frames[i].time.getTime()) / 60000);
  }

  // Deliberately returns null. radar.js then uses its NOAA WMS/ImageServer
  // path. This prevents the old RainViewer path from ever being selected.
  async function getFrames() {
    return null;
  }

  function tileUrl() {
    return '';
  }

  return { getFrames, tileUrl, ageMinutes, latestObservedIndex, NOAA_WMS };
})();

window.WTWRadarSource = WTWRadarSource;

/* Force every radar configuration path to NOAA/NWS. */
(() => {
  const c = window.WTW_CONFIG;
  if (!c) return;

  c.radarTiles = Object.assign({}, c.radarTiles, {
    enabled: false,
    source: 'nws',
    indexUrl: '',
    frameCount: 12,
    forecastFrames: 0,
  });

  c.radarImagery = Object.assign({}, c.radarImagery, {
    enabled: true,
    wmsBase: WTWRadarSource.NOAA_WMS,
    layer: '0',
    imageSize: 768,
    frameCount: 12,
    frameStepMin: 5,
    refreshMs: 300000,
    refreshMinutes: 5,
  });

  c.radar = Object.assign({}, c.radar, {
    frameMinutes: 60,
    framePlaybackMs: 650,
    autoRefreshMs: 300000,
  });
})();
