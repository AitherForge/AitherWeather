/* ============================================================
   Aither Weather V28 — radarsource.js
   Live radar frame source.

   The app now uses the NWS time-enabled national MRMS radar as its
   authoritative source. RainViewer is intentionally disabled here so
   the radar cannot silently stay on an older frame index.
   ============================================================ */

const WTWRadarSource = (() => {
  const cfg = () => (window.WTW_CONFIG && WTW_CONFIG.radarTiles) || {};

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function getFrames() {
    /* NOAA/NWS is the live source now. Returning null makes radar.js
       continue into its NWS WMS/ImageServer path instead of selecting
       RainViewer first. */
    if (cfg().source === 'rainviewer') {
      try {
        const c = cfg();
        if (c.enabled === false) return null;
        const data = await getJSON(c.indexUrl);
        const host = data.host || '';
        const radar = data.radar || {};
        const past = Array.isArray(radar.past) ? radar.past : [];
        if (!past.length) return null;
        const wanted = c.frameCount || 6;
        const aheadCount = c.forecastFrames === undefined ? 3 : c.forecastFrames;
        const ahead = aheadCount > 0 && Array.isArray(radar.nowcast) ? radar.nowcast : [];
        const shape = (f, forecast) => ({ time: new Date(f.time * 1000), path: f.path, forecast });
        return {
          source: 'rainviewer',
          host,
          frames: past.slice(-wanted).map(f => shape(f, false)).concat(ahead.slice(0, aheadCount).map(f => shape(f, true))),
          generated: data.generated,
        };
      } catch (err) {
        console.warn('[radar] optional RainViewer source unavailable', err && err.message);
      }
    }
    return null;
  }

  function latestObservedIndex(frames) {
    if (!frames || !frames.length) return -1;
    for (let i = frames.length - 1; i >= 0; i--) if (!frames[i].forecast) return i;
    return -1;
  }

  function tileUrl(host, framePath, z, x, y) {
    const c = cfg();
    const size = c.tileSize || 256;
    const color = c.colorScheme === undefined ? 4 : c.colorScheme;
    const smooth = c.smooth === false ? 0 : 1;
    const snow = c.showSnow === false ? 0 : 1;
    return `${host}${framePath}/${size}/${z}/${x}/${y}/${color}/${smooth}_${snow}.png`;
  }

  function ageMinutes(frames) {
    const i = latestObservedIndex(frames);
    if (i < 0) return null;
    return (Date.now() - frames[i].time.getTime()) / 60000;
  }

  return { getFrames, tileUrl, ageMinutes, latestObservedIndex };
})();

window.WTWRadarSource = WTWRadarSource;

/* ------------------------------------------------------------
   Force the V28 radar engine onto NOAA's live time-enabled service.
   NWS documents this service as a four-hour moving radar window that
   updates every five minutes and supports WMS time requests.
   ------------------------------------------------------------ */
(() => {
  const c = window.WTW_CONFIG;
  if (!c) return;

  c.radarTiles = Object.assign({}, c.radarTiles, {
    enabled: false,
    source: 'nws',
  });

  c.radarImagery = Object.assign({}, c.radarImagery, {
    enabled: true,
    wmsBase: 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer',
    layer: '0',
    rangeKm: 200,
    imageSize: 768,
    frameCount: 8,
    frameStepMin: 5,
    refreshMinutes: 5,
  });

  c.radar = Object.assign({}, c.radar, {
    frameMinutes: 40,
    framePlaybackMs: 700,
  });
})();
