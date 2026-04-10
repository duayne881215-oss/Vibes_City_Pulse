/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const CHIP_BASE =
  'h-8 px-[14px] rounded-[18px] border text-[12px] font-medium tracking-tight transition-all tap-feedback inline-flex items-center justify-center text-center backdrop-blur-[16px] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

const PILL_BASE =
  'h-7 px-3 rounded-full border text-[11px] font-medium tracking-tight transition-all tap-feedback inline-flex items-center justify-center text-center backdrop-blur-[14px] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

const PILL_ON =
  'bg-[linear-gradient(180deg,rgba(20,28,58,0.84),rgba(8,14,34,0.98))] border-[rgba(244,114,182,0.38)] text-white shadow-[0_0_0_1px_rgba(244,114,182,0.08),0_0_14px_rgba(244,114,182,0.12),0_0_24px_rgba(96,165,250,0.09)] ring-1 ring-[rgba(96,165,250,0.15)]';

const PILL_OFF =
  'bg-[linear-gradient(180deg,rgba(255,255,255,0.013),rgba(255,255,255,0.003))] border-white/5 text-white/68 hover:text-white/80 hover:border-white/8 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.006))]';

const CHIP_ON =
  'bg-[linear-gradient(180deg,rgba(20,28,58,0.88),rgba(8,14,34,0.98))] border-[rgba(244,114,182,0.42)] text-white shadow-[0_0_0_1px_rgba(244,114,182,0.08),0_0_16px_rgba(244,114,182,0.14),0_0_28px_rgba(96,165,250,0.10)] ring-1 ring-[rgba(96,165,250,0.18)]';

const CHIP_OFF =
  'bg-[linear-gradient(180deg,rgba(255,255,255,0.013),rgba(255,255,255,0.003))] border-white/5 text-white/68 hover:text-white/80 hover:border-white/8 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.006))]';

function ChipGroup({ value, onChange, options = [] }) {
  return html`
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-2.5">
      ${options.map(
        (opt) => html`<button
          key=${opt.value}
          type="button"
          className=${`${CHIP_BASE} ${value === opt.value ? CHIP_ON : CHIP_OFF}`}
          onClick=${(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange?.(opt.value);
          }}
        >
          ${opt.label}
        </button>`
      )}
    </div>
  `;
}

const CITY_INDEX = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'San Francisco, CA',
  'Columbus, OH',
  'Fort Worth, TX',
  'Indianapolis, IN',
  'Charlotte, NC',
  'Seattle, WA',
  'Denver, CO',
  'Washington, DC',
  'Boston, MA',
  'El Paso, TX',
  'Nashville, TN',
  'Detroit, MI',
  'Portland, OR',
  'Las Vegas, NV',
  'Memphis, TN',
  'Louisville, KY',
  'Baltimore, MD',
  'Milwaukee, WI',
  'Albuquerque, NM',
  'Tucson, AZ',
  'Fresno, CA',
  'Sacramento, CA',
  'Kansas City, MO',
  'Mesa, AZ',
  'Atlanta, GA',
  'Omaha, NE',
  'Colorado Springs, CO',
  'Raleigh, NC',
  'Miami, FL',
  'Miami Beach, FL',
  'Long Beach, CA',
  'Virginia Beach, VA',
  'Oakland, CA',
  'Minneapolis, MN',
  'Tulsa, OK',
  'Arlington, TX',
  'Tampa, FL',
  'New Orleans, LA'
];

function getCitySuggestions(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return CITY_INDEX.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
}

