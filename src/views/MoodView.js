/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import { useSavedPlaces } from '../state/savedPlaces.js';
import { useMapState } from '../state/mapState.js';
import { CitySearchSheet } from '../components/MapFiltersSheet.js';

const SECTION_TITLE =
  'text-[10px] font-black tracking-[0.34em] uppercase text-white/88 text-center';

const OPTION_BASE =
  'relative rounded-[26px] border transition-all duration-300 tap-feedback overflow-hidden flex flex-col items-center justify-center text-center px-4';

const OPTION_INACTIVE =
  'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] text-white/90';

const PILL_BASE =
  'h-10 px-4 rounded-full border text-[14px] font-medium tracking-[-0.02em] inline-flex items-center justify-center tap-feedback transition-all duration-300';

function normalizeMood(value) {
  const v = (value || '').toString().trim().toLowerCase();
  if (v === 'dating') return 'Dating';
  if (v === 'friends') return 'Friends';
  return 'Vibes';
}

function getSavedPlaceLabel(place) {
  if (!place) return '';
  const city = (place.city || place.name || place.label || '').toString().trim();
  const country = (place.country || '').toString().trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || 'Saved place';
}

export default function MoodView({ selectedMood, setSelectedMood, onDone }) {
  const safeMood = normalizeMood(selectedMood);

  const {
    mapMode,
    customPlace,
    setMapMode,
    setCustomPlace,
    setCurrentCenterLabel,
    citySearchOpen,
    openCitySearch,
    closeFiltersSheet
  } = useMapState();

  const { savedPlaces = [], savePlace, removePlace } = useSavedPlaces();

  const selectedPlaceId = React.useMemo(() => {
    if (!customPlace) return '';
    const customLat = Number(customPlace.lat);
    const customLng = Number(customPlace.lng);

    const match = savedPlaces.find((place) => {
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat === customLat && lng === customLng;
    });

    return match?.id || '';
  }, [customPlace, savedPlaces]);

  const finishToMap = React.useCallback(() => {
    closeFiltersSheet?.();
    onDone?.();
  }, [closeFiltersSheet, onDone]);

  const handleSelectMood = React.useCallback((next) => {
    setSelectedMood?.(next);
  }, [setSelectedMood]);

  const handleLocationMode = React.useCallback((mode) => {
    if (mode === 'nearby') {
      setMapMode?.('nearby');
      setCurrentCenterLabel?.('');
      finishToMap();
      return;
    }

    if (mode === 'city') {
      setMapMode?.('city');
      setCurrentCenterLabel?.('');
      finishToMap();
      return;
    }

    if (mode === 'custom') {
      openCitySearch?.();
    }
  }, [setMapMode, setCurrentCenterLabel, openCitySearch, finishToMap]);

  const handlePickSavedPlace = React.useCallback((place) => {
    if (!place) return;
    setCustomPlace?.(place);
    setCurrentCenterLabel?.(getSavedPlaceLabel(place));
    finishToMap();
  }, [setCustomPlace, setCurrentCenterLabel, finishToMap]);

  const handleSaveCurrentPlace = React.useCallback(() => {
    if (!customPlace || !savePlace) return;
    savePlace(customPlace);
  }, [customPlace, savePlace]);

  const moodCards = [
    {
      key: 'Friends',
      title: 'Friends',
      description: 'Chill plans, friendship, and good company.',
      activeGlow: '0 0 0 1px rgba(147,197,253,0.28), 0 0 24px rgba(96,165,250,0.16), inset 0 1px 0 rgba(255,255,255,0.06)',
      activeBorder: 'rgba(147,197,253,0.34)'
    },
    {
      key: 'Dating',
      title: 'Dating',
      description: 'Chemistry, attraction, and real connection.',
      activeGlow: '0 0 0 1px rgba(244,114,182,0.26), 0 0 28px rgba(236,72,153,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
      activeBorder: 'rgba(244,114,182,0.34)'
    },
    {
      key: 'Vibes',
      title: 'Vibes',
      description: 'Open, social, and free-flowing energy.',
      activeGlow: '0 0 0 1px rgba(125,211,252,0.22), 0 0 22px rgba(59,130,246,0.14), inset 0 1px 0 rgba(255,255,255,0.05)',
      activeBorder: 'rgba(125,211,252,0.28)'
    }
  ];

  const locationOptions = [
    { key: 'nearby', label: 'Nearby' },
    { key: 'city', label: 'This City' },
    { key: 'custom', label: 'Search' }
  ];

  return html`
    <${CitySearchSheet}
      open=${citySearchOpen}
      initialQuery=""
      onBack=${closeFiltersSheet}
      onSelect=${(place) => {
        const label = (place?.label || place?.city || place?.name || '').toString().trim();
        const lat = Number(place?.lat);
        const lng = Number(place?.lng);

        if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          closeFiltersSheet?.();
          return;
        }

        const next = {
          id: place?.id || `${lat},${lng}`,
          label,
          city: place?.city || label,
          country: place?.country || '',
          lat,
          lng
        };

        setCustomPlace?.(next);
        setCurrentCenterLabel?.(getSavedPlaceLabel(next));
        finishToMap();
      }}
    />

    <div
      className="w-full overflow-y-auto"
      style=${{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)'
      }}
    >
      <div className="text-center pt-2">
        <h2 className="text-[24px] leading-none font-black tracking-tight text-white">Search Preferences</h2>
      </div>

      <div className="mt-7">
        <div className=${SECTION_TITLE}>Looking For</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          ${moodCards.slice(0, 2).map((item) => {
            const isActive = safeMood === item.key;
            return html`
              <button
                key=${item.key}
                type="button"
                onClick=${() => handleSelectMood(item.key)}
                className=${`${OPTION_BASE} ${isActive ? '' : OPTION_INACTIVE}`}
                style=${{
                  minHeight: '110px',
                  ...(isActive ? {
                    border: `1px solid ${item.activeBorder}`,
                    background: 'linear-gradient(180deg, rgba(8,12,28,0.96), rgba(5,10,24,0.92))',
                    boxShadow: item.activeGlow
                  } : {
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                  })
                }}
              >
                <div className="text-[18px] font-black tracking-tight text-white">${item.title}</div>
                <div className="mt-2 text-[12px] leading-[1.2] text-white/50 max-w-[180px]">${item.description}</div>
              </button>
            `;
          })}
        </div>

        <div className="mt-3 flex justify-center">
          ${(() => {
            const item = moodCards[2];
            const isActive = safeMood === item.key;
            return html`
              <button
                type="button"
                onClick=${() => handleSelectMood(item.key)}
                className=${`${OPTION_BASE} ${isActive ? '' : OPTION_INACTIVE}`}
                style=${{
                  width: '100%',
                  maxWidth: '100%',
                  minHeight: '104px',
                  ...(isActive ? {
                    border: `1px solid ${item.activeBorder}`,
                    background: 'linear-gradient(180deg, rgba(8,12,28,0.96), rgba(5,10,24,0.92))',
                    boxShadow: item.activeGlow
                  } : {
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                  })
                }}
              >
                <div className="text-[18px] font-black tracking-tight text-white">${item.title}</div>
                <div className="mt-2 text-[12px] leading-[1.2] text-white/50 max-w-[220px]">${item.description}</div>
              </button>
            `;
          })()}
        </div>
      </div>

      <div className="mt-8">
        <div className=${SECTION_TITLE}>Location</div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          ${locationOptions.map((item) => {
            const isActive = mapMode === item.key;
            return html`
              <button
                key=${item.key}
                type="button"
                onClick=${() => handleLocationMode(item.key)}
                className=${PILL_BASE}
                style=${isActive ? {
                  color: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(244,114,182,0.42)',
                  background: 'linear-gradient(180deg, rgba(11,15,34,0.96), rgba(8,11,28,0.94))',
                  boxShadow: '0 0 0 1px rgba(244,114,182,0.16), 0 0 16px rgba(236,72,153,0.14), inset 0 1px 0 rgba(255,255,255,0.04)'
                } : {
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                }}
              >
                ${item.label}
              </button>
            `;
          })}
        </div>

        ${mapMode === 'custom' && customPlace && html`
          <div className="mt-4 flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 h-10 border max-w-full"
              style=${{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))'
              }}
            >
              <span className="text-[13px] text-white/90 truncate max-w-[170px]">${getSavedPlaceLabel(customPlace)}</span>

              ${!selectedPlaceId && html`
                <button
                  type="button"
                  onClick=${handleSaveCurrentPlace}
                  className="h-7 px-3 rounded-full text-[10px] uppercase font-black tracking-[0.16em] tap-feedback"
                  style=${{
                    color: 'rgba(255,255,255,0.96)',
                    background: 'rgba(59,130,246,0.18)',
                    border: '1px solid rgba(59,130,246,0.22)'
                  }}
                >
                  Save
                </button>
              `}
            </div>
          </div>
        `}
      </div>

      ${savedPlaces.length > 0 && html`
        <div className="mt-8">
          <div className=${SECTION_TITLE}>Saved Places</div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            ${savedPlaces.map((place) => {
              const label = getSavedPlaceLabel(place);
              const isActive = selectedPlaceId && place.id === selectedPlaceId;

              return html`
                <div
                  key=${place.id}
                  className="inline-flex items-center gap-2 rounded-full pr-2 pl-4 h-10 border max-w-full"
                  style=${isActive ? {
                    border: '1px solid rgba(244,114,182,0.34)',
                    background: 'linear-gradient(180deg, rgba(11,15,34,0.96), rgba(8,11,28,0.94))',
                    boxShadow: '0 0 0 1px rgba(244,114,182,0.12), 0 0 16px rgba(236,72,153,0.10)'
                  } : {
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))'
                  }}
                >
                  <button
                    type="button"
                    onClick=${() => handlePickSavedPlace(place)}
                    className="text-[13px] text-white/92 tap-feedback truncate max-w-[160px]"
                  >
                    ${label}
                  </button>

                  <button
                    type="button"
                    onClick=${(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removePlace?.(place);
                    }}
                    aria-label=${`Remove ${label}`}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center text-white/45 tap-feedback shrink-0"
                    style=${{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    ×
                  </button>
                </div>
              `;
            })}
          </div>
        </div>
      `}
    </div>
  `;
}
