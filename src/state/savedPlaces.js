/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';

const SavedPlacesContext = React.createContext(null);

const MAX_SAVED_PLACES = 4;

function getStorageKey(userId) {
  const uid = userId || 'anon';
  return `vibes.savedPlaces.${uid}`;
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function normalizeLabel(label) {
  return (label || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(place) {
  const id = (place?.id ?? '').toString().trim();
  if (id) return `id:${id}`;

  const label = normalizeLabel(place?.label);
  return label ? `label:${label.toLowerCase()}` : '';
}

function sanitizePlace(place) {
  const label = normalizeLabel(place?.label);
  const lat = typeof place?.lat === 'number' ? place.lat : Number(place?.lat);
  const lng = typeof place?.lng === 'number' ? place.lng : Number(place?.lng);
  const id = (place?.id ?? '').toString().trim();
  const savedAtRaw = typeof place?.savedAt === 'number' ? place.savedAt : Number(place?.savedAt);

  if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: id || undefined,
    label,
    lat,
    lng,
    savedAt: Number.isFinite(savedAtRaw) ? savedAtRaw : Date.now()
  };
}

function readSavedPlaces(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? safeParse(raw) : null;
    const list = Array.isArray(parsed) ? parsed : [];
    return list.map(sanitizePlace).filter(Boolean).slice(0, MAX_SAVED_PLACES);
  } catch (e) {
    return [];
  }
}

export function SavedPlacesProvider({ children, currentUserId }) {
  const storageKey = React.useMemo(() => getStorageKey(currentUserId), [currentUserId]);

  const [savedPlaces, setSavedPlaces] = React.useState(() => readSavedPlaces(storageKey));

  React.useEffect(() => {
    setSavedPlaces(readSavedPlaces(storageKey));
  }, [storageKey]);

  // Persist on change.
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedPlaces));
    } catch (e) {
      // ignore
    }
  }, [savedPlaces, storageKey]);

  const savePlace = React.useCallback((place) => {
    const p = sanitizePlace(place);
    if (!p) return;

    setSavedPlaces((prev) => {
      const key = normalizeKey(p);
      if (!key) return prev;

      const next = [
        { ...p, savedAt: Date.now() },
        ...prev.filter((x) => normalizeKey(x) !== key)
      ].slice(0, MAX_SAVED_PLACES);

      return next;
    });
  }, []);

  const removePlace = React.useCallback((place) => {
    const key = normalizeKey(place);
    if (!key) return;

    setSavedPlaces((prev) => prev.filter((x) => normalizeKey(x) !== key));
  }, []);

  const value = React.useMemo(() => {
    return {
      savedPlaces,
      savePlace,
      removePlace,
      maxSavedPlaces: MAX_SAVED_PLACES
    };
  }, [savedPlaces, savePlace, removePlace]);

  return React.createElement(SavedPlacesContext.Provider, { value }, children);
}

export function useSavedPlaces() {
  const ctx = React.useContext(SavedPlacesContext);
  if (!ctx) throw new Error('useSavedPlaces must be used within SavedPlacesProvider');
  return ctx;
}
