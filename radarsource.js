/* ============================================================
   Aither Weather V31 — NOAA-only, Apple-style radar
   ============================================================ */

const WTWRadarSource = (() => {
  // NOAA/NWS MRMS time-enabled national radar mosaic only.
  // No RainViewer, no third-party radar imagery, no simulated frames.
  const NOAA_WMS = 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer';

  function latestObservedIndex(frames) {
    if (!frames || !frames.length) return -1;
    let best = -1, bestTime = -Infinity;
    frames.forEach((f, i) => {
      if (!f.forecast && f.time instanceof Date && f.time.getTime() > bestTime) {
        best = i; bestTime = f.time.getTime();
      }
    });
    return best;
  }

  function ageMinutes(frames) {
    const i = latestObservedIndex(frames);
    return i < 0 ? null : Math.max(0, (Date.now() - frames[i].time.getTime()) / 60000);
  }

  // Never query a third-party radar index. radar.js falls through to its
  // timestamped NOAA WMS/ImageServer implementation.
  async function getFrames() { return null; }
  function tileUrl() { return ''; }

  return { getFrames, tileUrl, ageMinutes, latestObservedIndex, NOAA_WMS };
})();

window.WTWRadarSource = WTWRadarSource;

(() => {
  const c = window.WTW_CONFIG;
  if (!c) return;

  // NOAA is the only radar imagery provider.
  c.radarTiles = Object.assign({}, c.radarTiles, {
    enabled: false,
    source: 'nws',
    indexUrl: '',
    frameCount: 12,
    forecastFrames: 0,
  });

  c.radarImagery = Object.assign({}, c.radarImagery, {
    enabled: true,
    wmsBase: NOAA_WMS,
    layer: '0',
    imageSize: 768,
    frameCount: 12,
    frameStepMin: 5,
    refreshMs: 300000,
    refreshMinutes: 5,
  });

  // Apple Weather-style precipitation view: rectangular map, no scope,
  // no radar sweep, smooth short history, and frequent refreshes.
  c.radarStyles = [{ id: 'map', label: 'Map — Apple-style precipitation' }];
  c.defaults.radarStyle = 'map';
  c.defaults.radarOpacity = 0.82;
  c.radar = Object.assign({}, c.radar, {
    fullscreenOnTap: true,
    frameMinutes: 60,
    framePlaybackMs: 650,
    autoRefreshMs: 300000,
    sweepSecondsPerRev: 0,
  });

  // Remove the old secondary NCEI panel so the radar has one clean,
  // Apple-like map instead of two different radar presentations.
  const hideSecondaryRadar = () => {
    const style = document.createElement('style');
    style.textContent = '#nceiRadarPanel{display:none!important}\n.radar-wrap{position:relative;overflow:hidden;border-radius:20px;background:#10151d}\n.radar-wrap #radarCanvas{display:block;width:100%;height:min(62vw,560px);min-height:300px}\n.radar-location{position:absolute;left:14px;top:14px;padding:7px 11px;border-radius:999px;background:rgba(20,24,30,.78);backdrop-filter:blur(12px);font-size:12px;font-weight:650;box-shadow:0 2px 12px rgba(0,0,0,.18)}\n@media(max-width:640px){.radar-wrap #radarCanvas{height:72vw;min-height:250px;max-height:430px}}';
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideSecondaryRadar, { once: true });
  else hideSecondaryRadar();
})();
