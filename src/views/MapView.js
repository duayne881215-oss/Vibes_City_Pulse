/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import { useMapState } from '../state/mapState.js';
import { MAP_THEMES } from '../lib/mapThemes.js';

const FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop'
];

const isValidMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  if (!u || u === 'X' || u.length < 5 || u.includes('placeholder')) return false;
  if (u.startsWith('data:')) return true;
  if (u.startsWith('blob:')) return true;
  try {
    new URL(u, window.location.href);
    return true;
  } catch (e) {
    return false;
  }
};

const getAvatar = (vibe) => {
  const rawAvatar =
    vibe?.avatarUrl ??
    vibe?.avatar_url ??
    '';

  const avatar = typeof rawAvatar === 'string' ? rawAvatar.trim() : '';
  const rawId = (vibe?.id ?? vibe?.userId ?? '').toString().trim();

  if (isValidMediaUrl(avatar)) {
    const stableVersion =
      vibe?.updatedAt ||
      vibe?.updated_at ||
      vibe?.profileUpdatedAt ||
      vibe?.lastSeen ||
      '';

    if (stableVersion) {
      const joiner = avatar.includes('?') ? '&' : '?';
      return `${avatar}${joiner}v=${encodeURIComponent(String(stableVersion))}`;
    }

    return avatar;
  }

  const seedSource =
    rawId ||
    (vibe?.displayName ?? vibe?.display_name ?? 'vibe').toString().trim() ||
    'vibe';

  const idx =
    Math.abs(seedSource.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) %
    FALLBACK_AVATARS.length;

  return FALLBACK_AVATARS[idx];
};

const ENERGY_THEMES = {
  Chill: { color: 'bg-blue-400', glowColor: 'bg-blue-500' },
  Flirty: { color: 'bg-rose-400', glowColor: 'bg-rose-500' },
  Energetic: { color: 'bg-emerald-400', glowColor: 'bg-emerald-500' },
  Vibes: { color: 'bg-amber-400', glowColor: 'bg-amber-500' }
};

const getTheme = (energy) =>
  ENERGY_THEMES[energy] || { color: 'bg-indigo-400', glowColor: 'bg-indigo-500' };

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistance(lat1, lon1, lat2, lon2, unit = 'mi') {
  const R = unit === 'mi' ? 3958.8 : 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getStoryUserId = (story) => {
  return story?.userId || story?.user_id || '';
};

function shallowEqualVibe(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;

  const keys = [
    'id',
    'userId',
    'displayName',
    'city',
    'energy',
    'bio',
    'birthday',
    'instagram',
    'tiktok',
    'lat',
    'lng',
    'isOnline',
    'lastSeen',
    'avatarUrl',
    'color',
    'glowColor'
  ];

  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }

  const la = a.lookingFor || [];
  const lb = b.lookingFor || [];
  if (la.length !== lb.length) return false;

  for (let i = 0; i < la.length; i++) {
    if (la[i] !== lb[i]) return false;
  }

  return true;
}

function mergeVibesStable(prev, incoming) {
  const prevById = new Map(prev.map((v) => [v.id, v]));
  const nextById = new Map();

  for (const v of incoming) {
    const old = prevById.get(v.id);
    if (!old) {
      nextById.set(v.id, v);
      continue;
    }

    if (shallowEqualVibe(old, v)) {
      nextById.set(v.id, old);
    } else {
      nextById.set(v.id, { ...old, ...v });
    }
  }

  const next = [];
  const seen = new Set();

  for (const v of prev) {
    const nv = nextById.get(v.id);
    if (nv) {
      next.push(nv);
      seen.add(v.id);
    }
  }

  for (const v of incoming) {
    if (!seen.has(v.id)) next.push(nextById.get(v.id));
  }

  if (next.length === prev.length) {
    let same = true;
    for (let i = 0; i < next.length; i++) {
      if (next[i] !== prev[i]) {
        same = false;
        break;
      }
    }
    if (same) return prev;
  }

  return next;
}

