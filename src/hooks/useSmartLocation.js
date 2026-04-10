/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';

const LOCATION_MIN_INTERVAL_MS = 2500;
const LOCATION_MIN_DISTANCE_METERS = 18;
const LOCATION_SMOOTHING = 0.1;

function toRad(v) {
  return (v * Math.PI) / 180;
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLng = toRad((b.lng || 0) - (a.lng || 0));
  const lat1 = toRad(a.lat || 0);
  const lat2 = toRad(b.lat || 0);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function smoothLocation(prev, next) {
  if (!prev) return next;
  return {
    ...next,
    lat: prev.lat + (next.lat - prev.lat) * LOCATION_SMOOTHING,
    lng: prev.lng + (next.lng - prev.lng) * LOCATION_SMOOTHING,
  };
}

export default function useSmartLocation() {
  const [location, setLocation] = React.useState(null);
  const [isTracking, setIsTracking] = React.useState(false);

  const watchIdRef = React.useRef(null);
  const lastAcceptedLocationRef = React.useRef(null);
  const lastAcceptedAtRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  const stop = React.useCallback(() => {
    if (
      watchIdRef.current != null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch (e) {}
      watchIdRef.current = null;
    }

    if (mountedRef.current) {
      setIsTracking(false);
    }
  }, []);

  const start = React.useCallback(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      watchIdRef.current != null
    ) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;

        const coords = pos?.coords;
        if (!coords) return;

        const rawNext = {
          lat: Number(coords.latitude),
          lng: Number(coords.longitude),
          accuracy: coords.accuracy || null,
          heading: coords.heading || null,
          speed: coords.speed || null,
          timestamp: pos.timestamp || Date.now(),
        };

        if (!Number.isFinite(rawNext.lat) || !Number.isFinite(rawNext.lng)) return;

        const now = Date.now();
        const prev = lastAcceptedLocationRef.current;
        const movedMeters = distanceMeters(prev, rawNext);
        const elapsed = now - lastAcceptedAtRef.current;

        if (
          prev &&
          movedMeters < LOCATION_MIN_DISTANCE_METERS &&
          elapsed < LOCATION_MIN_INTERVAL_MS
        ) {
          return;
        }

        const next = smoothLocation(prev, rawNext);

        lastAcceptedLocationRef.current = next;
        lastAcceptedAtRef.current = now;
        setLocation(next);
      },
      () => {},
      {
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    if (mountedRef.current) {
      setIsTracking(true);
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    start();

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [start, stop]);

  return { location, isTracking, start, stop };
}

export {
  LOCATION_MIN_INTERVAL_MS,
  LOCATION_MIN_DISTANCE_METERS,
  LOCATION_SMOOTHING,
  toRad,
  distanceMeters,
};
