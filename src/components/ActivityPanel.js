/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

export const FILTERS = ['views', 'matches'];

export default function ActivityPanel({ supabase, currentUser, onOpenVibe, lastActivityViewedAt = 0 }) {
  const [activities, setActivities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState(null);

  const isMountedRef = React.useRef(true);
  const fetchInFlightRef = React.useRef(false);
  const realtimeRefreshTimeoutRef = React.useRef(null);
  const lastActivitiesSigRef = React.useRef('');
  const fetchActivitiesRef = React.useRef(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchActivities = React.useCallback(
    async (isSilent = false) => {
      if (!supabase || !currentUser?.id) {
        if (isMountedRef.current) {
          setActivities([]);
          setLoading(false);
        }
        return;
      }

      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;

      if (!isSilent && isMountedRef.current) setLoading(true);

      try {
        const userId = currentUser.id;

        const [viewsRes, connectionsRes] = await Promise.all([
          supabase
            .from('story_views')
            .select(
              `
                created_at,
                viewer_id,
                story_id,
                profiles:viewer_id (id, display_name, avatar_url),
                stories!inner(user_id)
              `
            )
            .eq('stories.user_id', userId)
            .order('created_at', { ascending: false })
            .limit(40),

          supabase
            .from('conversations')
            .select(
              `
                created_at,
                user_a,
                user_b
              `
            )
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(40)
        ]);

        const { data: views, error: viewsError } = viewsRes;
        const { data: connections, error: connectionsError } = connectionsRes;

        const allActivities = [];

        if (viewsError) {
          console.error('Error fetching story views:', viewsError);
        } else if (Array.isArray(views)) {
          for (const v of views) {
            const timestamp = new Date(v.created_at).getTime();
            if (!Number.isFinite(timestamp)) continue;

            allActivities.push({
              id: `view-${v.viewer_id}-${v.story_id}-${v.created_at}`,
              type: 'view',
              timestamp,
              user: {
                id: v.profiles?.id || v.viewer_id,
                displayName: v.profiles?.display_name || 'Someone',
                avatarUrl: v.profiles?.avatar_url || '',
                city: '',
                bio: '',
                birthday: '',
                lookingFor: [],
                energy: 'Vibes',
                isOnline: false,
                lastSeen: ''
              },
              text: 'viewed your story'
            });
          }
        }

        null;

        if (connectionsError) {
          console.error('Error fetching conversations:', connectionsError);
        } else if (Array.isArray(connections) && connections.length > 0) {
          const otherUserIds = [
            ...new Set(
              connections
                .map((c) => (c.user_a === userId ? c.user_b : c.user_a))
                .filter(Boolean)
            )
          ];

          let profileMap = {};

          if (otherUserIds.length > 0) {
            const { data: otherProfiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', otherUserIds);

            if (profilesError) {
              console.error('Error fetching connection profiles:', profilesError);
            } else if (Array.isArray(otherProfiles)) {
              profileMap = Object.fromEntries(otherProfiles.map((p) => [p.id, p]));
            }
          }

          for (const c of connections) {
            const timestamp = new Date(c.created_at).getTime();
            if (!Number.isFinite(timestamp)) continue;

            const otherUserId = c.user_a === userId ? c.user_b : c.user_a;
            const otherUser = profileMap[otherUserId];
            if (!otherUser) continue;

            allActivities.push({
              id: `connection-${c.user_a}-${c.user_b}-${c.created_at}`,
              type: 'connection',
              timestamp,
              user: {
                id: otherUser.id,
                displayName: otherUser.display_name || 'Someone',
                avatarUrl: otherUser.avatar_url || '',
                city: '',
                bio: '',
                birthday: '',
                lookingFor: [],
                energy: 'Vibes',
                isOnline: false,
                lastSeen: ''
              },
              text: 'matched with you'
            });
          }
        }

        allActivities.sort((a, b) => b.timestamp - a.timestamp);

        const seenIds = new Set();
        const uniqueActivities = [];
        for (const a of allActivities) {
          if (!a?.id || seenIds.has(a.id)) continue;
          seenIds.add(a.id);
          uniqueActivities.push(a);
          if (uniqueActivities.length >= 50) break;
        }

        const sig = uniqueActivities.map((a) => `${a.id}:${a.timestamp}`).join('|');
        if (sig !== lastActivitiesSigRef.current) {
          lastActivitiesSigRef.current = sig;
          if (isMountedRef.current) setActivities(uniqueActivities);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        fetchInFlightRef.current = false;
        if (isMountedRef.current) setLoading(false);
      }
    },
    [supabase, currentUser?.id]
  );

  React.useEffect(() => {
    fetchActivitiesRef.current = fetchActivities;
  }, [fetchActivities]);

  React.useEffect(() => {
    fetchActivities(false);
  }, [fetchActivities]);

  React.useEffect(() => {
    if (!supabase || !currentUser?.id) return;

    const userId = currentUser.id;

    const scheduleSilentRefresh = () => {
      if (realtimeRefreshTimeoutRef.current) return;
      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        fetchActivitiesRef.current?.(true);
      }, 600);
    };

    let isActive = true;

    const attachStoryViewsListener = async (channel) => {
      try {
        const { data: myStories, error } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!isActive) return;
        if (error) throw error;

        const ids = Array.isArray(myStories) ? myStories.map((s) => s?.id).filter(Boolean) : [];
        if (ids.length === 0) return;

        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'story_views', filter: `story_id=in.(${ids.join(',')})` },
          () => {
            if (!isActive) return;
            scheduleSilentRefresh();
          }
        );
      } catch (e) {
        console.warn('ActivityPanel: story_views realtime listener disabled:', e?.message || e);
      }
    };

    const channel = supabase.channel(`activity:${userId}`);

    null;

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversations' },
      (payload) => {
        if (!isActive) return;
        const row = payload?.new;
        if (row?.user_a !== userId && row?.user_b !== userId) return;
        scheduleSilentRefresh();
      }
    );

    (async () => {
      await attachStoryViewsListener(channel);
      if (!isActive) return;
      channel.subscribe();
    })();

    return () => {
      isActive = false;
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [supabase, currentUser?.id]);

  const filteredActivities = React.useMemo(() => {
    if (!filter) return activities;
    if (filter === 'views') return activities.filter((a) => a.type === 'view');
    if (filter === 'matches') return activities.filter((a) => a.type === 'connection');
    return activities;
  }, [activities, filter]);

  const formatTime = React.useCallback((ts) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const getInitials = React.useCallback((name) => {
    const s = (name || '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
  }, []);

  const renderAvatar = React.useCallback(
    (user) => {
      const url = user?.avatarUrl;
      const label = user?.displayName || 'Someone';

      if (url) {
        return html`<img
          className="w-12 h-12 rounded-full object-cover block"
          src=${url}
          alt=${label}
          onError=${(e) => {
            e.target.style.display = 'none';
            const fallback = e.target.nextElementSibling;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          className="w-12 h-12 rounded-full items-center justify-center bg-white/10 text-white font-extrabold text-sm"
          style=${{ display: 'none' }}
        >
          ${getInitials(label)}
        </div>`;
      }

      return html`<div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white font-extrabold text-sm">${getInitials(label)}</div>`;
    },
    [getInitials]
  );

  const buildProfilePayload = React.useCallback((activity) => {
    const user = activity?.user || {};
    return {
      id: user.id || '',
      displayName: user.displayName || 'Someone',
      avatarUrl: user.avatarUrl || '',
      city: user.city || '',
      bio: user.bio || '',
      birthday: user.birthday || '',
      lookingFor: Array.isArray(user.lookingFor) ? user.lookingFor : [],
      energy: user.energy || 'Vibes',
      isOnline: typeof user.isOnline === 'boolean' ? user.isOnline : false,
      lastSeen: user.lastSeen || ''
    };
  }, []);

  const filterLabel = React.useCallback((f) => {
    if (f === 'views') return 'Views';
    if (f === 'matches') return 'Matches';
    return f;
  }, []);

  return html`
    <div
      className="flex flex-col min-h-[360px] text-white bg-transparent"
      style=${{
        background: 'transparent'
      }}
    >
      <div className="px-4 pt-2 pb-2 bg-transparent">
        <div className="flex items-start justify-end gap-3">
          <button
            className="h-9 w-9 rounded-full text-white/90 inline-flex items-center justify-center shrink-0"
            style=${{
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, rgba(10,14,28,0.78), rgba(7,10,22,0.92))',
              boxShadow: '0 8px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.025)',
              marginTop: '8px',
              marginRight: '2px'
            }}
            onClick=${() => {
              setFilter(null);
              fetchActivities(false);
            }}
            disabled=${loading}
            title="Refresh"
            aria-label="Refresh"
          >
            ${loading
              ? html`<span className="text-[11px] font-bold text-white/55">...</span>`
              : html`<svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10"></path>
                  <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14"></path>
                </svg>`}
          </button>
        </div>

        <div
          className="flex items-center justify-start gap-3 px-5 py-2 mt-1 overflow-x-auto"
          style=${{
            flexWrap: 'nowrap',
            scrollbarWidth: 'none'
          }}
        >
          ${FILTERS.map(
            (f) => html`<button
              className=${filter === f
                ? 'h-9 min-w-[92px] px-3 rounded-[17px] text-white text-[12px] font-extrabold inline-flex items-center justify-center shrink-0'
                : 'h-9 min-w-[92px] px-3 rounded-[17px] text-white/72 text-[12px] font-extrabold inline-flex items-center justify-center shrink-0'}
              style=${filter === f
                ? {
                    border: '1px solid rgba(244,114,182,0.35)',
                    background: 'linear-gradient(180deg, rgba(20,18,34,0.94), rgba(8,10,22,1))',
                    boxShadow:
                      '0 0 0 1px rgba(244,114,182,0.10), 0 0 18px rgba(244,114,182,0.10), inset 0 1px 0 rgba(255,255,255,0.05)'
                  }
                : {
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.004))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
                  }}
              onClick=${() => setFilter((prev) => (prev === f ? null : f))}
            >
              ${filterLabel(f)}
            </button>`
          )}
        </div>
      </div>

      <div
        className="overflow-auto px-4 pt-1 pb-2"
        style=${{
          scrollbarWidth: 'thin',
          background: 'transparent',
          boxShadow: 'none',
          border: 'none'
        }}
      >
        ${loading
          ? html`<div className="py-8 text-center text-white/65 text-[15px]">Loading activity...</div>`
          : filteredActivities.length === 0
            ? html`<div className="pt-2 pb-4 text-center">
                <div className="text-white/60 text-[16px] font-medium tracking-tight">Nothing here yet</div>
                <div className="mt-1.5 text-white/30 text-[12px] font-medium">When people engage with you, it shows up here</div>
              </div>`
            : html`<div className="flex flex-col gap-3">
                ${filteredActivities.map((a) => {
                  const isUnreadItem = (a?.timestamp || 0) > (Number(lastActivityViewedAt) || 0);

                  return html`<button
                    key=${a.id}
                    className="w-full grid grid-cols-[48px_minmax(0,1fr)_auto] gap-3 items-center p-3 rounded-[20px] text-left tap-feedback"
                    style=${isUnreadItem
                      ? {
                          border: '1px solid rgba(244,114,182,0.12)',
                          background: 'linear-gradient(180deg, rgba(18,20,36,0.96), rgba(8,10,22,0.98))',
                          boxShadow:
                            '0 14px 30px rgba(0,0,0,0.20), 0 0 10px rgba(244,114,182,0.06), inset 0 1px 0 rgba(255,255,255,0.025)'
                        }
                      : {
                          border: '1px solid rgba(255,255,255,0.05)',
                          background: 'linear-gradient(180deg, rgba(12,16,30,0.94), rgba(7,10,22,0.98))',
                          boxShadow:
                            '0 12px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.02)'
                        }}
                    onClick=${() => {
                      if (typeof onOpenVibe !== 'function') return;
                      const profile = buildProfilePayload(a);
                      if (!profile.id) return;
                      onOpenVibe(profile);
                    }}
                  >
                    <div>${renderAvatar(a.user)}</div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 leading-[1.35]">
                        <span className="font-extrabold text-white">${a.user?.displayName || 'Someone'}</span>
                        <span className="text-white/75">${a.text}</span>
                      </div>
                    </div>

                    <div className="self-start text-[11px] text-white/42 whitespace-nowrap">${formatTime(a.timestamp)}</div>
                  </button>`;
                })}
              </div>`}
      </div>
    </div>
  `;
}
