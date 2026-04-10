/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';

const MIAMI_BASE = { lat: 25.846, lng: -80.145 };

const MAP_STYLE_STORAGE_KEY = 'vibes.mapStyle';
const FORCED_MAP_STYLE = 'satellite';

const LOCATION_LABELS = {
  unknown: 'Checking location',
  active: 'Location on',
  unavailable: 'Location off'
};

const MAP_MODE_STORAGE_KEY = 'vibes.mapMode';
const CUSTOM_PLACE_STORAGE_KEY = 'vibes.customPlace';
const CURRENT_CENTER_LABEL_STORAGE_KEY = 'vibes.currentCenterLabel';

const MapStateContext = React.createContext(null);

function persistMapStyle() {
  try {
    localStorage.setItem(MAP_STYLE_STORAGE_KEY, FORCED_MAP_STYLE);
  } catch (e) {}
}

const readStoredMapStyle = () => FORCED_MAP_STYLE;

function readStoredMapMode() {
  try {
    const raw = (localStorage.getItem(MAP_MODE_STORAGE_KEY) || '').toString().trim().toLowerCase();
    if (raw === 'city') return 'city';
    if (raw === 'custom') return 'custom';
    return 'nearby';
  } catch (e) {
    return 'nearby';
  }
}

function persistMapMode(value) {
  try {
    localStorage.setItem(MAP_MODE_STORAGE_KEY, value || 'nearby');
  } catch (e) {}
}

function readStoredCustomPlace() {
  try {
    const raw = localStorage.getItem(CUSTOM_PLACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: parsed?.id || `${lat},${lng}`,
      label: (parsed?.label || parsed?.city || parsed?.name || '').toString(),
      city: (parsed?.city || parsed?.name || parsed?.label || '').toString(),
      country: (parsed?.country || '').toString(),
      lat,
      lng
    };
  } catch (e) {
    return null;
  }
}