function CitySearchSheet({ open, initialQuery = '', onSelect, onBack }) {
  const [query, setQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const abortRef = React.useRef(null);
  const cacheRef = React.useRef(new Map());
  const openRef = React.useRef(false);
  const requestSeqRef = React.useRef(0);
  const inputRef = React.useRef(null);

  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);

  const CACHE_MAX = 40;

  const cacheGet = React.useCallback((key) => {
    const map = cacheRef.current;
    if (!map.has(key)) return null;
    const val = map.get(key);
    map.delete(key);
    map.set(key, val);
    return val;
  }, []);

  const cacheSet = React.useCallback((key, val) => {
    const map = cacheRef.current;
    if (map.has(key)) map.delete(key);
    map.set(key, val);
    while (map.size > CACHE_MAX) {
      const oldestKey = map.keys().next().value;
      map.delete(oldestKey);
    }
  }, []);

  React.useEffect(() => {
    openRef.current = !!open;
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const prevOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = !!open;
    if (!open || wasOpen) return;

    setQuery(initialQuery || '');
    setError('');
    setResults([]);
    setIsLoading(false);
    setKeyboardHeight(0);
    setIsKeyboardOpen(false);

    const t = setTimeout(() => {
      try {
        inputRef.current?.focus?.();
      } catch (e) {}
    }, 180);

    return () => clearTimeout(t);
  }, [open, initialQuery]);

  const normalizePlaceLabel = React.useCallback((item) => {
    const address = item?.address || {};
    const name = (
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      address.neighbourhood ||
      address.locality ||
      address.municipality ||
      address.county ||
      address.state_district ||
      address.state ||
      address.region ||
      address.country ||
      item?.name ||
      ''
    ).toString();

    const admin = (address.state || address.region || address.county || '').toString();
    const country = (address.country || '').toString();

    const parts = [name, admin, country]
      .map((s) => (s || '').toString().trim())
      .filter(Boolean);

    const label = parts.join(', ');
    return label || (item?.display_name || '').toString().trim();
  }, []);

  const fetchPlaces = React.useCallback(
    async (q) => {
      const queryStr = (q || '').trim();

      if (!queryStr) {
        setResults([]);
        setIsLoading(false);
        setError('');
        return;
      }

      const cacheKey = queryStr.toLowerCase();
      const cached = cacheGet(cacheKey);
      if (cached) {
        setResults(cached);
        setIsLoading(false);
        setError('');
        return;
      }

      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      const seq = ++requestSeqRef.current;

      setIsLoading(true);
      setError('');

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&accept-language=en,es&q=${encodeURIComponent(queryStr)}`;
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });

        if (!res.ok) throw new Error('Failed to fetch locations');

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const mapped = list
          .map((item) => {
            const label = normalizePlaceLabel(item);
            const lat = typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat;
            const lng = typeof item.lon === 'string' ? parseFloat(item.lon) : item.lon;

            return {
              id: `${item.place_id}`,
              label,
              lat,
              lng
            };
          })
          .filter((x) => x.label && Number.isFinite(x.lat) && Number.isFinite(x.lng))
          .slice(0, 12);

        cacheSet(cacheKey, mapped);

        if (!openRef.current) return;
        if (seq !== requestSeqRef.current) return;

        setResults(mapped);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        console.error('CitySearchSheet fetch error:', e);

        if (!openRef.current) return;
        if (seq !== requestSeqRef.current) return;

        setError('Could not load results.');
        setResults([]);
      } finally {
        if (!openRef.current) return;
        if (seq !== requestSeqRef.current) return;
        setIsLoading(false);
      }
    },
    [normalizePlaceLabel, cacheGet, cacheSet]
  );

  React.useEffect(() => {
    if (!open) return;
    const q = (query || '').trim();

    const t = setTimeout(() => {
      fetchPlaces(q);
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, fetchPlaces]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onBack?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onBack]);

  React.useEffect(() => {
    if (!open) return;

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) {
      setKeyboardHeight(0);
      setIsKeyboardOpen(false);
      return;
    }

    let raf = 0;

    const compute = () => {
      raf = 0;
      const innerH = window.innerHeight || 0;
      const vvH = vv.height || 0;
      const delta = Math.max(0, innerH - vvH);
      const keyboardOpen = delta > 110;

      setKeyboardHeight(keyboardOpen ? delta : 0);
      setIsKeyboardOpen(keyboardOpen);
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(compute);
    };

    schedule();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const suggestions = getCitySuggestions(query);
  const showRemote = (query || '').trim().length >= 1;
  const list = showRemote ? results : suggestions.map((c) => ({ id: c, label: c }));

  const bottomDockPadding = isKeyboardOpen
    ? 'max(env(safe-area-inset-bottom), 8px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 92px)';

  const sheetBottom = isKeyboardOpen ? '8px' : '0px';

  const listMaxHeight = isKeyboardOpen ? '34vh' : '42vh';

  return html`
    <div
      className="fixed inset-0"
      role="dialog"
      aria-modal="true"
      aria-label="Choose Place"
      style=${{
        zIndex: 2147483000,
        isolation: 'isolate'
      }}
      onPointerDown=${(e) => {
        e.stopPropagation();
        onBack?.();
      }}
    >
      <div
        className="absolute inset-0"
        style=${{
          background: 'linear-gradient(180deg, rgba(2,6,14,0.82), rgba(2,6,14,0.92))',
          backdropFilter: 'blur(14px) saturate(125%)',
          WebkitBackdropFilter: 'blur(14px) saturate(125%)'
        }}
      ></div>

      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style=${{
          height: isKeyboardOpen ? '24px' : '120px',
          background: 'linear-gradient(180deg, rgba(2,6,14,0), rgba(2,6,14,0.96) 38%, rgba(2,6,14,1) 100%)'
        }}
      ></div>

      <div
        className="absolute left-0 right-0"
        style=${{
          bottom: sheetBottom,
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: bottomDockPadding,
          transform: isKeyboardOpen ? `translateY(-${Math.max(0, Math.min(keyboardHeight - 8, 22))}px)` : 'translateY(0)',
          transition: 'transform 180ms ease, padding-bottom 180ms ease, bottom 180ms ease'
        }}
        onPointerDown=${(e) => e.stopPropagation()}
        onClick=${(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[30px] border"
          style=${{
            borderColor: 'rgba(255,255,255,0.10)',
            background: 'linear-gradient(180deg, rgba(11,16,34,0.985), rgba(7,11,24,0.992))',
            boxShadow: '0 -24px 70px rgba(0,0,0,0.58), 0 0 0 1px rgba(96,165,250,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px) saturate(145%)',
            WebkitBackdropFilter: 'blur(24px) saturate(145%)'
          }}
        >
          <div
            style=${{
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '10px'
            }}
          >
            <div
              style=${{
                width: '42px',
                height: '4px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.14)'
              }}
            ></div>
          </div>

          <div className="px-4 pt-2 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  style=${{
                    fontSize: '10px',
                    fontWeight: '900',
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.38)'
                  }}
                >
                  Location
                </div>

                <div
                  style=${{
                    marginTop: '6px',
                    fontSize: '26px',
                    lineHeight: '1.05',
                    fontWeight: '900',
                    letterSpacing: '-0.03em',
                    color: 'rgba(255,255,255,0.96)'
                  }}
                >
                  Search places
                </div>

                <div
                  style=${{
                    marginTop: '6px',
                    fontSize: '13px',
                    lineHeight: '1.35',
                    color: 'rgba(255,255,255,0.46)',
                    fontWeight: '700'
                  }}
                >
                  Search a city, country, or neighborhood
                </div>
              </div>

              <button
                type="button"
                onClick=${(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack?.();
                }}
                aria-label="Close place search"
                className="tap-feedback shrink-0"
                style=${{
                  width: '42px',
                  height: '42px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  color: 'rgba(255,255,255,0.76)',
                  fontSize: '20px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }}
              >
                ×
              </button>
            </div>

            <div
              style=${{
                marginTop: '16px',
                position: 'relative'
              }}
            >
              <div
                style=${{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.34)',
                  fontSize: '16px',
                  pointerEvents: 'none'
                }}
              >
                ⌕
              </div>

              <input
                ref=${inputRef}
                value=${query}
                onInput=${(e) => setQuery(e.target.value)}
                placeholder="Search city, country, neighborhood"
                autocapitalize="words"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                inputmode="search"
                enterkeyhint="search"
                name="vibes_place_search"
                data-lpignore="true"
                data-form-type="other"
                className="w-full"
                style=${{
                  height: '54px',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.09)',
                  paddingLeft: '40px',
                  paddingRight: '44px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: '15px',
                  fontWeight: '800',
                  letterSpacing: '-0.01em',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                }}
              />

              ${query
                ? html`
                    <button
                      type="button"
                      onClick=${(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setQuery('');
                        setResults([]);
                        setError('');
                        try {
                          inputRef.current?.focus?.();
                        } catch (err) {}
                      }}
                      className="tap-feedback"
                      aria-label="Clear search"
                      style=${{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  `
                : null}
            </div>

            <div
              style=${{
                marginTop: '14px',
                maxHeight: listMaxHeight,
                overflowY: 'auto',
                paddingRight: '2px',
                paddingBottom: '2px'
              }}
            >
              ${error
                ? html`
                    <div
                      style=${{
                        padding: '14px 6px',
                        fontSize: '13px',
                        fontWeight: '800',
                        color: 'rgba(254,202,202,0.78)'
                      }}
                    >
                      ${error}
                    </div>
                  `
                : null}

              ${isLoading
                ? html`
                    <div
                      style=${{
                        padding: '14px 6px',
                        fontSize: '13px',
                        fontWeight: '800',
                        color: 'rgba(255,255,255,0.40)'
                      }}
                    >
                      Searching...
                    </div>
                  `
                : null}

              ${list.length
                ? html`
                    <div className="flex flex-col gap-2">
                      ${list.map(
                        (item) => html`
                          <button
                            key=${item.id}
                            type="button"
                            onClick=${(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelect?.(item);
                            }}
                            className="tap-feedback w-full text-left"
                            style=${{
                              minHeight: '56px',
                              borderRadius: '18px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
                              padding: '0 14px',
                              color: 'rgba(255,255,255,0.90)',
                              fontSize: '14px',
                              fontWeight: '800',
                              letterSpacing: '-0.01em',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
                            }}
                          >
                            <div
                              style=${{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                              }}
                            >
                              <div
                                style=${{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '999px',
                                  background: 'radial-gradient(circle, rgba(96,165,250,0.22), rgba(96,165,250,0.06))',
                                  border: '1px solid rgba(96,165,250,0.14)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'rgba(191,219,254,0.88)',
                                  fontSize: '14px',
                                  flexShrink: 0
                                }}
                              >
                                ⌖
                              </div>

                              <div
                                style=${{
                                  minWidth: 0,
                                  flex: 1
                                }}
                              >
                                <div
                                  style=${{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  ${item.label}
                                </div>
                              </div>
                            </div>
                          </button>
                        `
                      )}
                    </div>
                  `
                : (!isLoading && (query || '').trim()
                    ? html`
                        <div
                          style=${{
                            padding: '16px 6px',
                            fontSize: '13px',
                            fontWeight: '800',
                            color: 'rgba(255,255,255,0.36)'
                          }}
                        >
                          No matches
                        </div>
                      `
                    : html`
                        <div
                          style=${{
                            padding: '16px 6px',
                            fontSize: '13px',
                            fontWeight: '800',
                            color: 'rgba(255,255,255,0.36)'
                          }}
                        >
                          Start typing to search
                        </div>
                      `)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default function MapFiltersSheet() {
  return null;
}

export { CHIP_BASE, PILL_BASE, PILL_ON, PILL_OFF, CHIP_ON, CHIP_OFF, ChipGroup, CITY_INDEX, getCitySuggestions, CitySearchSheet };
