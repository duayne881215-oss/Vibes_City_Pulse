export const MAP_STYLE_OPTIONS = [
  { value: 'satellite', label: 'Satellite' }
];

const MAP_MAX_ZOOM = 20;

const MAPBOX_ACCESS_TOKEN =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) ||
  '';

const SATELLITE = {
  id: 'satellite',
  label: 'Satellite',
  tileUrl: MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX_ACCESS_TOKEN}`
    : '',
  tileOptions: {
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: MAP_MAX_ZOOM,
    updateWhenIdle: false,
    updateWhenZooming: true,
    updateInterval: 60,
    keepBuffer: 12,
    detectRetina: false,
    crossOrigin: true,
    tileSize: 256,
    zoomOffset: 0,
    attribution: '© Mapbox © OpenStreetMap contributors'
  },
  shellBackground: '#04070b'
};

export const MAP_THEMES = {
  satellite: SATELLITE,
  dark: SATELLITE,
  light: SATELLITE
};

export function resolveAutoMapStyle() {
  return 'satellite';
}