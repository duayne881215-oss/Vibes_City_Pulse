/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const PREMIUM_GLASS_BUTTON = 'rgba(255,255,255,0.014)';
const PREMIUM_GLASS_BORDER = '1px solid rgba(255,255,255,0.07)';
const PREMIUM_GLASS_BUTTON_SHADOW = '0 0 0 1px rgba(255,255,255,0.01) inset, 0 6px 14px rgba(0,0,0,0.035)';
const PREMIUM_GLASS_BLUR = 'blur(10px) saturate(135%)';

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
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const readString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const readBool = (...values) => {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on', 'online', 'visible'].includes(v)) return true;
      if (['false', '0', 'no', 'off', 'offline', 'hidden'].includes(v)) return false;
    }
  }
  return null;
};

const normalizeSocialValue = (raw) => {
  return String(raw || '').trim();
};

const normalizeSocialUrl = (platform, raw) => {
  const value = normalizeSocialValue(raw);
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) return value;

  const username = value.replace(/^@+/, '').trim();
  if (!username) return '';

  if (platform === 'instagram') return `https://www.instagram.com/${encodeURIComponent(username)}/`;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  return '';
};

export default function ProfileView({
  profileData,
  currentUserLocation,
  isOwnProfile,
  stories = [],
  connectionStatus,
  onOpenEditProfile,
  onOpenSettings,
  onOpenActivity,
  onSendMessage,
  onViewStory,
  onBlockUser,
  onReportUser,
  viewerCount = 0,
  onRequestLogout
}) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [activePhoto, setActivePhoto] = React.useState(null);

  const displayName = readString(
    profileData?.displayName,
    profileData?.display_name,
    profileData?.name
  ) || 'Vibe';

  const avatarUrl = readString(
    profileData?.avatarUrl,
    profileData?.avatar_url
  );

  const city = readString(profileData?.city) || 'Nearby';
  const bio = readString(profileData?.bio);
  const birthday = readString(profileData?.birthday, profileData?.birth_date);

  const instagramValue = readString(
    profileData?.instagram,
    profileData?.instagram_username,
    profileData?.instagram_url
  );

  const tiktokValue = readString(
    profileData?.tiktok,
    profileData?.tiktok_username,
    profileData?.tiktok_url
  );

  const isVisibleResolved = (() => {
    const value = readBool(
      profileData?.isVisible,
      profileData?.is_visible,
      profileData?.profileVisibility,
      profileData?.profile_visibility,
      profileData?.visible,
      profileData?.showOnMap,
      profileData?.show_on_map
    );
    return value === null ? true : value;
  })();

  const isOnlineResolved = (() => {
    const value = readBool(
      profileData?.isOnline,
      profileData?.is_online
    );
    return value === null ? false : value;
  })();

  const lastSeenResolved = readString(
    profileData?.lastSeen,
    profileData?.last_seen,
    profileData?.lastSeenAt,
    profileData?.last_seen_at
  );

  const currentLookingFor = (() => {
    const raw = profileData?.lookingFor ?? profileData?.looking_for ?? '';
    if (Array.isArray(raw)) return raw[0] || 'Vibes';
    return raw || 'Vibes';
  })();

  const calculateAge = (value) => {
    if (!value) return '';
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age > 0 ? age : '';
  };

  const getStatusText = () => {
    if (!isVisibleResolved) return 'HIDDEN';
    if (isOnlineResolved) return 'ONLINE';

    const lastSeen = lastSeenResolved ? new Date(lastSeenResolved) : null;
    if (!lastSeen || Number.isNaN(lastSeen.getTime())) return 'AWAY';

    const diffMins = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
    if (diffMins < 5) return 'ACTIVE';
    if (diffMins < 60) return 'RECENT';
    return 'AWAY';
  };

  const getDistanceStr = () => {
    if (isOwnProfile) return null;
    if (!currentUserLocation?.lat || !currentUserLocation?.lng) return null;

    const targetLat = Number(profileData?.lat ?? profileData?.latitude);
    const targetLng = Number(profileData?.lng ?? profileData?.longitude);

    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return null;

    const isUS = navigator.language === 'en-US';
    const unit = isUS ? 'mi' : 'km';
    const dist = getDistance(
      Number(currentUserLocation.lat),
      Number(currentUserLocation.lng),
      targetLat,
      targetLng,
      unit
    );

    return `${dist.toFixed(1)} ${unit} away`;
  };

  const distanceStr = getDistanceStr();
  const age = calculateAge(birthday);
  const statusText = getStatusText();
  const hasInstagram = !!normalizeSocialUrl('instagram', instagramValue);
  const hasTiktok = !!normalizeSocialUrl('tiktok', tiktokValue);
  const hasSocial = hasInstagram || hasTiktok;
  const hasStories = Array.isArray(stories) && stories.length > 0;

  const openSocial = (platform) => {
    const raw = platform === 'instagram' ? instagramValue : tiktokValue;
    const url = normalizeSocialUrl(platform, raw);
    if (!url) return;

    try {
      window.location.assign(url);
      return;
    } catch (e) {}

    try {
      window.location.href = url;
      return;
    } catch (e) {}

    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_self';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {}
  };

  const handleSendRequest = () => {
    onSendMessage?.(profileData);

    if (!connectionStatus) {
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  };

  const renderActionButton = () => {
    const baseClasses = 'h-14 w-full rounded-[1.6rem] text-[12px] font-black tracking-[0.22em] uppercase transition-all tap-feedback flex items-center justify-center gap-2.5';

    if (isOwnProfile) {
      return html`
        <button
          type="button"
          onClick=${onOpenEditProfile}
          className="${baseClasses}"
          style=${{
            background: PREMIUM_GLASS_BUTTON,
            border: PREMIUM_GLASS_BORDER,
            color: 'rgba(255,255,255,0.97)',
            boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
            backdropFilter: PREMIUM_GLASS_BLUR,
            WebkitBackdropFilter: PREMIUM_GLASS_BLUR
          }}
        >
          <span>Edit Profile</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
        </button>
      `;
    }

    if (connectionStatus === 'connected') {
      return html`
        <button
          type="button"
          onClick=${() => onSendMessage?.(profileData)}
          className="${baseClasses}"
          style=${{
            background: 'linear-gradient(180deg, rgba(59,130,246,0.95) 0%, rgba(37,99,235,0.95) 100%)',
            border: '1px solid rgba(96,165,250,0.22)',
            color: 'white',
            boxShadow: '0 14px 34px rgba(37,99,235,0.24), inset 0 1px 0 rgba(255,255,255,0.18)'
          }}
        >
          <span>Send Message</span>
        </button>
      `;
    }

    if (connectionStatus === 'pending_sent') {
      return html`
        <div className="relative w-full">
          ${showFeedback ? html`
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] whitespace-nowrap animate-fade-in-out">
              Request sent
            </div>
          ` : null}

          <button
            type="button"
            disabled
            className="${baseClasses} bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
          >
            <span>Request Sent ✓</span>
          </button>
        </div>
      `;
    }

    if (connectionStatus === 'pending_received') {
      return html`
        <button
          type="button"
          onClick=${() => onSendMessage?.(profileData)}
          className="${baseClasses}"
          style=${{
            background: 'linear-gradient(180deg, rgba(16,185,129,0.96) 0%, rgba(5,150,105,0.96) 100%)',
            border: '1px solid rgba(110,231,183,0.22)',
            color: 'white',
            boxShadow: '0 14px 34px rgba(5,150,105,0.22), inset 0 1px 0 rgba(255,255,255,0.16)'
          }}
        >
          <span>Accept Request</span>
        </button>
      `;
    }

    return html`
      <button
        type="button"
        onClick=${handleSendRequest}
        className="${baseClasses}"
        style=${{
          background: 'linear-gradient(180deg, rgba(59,130,246,0.95) 0%, rgba(37,99,235,0.95) 100%)',
          border: '1px solid rgba(96,165,250,0.22)',
          color: 'white',
          boxShadow: '0 14px 34px rgba(37,99,235,0.24), inset 0 1px 0 rgba(255,255,255,0.18)'
        }}
      >
        <span>Send Request +</span>
      </button>
    `;
  };

  const openStoryFromAvatar = React.useCallback((e) => {
    if (!hasStories) return;
    e?.stopPropagation?.();
    onViewStory?.(stories[0], stories);
  }, [hasStories, onViewStory, stories]);

  return html`
    <div className="flex flex-col gap-6 animate-fade-in relative">
      <div className="vibes-profile-card rounded-[2.15rem] border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.24)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none"></div>

        <div className="absolute top-7 right-7 z-10">
          ${isOwnProfile ? html`
            <button
              type="button"
              onClick=${onOpenSettings}
              className="relative z-50 h-7 px-[10px] rounded-full bg-white/5 border border-white/10 text-white/52 hover:text-white/78 hover:bg-white/8 transition-all tap-feedback inline-flex items-center justify-center"
              style=${{
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
                background: PREMIUM_GLASS_BUTTON,
                border: PREMIUM_GLASS_BORDER,
                boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
                backdropFilter: PREMIUM_GLASS_BLUR,
                WebkitBackdropFilter: PREMIUM_GLASS_BLUR
              }}
              aria-label="Settings"
            >
              Settings
            </button>
          ` : html`
            ${isMenuOpen ? html`
              <div
                className="fixed inset-0 z-40"
                onClick=${() => setIsMenuOpen(false)}
              ></div>
            ` : null}

            <button
              onClick=${(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="relative z-50 p-2.5 rounded-full bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all tap-feedback"
              aria-label="Profile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>

            ${isMenuOpen ? html`
              <div className="absolute top-12 right-0 w-40 rounded-2xl border border-white/10 bg-[#161b2c] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                <button
                  onClick=${() => {
                    onReportUser?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Report
                </button>

                <div className="h-[1px] bg-white/5 mx-2"></div>

                <button
                  onClick=${() => {
                    onBlockUser?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-rose-500 hover:bg-rose-500/5 active:bg-rose-500/10 transition-colors flex items-center gap-3"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Block
                </button>
              </div>
            ` : null}
          `}
        </div>

        <div className="vibes-profile-header flex flex-col items-center text-center mb-8 relative z-1">
          <div className="vibes-profile-avatar-wrap relative mb-4">
            <div className="vibes-profile-aura" aria-hidden="true"></div>

            <button
              type="button"
              onClick=${openStoryFromAvatar}
              className=${`h-[7.5rem] w-[7.5rem] rounded-full border-2 border-white/10 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-4xl font-bold text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden relative vibes-profile-avatar-btn ${statusText === 'ONLINE' ? 'is-online' : ''} ${hasStories ? 'cursor-pointer tap-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0' : ''}`}
              aria-label=${hasStories ? 'View story' : 'Profile photo'}
              disabled=${!hasStories}
            >
              ${avatarUrl
                ? html`<img src=${avatarUrl} className="w-full h-full object-cover" />`
                : (displayName || 'V').charAt(0)
              }
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full"></div>
            </button>

            ${hasStories ? html`
              <div className="absolute -inset-2 rounded-full border-2 border-blue-500/40 animate-pulse pointer-events-none"></div>
              <div className="absolute -inset-2 rounded-full border border-blue-400/25 animate-story-ring pointer-events-none"></div>
            ` : null}

            ${isOwnProfile && hasStories && viewerCount > 0 ? html`
              <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-[12px] font-black px-2 py-0.5 rounded-full border-2 border-[#0a0f1e] z-20 shadow-lg min-w-[24px] flex items-center justify-center animate-in zoom-in duration-300">
                ${viewerCount}
              </div>
            ` : null}
          </div>

          <div className="w-full px-4">
            <h1
              className="text-3xl font-bold text-white tracking-tight text-center"
              style=${{
                textShadow: '0 4px 30px rgba(96,165,250,0.25)'
              }}
            >
              ${displayName}
            </h1>

            <div className="vibes-profile-meta flex items-center justify-center gap-2.5 text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mt-2 mb-2 min-h-[28px] flex-wrap">
              <span className="text-white/50">${city}</span>

              ${distanceStr ? html`
                <span className="h-1 w-1 rounded-full bg-white/10"></span>
                <span className="text-blue-400/90">${distanceStr}</span>
              ` : null}
            </div>
          </div>
        </div>

        ${(hasStories || isOwnProfile) ? html`
          <div className="vibes-profile-stories mb-10">
            <div
              className="text-[12px] tracking-[0.32em] text-white/42 uppercase font-black mb-5 text-center"
              style=${{
                textShadow: 'none'
              }}
            >
              Recent Stories
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center sm:justify-start">
              ${hasStories
                ? stories.map((story) => html`
                    <button
                      key=${story.id}
                      onClick=${() => onViewStory?.(story, stories)}
                      className="vibes-profile-story-thumb h-20 w-20 rounded-[1.5rem] border border-white/10 bg-white/5 overflow-hidden shrink-0 tap-feedback transition-all hover:border-white/20 relative group"
                    >
                      ${story.isVideo
                        ? html`<video src=${story.imageUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" muted playsInline />`
                        : html`<img src=${story.imageUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />`
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </button>
                  `)
                : html`
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white/40 text-[12px] font-semibold shrink-0"
                      style=${{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
                      }}
                    >
                      No story
                    </div>
                  `
              }
            </div>
          </div>
        ` : null}

        <div className="vibes-profile-info-grid grid grid-cols-3 gap-3 mb-10">
          <div className="vibes-profile-info-card flex flex-col items-center justify-center h-[4.75rem] rounded-3xl border border-white/[0.06] bg-white/[0.02] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-all hover:bg-white/[0.04] hover:border-white/12">
            <span className="vibes-profile-info-label text-[9px] font-black tracking-[0.25em] text-white/20 mb-1 uppercase">AGE</span>
            <span className=${`text-[22px] font-medium tracking-tight leading-none ${String(age).trim() ? 'text-white/85' : 'text-white/85 opacity-40'}`}>
              ${String(age).trim() ? age : '--'}
            </span>
            <span className="vibes-profile-info-sub text-[10px] font-semibold tracking-[0.08em] text-white/35 mt-0.5">
              ${String(age).trim() ? 'years' : ''}
            </span>
          </div>

          <div className="vibes-profile-info-card flex flex-col items-center justify-center h-[4.75rem] rounded-3xl border border-white/[0.06] bg-white/[0.02] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-all hover:bg-white/[0.04] hover:border-white/12 overflow-hidden">
            <span className="vibes-profile-info-label text-[9px] font-black tracking-[0.25em] text-white/20 mb-1 uppercase">VIBE</span>
            <span className="text-[12px] font-medium text-white/85 w-full text-center px-2 tracking-[0.08em] uppercase leading-none whitespace-nowrap overflow-hidden text-ellipsis">
              ${currentLookingFor || 'Vibes'}
            </span>
            <span className="vibes-profile-info-sub text-[10px] font-semibold tracking-[0.08em] text-white/35 mt-1">mode</span>
          </div>

          <div className="vibes-profile-info-card flex flex-col items-center justify-center h-[4.75rem] rounded-3xl border border-white/[0.06] bg-white/[0.02] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-all hover:bg-white/[0.04] hover:border-white/12">
            <span className="vibes-profile-info-label text-[9px] font-black tracking-[0.25em] text-white/20 mb-1 uppercase">STATUS</span>
            <div className="flex items-center justify-center gap-2">
              <div className=${`vibes-profile-status-dot ${statusText === 'ONLINE' ? 'is-online' : 'is-offline'}`}></div>
              <span className="text-[11px] font-semibold tracking-[0.12em] text-white/80 truncate">
                ${statusText}
              </span>
            </div>
            <span className="vibes-profile-info-sub text-[10px] font-semibold tracking-[0.08em] text-white/35 mt-0.5">presence</span>
          </div>
        </div>

        <div className="vibes-profile-bio mb-10 px-3 pt-0 pb-0">
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap tracking-[0.01em] italic text-center"
            style=${{
              color: 'rgba(255,255,255,0.50)'
            }}
          >
            ${bio ? `"${bio}"` : 'No bio yet.'}
          </p>
        </div>

        ${Array.isArray(profileData?.photos) && profileData.photos.length > 0 ? html`
          <div className="mt-6 mb-6">
            <div className="text-[12px] tracking-[0.32em] text-white/42 uppercase font-black mb-4 text-center">
              Photos
            </div>

            <div className="grid grid-cols-3 gap-2">
              ${profileData.photos.slice(0, 6).map((photo) => html`
                <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src=${photo}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick=${() => setActivePhoto(photo)}
                  />
                </div>
              `)}
            </div>
          </div>
        ` : null}

        ${hasSocial ? html`
          <div className="vibes-profile-social mt-4 mb-8">
            <div className="text-[12px] tracking-[0.32em] text-white/42 uppercase font-black mb-4 text-center">
              Social
            </div>

            <div className="flex flex-col gap-4">
              ${hasInstagram ? html`
                <button
                  type="button"
                  onClick=${() => openSocial('instagram')}
                  className="w-full px-5 py-4 rounded-[2rem] flex items-center justify-between transition-colors tap-feedback"
                  style=${{
                    border: PREMIUM_GLASS_BORDER,
                    background: PREMIUM_GLASS_BUTTON,
                    boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
                    backdropFilter: PREMIUM_GLASS_BLUR,
                    WebkitBackdropFilter: PREMIUM_GLASS_BLUR
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0 mx-auto">
                    <div className="h-12 w-12 rounded-[1.2rem] border border-white/10 bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                      <svg className="vibes-social-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="6" y="6" width="12" height="12" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="16.2" cy="7.8" r="0.85" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="text-[16px] font-extrabold text-white/92 leading-none">Instagram</div>
                      <div className="text-[12px] text-white/48 truncate mt-1">${instagramValue}</div>
                    </div>
                  </div>

                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/22 shrink-0">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              ` : null}

              ${hasTiktok ? html`
                <button
                  type="button"
                  onClick=${() => openSocial('tiktok')}
                  className="w-full px-5 py-4 rounded-[2rem] flex items-center justify-between transition-colors tap-feedback"
                  style=${{
                    border: PREMIUM_GLASS_BORDER,
                    background: PREMIUM_GLASS_BUTTON,
                    boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
                    backdropFilter: PREMIUM_GLASS_BLUR,
                    WebkitBackdropFilter: PREMIUM_GLASS_BLUR
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0 mx-auto">
                    <div className="h-12 w-12 rounded-[1.2rem] border border-white/10 bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                      <svg className="vibes-social-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 4v9.2a4.2 4.2 0 1 1-2.8-4V7.1c1.2 1.3 2.7 2 4.6 2.1V7.4c-1.2-.2-2.3-.9-3.1-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="text-[16px] font-extrabold text-white/92 leading-none">TikTok</div>
                      <div className="text-[12px] text-white/48 truncate mt-1">${tiktokValue}</div>
                    </div>
                  </div>

                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/22 shrink-0">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              ` : null}
            </div>
          </div>
        ` : null}

        <div className="mt-2">
          ${renderActionButton()}
        </div>
      </div>

      ${activePhoto ? html`
        <div
          className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center"
          onClick=${() => setActivePhoto(null)}
        >
          <img
            src=${activePhoto}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ` : null}
    </div>
  `;
}