const VibePoint = React.memo(function VibePoint({
  vibe,
  project,
  isMapDragging,
  normalizeDemoVibeForFlow,
  stories,
  getStoryUserId,
  onViewStory,
  onOpenVibe,
  getAvatar,
  isValidMediaUrl
}) {
  if (vibe?.isCurrentUser) return null;

  const pos = project(vibe.lng, vibe.lat);
  if (pos.hidden) return null;

  const isOnline = vibe.isOnline;

  let isRecentlyActive = false;
  if (vibe.lastSeen) {
    const lastSeen = new Date(vibe.lastSeen);
    const now = new Date();
    const diffMins = Math.floor((now - lastSeen) / 60000);
    isRecentlyActive = diffMins < 15;
  }

  const isAlive = isOnline || isRecentlyActive;
  const isHidden = vibe.isHidden;

  const avatarUrl = getAvatar(vibe);
  const isCamila = String(vibe?.displayName || '').trim().toLowerCase() === 'camila';

  const fallbackLetter =
    (String(vibe?.displayName || 'V').trim().charAt(0) || 'V').toUpperCase();

  const avatarBorder = isCamila
    ? '2px solid rgba(239,68,68,0.95)'
    : '1px solid rgba(255,255,255,0.25)';

  const avatarBoxShadow = isCamila
    ? '0 0 0 2px rgba(255,255,255,0.10), 0 0 18px rgba(239,68,68,0.45)'
    : '0 0 0 1px rgba(255,255,255,0.04), 0 0 18px rgba(96,165,250,0.10)';

  const avatarBackground = '#0b1020';

  const relevance = vibe.relevance || 0.5;
  const scale = 0.85 + relevance * 0.3;
  const glowOpacity = 0.2 + relevance * 0.6;

  const dragGlowScale = isMapDragging ? 0.35 : 1;
  const dragBlurOuter = isMapDragging ? 'blur-[6px]' : 'blur-[14px]';

  const safeStories = Array.isArray(stories) ? stories : [];

  return html`
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center z-20"
      style=${{
        top: pos.top,
        left: pos.left,
        transform: `translate(-50%, -50%) scale(${isHidden ? 0.5 : scale})`,
        transitionDuration: isHidden ? '220ms' : (isMapDragging ? '0ms' : '180ms'),
        transitionTimingFunction: 'linear',
        transitionProperty: 'top, left, transform',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        opacity: isHidden ? 0 : (isMapDragging ? 0.82 : 1),
        willChange: isMapDragging ? 'auto' : 'top, left, transform'
      }}
    >
      <button
        onClick=${(e) => {
          e.stopPropagation();

          const normalized = normalizeDemoVibeForFlow(vibe);
          if (!normalized) return;

          const userStory = safeStories.find((s) => {
            const uid = getStoryUserId(s);
            return uid && String(uid) === String(normalized.id);
          });

          if (userStory) {
            const seq = safeStories.filter(
              (s) => String(getStoryUserId(s)) === String(normalized.id)
            );
            onViewStory?.(userStory, seq);
          } else {
            onOpenVibe?.(normalized);
          }
        }}
        className="relative w-12 h-12 flex items-center justify-center group tap-feedback pointer-events-auto"
      >
        <div
          className="absolute inset-[-6px] rounded-full"
          style=${{
            background: isCamila
              ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.28), rgba(239,68,68,0) 62%)'
              : 'radial-gradient(circle at 50% 50%, rgba(34,211,238,' + (isAlive ? 0.10 : 0.06) + '), rgba(34,211,238,0) 62%)',
            filter: isMapDragging ? 'blur(4px)' : 'blur(7px)',
            opacity: (isAlive ? 0.34 : 0.2) * (isMapDragging ? 0.6 : 1)
          }}
        ></div>

        <div
          className=${`absolute inset-[-4px] ${isCamila ? 'bg-red-500' : vibe.glowColor} ${dragBlurOuter} rounded-full`}
          style=${{
            opacity: isCamila
              ? 0.55
              : (isAlive ? glowOpacity * 0.34 : glowOpacity * 0.18) * dragGlowScale
          }}
        ></div>

        <div
          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
          style=${{
            border: avatarBorder,
            boxShadow: avatarBoxShadow,
            background: avatarBackground
          }}
        >
          ${
            isValidMediaUrl(avatarUrl)
              ? html`
                  <img
                    src=${avatarUrl}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    onError=${(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      const fallback = parent
                        ? parent.querySelector('[data-avatar-fallback="true"]')
                        : null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                `
              : null
          }

          <div
            data-avatar-fallback="true"
            className="absolute inset-0 flex items-center justify-center"
            style=${{
              display: isValidMediaUrl(avatarUrl) ? 'none' : 'flex',
              background:
                'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 34%, rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(18,26,52,0.96), rgba(7,12,28,0.98))'
            }}
          >
            <div
              style=${{
                position: 'absolute',
                inset: '0',
                background: 'radial-gradient(circle at 50% 120%, rgba(96,165,250,0.18), rgba(96,165,250,0) 58%)'
              }}
            ></div>

            <div
              style=${{
                width: '18px',
                height: '18px',
                borderRadius: '999px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(203,213,225,0.82))',
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            ></div>

            <div
              style=${{
                width: '24px',
                height: '14px',
                borderRadius: '999px 999px 8px 8px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(203,213,225,0.76))',
                position: 'absolute',
                bottom: '7px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            ></div>

            <div
              style=${{
                position: 'absolute',
                right: '3px',
                bottom: '3px',
                minWidth: '14px',
                height: '14px',
                borderRadius: '999px',
                padding: '0 3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '7px',
                fontWeight: '900',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.92)',
                background: 'rgba(59,130,246,0.22)',
                border: '1px solid rgba(255,255,255,0.14)'
              }}
            >
              ${fallbackLetter}
            </div>
          </div>

          ${isAlive && html`
            <div
              className="absolute rounded-full"
              style=${{
                right: '-2px',
                bottom: '-2px',
                width: '11px',
                height: '11px',
                border: '2px solid #0b1020',
                background: '#10b981'
              }}
            ></div>
          `}
        </div>
      </button>
    </div>
  `;
});

const UserPoint = React.memo(function UserPoint({
  userLocation,
  MIAMI_BASE,
  project,
  currentUser,
  currentUserId,
  onOpenVibe,
  isMapDragging,
  getTheme,
  isValidMediaUrl
}) {
  const stableLocationRef = React.useRef(userLocation || MIAMI_BASE);

  React.useEffect(() => {
    if (!userLocation) return;
    stableLocationRef.current = {
      lat: Number(userLocation.lat),
      lng: Number(userLocation.lng)
    };
  }, [userLocation]);

  const effectiveLocation = stableLocationRef.current || MIAMI_BASE;

  try {
    if (window.vibesMap?.getBounds) {
      const bounds = window.vibesMap.getBounds();
      const paddedBounds = bounds?.pad?.(-0.08) || bounds;
      const inView = paddedBounds?.contains?.(
        window.L.latLng(effectiveLocation.lat, effectiveLocation.lng)
      );
      if (!inView) return null;
    }
  } catch (e) {}

  const pos = project(effectiveLocation.lng, effectiveLocation.lat);
  if (pos.hidden) return null;

  const profilePhotoUrl = currentUser?.avatarUrl;
  const initial = (currentUser?.displayName || 'V').charAt(0);

  return html`
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center z-30"
      style=${{
        top: pos.top,
        left: pos.left,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transition: isMapDragging
          ? 'top 0ms linear, left 0ms linear, transform 0ms linear'
          : 'top 180ms linear, left 180ms linear, transform 180ms linear',
        opacity: 1,
        willChange: isMapDragging ? 'auto' : 'top, left, transform'
      }}
    >
      <div
        className="absolute inset-[-6px] rounded-full"
        style=${{
          background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)',
          filter: 'blur(8px)'
        }}
      ></div>

      <div
        className="absolute inset-[1px] rounded-full"
        style=${{
          background:
            'radial-gradient(circle at 50% 50%, rgba(96,165,250,0.14), rgba(59,130,246,0.08) 42%, rgba(0,0,0,0) 72%)',
          filter: 'blur(7px)',
          opacity: 0.72
        }}
      ></div>

      <button
        onClick=${(e) => {
          e.stopPropagation();
          onOpenVibe?.({
            id: currentUserId,
            userId: currentUserId,
            displayName: currentUser?.displayName || 'You',
            city: currentUser?.city,
            energy: currentUser?.energy,
            bio: currentUser?.bio,
            birthday: currentUser?.birthday,
            lookingFor: currentUser?.lookingFor,
            avatarUrl: currentUser?.avatarUrl,
            ...getTheme(currentUser?.energy),
            lat: effectiveLocation.lat,
            lng: effectiveLocation.lng,
            isOnline: true,
            isCurrentUser: true
          });
        }}
        className="relative h-12 w-12 rounded-full border-[2.5px] border-white/90 bg-black overflow-hidden flex items-center justify-center z-10 tap-feedback pointer-events-auto"
        style=${{
          pointerEvents: 'auto',
          boxShadow:
            '0 10px 22px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.9), 0 0 18px rgba(59,130,246,0.35)',
          filter: 'none'
        }}
        aria-label="Open your profile"
      >
        <div className="avatar-container w-full h-full">
          ${
            isValidMediaUrl(profilePhotoUrl)
              ? html`
                  <img
                    src=${profilePhotoUrl}
                    className="avatar-img"
                    alt=""
                    loading="eager"
                    decoding="async"
                    fetchpriority="high"
                    referrerpolicy="no-referrer"
                    onError=${(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                `
              : null
          }
        </div>

        <span className="text-blue-400 text-base font-black absolute inset-0 flex items-center justify-center -z-10">
          ${initial}
        </span>
      </button>
    </div>
  `;
});

export default function MapView({
  isActive,
  isMainMapView = false,
  supabase,
  currentUser,
  selectedMood = 'Vibes',
  onOpenVibe,
  stories = [],
  onViewStory,
  onLocationUpdate,
  blockedUserIds = [],
  resumeToken = 0,
  storyOpen = false,
  activeStory = null,
  selectedStory = null
}) {
  // Map is fixed to light theme for stability.

  const LAST_MAP_VIEW_STORAGE_KEY = 'vibes.lastMapView';

  function readStoredLastMapView() {
    try {
      const raw = localStorage.getItem(LAST_MAP_VIEW_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);

      const lat = Number(parsed?.center?.lat);
      const lng = Number(parsed?.center?.lng);
      const zoom = Number(parsed?.zoom);
      const followUser = parsed?.followUser === true;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        center: { lat, lng },
        zoom: Number.isFinite(zoom) ? zoom : null,
        followUser
      };
    } catch (e) {
      return null;
    }
  }

  function persistLastMapView(payload) {
    try {
      if (!payload?.center) return;
      localStorage.setItem(LAST_MAP_VIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  const restoredMapViewRef = React.useRef(readStoredLastMapView());
  const followUserRef = React.useRef(
    restoredMapViewRef.current?.followUser === true
  );
  const isProgrammaticCameraMoveRef = React.useRef(false);
  const programmaticCameraReleaseRef = React.useRef(null);

  const setProgrammaticCameraLock = React.useCallback((locked = true) => {
    if (programmaticCameraReleaseRef.current) {
      clearTimeout(programmaticCameraReleaseRef.current);
      programmaticCameraReleaseRef.current = null;
    }

    isProgrammaticCameraMoveRef.current = !!locked;

    if (locked) {
      programmaticCameraReleaseRef.current = setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
        programmaticCameraReleaseRef.current = null;
      }, 260);
    }
  }, []);

  const {
    MIAMI_BASE,
    location,
    mapCenter,
    setMapCenter,
    mapMode,
    customPlace
  } = useMapState();

  const liveMapStateCoords = React.useMemo(() => {
    const lat = Number(location?.coords?.lat);
    const lng = Number(location?.coords?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [location?.coords?.lat, location?.coords?.lng]);

  const [userLocation, setUserLocation] = React.useState(() => {
    const lat = Number(currentUser?.latitude);
    const lng = Number(currentUser?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });

  const hasValidCoords = (value) =>
    value &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng));

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  function distanceMeters(a, b) {
    if (!a || !b) return Infinity;

    const R = 6371000;
    const dLat = toRad((Number(b.lat) || 0) - (Number(a.lat) || 0));
    const dLng = toRad((Number(b.lng) || 0) - (Number(a.lng) || 0));
    const lat1 = toRad(Number(a.lat) || 0);
    const lat2 = toRad(Number(b.lat) || 0);

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  const snapshotViewportNow = React.useCallback(() => {
    try {
      if (!window.vibesMap) return;

      const c = window.vibesMap.getCenter?.();
      const z =
        typeof window.vibesMap.getZoom === 'function'
          ? window.vibesMap.getZoom()
          : null;

      if (!c || !Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lng))) return;

      const nextCenter = {
        lat: Number(c.lat),
        lng: Number(c.lng)
      };

      let shouldFollow = followUserRef.current === true;

      if (hasValidCoords(userLocation)) {
        const distFromUser = distanceMeters(nextCenter, userLocation);

        /* If the map center is meaningfully away from the user,
           treat it as explore mode even if follow had not been saved yet. */
        if (distFromUser > 120) {
          shouldFollow = false;
          followUserRef.current = false;
        }
      }

      setMapCenter((prev) => {
        if (prev && prev.lat === nextCenter.lat && prev.lng === nextCenter.lng) return prev;
        return nextCenter;
      });

      persistLastMapView({
        center: nextCenter,
        zoom: Number.isFinite(Number(z)) ? Number(z) : null,
        followUser: shouldFollow
      });
    } catch (e) {}
  }, [userLocation, setMapCenter]);

  const requestFreshUserLocation = React.useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const fresh = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude)
          };

          if (!Number.isFinite(fresh.lat) || !Number.isFinite(fresh.lng)) {
            resolve(null);
            return;
          }

          setUserLocation(fresh);

          onLocationUpdate?.({
            coords: fresh
          });

          resolve(fresh);
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          maximumAge: 15000,
          timeout: 12000
        }
      );
    });
  }, [onLocationUpdate]);

  React.useEffect(() => {
    if (liveMapStateCoords) {
      setUserLocation((prev) => {
        if (
          prev &&
          Math.abs(Number(prev.lat) - Number(liveMapStateCoords.lat)) < 0.000001 &&
          Math.abs(Number(prev.lng) - Number(liveMapStateCoords.lng)) < 0.000001
        ) {
          return prev;
        }

        return {
          lat: Number(liveMapStateCoords.lat),
          lng: Number(liveMapStateCoords.lng)
        };
      });

      setMapVersion((v) => v + 1);
      return;
    }

    const lat = Number(currentUser?.latitude);
    const lng = Number(currentUser?.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setUserLocation((prev) => {
        if (prev && prev.lat === lat && prev.lng === lng) return prev;
        return { lat, lng };
      });

      setMapVersion((v) => v + 1);
    }
  }, [liveMapStateCoords, currentUser?.latitude, currentUser?.longitude]);


  const [swipeDeckOpen, setSwipeDeckOpen] = React.useState(false);
  const [swipeDeckIndex, setSwipeDeckIndex] = React.useState(0);

  const [activeVibes, setActiveVibes] = React.useState([]);

  const pendingMapViewRef = React.useRef(restoredMapViewRef.current);

  const [mapVersion, setMapVersion] = React.useState(0);

  const [isMapDragging, setIsMapDragging] = React.useState(false);
  const [isDragFreeze, setIsDragFreeze] = React.useState(false);
  const dragFreezeTimeoutRef = React.useRef(null);
  const moveRafRef = React.useRef(0);
  const dragStateRef = React.useRef(false);

  React.useEffect(() => {
    const openDeck = () => {
      setSwipeDeckIndex(0);
      setSwipeDeckOpen(true);
    };

    window.addEventListener('vibes:open-swipe-deck', openDeck);

    return () => {
      window.removeEventListener('vibes:open-swipe-deck', openDeck);
    };
  }, []);

  const currentUserId = React.useMemo(() => {
    const directId = currentUser?.id;
    if (directId) return directId;

    try {
      const localId = localStorage.getItem('vibes_user_id');
      if (localId && String(localId).trim()) return String(localId).trim();
    } catch (e) {}

    return null;
  }, [currentUser?.id]);

  const isLocationSharingEnabled = React.useMemo(() => {
    const parseFlag = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['false', '0', 'off', 'no', 'disabled'].includes(v)) return false;
        if (['true', '1', 'on', 'yes', 'enabled'].includes(v)) return true;
      }
      if (typeof value === 'number') return value !== 0;
      return null;
    };

    const directCandidates = [
      currentUser?.locationSharing,
      currentUser?.location_sharing,
      currentUser?.locationSharingEnabled,
      currentUser?.location_sharing_enabled,
      currentUser?.shareLocation,
      currentUser?.share_location,
      currentUser?.allowLocation,
      currentUser?.allow_location,
      currentUser?.locationEnabled,
      currentUser?.location_enabled,
      currentUser?.useLocation,
      currentUser?.use_location
    ];

    for (const value of directCandidates) {
      const parsed = parseFlag(value);
      if (parsed !== null) return parsed;
    }

    try {
      const saved = JSON.parse(localStorage.getItem('vibes_profile') || '{}');

      const savedCandidates = [
        saved?.locationSharing,
        saved?.location_sharing,
        saved?.locationSharingEnabled,
        saved?.location_sharing_enabled,
        saved?.shareLocation,
        saved?.share_location,
        saved?.allowLocation,
        saved?.allow_location,
        saved?.locationEnabled,
        saved?.location_enabled,
        saved?.useLocation,
        saved?.use_location
      ];

      for (const value of savedCandidates) {
        const parsed = parseFlag(value);
        if (parsed !== null) return parsed;
      }
    } catch (e) {}

    return true;
  }, [
    currentUser?.locationSharing,
    currentUser?.location_sharing,
    currentUser?.locationSharingEnabled,
    currentUser?.location_sharing_enabled,
    currentUser?.shareLocation,
    currentUser?.share_location,
    currentUser?.allowLocation,
    currentUser?.allow_location,
    currentUser?.locationEnabled,
    currentUser?.location_enabled,
    currentUser?.useLocation,
    currentUser?.use_location
  ]);

  const isCurrentUserVisible = React.useMemo(() => {
    const candidates = [
      currentUser?.isVisible,
      currentUser?.is_visible,
      currentUser?.profileVisibility,
      currentUser?.profile_visibility,
      currentUser?.visible,
      currentUser?.showOnMap,
      currentUser?.show_on_map
    ];

    for (const value of candidates) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['false', '0', 'off', 'hidden', 'no'].includes(v)) return false;
        if (['true', '1', 'on', 'visible', 'yes'].includes(v)) return true;
      }
      if (typeof value === 'number') return value !== 0;
    }

    return true;
  }, [
    currentUser?.isVisible,
    currentUser?.is_visible,
    currentUser?.profileVisibility,
    currentUser?.profile_visibility,
    currentUser?.visible,
    currentUser?.showOnMap,
    currentUser?.show_on_map
  ]);

  const normalizeLookingFor = React.useCallback((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const s = String(raw || '').trim().toLowerCase();

    if (!s) return 'Vibes';
    if (['friends', 'friendship', 'friend'].includes(s)) return 'Friends';
    if (['dating', 'date'].includes(s)) return 'Dating';
    if (['vibes', 'open', 'nearby radar', 'all'].includes(s)) return 'Vibes';

    return raw;
  }, []);

  const normalizeIntent = React.useCallback((value) => {
    const normalized = normalizeLookingFor(value);
    if (!normalized) return 'All';
    if (normalized === 'Friends') return 'Friends';
    if (normalized === 'Dating') return 'Dating';
    if (normalized === 'Vibes') return 'Vibes';
    return normalized;
  }, [normalizeLookingFor]);

  const activeMapMode = React.useMemo(() => {
    const mode = normalizeLookingFor(selectedMood || 'Vibes');

    if (mode === 'Friends') return 'Friends';
    if (mode === 'Dating') return 'Dating';
    return 'Vibes';
  }, [selectedMood, normalizeLookingFor]);

  const filteredUsers = React.useMemo(() => {
    const users = Array.isArray(activeVibes) ? activeVibes : [];
    return users.filter(Boolean);
  }, [activeVibes]);

  const matchesSignupPreferences = React.useCallback(() => true, []);

  const CITY_ZOOM = 12.5;
  const CUSTOM_PLACE_ZOOM = 13.8;
  const NEARBY_ZOOM = 15.4;

  const flyToSafe = React.useCallback((lat, lng, zoom) => {
    if (!window.vibesMap || typeof lat !== 'number' || typeof lng !== 'number') return;

    const targetZoom =
      typeof zoom === 'number' && Number.isFinite(zoom)
        ? zoom
        : (typeof window.vibesMap.getZoom === 'function' ? window.vibesMap.getZoom() : 13);

    setProgrammaticCameraLock(true);

    try {
      window.vibesMap.invalidateSize?.(true);
    } catch (e) {}

    try {
      window.vibesMap.setView([lat, lng], targetZoom, { animate: false });
    } catch (e) {
      try {
        window.vibesMap.setView([lat, lng], targetZoom, { animate: false });
      } catch (e2) {}
    }
  }, [setProgrammaticCameraLock]);

  React.useEffect(() => {
    if (!isActive || !isMainMapView) return;
    if (!window.vibesMap) return;

    /* Do not let automatic camera sync fight an in-progress programmatic move
       such as recenter, refresh, resume restore, or nearby selection. */
    if (isProgrammaticCameraMoveRef.current) return;

    if (mapMode === 'custom') {
      const lat = Number(customPlace?.lat);
      const lng = Number(customPlace?.lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        followUserRef.current = false;
        setMapCenter({ lat, lng });
        flyToSafe(lat, lng, CUSTOM_PLACE_ZOOM);
        setMapVersion((v) => v + 1);
        return;
      }
    }

    if (mapMode === 'city') {
      const base = hasValidCoords(userLocation) ? userLocation : MIAMI_BASE;
      followUserRef.current = false;
      setMapCenter({
        lat: Number(base.lat),
        lng: Number(base.lng)
      });
      flyToSafe(Number(base.lat), Number(base.lng), CITY_ZOOM);
      setMapVersion((v) => v + 1);
      return;
    }

    const nearbyBase = hasValidCoords(userLocation) ? userLocation : MIAMI_BASE;

    if (followUserRef.current) {
      const currentMapZoom =
        typeof window.vibesMap?.getZoom === 'function'
          ? window.vibesMap.getZoom()
          : NEARBY_ZOOM;

      const targetZoom =
        Number.isFinite(Number(currentMapZoom)) && Number(currentMapZoom) > NEARBY_ZOOM
          ? Number(currentMapZoom)
          : NEARBY_ZOOM;

      setMapCenter({
        lat: Number(nearbyBase.lat),
        lng: Number(nearbyBase.lng)
      });
      flyToSafe(Number(nearbyBase.lat), Number(nearbyBase.lng), targetZoom);
      setMapVersion((v) => v + 1);
      return;
    }

    try {
      const c = window.vibesMap.getCenter?.();
      if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
        setMapCenter({
          lat: Number(c.lat),
          lng: Number(c.lng)
        });
      }
    } catch (e) {}

    setMapVersion((v) => v + 1);
  }, [
    isActive,
    isMainMapView,
    mapMode,
    customPlace?.id,
    customPlace?.lat,
    customPlace?.lng,
    userLocation?.lat,
    userLocation?.lng,
    MIAMI_BASE,
    CITY_ZOOM,
    CUSTOM_PLACE_ZOOM,
    NEARBY_ZOOM,
    flyToSafe,
    setMapCenter
  ]);

  const project = React.useCallback((lng, lat) => {
    if (!window.vibesMap || !window.L) return { top: '50%', left: '50%', hidden: true };
    try {
      const point = window.vibesMap.latLngToContainerPoint([lat, lng]);
      const container = window.vibesMap.getContainer();
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;

      return {
        x: point.x,
        y: point.y,
        left: point.x + 'px',
        top: point.y + 'px',
        hidden: point.x < -100 || point.y < -100 || point.x > width + 100 || point.y > height + 100
      };
    } catch (e) {
      return { top: '50%', left: '50%', hidden: true };
    }
  }, []);

  const fetchNearbyVibes = React.useCallback(async () => {
    try {
      let effectiveUserId = currentUserId || null;

      const hasSupabaseProfiles =
        !!supabase &&
        typeof supabase.from === 'function';

      if (!hasSupabaseProfiles) {
        setActiveVibes([]);
        return;
      }

      let authUserId = null;

      try {
        if (supabase?.auth && typeof supabase.auth.getUser === 'function') {
          const authRes = await supabase.auth.getUser().catch(() => null);
          authUserId = authRes?.data?.user?.id || null;
        }
      } catch (e) {}

      effectiveUserId = currentUserId || authUserId || null;

      const [locationsQueryResult, presenceQueryResult] = await Promise.all([
        supabase
          .from('user_locations')
          .select('user_id, latitude, longitude, updated_at'),
        supabase
          .from('presence')
          .select('user_id, status, vibe, last_seen_at, updated_at')
      ]);

      const locationsData = locationsQueryResult?.data || [];
      const presenceData = presenceQueryResult?.data || [];

      const safeLocations = Array.isArray(locationsData) ? locationsData : [];
      const safePresence = Array.isArray(presenceData) ? presenceData : [];

      const candidateIds = Array.from(
        new Set(
          safeLocations
            .map((row) => String(row?.user_id || '').trim())
            .filter(Boolean)
            .filter((id) => !effectiveUserId || String(id) !== String(effectiveUserId))
        )
      );

      let safeProfiles = [];

      if (candidateIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(
            'id, display_name, avatar_url, bio, birth_date, city, country, gender, interested_in, is_visible, updated_at'
          )
          .in('id', candidateIds);

        if (profilesError) {
          console.warn('profiles query failed:', profilesError);
        }

        safeProfiles = Array.isArray(profilesData) ? profilesData : [];
      }

      const profileMap = new Map(
        safeProfiles.map((row) => [String(row.id), row])
      );

      const presenceMap = new Map(
        safePresence.map((row) => [String(row.user_id), row])
      );

      const dbVibes = [];

      safeLocations.forEach((loc) => {
        const uid = (loc?.user_id || '').toString().trim();
        if (!uid) return;
        if (effectiveUserId && String(uid) === String(effectiveUserId)) return;

        const lat = Number(loc?.latitude);
        const lng = Number(loc?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }

        const p = profileMap.get(String(uid)) || null;
        const prs = presenceMap.get(String(uid)) || null;

        const rawVisible = p?.is_visible;
        const isVisible =
          rawVisible === false
            ? false
            : typeof rawVisible === 'string'
              ? rawVisible.trim().toLowerCase() !== 'false'
              : typeof rawVisible === 'number'
                ? rawVisible !== 0
                : true;

        if (!isVisible) {
          return;
        }

        const status = String(prs?.status || '').toLowerCase();
        const isOnline = status === 'online' || status === 'active';

        const resolvedLookingFor = normalizeLookingFor(prs?.vibe || 'Vibes');

        const energy =
          resolvedLookingFor === 'Friends'
            ? 'Chill'
            : resolvedLookingFor === 'Dating'
              ? 'Flirty'
              : 'Vibes';

        const cleanAvatar =
          typeof p?.avatar_url === 'string'
            ? p.avatar_url.trim()
            : '';

        const safeDisplayName =
          typeof p?.display_name === 'string' && p.display_name.trim()
            ? p.display_name.trim()
            : 'Nearby user';

        dbVibes.push({
          id: uid,
          userId: uid,
          displayName: safeDisplayName,
          city: p?.city || 'Nearby',
          country: p?.country || '',
          energy,
          bio: p?.bio || '',
          birthday: p?.birth_date || null,
          lookingFor: [resolvedLookingFor],
          looking_for: resolvedLookingFor,
          interested_in: p?.interested_in || '',
          interestedIn: p?.interested_in || '',
          gender: p?.gender || '',
          instagram: '',
          tiktok: '',
          ...getTheme(energy),
          lat,
          lng,
          isOnline,
          lastSeen: prs?.last_seen_at || prs?.updated_at || loc?.updated_at || p?.updated_at || null,
          avatarUrl: cleanAvatar,
          avatar_url: cleanAvatar,
          updatedAt: p?.updated_at || loc?.updated_at || '',
          updated_at: p?.updated_at || loc?.updated_at || '',
          profileUpdatedAt: p?.updated_at || '',
          hasProfileRow: !!p
        });
      });

      setActiveVibes((prev) => {
        const next = mergeVibesStable(prev, dbVibes);
        return next === prev ? prev : next;
      });
    } catch (err) {
      console.warn('fetchNearbyVibes failed:', err);
      setActiveVibes((prev) => (Array.isArray(prev) ? prev : []));
    }
  }, [currentUserId, supabase, normalizeLookingFor]);

  React.useEffect(() => {
    if (!hasValidCoords(userLocation)) return;

    const locationCandidates = [
      currentUser?.locationSharing,
      currentUser?.location_sharing,
      currentUser?.shareLocation,
      currentUser?.share_location,
      currentUser?.allowLocation,
      currentUser?.allow_location
    ];

    let isLocationEnabled = true;

    for (const value of locationCandidates) {
      if (typeof value === 'boolean') {
        isLocationEnabled = value;
        break;
      }
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['false', '0', 'off', 'no'].includes(v)) {
          isLocationEnabled = false;
          break;
        }
        if (['true', '1', 'on', 'yes'].includes(v)) {
          isLocationEnabled = true;
          break;
        }
      }
      if (typeof value === 'number') {
        isLocationEnabled = value !== 0;
        break;
      }
    }

    if (!isLocationEnabled) return;

    onLocationUpdate?.({
      coords: {
        lat: Number(userLocation.lat),
        lng: Number(userLocation.lng)
      }
    });
  }, [
    userLocation,
    onLocationUpdate,
    currentUser?.locationSharing,
    currentUser?.location_sharing,
    currentUser?.shareLocation,
    currentUser?.share_location,
    currentUser?.allowLocation,
    currentUser?.allow_location
  ]);

  React.useEffect(() => {
    if (!hasValidCoords(userLocation)) return;
    if (!isCurrentUserVisible) return;
    if (!isLocationSharingEnabled) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const dbUserId =
          currentUserId ||
          (await supabase?.auth?.getUser?.())?.data?.user?.id;

        if (!dbUserId || cancelled) return;

        await supabase?.from?.('user_locations')?.upsert?.({
          user_id: dbUserId,
          latitude: Number(userLocation.lat),
          longitude: Number(userLocation.lng),
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Location save failed:', e);
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    userLocation?.lat,
    userLocation?.lng,
    currentUserId,
    supabase,
    isCurrentUserVisible,
    isLocationSharingEnabled
  ]);

  React.useEffect(() => {
    if (!isActive || !isMainMapView) return;

    let cancelled = false;
    let intervalId = null;

    const bootNearby = async () => {
      try {
        await fetchNearbyVibes();
        if (cancelled) return;

        requestAnimationFrame(() => {
          if (cancelled) return;
          setMapVersion((v) => v + 1);
        });

        setTimeout(async () => {
          if (cancelled) return;
          try {
            await fetchNearbyVibes();
          } catch (e) {}
          if (cancelled) return;

          requestAnimationFrame(() => {
            if (cancelled) return;
            setMapVersion((v) => v + 1);
          });
        }, 350);

        setTimeout(() => {
          if (cancelled) return;
          try {
            const c = window.vibesMap?.getCenter?.();
            if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
              setMapCenter((prev) => {
                const next = { lat: Number(c.lat), lng: Number(c.lng) };
                if (prev && prev.lat === next.lat && prev.lng === next.lng) return prev;
                return next;
              });
            }
          } catch (e) {}

          setMapVersion((v) => v + 1);
        }, 500);
      } catch (e) {
        console.warn('bootNearby failed:', e);
      }
    };

    bootNearby();

    intervalId = setInterval(async () => {
      if (cancelled) return;
      try {
        await fetchNearbyVibes();
      } catch (e) {}
      if (cancelled) return;
      setMapVersion((v) => v + 1);
    }, 25000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    isActive,
    isMainMapView,
    fetchNearbyVibes,
    setMapCenter
  ]);


  const resolvedMapStyle = 'light';

  React.useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const createTileLayerForTheme = () => {
      const safeTheme = 'light';
      const theme = MAP_THEMES[safeTheme] || MAP_THEMES.light;

      const url = theme.tileUrl;
      const themeOptions = theme.tileOptions || {};
      const shellBackground = theme.shellBackground || '#04070b';

      const options = {
        ...themeOptions,
        maxZoom: Number.isFinite(Number(themeOptions.maxZoom)) ? Number(themeOptions.maxZoom) : 20,
        maxNativeZoom: Number.isFinite(Number(themeOptions.maxNativeZoom))
          ? Number(themeOptions.maxNativeZoom)
          : 20,
        tileSize: Number.isFinite(Number(themeOptions.tileSize)) ? Number(themeOptions.tileSize) : 256,
        zoomOffset: Number.isFinite(Number(themeOptions.zoomOffset)) ? Number(themeOptions.zoomOffset) : 0,
        keepBuffer: Number.isFinite(Number(themeOptions.keepBuffer)) ? Math.max(Number(themeOptions.keepBuffer), 18) : 18,
        updateWhenIdle: false,
        updateWhenZooming: true,
        updateInterval: Number.isFinite(Number(themeOptions.updateInterval))
          ? Math.min(Number(themeOptions.updateInterval), 40)
          : 40,
        detectRetina: typeof themeOptions.detectRetina === 'boolean' ? themeOptions.detectRetina : false,
        crossOrigin: true,
        noWrap: false,
        bounds: null,
        className: 'vibes-map-tile-layer'
      };

      const layer = window.L.tileLayer(url, options);
      layer.__themeName = safeTheme;
      layer.__ready = false;
      layer.__tileLoadCount = 0;
      layer.__pendingTiles = 0;
      layer.__lastLoadedAt = 0;
      layer.__shellBackground = shellBackground;

      const setMapLoadingState = (isLoading) => {
        try {
          const el = document.getElementById('vibes-map');
          if (!el) return;
          if (isLoading) el.setAttribute('data-map-loading', 'true');
          else el.setAttribute('data-map-loading', 'false');
        } catch (e) {}
      };

      const markReady = () => {
        layer.__tileLoadCount += 1;
        layer.__ready = true;
        layer.__lastLoadedAt = Date.now();
      };

      layer.on('loading', () => {
        layer.__pendingTiles = Math.max(1, Number(layer.__pendingTiles || 0));
        setMapLoadingState(true);
      });

      layer.on('tileloadstart', (ev) => {
        layer.__pendingTiles = Number(layer.__pendingTiles || 0) + 1;

        const tile = ev?.tile;
        if (tile) {
          try {
            tile.style.opacity = '1';
            tile.style.visibility = 'visible';
            tile.style.background = 'transparent';
            tile.style.transition = 'opacity 120ms linear';
          } catch (e) {}
        }
      });

      layer.on('tileload', (ev) => {
        markReady();
        layer.__pendingTiles = Math.max(0, Number(layer.__pendingTiles || 0) - 1);

        const tile = ev?.tile;
        if (tile) {
          try {
            tile.style.opacity = '1';
            tile.style.visibility = 'visible';
            tile.style.background = 'transparent';
            tile.style.transition = 'opacity 120ms linear';
          } catch (e) {}
        }

        if (layer.__pendingTiles <= 0) {
          setTimeout(() => {
            if (layer.__pendingTiles <= 0) setMapLoadingState(false);
          }, 60);
        }
      });

      layer.on('load', () => {
        markReady();
        layer.__pendingTiles = 0;
        setMapLoadingState(false);
      });

      layer.on('tileerror', (ev) => {
        layer.__pendingTiles = Math.max(0, Number(layer.__pendingTiles || 0) - 1);

        const tile = ev?.tile;
        if (tile) {
          try {
            tile.style.opacity = '0';
            tile.style.visibility = 'hidden';
            tile.style.background = 'transparent';
          } catch (e) {}
        }

        if (layer.__pendingTiles <= 0) {
          setTimeout(() => {
            if (layer.__pendingTiles <= 0) setMapLoadingState(false);
          }, 60);
        }
      });

      return layer;
    };

    let manualPointerDownHandler = null;
    let manualWheelHandler = null;

    const startMap = () => {
      if (!window.L) return;
      if (window.vibesMap) return;

      const el = document.getElementById('vibes-map');
      if (!el) return;

      const pendingView = pendingMapViewRef.current;

      const initialCenter =
        pendingView?.center
          ? [Number(pendingView.center.lat), Number(pendingView.center.lng)]
          : hasValidCoords(userLocation)
            ? [Number(userLocation.lat), Number(userLocation.lng)]
            : [Number(MIAMI_BASE.lat), Number(MIAMI_BASE.lng)];

      const initialZoom =
        Number.isFinite(Number(pendingView?.zoom))
          ? Math.min(Number(pendingView.zoom), 20)
          : (hasValidCoords(userLocation) ? Math.min(NEARBY_ZOOM, 20) : 13);

      const getDynamicMinZoom = () => {
        if (mapMode === 'nearby') return 8;
        if (mapMode === 'city') return 6;
        if (mapMode === 'custom') return 4;
        return 4;
      };

      const themeMaxZoom = Number.isFinite(Number(MAP_THEMES?.light?.tileOptions?.maxZoom))
        ? Number(MAP_THEMES.light.tileOptions.maxZoom)
        : 18;

      const map = window.L.map('vibes-map', {
        center: initialCenter,
        zoom: Math.min(initialZoom, themeMaxZoom),
        minZoom: getDynamicMinZoom(),
        maxZoom: themeMaxZoom,
        zoomControl: false,
        attributionControl: false,
        tap: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        preferCanvas: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        inertia: true,
        inertiaDeceleration: 1800,
        inertiaMaxSpeed: 4200,
        easeLinearity: 0.22,
        worldCopyJump: false,
        bounceAtZoomLimits: false,
        zoomSnap: 0.25,
        zoomDelta: 0.75,
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 90
      });

      window.vibesMap = map;

      try {
        const container = map.getContainer?.();
        if (container) {
          container.style.touchAction = 'pan-x pan-y';
          container.style.webkitTouchCallout = 'none';
          container.style.webkitUserSelect = 'none';
          container.style.userSelect = 'none';
          container.style.overscrollBehavior = 'none';
          container.style.webkitTapHighlightColor = 'transparent';
          container.style.background = '#04070b';
        }
      } catch (e) {}

      const firstLayer = createTileLayerForTheme();

      try {
        firstLayer.addTo(map);
        window.vibesMapTileLayer = firstLayer;
      } catch (e) {
        console.warn('Initial tile layer add failed:', e);
      }

      let readyDone = false;

      const markReady = () => {
        if (readyDone) return;
        readyDone = true;
        window.vibesMapTileLayer = firstLayer;

        try {
          map.invalidateSize?.(true);
        } catch (e) {}

        setMapVersion((v) => v + 1);
      };

      firstLayer.once?.('load', markReady);

      setTimeout(() => {
        markReady();
      }, 1200);

      const markManualExploreMode = () => {
        if (isProgrammaticCameraMoveRef.current) return;

        followUserRef.current = false;
        snapshotViewportNow();
      };

      const syncProjectedOverlayPositions = () => {
        if (moveRafRef.current) return;

        moveRafRef.current = requestAnimationFrame(() => {
          moveRafRef.current = 0;

          snapshotViewportNow();
          setMapVersion((v) => v + 1);
        });
      };

      const containerEl = map.getContainer?.();
      manualPointerDownHandler = () => {
        markManualExploreMode();
      };

      manualWheelHandler = () => {
        markManualExploreMode();
      };

      if (containerEl) {
        containerEl.addEventListener('pointerdown', manualPointerDownHandler, { passive: true });
        containerEl.addEventListener('touchstart', manualPointerDownHandler, { passive: true });
        containerEl.addEventListener('wheel', manualWheelHandler, { passive: true });
      }

      map.on('movestart', () => {
        dragStateRef.current = true;
        setIsMapDragging(true);
        setIsDragFreeze(true);

        if (dragFreezeTimeoutRef.current) {
          clearTimeout(dragFreezeTimeoutRef.current);
          dragFreezeTimeoutRef.current = null;
        }

        if (!isProgrammaticCameraMoveRef.current) {
          markManualExploreMode();
        }

        syncProjectedOverlayPositions();
      });

      map.on('move', syncProjectedOverlayPositions);
      map.on('zoom', syncProjectedOverlayPositions);

      map.on('zoomstart', () => {
        dragStateRef.current = true;

        if (!isProgrammaticCameraMoveRef.current) {
          markManualExploreMode();
        }

        if (dragFreezeTimeoutRef.current) {
          clearTimeout(dragFreezeTimeoutRef.current);
          dragFreezeTimeoutRef.current = null;
        }

        setIsMapDragging(true);
        setIsDragFreeze(true);
        syncProjectedOverlayPositions();
      });

      map.on('zoomend', () => {
        setProgrammaticCameraLock(false);

        try {
          if (!window.vibesMap) return;

          const providerMaxZoom = Number.isFinite(Number(MAP_THEMES?.light?.tileOptions?.maxZoom))
            ? Number(MAP_THEMES.light.tileOptions.maxZoom)
            : 18;

          if (window.vibesMap.getZoom() > providerMaxZoom) {
            setProgrammaticCameraLock(true);
            window.vibesMap.setZoom(providerMaxZoom, { animate: false });
            return;
          }

          const c = window.vibesMap.getCenter?.();
          if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
            setMapCenter((prev) => {
              if (prev && prev.lat === c.lat && prev.lng === c.lng) return prev;
              return { lat: c.lat, lng: c.lng };
            });
          }
        } catch (e) {}

        setMapVersion((v) => v + 1);
        setIsMapDragging(false);

        if (dragFreezeTimeoutRef.current) {
          clearTimeout(dragFreezeTimeoutRef.current);
        }

        dragFreezeTimeoutRef.current = setTimeout(() => {
          setIsDragFreeze(false);
          dragFreezeTimeoutRef.current = null;
        }, 120);
      });

      map.on('drag', () => {
        if (moveRafRef.current) return;

        moveRafRef.current = requestAnimationFrame(() => {
          moveRafRef.current = 0;

          if (!window.vibesMap) return;

          const c = window.vibesMap.getCenter();
          setMapCenter((prev) => {
            if (prev && prev.lat === c.lat && prev.lng === c.lng) return prev;
            return { lat: c.lat, lng: c.lng };
          });
        });
      });

      map.on('moveend', () => {
        dragStateRef.current = false;
        setProgrammaticCameraLock(false);

        if (moveRafRef.current) {
          cancelAnimationFrame(moveRafRef.current);
          moveRafRef.current = 0;
        }

        if (window.vibesMap) {
          const c = window.vibesMap.getCenter();
          const z =
            typeof window.vibesMap.getZoom === 'function'
              ? window.vibesMap.getZoom()
              : null;

          const nextCenter = {
            lat: Number(c.lat),
            lng: Number(c.lng)
          };

          setMapCenter((prev) => {
            if (prev && prev.lat === nextCenter.lat && prev.lng === nextCenter.lng) return prev;
            return nextCenter;
          });

          persistLastMapView({
            center: nextCenter,
            zoom: Number.isFinite(Number(z)) ? Number(z) : null,
            followUser: followUserRef.current === true
          });
        }

        setMapVersion((v) => v + 1);
        setIsMapDragging(false);

        if (dragFreezeTimeoutRef.current) {
          clearTimeout(dragFreezeTimeoutRef.current);
        }

        dragFreezeTimeoutRef.current = setTimeout(() => {
          setIsDragFreeze(false);
          dragFreezeTimeoutRef.current = null;
        }, 120);
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            map.invalidateSize?.(true);
          } catch (e) {}
          setMapVersion((v) => v + 1);
        });
      });
    };

    const bootLeaflet = () => {
      let tries = 0;

      const tryStart = () => {
        if (window.L) {
          startMap();
          return;
        }

        tries += 1;
        if (tries < 40) {
          setTimeout(tryStart, 120);
        }
      };

      const existing = document.getElementById('leaflet-script');

      if (window.L) {
        startMap();
        return;
      }

      if (existing) {
        tryStart();
        return;
      }

      const script = document.createElement('script');
      script.id = 'leaflet-script';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = tryStart;
      document.head.appendChild(script);

      tryStart();
    };

    bootLeaflet();

    return () => {
      if (dragFreezeTimeoutRef.current) {
        clearTimeout(dragFreezeTimeoutRef.current);
        dragFreezeTimeoutRef.current = null;
      }

      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }

      if (programmaticCameraReleaseRef.current) {
        clearTimeout(programmaticCameraReleaseRef.current);
        programmaticCameraReleaseRef.current = null;
      }

      try {
        const containerEl = window.vibesMap?.getContainer?.();
        if (containerEl) {
          if (manualPointerDownHandler) {
            containerEl.removeEventListener('pointerdown', manualPointerDownHandler);
            containerEl.removeEventListener('touchstart', manualPointerDownHandler);
          }
          if (manualWheelHandler) {
            containerEl.removeEventListener('wheel', manualWheelHandler);
          }
        }
      } catch (e) {}

      isProgrammaticCameraMoveRef.current = false;
      dragStateRef.current = false;

      if (window.vibesMap) {
        try {
          window.vibesMap.remove();
        } catch (e) {}
        window.vibesMap = null;
      }

      window.vibesMapTileLayer = null;
    };
  }, []);

  React.useEffect(() => {
    if (!window.vibesMap) return;

    let nextMinZoom = 4;

    if (mapMode === 'nearby') nextMinZoom = 8;
    else if (mapMode === 'city') nextMinZoom = 6;
    else if (mapMode === 'custom') nextMinZoom = 4;

    try {
      window.vibesMap.setMinZoom(nextMinZoom);

      const currentZoom =
        typeof window.vibesMap.getZoom === 'function'
          ? window.vibesMap.getZoom()
          : nextMinZoom;

      if (Number.isFinite(currentZoom) && currentZoom < nextMinZoom) {
        window.vibesMap.setZoom(nextMinZoom, { animate: false });
      }

      window.vibesMap.invalidateSize?.(true);
      setMapVersion((v) => v + 1);
    } catch (e) {}
  }, [mapMode]);

  React.useEffect(() => {
    if (!isActive || !isMainMapView) return;

    let cancelled = false;

    const forceVisibleRecalc = () => {
      if (cancelled) return;
      if (!window.vibesMap) return;

      try {
        window.vibesMap.invalidateSize?.(true);
      } catch (e) {}

      try {
        const c = window.vibesMap.getCenter?.();
        if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
          setMapCenter((prev) => {
            const next = { lat: Number(c.lat), lng: Number(c.lng) };
            if (prev && prev.lat === next.lat && prev.lng === next.lng) return prev;
            return next;
          });
        }
      } catch (e) {}

      requestAnimationFrame(() => {
        if (cancelled) return;
        setMapVersion((v) => v + 1);
      });
    };

    const run = async () => {
      try {
        await fetchNearbyVibes();
      } catch (e) {}

      if (mapMode !== 'nearby') {
        return;
      }

      [0, 120, 320, 700, 1200].forEach((ms) => {
        setTimeout(() => {
          forceVisibleRecalc();
        }, ms);
      });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    isMainMapView,
    resumeToken,
    resolvedMapStyle,
    fetchNearbyVibes,
    setMapCenter,
    mapMode
  ]);


  // follow state removed: recenter works directly from current location

  const handleRecenter = React.useCallback(async () => {
    if (!window.vibesMap) return;

    const map = window.vibesMap;

    let currentZoom = 13;
    try {
      const z = typeof map.getZoom === 'function' ? map.getZoom() : 13;
      if (typeof z === 'number' && Number.isFinite(z)) currentZoom = z;
    } catch (e) {}

    const providerMaxZoom = Number.isFinite(Number(MAP_THEMES?.light?.tileOptions?.maxZoom))
      ? Number(MAP_THEMES.light.tileOptions.maxZoom)
      : 18;

    const MAX_ZOOM = providerMaxZoom;
    const ZOOM_STEP = 2.25;
    const MIN_REFOCUS_ZOOM = Math.min(17.2, providerMaxZoom);

    const nextZoom = Math.min(
      Math.max(currentZoom + ZOOM_STEP, MIN_REFOCUS_ZOOM),
      MAX_ZOOM
    );

    if (!isLocationSharingEnabled) {
      const fallbackCenter = {
        lat: Number(MIAMI_BASE.lat),
        lng: Number(MIAMI_BASE.lng)
      };

      followUserRef.current = true;

      try {
        setProgrammaticCameraLock(true);
        map.invalidateSize?.(true);
        map.setView([fallbackCenter.lat, fallbackCenter.lng], nextZoom, {
          animate: false
        });
      } catch (e) {
        try {
          setProgrammaticCameraLock(true);
          map.setView([fallbackCenter.lat, fallbackCenter.lng], nextZoom, {
            animate: false
          });
        } catch (e2) {}
      }

      setMapCenter(fallbackCenter);

      persistLastMapView({
        center: fallbackCenter,
        zoom: nextZoom,
        followUser: true
      });

      setMapVersion((v) => v + 1);
      return;
    }

    const fresh = await requestFreshUserLocation();
    const hasUser = hasValidCoords(fresh) || hasValidCoords(userLocation);
    if (!hasUser) return;

    const target = hasValidCoords(fresh) ? fresh : userLocation;
    const nextCenter = {
      lat: Number(target.lat),
      lng: Number(target.lng)
    };

    try {
      setProgrammaticCameraLock(true);
      map.invalidateSize?.(true);
      map.setView([nextCenter.lat, nextCenter.lng], nextZoom, {
        animate: false
      });
    } catch (e) {
      try {
        setProgrammaticCameraLock(true);
        map.setView([nextCenter.lat, nextCenter.lng], nextZoom, {
          animate: false
        });
      } catch (e2) {}
    }

    setMapCenter(nextCenter);
    followUserRef.current = true;

    persistLastMapView({
      center: nextCenter,
      zoom: nextZoom,
      followUser: true
    });

    setMapVersion((v) => v + 1);
  }, [
    isLocationSharingEnabled,
    MIAMI_BASE,
    requestFreshUserLocation,
    userLocation,
    setMapCenter,
    setProgrammaticCameraLock
  ]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setIsMapDragging(false);
      setIsDragFreeze(false);

      if (dragFreezeTimeoutRef.current) {
        clearTimeout(dragFreezeTimeoutRef.current);
        dragFreezeTimeoutRef.current = null;
      }

      followUserRef.current = true;

      const fresh = await requestFreshUserLocation();
      await fetchNearbyVibes();

      const target =
        hasValidCoords(fresh)
          ? fresh
          : hasValidCoords(userLocation)
            ? userLocation
            : MIAMI_BASE;

      const nextCenter = {
        lat: Number(target.lat),
        lng: Number(target.lng)
      };

      setMapCenter(nextCenter);

      requestAnimationFrame(() => {
        try {
          if (!window.vibesMap) return;

          window.vibesMap.invalidateSize?.(true);

          const zoom =
            typeof window.vibesMap.getZoom === 'function'
              ? window.vibesMap.getZoom()
              : (hasValidCoords(userLocation) ? NEARBY_ZOOM : 13);

          setProgrammaticCameraLock(true);
          window.vibesMap.setView(
            [nextCenter.lat, nextCenter.lng],
            zoom,
            { animate: false }
          );

          persistLastMapView({
            center: nextCenter,
            zoom: Number(zoom),
            followUser: true
          });

          setMapVersion((v) => v + 1);
        } catch (e) {}
      });
    } catch (e) {
      console.error('Refresh failed:', e);
    }
  }, [
    requestFreshUserLocation,
    fetchNearbyVibes,
    userLocation,
    NEARBY_ZOOM,
    MIAMI_BASE,
    setMapCenter,
    setProgrammaticCameraLock
  ]);

  React.useEffect(() => {
    const handleNearbySelected = async () => {
      followUserRef.current = true;

      const fresh = await requestFreshUserLocation();
      const target =
        hasValidCoords(fresh)
          ? fresh
          : hasValidCoords(userLocation)
            ? userLocation
            : MIAMI_BASE;

      if (!target || !window.vibesMap) return;

      const nextCenter = {
        lat: Number(target.lat),
        lng: Number(target.lng)
      };

      setMapCenter(nextCenter);

      try {
        setProgrammaticCameraLock(true);
        window.vibesMap.invalidateSize?.(true);
        window.vibesMap.setView(
          [nextCenter.lat, nextCenter.lng],
          NEARBY_ZOOM,
          { animate: false }
        );
      } catch (e) {
        try {
          setProgrammaticCameraLock(true);
          window.vibesMap.setView(
            [nextCenter.lat, nextCenter.lng],
            NEARBY_ZOOM,
            { animate: false }
          );
        } catch (e2) {}
      }

      persistLastMapView({
        center: nextCenter,
        zoom: NEARBY_ZOOM,
        followUser: true
      });

      setMapVersion((v) => v + 1);
    };

    window.addEventListener('vibes:map-nearby-selected', handleNearbySelected);

    return () => {
      window.removeEventListener('vibes:map-nearby-selected', handleNearbySelected);
    };
  }, [
    requestFreshUserLocation,
    userLocation,
    MIAMI_BASE,
    NEARBY_ZOOM,
    setMapCenter,
    setProgrammaticCameraLock
  ]);

  React.useEffect(() => {
    if (!isActive) return;
    if (!resumeToken) return;

    let cancelled = false;

    const softResumeMap = async () => {
      if (cancelled) return;

      try {
        if (dragFreezeTimeoutRef.current) {
          clearTimeout(dragFreezeTimeoutRef.current);
          dragFreezeTimeoutRef.current = null;
        }
      } catch (e) {}

      try {
        setIsMapDragging(false);
        setIsDragFreeze(false);
      } catch (e) {}

      try {
        if (window.vibesMap) {
          window.vibesMap.invalidateSize?.(true);
        }
      } catch (e) {}

      try {
        await fetchNearbyVibes();
      } catch (e) {}

      if (cancelled) return;

      const stored = readStoredLastMapView();

      if (window.vibesMap && stored?.center) {
        try {
          followUserRef.current = stored.followUser === true;

          const zoom =
            Number.isFinite(Number(stored.zoom))
              ? Number(stored.zoom)
              : (typeof window.vibesMap.getZoom === 'function'
                  ? window.vibesMap.getZoom()
                  : 13);

          const shouldFollowNow =
            stored.followUser === true &&
            mapMode === 'nearby';

          const targetCenter = shouldFollowNow && hasValidCoords(userLocation)
            ? {
                lat: Number(userLocation.lat),
                lng: Number(userLocation.lng)
              }
            : {
                lat: Number(stored.center.lat),
                lng: Number(stored.center.lng)
              };

          setProgrammaticCameraLock(true);
          window.vibesMap.setView(
            [targetCenter.lat, targetCenter.lng],
            zoom,
            { animate: false }
          );

          setMapCenter(targetCenter);

          persistLastMapView({
            center: targetCenter,
            zoom,
            followUser: stored.followUser === true
          });
        } catch (e) {}
      }

      setMapVersion((v) => v + 1);
    };

    const t = setTimeout(() => {
      softResumeMap();
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [resumeToken, isActive, fetchNearbyVibes, setMapCenter, mapMode, userLocation, snapshotViewportNow]);

  React.useEffect(() => {
    if (isActive) return;

    snapshotViewportNow();
  }, [isActive, snapshotViewportNow]);

  const lastSortAtRef = React.useRef(0);
  const lastProcessedRef = React.useRef({ sig: '', value: [] });

  const processedVibes = React.useMemo(() => {
    if (isDragFreeze && lastProcessedRef.current.value.length) {
      return lastProcessedRef.current.value;
    }

    const baseVibes = filteredUsers
      .filter((v) => !blockedUserIds.includes(v.id))
      .filter((v) => matchesSignupPreferences(v));

    const now = Date.now();
    const shouldThrottle = now - lastSortAtRef.current < 1500;

    const customLat = Number(customPlace?.lat);
    const customLng = Number(customPlace?.lng);

    const sig =
      String(mapMode || 'nearby') + '|' +
      String(customPlace?.city || customPlace?.name || '') + '|' +
      String(customLat) + '|' +
      String(customLng) + '|' +
      String(activeMapMode) + '|' +
      String(baseVibes.length) + '|' +
      String(userLocation ? (Math.round(userLocation.lat * 10000) + ',' + Math.round(userLocation.lng * 10000)) : '');

    if (shouldThrottle && lastProcessedRef.current.sig === sig && lastProcessedRef.current.value.length) {
      return lastProcessedRef.current.value;
    }

    lastSortAtRef.current = now;

    const next = baseVibes.map((v) => ({
      ...v,
      isHidden: false
    }));

    lastProcessedRef.current = { sig, value: next };
    return next;
  }, [
    filteredUsers,
    blockedUserIds,
    matchesSignupPreferences,
    userLocation,
    isDragFreeze,
    mapMode,
    customPlace,
    activeMapMode
  ]);

  const finalVibes = React.useMemo(() => {
    const visible = processedVibes.filter((v) => !v.isHidden);

    let baseVibes;
    if (visible.length === 0 && processedVibes.length > 0) {
      const sorted = [...processedVibes].sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        const dateA = new Date(a.lastSeen || 0);
        const dateB = new Date(b.lastSeen || 0);
        return dateB - dateA;
      });

      const fallbackCount = Math.min(3, sorted.length);
      const fallbackIds = new Set(sorted.slice(0, fallbackCount).map((v) => v.id));

      baseVibes = processedVibes.map((v) => ({
        ...v,
        isHidden: fallbackIds.has(v.id) ? false : v.isHidden
      }));
    } else {
      baseVibes = processedVibes;
    }

    let vibes = [...baseVibes];

    const bucketMap = new Map();

    vibes.forEach((v) => {
      if (v.isHidden) return;
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const bucketKey =
        `${Math.round(lat * 10000)}:${Math.round(lng * 10000)}`;

      if (!bucketMap.has(bucketKey)) bucketMap.set(bucketKey, []);
      bucketMap.get(bucketKey).push(v);
    });

    const spreadById = new Map();

    bucketMap.forEach((group) => {
      if (!Array.isArray(group) || group.length <= 1) return;

      const sorted = [...group].sort((a, b) => {
        const an = String(a?.displayName || a?.id || '');
        const bn = String(b?.displayName || b?.id || '');
        return an.localeCompare(bn);
      });

      const centerLat =
        sorted.reduce((sum, item) => sum + Number(item.lat || 0), 0) / sorted.length;
      const centerLng =
        sorted.reduce((sum, item) => sum + Number(item.lng || 0), 0) / sorted.length;

      const baseRadius = 0.00042;

      sorted.forEach((item, idx) => {
        const angle = (Math.PI * 2 * idx) / sorted.length;
        const ring = Math.floor(idx / 6);
        const radius = baseRadius + ring * 0.00018;

        spreadById.set(item.id, {
          lat: centerLat + Math.sin(angle) * radius,
          lng: centerLng + Math.cos(angle) * radius
        });
      });
    });

    vibes = vibes.map((v) => {
      const nextPos = spreadById.get(v.id);
      if (!nextPos) return v;
      return {
        ...v,
        lat: nextPos.lat,
        lng: nextPos.lng
      };
    });

    const uid = currentUserId;
    if (uid) {
      const base = hasValidCoords(userLocation) ? userLocation : MIAMI_BASE;

      const separatedOthers = vibes
        .filter((u) => u?.id !== uid)
        .map((u) => {
          if (!Number.isFinite(Number(u?.lat)) || !Number.isFinite(Number(u?.lng))) return u;

          const dLat = Number(u.lat) - Number(base.lat);
          const dLng = Number(u.lng) - Number(base.lng);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist >= 0.00085) return u;

          const angleSeed =
            String(u?.id || '')
              .split('')
              .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1;

          const angle = (angleSeed % 360) * (Math.PI / 180);
          const push = 0.0011;

          return {
            ...u,
            lat: Number(base.lat) + Math.sin(angle) * push,
            lng: Number(base.lng) + Math.cos(angle) * push
          };
        });

      if (!isCurrentUserVisible) {
        return separatedOthers;
      }

      const currentUserMarker = {
        id: uid,
        userId: uid,
        label: 'YOU',
        isCurrentUser: true,
        lat: Number(base.lat),
        lng: Number(base.lng)
      };

      return [...separatedOthers, currentUserMarker];
    }

    return vibes;
  }, [processedVibes, currentUserId, isCurrentUserVisible, userLocation, MIAMI_BASE]);

  const lastRelevanceAtRef = React.useRef(0);
  const lastRelevanceRef = React.useRef([]);

  const relevanceVibes = React.useMemo(() => {
    // Freeze expensive relevance calculations while dragging and shortly after.
    if (isDragFreeze && lastRelevanceRef.current.length) {
      return lastRelevanceRef.current;
    }

    const now = Date.now();
    if (now - lastRelevanceAtRef.current < 1200 && lastRelevanceRef.current.length) {
      return lastRelevanceRef.current;
    }
    lastRelevanceAtRef.current = now;

    const safeCenter = hasValidCoords(mapCenter) ? mapCenter : MIAMI_BASE;

    const next = finalVibes.map((v) => {
      // Prevent distance/relevance calculations from receiving undefined lat/lng.
      const safeLat = Number.isFinite(Number(v?.lat)) ? Number(v.lat) : safeCenter.lat;
      const safeLng = Number.isFinite(Number(v?.lng)) ? Number(v.lng) : safeCenter.lng;

      const dist = getDistance(safeCenter.lat, safeCenter.lng, safeLat, safeLng, 'mi');
      const distScore = Math.max(0, 1 - dist / 3);
      const onlineScore = v.isOnline ? 1 : 0;

      let compScore = 0;
      if (currentUser) {
        if (v.energy === currentUser.energy) compScore += 0.5;
        if (v.lookingFor && currentUser.lookingFor && v.lookingFor.some((l) => currentUser.lookingFor.includes(l))) {
          compScore += 0.5;
        }
      }

      const relevance = distScore * 0.5 + onlineScore * 0.3 + compScore * 0.2;
      return { ...v, lat: safeLat, lng: safeLng, relevance };
    });

    lastRelevanceRef.current = next;
    return next;
  }, [finalVibes, mapCenter, currentUser, MIAMI_BASE, isDragFreeze]);

  const discoverList = (relevanceVibes || []).filter(
    (v) => !v.isHidden && !v.isCurrentUser
  );

  React.useEffect(() => {
    if (!swipeDeckOpen) return;

    if (!discoverList.length) {
      setSwipeDeckIndex(0);
      return;
    }

    if (swipeDeckIndex < 0) {
      setSwipeDeckIndex(0);
      return;
    }

    if (swipeDeckIndex > discoverList.length) {
      setSwipeDeckIndex(discoverList.length);
    }
  }, [swipeDeckOpen, swipeDeckIndex, discoverList.length]);

  const swipeDeckUser = swipeDeckOpen ? (discoverList[swipeDeckIndex] || null) : null;

  const handleSwipePass = React.useCallback(() => {
    setSwipeDeckIndex((prev) => {
      if (!discoverList.length) return 0;
      const next = prev + 1;
      return next >= discoverList.length ? discoverList.length : next;
    });
  }, [discoverList.length]);

  const handleSwipeLike = React.useCallback(() => {
    setSwipeDeckIndex((prev) => {
      if (!discoverList.length) return 0;
      const next = prev + 1;
      return next >= discoverList.length ? discoverList.length : next;
    });
  }, [discoverList.length]);

  const clusteredData = React.useMemo(() => {
    if (isDragFreeze) {
      return {
        clusters: [],
        individuals: relevanceVibes.filter((v) => !v?.isCurrentUser),
        hidden: relevanceVibes.filter((v) => !!v?.isHidden && !v?.isCurrentUser)
      };
    }

    const nonCurrentVisibleVibes = relevanceVibes.filter(
      (v) => !v.isHidden && !v.isCurrentUser
    );

    if (nonCurrentVisibleVibes.length === 0) {
      return {
        clusters: [],
        individuals: relevanceVibes.filter((v) => !v?.isCurrentUser),
        hidden: relevanceVibes.filter((v) => !!v?.isHidden && !v?.isCurrentUser)
      };
    }

    const clusters = [];
    const individuals = [];
    const processedIds = new Set();
    const CLUSTER_THRESHOLD = 60;

    nonCurrentVisibleVibes.forEach((vibe, i) => {
      if (processedIds.has(vibe.id)) return;

      const pos = project(vibe.lng, vibe.lat);
      if (pos.hidden) return;

      const cluster = [vibe];
      processedIds.add(vibe.id);

      for (let j = i + 1; j < nonCurrentVisibleVibes.length; j++) {
        const other = nonCurrentVisibleVibes[j];
        if (processedIds.has(other.id)) continue;

        const otherPos = project(other.lng, other.lat);
        if (otherPos.hidden) continue;

        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CLUSTER_THRESHOLD) {
          cluster.push(other);
          processedIds.add(other.id);
        }
      }

      if (cluster.length > 1) {
        const avgLat = cluster.reduce((sum, v) => sum + v.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, v) => sum + v.lng, 0) / cluster.length;

        clusters.push({
          id: 'cluster-' + vibe.id,
          lat: avgLat,
          lng: avgLng,
          count: cluster.length,
          vibes: cluster
        });
      } else {
        individuals.push(vibe);
      }
    });

    const hiddenVibes = relevanceVibes.filter(
      (v) => v.isHidden && !v.isCurrentUser
    );

    return {
      clusters,
      individuals: [...individuals, ...hiddenVibes]
    };
  }, [relevanceVibes, mapVersion, project, isDragFreeze]);

  const ClusterMarker = ({ cluster }) => {
    const pos = project(cluster.lng, cluster.lat);
    if (pos.hidden) return null;

    const energies = new Set(cluster.vibes.map((v) => v.energy));
    const isMixed = energies.size > 1;
    const primaryEnergy = cluster.vibes[0].energy;
    const theme = isMixed ? { color: 'bg-indigo-400', glowColor: 'bg-indigo-500' } : getTheme(primaryEnergy);

    return html`
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center z-20 pointer-events-none"
        style=${{
          top: pos.top,
          left: pos.left,
          transitionDuration: isMapDragging ? '0ms' : '180ms',
          transitionTimingFunction: 'linear',
          transitionProperty: 'top, left, transform',
          pointerEvents: 'none',
          willChange: isMapDragging ? 'auto' : 'top, left, transform'
        }}
      >
        <button
          onClick=${(e) => {
            e.stopPropagation();
            if (!window.vibesMap) return;

            const providerMaxZoom = Number.isFinite(Number(MAP_THEMES?.light?.tileOptions?.maxZoom))
              ? Number(MAP_THEMES.light.tileOptions.maxZoom)
              : 18;

            const currentZoom =
              typeof window.vibesMap.getZoom === 'function'
                ? Number(window.vibesMap.getZoom())
                : 13;

            const nextZoom = Math.min(currentZoom + 1.5, providerMaxZoom);

            window.vibesMap.setView([cluster.lat, cluster.lng], nextZoom, { animate: false });
          }}
          className="relative w-12 h-12 flex items-center justify-center group tap-feedback pointer-events-auto"
          style=${{ pointerEvents: 'auto' }}
        >
          <div className=${`absolute inset-0 ${theme.glowColor} opacity-[0.28] blur-[10px] rounded-full animate-pulse`}></div>
          <div className=${`absolute inset-2 ${theme.glowColor} opacity-[0.16] blur-[5px] rounded-full animate-pulse-slow`}></div>

          <div className="relative w-10 h-10 rounded-full border-2 border-white/20 bg-[#0b1020] flex items-center justify-center shadow-2xl transition-transform group-active:scale-110">
            <span className="text-white text-[14px] font-black tracking-tighter drop-shadow-md">${cluster.count}</span>

            ${
              isMixed &&
              html`<div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-tr from-indigo-500 to-purple-400 rounded-full border border-white/20 shadow-sm"></div>`
            }
          </div>
        </button>
      </div>
    `;
  };


  const normalizeDemoVibeForFlow = React.useCallback((raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    const id = (src.id ?? src.userId ?? src.user_id ?? '').toString().trim();
    if (!id) {
      console.warn('[map] Missing/invalid vibe id:', raw);
      return null;
    }

    const displayName = (src.displayName ?? src.display_name ?? src.label ?? '').toString().trim() || 'Vibe';
    const avatarUrl = (src.avatarUrl ?? src.avatar_url ?? '').toString();
    const city = (src.city ?? '').toString();
    const bio = (src.bio ?? '').toString();
    const birthday = (src.birthday ?? src.birth_date ?? '').toString();

    const rawLookingFor = src.looking_for ?? src.lookingFor ?? '';
    const normalizedLookingFor = Array.isArray(rawLookingFor)
      ? (rawLookingFor[0] || 'Vibes')
      : (rawLookingFor || 'Vibes');

    const lookingFor = Array.isArray(rawLookingFor)
      ? rawLookingFor.filter(Boolean)
      : [normalizedLookingFor];

    const energy = (src.energy ?? '').toString() || 'Chill';
    const isOnline = src.isOnline ?? src.is_online;
    const lastSeen = src.lastSeen ?? src.last_seen ?? '';

    const instagram = (src.instagram ?? src.instagram_username ?? src.instagram_url ?? '').toString();
    const tiktok = (src.tiktok ?? src.tiktok_username ?? src.tiktok_url ?? '').toString();
    const gender = (src.gender ?? '').toString();
    const interestedIn = (src.interested_in ?? src.interestedIn ?? '').toString();

    return {
      id,
      userId: id,
      displayName,
      avatarUrl,
      city,
      bio,
      birthday,
      looking_for: normalizedLookingFor,
      lookingFor,
      energy,
      isOnline: typeof isOnline === 'boolean' ? isOnline : !!isOnline,
      lastSeen: lastSeen ? lastSeen.toString() : '',
      instagram,
      tiktok,
      gender,
      interested_in: interestedIn,
      interestedIn
    };
  }, []);

  const visibleCount = React.useMemo(() => {
    return finalVibes.filter((v) => !v?.isHidden && !v?.isCurrentUser).length;
  }, [finalVibes]);

  // Detect if a story is open.
  const isStoryOpen = Boolean(activeStory || selectedStory || storyOpen);

  const nearbyStoryCount = React.useMemo(() => {
    const visibleVibeIds = new Set(
      relevanceVibes
        .filter((v) => !v.isHidden)
        .map((v) => String(v.id))
    );

    const usersWithStories = new Set(
      stories
        .map((s) => getStoryUserId(s))
        .filter((uid) => uid)
        .map((uid) => String(uid))
    );

    if (currentUserId) {
      usersWithStories.add(String(currentUserId));
    }

    let count = 0;

    usersWithStories.forEach((uid) => {
      if (uid === String(currentUserId || '')) {
        count += 1;
        return;
      }

      if (visibleVibeIds.has(uid)) {
        count += 1;
      }
    });

    return count;
  }, [relevanceVibes, stories, currentUserId]);

  const datingCount = React.useMemo(() => {
    return relevanceVibes.filter((v) => {
      if (v?.isHidden || v?.isCurrentUser) return false;
      return normalizeIntent(v?.looking_for || v?.lookingFor) === 'Dating';
    }).length;
  }, [relevanceVibes, normalizeIntent]);

  const friendsCount = React.useMemo(() => {
    return relevanceVibes.filter((v) => {
      if (v?.isHidden || v?.isCurrentUser) return false;
      return normalizeIntent(v?.looking_for || v?.lookingFor) === 'Friends';
    }).length;
  }, [relevanceVibes, normalizeIntent]);

  const vibesCount = React.useMemo(() => {
    return relevanceVibes.filter((v) => {
      if (v?.isHidden || v?.isCurrentUser) return false;
      return normalizeIntent(v?.looking_for || v?.lookingFor) === 'Vibes';
    }).length;
  }, [relevanceVibes, normalizeIntent]);

  const liveEnergyMoodLabel = (selectedMood || 'Vibes').toString().trim() || 'Vibes';

  const liveEnergySelectedCount = React.useMemo(() => {
    const mode = normalizeIntent(liveEnergyMoodLabel);

    if (mode === 'Dating') return datingCount;
    if (mode === 'Friends') return friendsCount;
    return vibesCount;
  }, [liveEnergyMoodLabel, normalizeIntent, datingCount, friendsCount, vibesCount]);

  const liveEnergyMoodConfig = React.useMemo(() => {
    const mood = liveEnergyMoodLabel.toLowerCase();

    if (mood === 'dating') {
      return {
        label: 'Dating',
        dot: '#f43f5e',
        glow: '0 0 10px rgba(244,63,94,0.42)',
        text: 'rgba(255,240,244,0.92)',
        count: liveEnergySelectedCount
      };
    }

    if (mood === 'friends') {
      return {
        label: 'Friends',
        dot: '#a78bfa',
        glow: '0 0 10px rgba(167,139,250,0.40)',
        text: 'rgba(243,240,255,0.92)',
        count: liveEnergySelectedCount
      };
    }

    return {
      label: 'Vibes',
      dot: '#f59e0b',
      glow: '0 0 10px rgba(245,158,11,0.40)',
      text: 'rgba(255,247,237,0.92)',
      count: liveEnergySelectedCount
    };
  }, [liveEnergyMoodLabel, liveEnergySelectedCount]);


  const showMapOverlays = !!isActive && !!isMainMapView;

  const GAP = 86;

  return html`
    <div className="absolute inset-0 bg-zinc-950 overflow-hidden">
      <div
        id="vibes-map"
        data-map-loading="false"
        className=${`absolute inset-0 vibes-map--${resolvedMapStyle}`}
        style=${{
          zIndex: 0,
          pointerEvents: 'auto',
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'none',
          WebkitTapHighlightColor: 'transparent',
          background: '#04070b'
        }}
      ></div>

      <style>
        #vibes-map,
        #vibes-map .leaflet-container,
        #vibes-map .leaflet-pane,
        #vibes-map .leaflet-map-pane,
        #vibes-map .leaflet-tile-pane,
        #vibes-map .leaflet-layer,
        #vibes-map .leaflet-tile-container {
          background: #04070b !important;
        }

        #vibes-map.vibes-map--light,
        #vibes-map.vibes-map--light .leaflet-container,
        #vibes-map.vibes-map--light .leaflet-map-pane,
        #vibes-map.vibes-map--light .leaflet-tile-pane,
        #vibes-map.vibes-map--light .leaflet-tile-container {
          background: #04070b !important;
        }

        #vibes-map .leaflet-container {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        #vibes-map .leaflet-tile-pane,
        #vibes-map .leaflet-layer,
        #vibes-map .leaflet-tile-container {
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        /* MAP COLOR GRADING: less washed, more depth */
        #vibes-map .leaflet-tile-pane {
          filter: contrast(1.14) saturate(1.10) brightness(0.93) !important;
          transform: translateZ(0);
          transform-origin: center center;
        }

        #vibes-map .leaflet-tile {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
          mix-blend-mode: normal !important;
          transition: opacity 120ms linear !important;
          image-rendering: auto !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          outline: none !important;
          transform: translateZ(0);
          background: transparent !important;
          filter: none !important;
        }

        #vibes-map .leaflet-tile-loaded {
          opacity: 1 !important;
        }

        #vibes-map .leaflet-tile-container {
          opacity: 1 !important;
        }

        #vibes-map .leaflet-overlay-pane,
        #vibes-map .leaflet-marker-pane,
        #vibes-map .leaflet-shadow-pane {
          filter: none !important;
        }

        #vibes-map::before,
        #vibes-map::after {
          content: none !important;
          display: none !important;
          opacity: 0 !important;
          background: none !important;
        }
      </style>

      <div className="absolute inset-0 z-20" style=${{ pointerEvents: 'none' }}>
        ${!isMapDragging && clusteredData.clusters.map((cluster) => html`
          <${ClusterMarker}
            key=${cluster.id}
            cluster=${cluster}
          />
        `)}

        ${clusteredData.individuals.map((vibe) => html`
          <${VibePoint}
            key=${vibe.id}
            vibe=${vibe}
            project=${project}
            isMapDragging=${isMapDragging}
            normalizeDemoVibeForFlow=${normalizeDemoVibeForFlow}
            stories=${stories}
            getStoryUserId=${getStoryUserId}
            onViewStory=${onViewStory}
            onOpenVibe=${onOpenVibe}
            getAvatar=${getAvatar}
            isValidMediaUrl=${isValidMediaUrl}
          />
        `)}

        ${isCurrentUserVisible && html`
          <${UserPoint}
            userLocation=${userLocation}
            MIAMI_BASE=${MIAMI_BASE}
            project=${project}
            currentUser=${currentUser}
            currentUserId=${currentUserId}
            onOpenVibe=${onOpenVibe}
            isMapDragging=${isMapDragging}
            getTheme=${getTheme}
            isValidMediaUrl=${isValidMediaUrl}
          />
        `}
      </div>

      ${showMapOverlays && !isStoryOpen && html`
        <div
          className="pointer-events-auto absolute"
          aria-label="Live energy"
          style=${{
            top: '6px',
            left: '10px',
            width: '154px',
            minHeight: '82px',
            borderRadius: '24px',
            padding: '12px 12px',
            background: 'linear-gradient(180deg, rgba(8,10,14,0.90), rgba(5,7,10,0.94))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px) saturate(120%)',
            WebkitBackdropFilter: 'blur(12px) saturate(120%)',
            color: '#ffffff',
            textAlign: 'left'
          }}
        >
          <div
            style=${{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px'
            }}
          >
            <div
              style=${{
                fontSize: '10px',
                lineHeight: '1',
                fontWeight: '900',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.86)',
                whiteSpace: 'nowrap'
              }}
            >
              LIVE ENERGY
            </div>
          </div>

          <div
            style=${{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              rowGap: '10px',
              columnGap: '8px'
            }}
          >
            ${[
              {
                label: liveEnergyMoodConfig.label,
                count: liveEnergyMoodConfig.count,
                active: true,
                color: liveEnergyMoodConfig.dot,
                glow: liveEnergyMoodConfig.glow
              },
              {
                label: 'Nearby',
                count: visibleCount,
                active: false,
                color: '#34d399',
                glow: '0 0 10px rgba(52,211,153,0.45)'
              },
              {
                label: 'History',
                count: nearbyStoryCount,
                active: false,
                color: '#60a5fa',
                glow: '0 0 10px rgba(96,165,250,0.38)'
              }
            ].map((item) => html`
              <div style=${{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '0',
                opacity: item.active ? 1 : 0.55,
                transform: item.active ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 180ms ease'
              }}>
                <div style=${{
                  width: item.active ? '9px' : '7px',
                  height: item.active ? '9px' : '7px',
                  borderRadius: '999px',
                  background: item.color,
                  boxShadow: item.glow,
                  transition: 'all 180ms ease'
                }}></div>

                <span style=${{
                  fontSize: item.active ? '9px' : '8px',
                  lineHeight: '1',
                  fontWeight: item.active ? '900' : '700',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: item.active
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.65)',
                  whiteSpace: 'nowrap',
                  transition: 'all 180ms ease'
                }}>
                  ${item.label}
                </span>
              </div>

              <span style=${{
                fontSize: item.active ? '10px' : '8px',
                lineHeight: '1',
                fontWeight: '900',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: item.active
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.65)',
                justifySelf: 'end',
                whiteSpace: 'nowrap',
                transition: 'all 180ms ease'
              }}>
                ${item.count}
              </span>
            `)}
          </div>
        </div>

        <button
          onClick=${() => {
            window.dispatchEvent(new CustomEvent('vibes:open-swipe-deck'));
          }}
          className="pointer-events-auto absolute"
          aria-label="Open swipe deck"
          style=${{
            top: (264 + GAP * 0) + 'px',
            right: '12px',
            width: '54px',
            height: '54px',
            padding: '0',
            background: 'transparent',
            border: '0',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            appearance: 'none',
            WebkitAppearance: 'none',
            overflow: 'visible'
          }}
        >
          <div
            style=${{
              position: 'relative',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(0)',
              animation:
                datingCount > 0
                  ? 'vibesCheersFloat 2.2s ease-in-out infinite, vibesCheersPulseRed 1.8s ease-in-out infinite'
                  : visibleCount > 0
                    ? 'vibesCheersFloat 2.8s ease-in-out infinite, vibesCheersPulseSoft 2.6s ease-in-out infinite'
                    : 'vibesCheersFloat 3.2s ease-in-out infinite',
              filter:
                datingCount > 0
                  ? 'drop-shadow(0 0 8px rgba(190,24,93,0.38)) drop-shadow(0 6px 14px rgba(0,0,0,0.30))'
                  : visibleCount > 0
                    ? 'drop-shadow(0 0 8px rgba(239,68,68,0.18)) drop-shadow(0 6px 14px rgba(0,0,0,0.28))'
                    : 'drop-shadow(0 5px 10px rgba(0,0,0,0.22))'
            }}
          >
            <div
              aria-hidden="true"
              style=${{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '999px',
                background:
                  datingCount > 0
                    ? 'radial-gradient(circle, rgba(127,29,29,0.24) 0%, rgba(185,28,28,0.12) 34%, rgba(0,0,0,0) 72%)'
                    : visibleCount > 0
                      ? 'radial-gradient(circle, rgba(153,27,27,0.16) 0%, rgba(239,68,68,0.08) 34%, rgba(0,0,0,0) 72%)'
                      : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 70%)',
                opacity: datingCount > 0 ? 1 : (visibleCount > 0 ? 0.8 : 0.45),
                animation:
                  datingCount > 0
                    ? 'vibesCheersAura 1.8s ease-in-out infinite'
                    : visibleCount > 0
                      ? 'vibesCheersAura 2.8s ease-in-out infinite'
                      : 'none'
              }}
            ></div>

            <div
              style=${{
                position: 'relative',
                fontSize: '30px',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              🥂
            </div>

            ${(datingCount > 0 || visibleCount > 0) && html`
              <div
                aria-hidden="true"
                style=${{
                  position: 'absolute',
                  top: '-1px',
                  right: '-1px',
                  width: datingCount > 0 ? '7px' : '6px',
                  height: datingCount > 0 ? '7px' : '6px',
                  borderRadius: '999px',
                  background: datingCount > 0 ? '#ef4444' : '#f87171',
                  boxShadow: datingCount > 0
                    ? '0 0 10px rgba(239,68,68,0.72)'
                    : '0 0 8px rgba(248,113,113,0.50)',
                  animation: 'vibesCheersBadge 1.4s ease-in-out infinite'
                }}
              ></div>
            `}
          </div>
        </button>

        <style>
          @keyframes vibesCheersFloat {
            0% { transform: translateY(0px) scale(1) rotate(0deg); }
            50% { transform: translateY(-3px) scale(1.04) rotate(0deg); }
            100% { transform: translateY(0px) scale(1) rotate(0deg); }
          }

          @keyframes vibesCheersPulseSoft {
            0% { opacity: 0.92; }
            50% { opacity: 1; }
            100% { opacity: 0.92; }
          }

          @keyframes vibesCheersPulseRed {
            0% { transform: translateY(0px) scale(1) rotate(0deg); }
            50% { transform: translateY(-4px) scale(1.08) rotate(0deg); }
            100% { transform: translateY(0px) scale(1) rotate(0deg); }
          }

          @keyframes vibesCheersAura {
            0% { transform: scale(0.92); opacity: 0.28; }
            50% { transform: scale(1.12); opacity: 0.52; }
            100% { transform: scale(0.92); opacity: 0.28; }
          }

          @keyframes vibesCheersBadge {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.18); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
        </style>

        <button
          onClick=${handleRefresh}
          className="pointer-events-auto absolute vibes-map-side-btn"
          aria-label="Refresh map"
          style=${{
            top: (264 + GAP) + 'px',
            right: '12px',
            width: '48px',
            height: '48px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, rgba(8,10,14,0.90), rgba(5,7,10,0.94))',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.035)',
            backdropFilter: 'blur(12px) saturate(120%)',
            WebkitBackdropFilter: 'blur(12px) saturate(120%)',
            color: 'rgba(255,255,255,0.90)',
            fontSize: '23px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            appearance: 'none',
            WebkitAppearance: 'none'
          }}
        >
          ↻
        </button>

        <button
          onClick=${handleRecenter}
          className="pointer-events-auto absolute vibes-map-side-btn"
          aria-label="Recenter map"
          style=${{
            top: (264 + GAP * 2) + 'px',
            right: '12px',
            width: '48px',
            height: '48px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, rgba(8,10,14,0.90), rgba(5,7,10,0.94))',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.035)',
            backdropFilter: 'blur(12px) saturate(120%)',
            WebkitBackdropFilter: 'blur(12px) saturate(120%)',
            color: 'rgba(255,255,255,0.82)',
            fontSize: '15px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            appearance: 'none',
            WebkitAppearance: 'none'
          }}
        >
          ⌖
        </button>
      `}

      ${showMapOverlays && swipeDeckOpen && html`
        <div
          className="absolute inset-0 z-[1300] pointer-events-auto"
          onClick=${() => setSwipeDeckOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
          ></div>

          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div
              className="relative w-full max-w-[360px] rounded-[30px] overflow-hidden border border-white/10"
              style=${{
                background: 'linear-gradient(180deg, rgba(15,18,30,0.98), rgba(8,10,20,1))',
                boxShadow: '0 18px 48px rgba(0,0,0,0.46), 0 0 0 1px rgba(255,255,255,0.03) inset'
              }}
              onClick=${(e) => e.stopPropagation()}
            >
              ${
                swipeDeckUser
                  ? html`
                      <div className="relative h-[470px] bg-black">
                        <img
                          src=${getAvatar(swipeDeckUser)}
                          alt=${swipeDeckUser.displayName || 'Vibe'}
                          className="w-full h-full object-cover"
                        />

                        <div
                          className="absolute inset-x-0 bottom-0"
                          style=${{
                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 18%, rgba(0,0,0,0.84) 100%)',
                            padding: '22px 18px 18px 18px'
                          }}
                        >
                          <div className="text-white text-[28px] font-black leading-none tracking-[-0.03em]">
                            ${swipeDeckUser.displayName || 'Vibe'}
                          </div>

                          <div className="mt-2 text-white/70 text-[12px] font-semibold uppercase tracking-[0.20em]">
                            ${swipeDeckUser.city || 'Nearby'}
                          </div>

                          <div className="mt-3 text-white/84 text-[13px] leading-[1.35]">
                            ${swipeDeckUser.bio || 'Open to new vibes.'}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center justify-center"
                        style=${{
                          padding: '14px 16px 20px 16px',
                          background: 'linear-gradient(180deg, rgba(12,14,24,0.94), rgba(7,10,18,1))'
                        }}
                      >
                        <div
                          className="relative flex items-center justify-center"
                          style=${{
                            width: '100%',
                            maxWidth: '220px',
                            minHeight: '92px',
                            borderRadius: '999px',
                            padding: '12px 14px',
                            background: 'linear-gradient(135deg, rgba(12,18,31,0.76) 0%, rgba(14,22,38,0.68) 42%, rgba(9,16,28,0.82) 100%)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.36), 0 8px 20px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.03) inset',
                            backdropFilter: 'blur(24px) saturate(155%)',
                            WebkitBackdropFilter: 'blur(24px) saturate(155%)'
                          }}
                        >
                          <div
                            aria-hidden="true"
                            className="absolute inset-[1px] rounded-[999px]"
                            style=${{
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.01) 42%, rgba(255,255,255,0.03) 100%)',
                              pointerEvents: 'none'
                            }}
                          ></div>

                          <div
                            aria-hidden="true"
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style=${{
                              width: '26px',
                              height: '26px',
                              background: 'radial-gradient(circle, rgba(79,209,197,0.18) 0%, rgba(79,209,197,0.06) 38%, rgba(79,209,197,0) 74%)',
                              filter: 'blur(4px)',
                              pointerEvents: 'none'
                            }}
                          ></div>

                          <div className="relative z-10 flex w-full items-center justify-center gap-5">
                            <button
                              type="button"
                              onClick=${handleSwipePass}
                              className="rounded-full text-white transition-transform duration-200 active:scale-[0.96]"
                              style=${{
                                width: '56px',
                                height: '56px',
                                border: '1px solid rgba(255,255,255,0.10)',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,255,255,0.02) inset'
                              }}
                              aria-label="Pass"
                            >
                              <span
                                style=${{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  height: '100%',
                                  fontSize: '20px',
                                  fontWeight: '500',
                                  color: 'rgba(255,255,255,0.88)',
                                  textShadow: '0 1px 6px rgba(255,255,255,0.08)'
                                }}
                              >
                                ✕
                              </span>
                            </button>

                            <div
                              aria-hidden="true"
                              className="rounded-full"
                              style=${{
                                width: '1px',
                                height: '36px',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.14), rgba(120,255,224,0.18), rgba(255,255,255,0.10), rgba(255,255,255,0))',
                                boxShadow: '0 0 12px rgba(45,212,191,0.18)'
                              }}
                            ></div>

                            <button
                              type="button"
                              onClick=${handleSwipeLike}
                              className="rounded-full text-white transition-transform duration-200 active:scale-[0.97]"
                              style=${{
                                width: '68px',
                                height: '68px',
                                border: '1px solid rgba(153,246,228,0.24)',
                                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 28%, rgba(45,212,191,0.22) 58%, rgba(13,148,136,0.30) 100%)',
                                boxShadow: '0 16px 28px rgba(0,0,0,0.26), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 18px rgba(45,212,191,0.20), 0 0 34px rgba(45,212,191,0.12)'
                              }}
                              aria-label="Like"
                            >
                              <span
                                style=${{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  height: '100%',
                                  fontSize: '24px',
                                  color: 'rgba(255,255,255,0.98)',
                                  textShadow: '0 0 12px rgba(255,255,255,0.14)',
                                  transform: 'translateY(1px)',
                                  animation: 'pulse 2.4s ease-in-out infinite'
                                }}
                              >
                                ♥
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    `
                  : html`
                      <div
                        className="text-center"
                        style=${{
                          padding: '30px 22px'
                        }}
                      >
                        <div className="text-white text-[18px] font-black tracking-tight">No more people here</div>
                        <div className="mt-2 text-white/55 text-[13px] leading-[1.4]">
                          Try another location or adjust your filters.
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick=${() => setSwipeDeckOpen(false)}
                            className="h-[46px] px-5 rounded-full border border-white/10 text-white/90"
                            style=${{
                              background: 'rgba(255,255,255,0.05)'
                            }}
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            onClick=${() => setSwipeDeckIndex(0)}
                            className="h-[46px] px-5 rounded-full border border-white/10 text-white"
                            style=${{
                              background: 'linear-gradient(180deg, rgba(16,185,129,0.20), rgba(16,185,129,0.10))',
                              boxShadow: '0 0 16px rgba(16,185,129,0.10)'
                            }}
                          >
                            Start again
                          </button>
                        </div>
                      </div>
                    `
              }
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