function persistCustomPlace(place) {
  try {
    if (!place) {
      localStorage.removeItem(CUSTOM_PLACE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CUSTOM_PLACE_STORAGE_KEY, JSON.stringify(place));
  } catch (e) {}
}

function readStoredCenterLabel() {
  try {
    return (localStorage.getItem(CURRENT_CENTER_LABEL_STORAGE_KEY) || '').toString();
  } catch (e) {
    return '';
  }
}

function persistCenterLabel(value) {
  try {
    localStorage.setItem(CURRENT_CENTER_LABEL_STORAGE_KEY, (value || '').toString());
  } catch (e) {}
}

export function MapStateProvider({ children }) {
  const [location, setLocation] = React.useState({
    status: 'unknown',
    coords: null,
    label: LOCATION_LABELS.unknown
  });

  const [mapCenter, setMapCenter] = React.useState(MIAMI_BASE);
  const [mapStyle, setMapStyleState] = React.useState(FORCED_MAP_STYLE);
  const [mapMode, setMapModeState] = React.useState(() => readStoredMapMode());
  const [customPlace, setCustomPlaceState] = React.useState(() => readStoredCustomPlace());
  const [currentCenterLabel, setCurrentCenterLabelState] = React.useState(() => readStoredCenterLabel());
  const [citySearchOpen, setCitySearchOpen] = React.useState(false);

  const watchIdRef = React.useRef(null);
  const lastCoordsRef = React.useRef(null);
  const hasHydratedInitialLocationRef = React.useRef(false);

  const setMapStyle = React.useCallback(() => {
    setMapStyleState(FORCED_MAP_STYLE);
    persistMapStyle();
  }, []);

  const applyCoords = React.useCallback((lat, lng, options = {}) => {
    const next = {
      lat: Number(lat),
      lng: Number(lng)
    };

    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;

    const forceCenterUpdate = options?.forceCenterUpdate === true;

    const prev = lastCoordsRef.current;
    const same =
      prev &&
      Math.abs(prev.lat - next.lat) < 0.00001 &&
      Math.abs(prev.lng - next.lng) < 0.00001;

    if (same && !forceCenterUpdate) return;

    lastCoordsRef.current = next;

    setLocation({
      status: 'active',
      coords: next,
      label: LOCATION_LABELS.active
    });

    if (forceCenterUpdate) {
      setMapCenter({
        lat: next.lat,
        lng: next.lng
      });
    }
  }, []);

  const refreshUserLocation = React.useCallback((options = {}) => {
    if (!navigator.geolocation) {
      setLocation({
        status: 'unavailable',
        coords: null,
        label: LOCATION_LABELS.unavailable
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoords(position.coords.latitude, position.coords.longitude, {
          forceCenterUpdate: options?.forceCenterUpdate === true
        });
      },
      () => {
        setLocation((prev) => ({
          status: 'unavailable',
          coords: prev?.coords || null,
          label: LOCATION_LABELS.unavailable
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: options?.forceCenterUpdate === true ? 0 : 4000,
        timeout: 12000
      }
    );
  }, [applyCoords]);

  const setMapMode = React.useCallback((nextMode) => {
    const resolved = nextMode === 'city' || nextMode === 'custom' ? nextMode : 'nearby';

    setMapModeState(resolved);
    persistMapMode(resolved);

    if (resolved === 'nearby') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = {
              lat: Number(position.coords.latitude),
              lng: Number(position.coords.longitude)
            };

            if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;

            lastCoordsRef.current = next;

            setLocation({
              status: 'active',
              coords: next,
              label: LOCATION_LABELS.active
            });

            setMapCenter({
              lat: next.lat,
              lng: next.lng
            });

            try {
              window.dispatchEvent(
                new CustomEvent('vibes:map-nearby-selected', { detail: next })
              );
            } catch (e) {}
          },
          () => {
            if (lastCoordsRef.current) {
              const fallback = {
                lat: Number(lastCoordsRef.current.lat),
                lng: Number(lastCoordsRef.current.lng)
              };

              setMapCenter(fallback);

              try {
                window.dispatchEvent(
                  new CustomEvent('vibes:map-nearby-selected', { detail: fallback })
                );
              } catch (e) {}
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 12000
          }
        );
      } else if (lastCoordsRef.current) {
        const fallback = {
          lat: Number(lastCoordsRef.current.lat),
          lng: Number(lastCoordsRef.current.lng)
        };

        setMapCenter(fallback);

        try {
          window.dispatchEvent(
            new CustomEvent('vibes:map-nearby-selected', { detail: fallback })
          );
        } catch (e) {}
      }

      return;
    }

    if (resolved === 'city') {
      if (lastCoordsRef.current) {
        setMapCenter({
          lat: Number(lastCoordsRef.current.lat),
          lng: Number(lastCoordsRef.current.lng)
        });
      }
      return;
    }

    if (resolved === 'custom') {
      const savedCustom = readStoredCustomPlace();
      const target = customPlace || savedCustom;

      if (target) {
        const lat = Number(target.lat);
        const lng = Number(target.lng);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapCenter({ lat, lng });
        }
      }
    }
  }, [customPlace]);

  const setCustomPlace = React.useCallback((place) => {
    if (!place) {
      setCustomPlaceState(null);
      persistCustomPlace(null);
      return;
    }

    const next = {
      id: place.id || `${Number(place.lat)},${Number(place.lng)}`,
      label: (place.label || place.city || place.name || '').toString(),
      city: (place.city || place.name || place.label || '').toString(),
      country: (place.country || '').toString(),
      lat: Number(place.lat),
      lng: Number(place.lng)
    };

    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;

    setCustomPlaceState(next);
    persistCustomPlace(next);

    setMapModeState('custom');
    persistMapMode('custom');

    setMapCenter({
      lat: next.lat,
      lng: next.lng
    });
  }, []);

  const setCurrentCenterLabel = React.useCallback((value) => {
    const next = (value || '').toString();
    setCurrentCenterLabelState(next);
    persistCenterLabel(next);
  }, []);

  const openCitySearch = React.useCallback(() => {
    setCitySearchOpen(true);
  }, []);

  const closeFiltersSheet = React.useCallback(() => {
    setCitySearchOpen(false);
  }, []);

  React.useEffect(() => {
    persistMapStyle();
    setMapStyleState(readStoredMapStyle());
  }, []);

  React.useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        status: 'unavailable',
        coords: null,
        label: LOCATION_LABELS.unavailable
      });
      return;
    }

    refreshUserLocation({
      forceCenterUpdate: !hasHydratedInitialLocationRef.current
    });
    hasHydratedInitialLocationRef.current = true;

    if (watchIdRef.current != null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch (e) {}
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        applyCoords(position.coords.latitude, position.coords.longitude, {
          forceCenterUpdate: false
        });
      },
      () => {
        setLocation((prev) => ({
          status: prev?.coords ? 'active' : 'unavailable',
          coords: prev?.coords || null,
          label: prev?.coords ? LOCATION_LABELS.active : LOCATION_LABELS.unavailable
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 15000
      }
    );

    return () => {
      if (watchIdRef.current != null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (e) {}
        watchIdRef.current = null;
      }
    };
  }, [refreshUserLocation, applyCoords]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        persistMapStyle();
        setMapStyleState(FORCED_MAP_STYLE);

        refreshUserLocation({ forceCenterUpdate: false });
      }
    };

    const handleFocus = () => {
      persistMapStyle();
      setMapStyleState(FORCED_MAP_STYLE);

      refreshUserLocation({ forceCenterUpdate: false });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUserLocation]);

  const value = React.useMemo(() => {
    return {
      MIAMI_BASE,
      location,
      mapCenter,
      setMapCenter,
      mapStyle: FORCED_MAP_STYLE,
      setMapStyle,
      refreshLocation: refreshUserLocation,
      mapMode,
      setMapMode,
      customPlace,
      setCustomPlace,
      currentCenterLabel,
      setCurrentCenterLabel,
      citySearchOpen,
      openCitySearch,
      closeFiltersSheet
    };
  }, [
    location,
    mapCenter,
    setMapCenter,
    setMapStyle,
    refreshUserLocation,
    mapMode,
    setMapMode,
    customPlace,
    setCustomPlace,
    currentCenterLabel,
    setCurrentCenterLabel,
    citySearchOpen,
    openCitySearch,
    closeFiltersSheet
  ]);

  return React.createElement(MapStateContext.Provider, { value }, children);
}

export function useMapState() {
  const ctx = React.useContext(MapStateContext);
  if (!ctx) throw new Error('useMapState must be used within MapStateProvider');
  return ctx;
}
