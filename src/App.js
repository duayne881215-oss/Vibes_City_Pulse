/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { supabase } from './lib/supabase.js';
import {
  readLocalMessagesState,
  appendLocalMessage,
  upsertLocalConversation,
  markConversationReadLocal
} from './lib/messagesLocalStore.js';
import { html } from './jsx.js';
import ProfileView from './views/ProfileView.js';
import EditProfileView from './views/EditProfileView.js';
import SettingsView from './views/SettingsView.js';
import MoodView from './views/MoodView.js';
import MessagesView from './views/MessagesView.js';
import MapView from './views/MapView.js';
import StoryCreator from './components/StoryCreator.js';
import StoryViewer from './components/StoryViewer.js';
import Onboarding from './components/Onboarding.js';
import IdentityStep from './components/IdentityStep.js';
import Panel from './components/Panel.js';
import ActivityPanel from './components/ActivityPanel.js';
import OrientationLock from './components/OrientationLock.js';
import { MapStateProvider } from './state/mapState.js';
import { SavedPlacesProvider } from './state/savedPlaces.js';
import useAppResume from './hooks/useAppResume.js';

const getUserId = () => {
  let id = localStorage.getItem('vibes_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('vibes_user_id', id);
  }
  return id;
};

// Reliable media detection for stories (Supabase may return inconsistent media_type/type)
// NOTE: Keep this simple and browser-safe (no regex /x flag).
const isVideoMedia = (source, mediaType) => {
  const mt = (mediaType ?? '').toString().toLowerCase();
  if (mt && mt.includes('video')) return true;

  const src = (source ?? '').toString().trim().toLowerCase();
  if (!src) return false;

  // Strip query/hash so "file.mp4?x=y" still matches
  const clean = src.split('#')[0].split('?')[0];
  return /\.(mp4|mov|m4v|webm|ogg)$/.test(clean);
};

function Header({
  selectedMood,
  activePanel,
  openProfile,
  openActivity,
  openPanel,
  profileData,
  stories,
  onViewStory,
  onOpenAddStory,
  viewerCount,
  activityUnreadCount
}) {
  const userStory = stories.find(s => s.userId === profileData.id);

  const profilePhotoUrl = (typeof profileData?.avatarUrl === 'string' ? profileData.avatarUrl.trim() : '');
  const fallbackAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

  return html`
    <header className="px-4 pt-1.5 pb-1.5 border-b border-white/10 bg-black/82 backdrop-blur-sm z-50 safe-area-top safe-area-left safe-area-right">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 shrink-0">
          <div
            className="text-[17px] tracking-[0.26em] uppercase font-black bg-clip-text text-transparent leading-none"
            style=${{
              backgroundImage: 'linear-gradient(90deg, rgba(110,231,183,0.98), rgba(16,185,129,0.96), rgba(5,150,105,0.92))',
              textShadow: '0 0 10px rgba(16,185,129,0.16), 0 0 22px rgba(5,150,105,0.10)'
            }}
          >
            VIBES
          </div>

          <div className="text-[26px] leading-none font-black mt-[2px] tracking-tight whitespace-nowrap">
            <span className="text-white">City </span>
            <span
              className="bg-clip-text text-transparent"
              style=${{
                backgroundImage: 'linear-gradient(90deg, rgba(251,113,133,0.92), rgba(190,24,93,0.94), rgba(127,29,29,0.96))',
                textShadow: '0 0 8px rgba(190,24,93,0.10), 0 0 14px rgba(127,29,29,0.06)'
              }}
            >
              Pulse
            </span>
          </div>

          <div
            className="mt-[4px]"
            style=${{
              paddingLeft: '3.95rem',
              transform: 'translateX(-2.55rem)'
            }}
          >
            <button
              type="button"
              onClick=${() => {
                try {
                  window.dispatchEvent(new CustomEvent('vibes:open-visibility-sheet'));
                } catch (e) {}
              }}
              aria-label="Open live status"
              className="inline-flex items-center gap-[6px] h-[22px] px-[10px] rounded-full active:scale-[0.98] transition-transform"
              style=${{
                background: 'linear-gradient(180deg, rgba(8,24,18,0.82), rgba(5,15,12,0.92))',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                WebkitBoxShadow: 'none',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              <span
                aria-hidden="true"
                className="rounded-full"
                style=${{
                  width: '6px',
                  height: '6px',
                  background: 'rgba(16,185,129,0.98)',
                  boxShadow: '0 0 8px rgba(16,185,129,0.88)'
                }}
              ></span>

              <span
                style=${{
                  fontSize: '8px',
                  lineHeight: '1',
                  fontWeight: '800',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'rgba(210,255,242,0.92)',
                  transform: 'translateY(0.5px)'
                }}
              >
                Live Now
              </span>

              <span
                aria-hidden="true"
                style=${{
                  fontSize: '9px',
                  lineHeight: '1',
                  color: 'rgba(210,255,242,0.68)',
                  transform: 'translateY(-0.5px)'
                }}
              >
                ▾
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
          <div
            role="button"
            tabIndex="0"
            onClick=${() => onOpenAddStory?.()}
            onKeyDown=${(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAddStory?.();
              }
            }}
            aria-label="Add story"
            className="shrink-0 select-none active:scale-[0.97] transition-transform"
            style=${{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transform: 'translateY(3px)',
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              padding: '0',
              margin: '0',
              cursor: 'pointer'
            }}
          >
            <span
              style=${{
                fontSize: '9px',
                fontWeight: '900',
                letterSpacing: '0.18em',
                color: 'rgba(96,165,250,0.95)',
                textShadow: '0 0 8px rgba(59,130,246,0.35)',
                animation: !userStory ? 'vibesStoryPulse 2.2s ease-in-out infinite' : 'none'
              }}
            >
              +
            </span>

            <span
              style=${{
                fontSize: '9px',
                fontWeight: '900',
                letterSpacing: '0.18em',
                color: 'rgba(235,255,250,0.95)',
                textShadow: '0 0 6px rgba(255,255,255,0.15)',
                animation: !userStory ? 'vibesStoryPulse 2.2s ease-in-out infinite' : 'none'
              }}
            >
              STORY
            </span>

            ${!userStory && html`
              <span
                style=${{
                  width: '6px',
                  height: '6px',
                  marginLeft: '3px',
                  borderRadius: '999px',
                  background: 'rgba(59,130,246,1)',
                  boxShadow: '0 0 10px rgba(59,130,246,0.8)',
                  animation: 'vibesDotPulse 1.8s ease-in-out infinite'
                }}
              ></span>
            `}

            <style>
              @keyframes vibesStoryPulse {
                0%, 100% {
                  opacity: 0.85;
                  transform: scale(1);
                }
                50% {
                  opacity: 1;
                  transform: scale(1.06);
                }
              }

              @keyframes vibesDotPulse {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.9;
                  box-shadow: 0 0 8px rgba(59,130,246,0.6);
                }
                50% {
                  transform: scale(1.35);
                  opacity: 1;
                  box-shadow: 0 0 16px rgba(59,130,246,0.95);
                }
              }
            </style>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick=${() => userStory ? onViewStory(userStory) : openProfile()}
              onContextMenu=${(e) => { e.preventDefault(); openProfile(); }}
              className="w-[62px] h-[62px] rounded-full bg-transparent flex items-center justify-center overflow-visible tap-feedback shadow-lg relative z-10"
              aria-label="Open profile"
            >
              ${userStory && html`
                <span
                  aria-hidden="true"
                  className="absolute -inset-[3px] rounded-full pointer-events-none"
                  style=${{
                    border: '2px solid rgba(96,165,250,0.62)',
                    boxShadow: '0 0 10px rgba(96,165,250,0.22), 0 0 16px rgba(59,130,246,0.10)'
                  }}
                ></span>
              `}

              <span
                className="w-full h-full rounded-full overflow-hidden block"
                style=${{
                  border: '1.5px solid rgba(255,255,255,0.20)',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 0 0 1px rgba(59,130,246,0.10), 0 0 18px rgba(59,130,246,0.22)'
                }}
              >
                <img
                  src=${profilePhotoUrl || fallbackAvatar}
                  alt="Profile"
                  className="block w-full h-full"
                  style=${{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
                />
              </span>
            </button>

            ${userStory && viewerCount > 0 && html`
              <div
                className="absolute bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-black z-20 shadow-[0_4px_10px_rgba(59,130,246,0.5)] min-w-[16px] flex items-center justify-center animate-in zoom-in duration-300"
                style=${{
                  right: '-2px',
                  bottom: '-2px'
                }}
              >
                ${viewerCount}
              </div>
            `}
          </div>
        </div>
      </div>
    </header>
  `;
}

const BOTTOM_NAV_ITEMS = [
  {
    key: 'discover',
    tabId: 'mood',
    icon: html`
      <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="url(#discoverGrad)" stroke-width="2.2"></circle>
        <path d="M16.2 16.2L20 20" stroke="url(#discoverGrad)" stroke-width="2.2" stroke-linecap="round"></path>
        <defs>
          <linearGradient id="discoverGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stop-color="#8CF1FF"></stop>
            <stop offset="0.55" stop-color="#6EA8FF"></stop>
            <stop offset="1" stop-color="#7C5CFF"></stop>
          </linearGradient>
        </defs>
      </svg>
    `
  },
  {
    key: 'match',
    tabId: 'activity',
    icon: html`
      <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19.2c-.22 0-.44-.06-.62-.18-2.72-1.82-6.88-4.88-6.88-8.9 0-2.3 1.82-4.12 4.16-4.12 1.3 0 2.54.58 3.34 1.58A4.3 4.3 0 0 1 15.34 6c2.34 0 4.16 1.82 4.16 4.12 0 4.02-4.16 7.08-6.88 8.9-.18.12-.4.18-.62.18Z" fill="url(#matchHeartFill)"></path>
        <path d="M7.4 18.2 17.9 7.8" stroke="url(#matchArrowStroke)" stroke-width="1.9" stroke-linecap="round"></path>
        <path d="M16.4 7.9h2.9v2.9" stroke="url(#matchArrowStroke)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M6.3 19.1l1.25-3.15 1.95 1.9-3.2 1.25Z" fill="url(#matchArrowStroke)"></path>
        <defs>
          <linearGradient id="matchHeartFill" x1="5" y1="6" x2="19.5" y2="18.5" gradientUnits="userSpaceOnUse">
            <stop stop-color="#87E8FF"></stop>
            <stop offset="0.52" stop-color="#4E86FF"></stop>
            <stop offset="1" stop-color="#7D5CFF"></stop>
          </linearGradient>
          <linearGradient id="matchArrowStroke" x1="7" y1="18.5" x2="19.3" y2="7.4" gradientUnits="userSpaceOnUse">
            <stop stop-color="#9EEBFF"></stop>
            <stop offset="0.6" stop-color="#6B8DFF"></stop>
            <stop offset="1" stop-color="#8C63FF"></stop>
          </linearGradient>
        </defs>
      </svg>
    `
  },
  {
    key: 'messages',
    tabId: 'messages',
    icon: html`
      <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7.2 6.4h9.6c2.08 0 3.4 1.3 3.4 3.38v4.46c0 2.08-1.32 3.42-3.4 3.42h-5.16l-3.36 2.72c-.56.46-1.14.22-1.14-.52V17.7c-1.96-.1-3.2-1.42-3.2-3.42V9.78c0-2.08 1.32-3.38 3.2-3.38Z" fill="url(#msgGrad)"></path>
        <circle cx="10" cy="12.1" r="0.95" fill="#B8C7FF"></circle>
        <circle cx="13.1" cy="12.1" r="0.95" fill="#B8C7FF"></circle>
        <circle cx="16.2" cy="12.1" r="0.95" fill="#B8C7FF"></circle>
        <defs>
          <linearGradient id="msgGrad" x1="5" y1="6" x2="19.8" y2="19" gradientUnits="userSpaceOnUse">
            <stop stop-color="#8CEBFF"></stop>
            <stop offset="0.55" stop-color="#5F8EFF"></stop>
            <stop offset="1" stop-color="#8A63FF"></stop>
          </linearGradient>
        </defs>
      </svg>
    `
  },
  {
    key: 'profile',
    tabId: 'profile',
    icon: html`
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.1" r="3.2" fill="url(#profileGrad)"></circle>
        <path d="M6.2 18.4c.62-2.66 2.84-4.16 5.8-4.16 2.96 0 5.18 1.5 5.8 4.16" stroke="url(#profileGrad)" stroke-width="2.1" stroke-linecap="round"></path>
        <defs>
          <linearGradient id="profileGrad" x1="6.2" y1="5" x2="18" y2="18.8" gradientUnits="userSpaceOnUse">
            <stop stop-color="#95ECFF"></stop>
            <stop offset="0.58" stop-color="#6F9BFF"></stop>
            <stop offset="1" stop-color="#9065FF"></stop>
          </linearGradient>
        </defs>
      </svg>
    `
  }
];

const bottomNavContainerStyle = {
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  zIndex: 1200,
  padding: '6px 14px calc(env(safe-area-inset-bottom, 0px) + 6px)',
  background: `
    linear-gradient(
      180deg,
      rgba(3,7,12,0) 0%,
      rgba(3,7,12,0.03) 10%,
      rgba(3,7,12,0.09) 24%,
      rgba(3,7,12,0.22) 46%,
      rgba(3,7,12,0.40) 76%,
      rgba(3,7,12,0.54) 100%
    )
  `,
  backdropFilter: 'blur(10px) saturate(116%)',
  WebkitBackdropFilter: 'blur(10px) saturate(116%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)'
};

const bottomNavRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  alignItems: 'end',
  gap: '2px',
  paddingBottom: '0',
  position: 'relative'
};

const bottomNavButtonStyle = {
  appearance: 'none',
  WebkitAppearance: 'none',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  minHeight: '52px',
  padding: '0',
  textDecoration: 'none',
  transform: 'translateY(0)',
  position: 'relative'
};

const bottomNavIconWrapStyle = (isActive) => ({
  position: 'relative',
  width: '42px',
  height: '42px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: isActive ? 1 : 0.82,
  transform: isActive ? 'translateY(-0.5px) scale(1.02)' : 'scale(1)',
  background: isActive
    ? 'radial-gradient(circle at 50% 42%, rgba(118,178,255,0.16), rgba(79,70,229,0.08) 62%, rgba(255,255,255,0.025) 100%)'
    : 'transparent',
  border: isActive
    ? '1px solid rgba(148,163,184,0.11)'
    : '1px solid rgba(255,255,255,0)',
  boxShadow: isActive
    ? [
        '0 0 0 1px rgba(255,255,255,0.022) inset',
        '0 6px 18px rgba(37,99,235,0.11)',
        '0 0 10px rgba(96,165,250,0.11)'
      ].join(', ')
    : 'none',
  filter: isActive
    ? 'drop-shadow(0 0 6px rgba(96,165,250,0.16))'
    : 'drop-shadow(0 0 3px rgba(96,165,250,0.06))',
  transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease'
});

function BottomNav({ activeTab, openPanel, unreadCount }) {
  return html`
    <div className="absolute left-0 right-0 safe-area-left safe-area-right" style=${bottomNavContainerStyle}>
      <div style=${bottomNavRowStyle}>
        ${BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.tabId || activeTab === item.key;
          const showBadge =
            item.tabId === 'messages' &&
            unreadCount > 0 &&
            window?.vibesMessageNotificationsEnabled !== false;

          return html`
            <button
              key=${item.key}
              type="button"
              className="relative tap-feedback"
              style=${bottomNavButtonStyle}
              onClick=${() => openPanel(item.tabId)}
              aria-label=${item.key}
              aria-current=${isActive ? 'page' : undefined}
            >
              <span style=${bottomNavIconWrapStyle(isActive)}>
                ${isActive && html`
                  <span
                    aria-hidden="true"
                    style=${{
                      position: 'absolute',
                      inset: '-2px',
                      borderRadius: '999px',
                      background: 'radial-gradient(circle, rgba(96,165,250,0.16) 0%, rgba(96,165,250,0.07) 46%, rgba(129,140,248,0.03) 64%, rgba(129,140,248,0) 76%)',
                      filter: 'blur(4px)',
                      pointerEvents: 'none'
                    }}
                  ></span>
                `}

                <span
                  style=${{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ${item.icon}
                </span>
              </span>

              ${showBadge && html`
                <div
                  className="absolute rounded-full"
                  style=${{
                    top: '7px',
                    right: '23px',
                    width: '7px',
                    height: '7px',
                    background: 'linear-gradient(180deg, rgba(139,233,255,1), rgba(90,169,255,1))',
                    boxShadow: '0 0 10px rgba(96,165,250,0.72), 0 0 12px rgba(139,92,246,0.18)'
                  }}
                ></div>
              `}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

function ActionSheet({ isOpen, onClose, onAddStory }) {
  React.useEffect(() => {
    if (!isOpen) return;

    const run = requestAnimationFrame(() => {
      try {
        if (typeof onClose === 'function') onClose();
      } catch (e) {}

      try {
        if (typeof onAddStory === 'function') onAddStory();
      } catch (e) {}
    });

    return () => cancelAnimationFrame(run);
  }, [isOpen, onClose, onAddStory]);

  return null;
}

function VisibilitySheet({ isOpen, isVisible, onClose, onSelect }) {
  if (!isOpen) return null;

  return html`
    <div className="fixed inset-0 z-[1300] flex items-end justify-center px-4 pb-6">
      <div
        className="absolute inset-0 bg-black/72 backdrop-blur-sm animate-fade-in"
        onClick=${onClose}
      ></div>

      <div
        className="relative w-full max-w-sm rounded-[2.25rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up"
        style=${{
          background: 'linear-gradient(180deg, rgba(12,18,40,0.88), rgba(7,12,28,0.96))',
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(22px) saturate(145%)',
          WebkitBackdropFilter: 'blur(22px) saturate(145%)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Visibility options"
      >
        <div className="px-6 pt-5 pb-5">
          <div className="flex items-center justify-center">
            <div className="h-1 w-12 rounded-full bg-white/10"></div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-[11px] tracking-[0.28em] uppercase font-black text-white/40">Live Status</div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick=${() => onSelect(true)}
              className="w-full rounded-[1.35rem] px-4 py-4 text-left tap-feedback transition-all active:scale-[0.985]"
              style=${{
                background: isVisible
                  ? 'linear-gradient(180deg, rgba(16,185,129,0.18), rgba(5,150,105,0.16))'
                  : 'rgba(255,255,255,0.04)',
                border: isVisible
                  ? '1px solid rgba(16,185,129,0.34)'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isVisible
                  ? '0 12px 30px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : 'none'
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-black tracking-[0.16em] uppercase text-white/95">Visible</div>
                  <div className="mt-1 text-[12px] text-white/55">People can see you on the map</div>
                </div>
                <div
                  className="rounded-full"
                  style=${{
                    width: '10px',
                    height: '10px',
                    background: 'rgba(16,185,129,0.95)',
                    boxShadow: '0 0 12px rgba(16,185,129,0.85)'
                  }}
                ></div>
              </div>
            </button>

            <button
              type="button"
              onClick=${() => onSelect(false)}
              className="w-full rounded-[1.35rem] px-4 py-4 text-left tap-feedback transition-all active:scale-[0.985]"
              style=${{
                background: !isVisible
                  ? 'linear-gradient(180deg, rgba(59,130,246,0.16), rgba(30,41,59,0.24))'
                  : 'rgba(255,255,255,0.04)',
                border: !isVisible
                  ? '1px solid rgba(96,165,250,0.32)'
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: !isVisible
                  ? '0 12px 30px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : 'none'
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-black tracking-[0.16em] uppercase text-white/95">Invisible</div>
                  <div className="mt-1 text-[12px] text-white/55">Hide yourself from the map for now</div>
                </div>
                <div
                  className="rounded-full"
                  style=${{
                    width: '10px',
                    height: '10px',
                    background: 'rgba(96,165,250,0.92)',
                    boxShadow: '0 0 12px rgba(96,165,250,0.72)'
                  }}
                ></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function Toast({ message, isVisible }) {
  if (!isVisible) return null;
  return html`
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
      <div className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase shadow-[0_8px_25px_-5px_rgba(37,99,235,0.5)] animate-slide-up flex items-center gap-2 border border-blue-400/20">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ${message}
      </div>
    </div>
  `;
}

function InAppNotification({ notification, onClick, onClose }) {
  if (!notification) return null;
  return html`
    <div className="fixed top-6 left-4 right-4 z-[250] animate-slide-up pointer-events-none">
      <div
        onClick=${onClick}
        className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_15px_rgba(59,130,246,0.1)] flex items-center gap-3 pointer-events-auto active:scale-[0.98] transition-transform cursor-pointer"
      >
        <div className="h-10 w-10 rounded-full border border-white/10 overflow-hidden bg-white/5 shrink-0">
          ${notification.avatarUrl
            ? html`<img src=${notification.avatarUrl} className="w-full h-full object-cover object-center" />`
            : html`<div className="w-full h-full flex items-center justify-center text-white/40 font-bold text-xs">${notification.title.charAt(0)}</div>`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white/90 leading-tight">${notification.title}</div>
          <div className="text-[11px] text-white/50 truncate leading-tight mt-0.5">${notification.body}</div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0 mr-1"></div>
      </div>
    </div>
  `;
}

function ConfirmationModal({ isOpen, title, message, confirmLabel, onConfirm, onCancel, isDestructive = false }) {
  if (!isOpen) return null;
  return html`
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick=${onCancel}></div>
      <div className="relative w-full max-w-xs bg-[#161b2c] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-3">${title}</h3>
        <p className="text-sm text-white/50 leading-relaxed mb-8">${message}</p>
        <div className="flex flex-col gap-3">
          <button onClick=${onConfirm} className=${`h-14 rounded-2xl font-bold text-sm transition-all tap-feedback ${isDestructive ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-white text-black'}`}>
            ${confirmLabel}
          </button>
          <button onClick=${onCancel} className="h-14 rounded-2xl font-bold text-sm text-white/40 hover:text-white/60 transition-colors tap-feedback">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

function ReportSheet({ isOpen, onClose, onSubmit }) {
  const [selectedReason, setSelectedReason] = React.useState(null);
  const reasons = ['Spam', 'Harassment', 'Fake profile', 'Inappropriate content'];

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedReason(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return html`
    <div className="fixed inset-0 z-[300] flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick=${onClose}></div>
      <div className="relative w-full max-w-sm bg-[#161b2c] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white">Report User</h3>
            <p className="text-sm text-white/40 mt-1">Why are you reporting this profile?</p>
          </div>
          <div className="space-y-2 mb-8">
            ${reasons.map(reason => html`
              <button
                key=${reason}
                onClick=${() => setSelectedReason(reason)}
                className=${`w-full h-14 px-6 rounded-2xl border transition-all flex items-center justify-between tap-feedback ${selectedReason === reason ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-[0_4px_15px_rgba(59,130,246,0.15)]' : 'border-white/5 bg-white/[0.03] text-white/60'}`}
              >
                <span className="text-sm font-bold">${reason}</span>
                ${selectedReason === reason && html`
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                `}
              </button>
            `)}
          </div>
          <div className="flex flex-col gap-3">
            <button
              disabled=${!selectedReason}
              onClick=${() => onSubmit(selectedReason)}
              className=${`h-14 rounded-2xl font-bold text-sm transition-all tap-feedback ${selectedReason ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              Send Report
            </button>
            <button onClick=${onClose} className="h-14 rounded-2xl font-bold text-sm text-white/40 tap-feedback">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function LandscapeBlocker() {
  return html`
    <div
      className="h-screen w-screen bg-black text-white overflow-hidden flex items-center justify-center px-6"
      style=${{
        minHeight: '100vh',
        minHeight: '100dvh',
        overscrollBehavior: 'none'
      }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-[1.75rem] border border-white/10"
          style=${{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
          aria-hidden="true"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/85">
            <rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect>
            <path d="M12 18h.01"></path>
            <path d="M4.5 8.5A9 9 0 0 1 8 4.9"></path>
            <path d="M19.5 15.5A9 9 0 0 1 16 19.1"></path>
          </svg>
        </div>

        <div className="text-[11px] tracking-[0.32em] uppercase font-black text-white/35">Portrait only</div>
        <h1 className="mt-3 text-[32px] leading-none font-black tracking-tight text-white">Rotate your phone</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">City Pulse works in vertical mode</p>
      </div>
    </div>
  `;
}

const STORY_SESSION_KEY = 'vibes.storyViewerSession.v1';
const DEFAULT_PROFILE_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

function safeReadStoryViewerSession() {
  try {
    const raw = localStorage.getItem(STORY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const activeStoryId = (parsed.activeStoryId ?? '').toString();
    if (!activeStoryId) return null;
    return {
      activeStoryId,
      currentTime: Number.isFinite(parsed.currentTime) ? parsed.currentTime : 0,
      paused: !!parsed.paused,
      isOpen: parsed.isOpen !== undefined ? !!parsed.isOpen : true,
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now()
    };
  } catch (e) {
    return null;
  }
}

function safeWriteStoryViewerSession(payload) {
  try {
    localStorage.setItem(
      STORY_SESSION_KEY,
      JSON.stringify({
        activeStoryId: (payload?.activeStoryId ?? '').toString(),
        currentTime: Number.isFinite(payload?.currentTime) ? payload.currentTime : 0,
        paused: !!payload?.paused,
        isOpen: payload?.isOpen !== undefined ? !!payload.isOpen : true,
        savedAt: Date.now()
      })
    );
  } catch (e) {
    // ignore
  }
}

export default function App() {
  const [authUserId, setAuthUserId] = React.useState(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(() => window.innerWidth > window.innerHeight);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showIdentity, setShowIdentity] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('map');
  const [activePanel, setActivePanel] = React.useState(null);
  const [selectedVibe, setSelectedVibe] = React.useState(null);
  const [activeConversationVibe, setActiveConversationVibe] = React.useState(null);
  const [messagesViewNonce, setMessagesViewNonce] = React.useState(0);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [activityUnreadCount, setActivityUnreadCount] = React.useState(0);
  const [lastActivityViewedAt, setLastActivityViewedAt] = React.useState(() => {
    return parseInt(localStorage.getItem('vibes_last_activity_viewed_at') || '0');
  });
  const [inAppNotification, setInAppNotification] = React.useState(null);
  const [connectionStatus, setConnectionStatus] = React.useState(null);


  const [isActionSheetOpen, setIsActionSheetOpen] = React.useState(false);
  const [isVisibilitySheetOpen, setIsVisibilitySheetOpen] = React.useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = React.useState(false);
  const [initialStoryImage, setInitialStoryImage] = React.useState(null);
  const [initialStoryIsVideo, setInitialStoryIsVideo] = React.useState(false);
  const [storyFile, setStoryFile] = React.useState(null);
  const storyFileInputRef = React.useRef(null);
  const initialStoryObjectUrlRef = React.useRef(null);

  const cleanupInitialStoryObjectUrl = React.useCallback(() => {
    if (!initialStoryObjectUrlRef.current) return;
    try {
      URL.revokeObjectURL(initialStoryObjectUrlRef.current);
    } catch (e) {
      // ignore
    }
    initialStoryObjectUrlRef.current = null;
  }, []);

  const resetStoryComposer = React.useCallback(() => {
    cleanupInitialStoryObjectUrl();
    setIsStoryCreatorOpen(false);
    setInitialStoryImage(null);
    setInitialStoryIsVideo(false);
    setStoryFile(null);
  }, [cleanupInitialStoryObjectUrl]);

  const openStoryCreatorFromFile = React.useCallback((file) => {
    if (!(file instanceof File)) return;

    const isVideo = (file.type || '').startsWith('video/');
    cleanupInitialStoryObjectUrl();
    setStoryFile(file);
    setInitialStoryIsVideo(isVideo);

    try {
      const url = URL.createObjectURL(file);
      initialStoryObjectUrlRef.current = url;
      setInitialStoryImage(url);
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInitialStoryImage(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => {
        setInitialStoryImage(null);
      };
      reader.readAsDataURL(file);
    }

    setIsStoryCreatorOpen(true);
    setIsActionSheetOpen(false);
  }, [cleanupInitialStoryObjectUrl]);

  const [storySession, setStorySession] = React.useState(() => {
    const saved = safeReadStoryViewerSession();
    return {
      isOpen: !!saved?.isOpen,
      activeStoryId: saved?.activeStoryId || null,
      currentTime: Number.isFinite(saved?.currentTime) ? saved.currentTime : 0,
      paused: typeof saved?.paused === 'boolean' ? saved.paused : false
    };
  });

  const [activeStorySnapshot, setActiveStorySnapshot] = React.useState(null);
  const [activeStorySequence, setActiveStorySequence] = React.useState(null);

  React.useEffect(() => {
    try {
      localStorage.removeItem('vibes.storyViewerSession.v1');
    } catch (e) {}
    setStorySession({ isOpen: false, activeStoryId: null, currentTime: 0, paused: false });
    setActiveStorySnapshot(null);
    setActiveStorySequence(null);
  }, []);

  const [currentStoryViewers, setCurrentStoryViewers] = React.useState([]);
  const [userStoryViewerCount, setUserStoryViewerCount] = React.useState(0);
  const [stories, setStories] = React.useState([
    {
      id: 's1',
      userId: 'ava',
      displayName: 'Ava',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      imageUrl: 'https://images.unsplash.com/photo-1514525253361-bee8718a74a2?w=800&q=80',
      caption: 'Miami nights! ✨',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      isVideo: false
    }
  ]);

  const [toast, setToast] = React.useState({ message: '', visible: false });

  React.useEffect(() => {
    const openVisibilitySheet = () => setIsVisibilitySheetOpen(true);
    window.addEventListener('vibes:open-visibility-sheet', openVisibilitySheet);
    return () => window.removeEventListener('vibes:open-visibility-sheet', openVisibilitySheet);
  }, []);

  const [resumeToken, setResumeToken] = React.useState(0);
  const wasMapScreenActiveRef = React.useRef(false);

  const [profileData, setProfileData] = React.useState(() => {
    const saved = localStorage.getItem('vibes_profile');

    const defaultData = {
      id: authUserId || getUserId(),
      displayName: '',
      birthday: '',
      city: 'Miami',
      bio: 'Open to new vibes.',
      looking_for: 'Vibes',
      lookingFor: ['Vibes'],
      latitude: null,
      longitude: null,
      isOnline: true,
      notificationsEnabled: false,
      avatarUrl: DEFAULT_PROFILE_AVATAR,
      instagram: '',
      tiktok: ''
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved) || {};
        const resolvedAvatar =
          typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim()
            ? parsed.avatarUrl.trim()
            : typeof parsed.avatar_url === 'string' && parsed.avatar_url.trim()
              ? parsed.avatar_url.trim()
              : DEFAULT_PROFILE_AVATAR;

        return {
          ...defaultData,
          ...parsed,
          avatarUrl: resolvedAvatar,
          avatar_url: resolvedAvatar
        };
      } catch (e) {
        return defaultData;
      }
    }

    return defaultData;
  });

  React.useEffect(() => {
    try {
      window.vibesMessageNotificationsEnabled = !!profileData?.notificationsEnabled;
    } catch (e) {}
  }, [profileData?.notificationsEnabled]);

  React.useEffect(() => {
    try {
      window.showVibesMapDebugBox = () => {
        const old = document.getElementById('vibes-debug-box');
        if (old) old.remove();

        const box = document.createElement('pre');
        box.id = 'vibes-debug-box';
        box.style.position = 'fixed';
        box.style.left = '12px';
        box.style.right = '12px';
        box.style.bottom = '12px';
        box.style.zIndex = '999999';
        box.style.maxHeight = '45vh';
        box.style.overflow = 'auto';
        box.style.padding = '12px';
        box.style.borderRadius = '12px';
        box.style.background = 'rgba(0,0,0,0.92)';
        box.style.color = '#fff';
        box.style.fontSize = '12px';
        box.style.lineHeight = '1.35';
        box.style.whiteSpace = 'pre-wrap';
        box.style.wordBreak = 'break-word';
        box.textContent = JSON.stringify(window.__vibesMapDebug?.targetDebug || window.__vibesMapDebug || {}, null, 2);
        box.onclick = () => box.remove();
        document.body.appendChild(box);
      };
    } catch (e) {}

    return () => {
      try {
        delete window.showVibesMapDebugBox;
      } catch (e) {}
    };
  }, []);

  const getRoute = React.useCallback(() => {
    try {
      return (window.location.hash || '').replace(/^#\/?/, '');
    } catch (e) {
      return '';
    }
  }, []);

  const isResetPasswordRoute = React.useCallback((route) => {
    const r = (route || '').toLowerCase();
    return r === 'reset-password' || r.startsWith('reset-password?');
  }, []);

  const isResetPasswordPathname = React.useCallback(() => {
    try {
      return (window.location.pathname || '').toLowerCase() === '/reset-password';
    } catch (e) {
      return false;
    }
  }, []);

  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(() => {
    const route = getRoute();
    return isResetPasswordRoute(route) || isResetPasswordPathname();
  });

  React.useEffect(() => {
    const onHashChange = () => {
      const route = getRoute();
      setIsPasswordRecovery(isResetPasswordRoute(route) || isResetPasswordPathname());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [getRoute, isResetPasswordRoute, isResetPasswordPathname]);

  // Ensure recovery links never show the normal signup/login screen.
  // - If the user lands on /reset-password (pathname) OR #/reset-password, force IdentityStep to render.
  // - Also listen for Supabase PASSWORD_RECOVERY event (in case the route is missing but the session is recovery).
  React.useEffect(() => {
    const updateLandscape = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    updateLandscape();
    window.addEventListener('resize', updateLandscape);
    window.addEventListener('orientationchange', updateLandscape);

    return () => {
      window.removeEventListener('resize', updateLandscape);
      window.removeEventListener('orientationchange', updateLandscape);
    };
  }, []);

  React.useEffect(() => {
    if (!supabase?.auth) return;

    let unsub = null;

    const init = async () => {
      const onResetRoute = isResetPasswordRoute(getRoute()) || isResetPasswordPathname();
      if (onResetRoute) {
        setIsPasswordRecovery(true);
        setShowOnboarding(false);
        setShowIdentity(true);
        return;
      }

      try {
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
            setShowOnboarding(false);
            setShowIdentity(true);
          }
        });
        unsub = data?.subscription;
      } catch (e) {
        // ignore
      }
    };

    init();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch (e) {}
    };
  }, [getRoute, isResetPasswordRoute, isResetPasswordPathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      // Clear authenticated user state and return to auth screen in LOGIN mode.
      setAuthUserId(null);
      setShowOnboarding(false);
      setShowIdentity(true);
      setActiveTab('map');
      setActivePanel(null);
      setSelectedVibe(null);
      setActiveConversationVibe(null);
      setConfirmation(null);
      setReportingUser(null);
      setIsActionSheetOpen(false);
      resetStoryComposer();

      try {
        localStorage.removeItem('vibes_profile');
      } catch (e) {}

      try {
        localStorage.setItem('vibes_auth_mode', 'login');
      } catch (e) {}

      try {
        window.location.hash = '#/';
      } catch (e) {}
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await handleLogout();
  };

  React.useEffect(() => {
    if (!supabase?.auth) {
      setAuthReady(true);
      return;
    }

    let unsub = null;

    const init = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Supabase getSession error:', sessionError);
          setAuthUserId(null);
        } else {
          setAuthUserId(sessionData?.session?.user?.id || null);
        }
      } catch (err) {
        console.error('Supabase getSession exception:', err);
        setAuthUserId(null);
      } finally {
        setAuthReady(true);
      }

      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setAuthUserId(session?.user?.id || null);
          setAuthReady(true);
        });
        unsub = data?.subscription;
      } catch (err) {
        console.error('Supabase onAuthStateChange error:', err);
      }
    };

    init();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch (e) {}
    };
  }, []);

  React.useEffect(() => {
    if (!authUserId) return;

    setProfileData(prev => {
      if (!prev) return prev;
      if (prev.id === authUserId) return prev;

      const next = { ...prev, id: authUserId };
      try {
        localStorage.setItem('vibes_profile', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [authUserId]);

  const [blockedUserIds, setBlockedUserIds] = React.useState([]);
  const [hiddenConversationIds, setHiddenConversationIds] = React.useState([]);
  const [confirmation, setConfirmation] = React.useState(null);
  const [reportingUser, setReportingUser] = React.useState(null);

  // eliminado: showPhotoOptions no se usa
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 2500);
  };

  const handleSelectVisibility = async (nextVisible) => {
    try {
      await saveProfile({ isVisible: !!nextVisible });
      setIsVisibilitySheetOpen(false);
      showToast(nextVisible ? 'Now visible' : 'Now invisible');
      setActivePanel(null);
      setActiveTab('map');
    } catch (err) {
      console.error('Error updating visibility:', err);
      showToast('Could not update visibility');
    }
  };

  const normalizeStory = React.useCallback((s) => {
    if (!s || typeof s !== 'object') return null;

    const id = s.id || s.storyId || s.story_id;
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) return null;

    const userId = s.userId || s.user_id;
    if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) return null;

    const mediaUrl = (s.videoUrl || s.imageUrl || s.media_url || s.mediaUrl || s.url || s.src || '').toString().trim();
    if (!mediaUrl) return null;

    const timestamp = typeof s.timestamp === 'number' ? s.timestamp : (s.createdAt || s.created_at ? new Date(s.createdAt || s.created_at).getTime() : null);

    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

    const explicitType = (s.type || s.mediaType || s.media_type || '').toString().toLowerCase();
    const isVideo = explicitType.includes('video') || /\.(mp4|mov|webm|m4v)$/i.test(mediaUrl.split('?')[0].split('#')[0]);

    return {
      ...s,
      id,
      userId,
      mediaUrl,
      imageUrl: mediaUrl,
      type: isVideo ? 'video' : 'image',
      mediaType: isVideo ? 'video' : 'image',
      displayName:
        typeof s.displayName === 'string' && s.displayName.trim()
          ? s.displayName
          : typeof s.display_name === 'string' && s.display_name.trim()
            ? s.display_name
            : 'Vibe',
      avatarUrl: typeof s.avatarUrl === 'string' ? s.avatarUrl : typeof s.avatar_url === 'string' ? s.avatar_url : '',
      caption: typeof s.caption === 'string' ? s.caption : '',
      timestamp,
      createdAt: s.createdAt || s.created_at || new Date(timestamp).toISOString(),
      isVideo
    };
  }, []);

  const normalizeStories = React.useCallback((inputStories) => {
    console.log('[StoryLauncher] raw stories received', inputStories);
    const normalized = (Array.isArray(inputStories) ? inputStories : []).map(normalizeStory).filter(Boolean);
    console.log('[StoryLauncher] normalized stories count', normalized.length);
    return normalized;
  }, [normalizeStory]);

  // eliminado: safeOpenStoryViewer no se está usando

  const dedupeStoriesById = React.useCallback((list) => {
    const out = [];
    const seen = new Set();
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const s = normalizeStory(raw);
      if (!s) return;
      if (seen.has(s.id)) return;
      seen.add(s.id);
      out.push(s);
    });
    return out;
  }, [normalizeStory]);

  const activeStories = React.useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const normalized = (Array.isArray(stories) ? stories : []).map(normalizeStory).filter(Boolean).filter(s => s.timestamp > twentyFourHoursAgo);

    const byId = [];
    const seenIds = new Set();
    normalized.forEach((s) => {
      if (seenIds.has(s.id)) return;
      seenIds.add(s.id);
      byId.push(s);
    });

    const unique = new Map();
    byId.forEach(s => {
      const key = `${s.userId}-${s.mediaUrl}`;
      if (!unique.has(key)) {
        unique.set(key, s);
      } else {
        const existing = unique.get(key);
        const isLocal = (id) => typeof id === 'string' && id.startsWith('s') && id.length < 20;
        if (isLocal(existing.id) && !isLocal(s.id)) {
          unique.set(key, s);
        }
      }
    });

    return dedupeStoriesById(Array.from(unique.values()));
  }, [stories, normalizeStory, dedupeStoriesById]);

  const fetchStories = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          caption,
          created_at,
          profiles:user_id (display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (data && !error) {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const mapped = data
          .filter(s => s.media_url && typeof s.media_url === 'string' && s.media_url.trim() !== '')
          .map(s => {
            const isVideo = isVideoMedia(s.media_url, s.media_type || s.type);
            return {
              id: s.id,
              userId: s.user_id,
              displayName: s.profiles?.display_name || 'Someone',
              avatarUrl: s.profiles?.avatar_url,
              imageUrl: s.media_url,
              mediaUrl: s.media_url,
              caption: s.caption,
              timestamp: new Date(s.created_at).getTime(),
              createdAt: s.created_at,
              isVideo,
              mediaType: isVideo ? 'video' : 'image'
            };
          })
          .filter(s => s.timestamp > twentyFourHoursAgo);

        setStories(prev => {
          const dbIds = new Set(mapped.map(s => s.id));
          const localOnly = prev.filter(s => typeof s.id === 'string' && s.id.startsWith('s') && !dbIds.has(s.id) && s.timestamp > twentyFourHoursAgo);

          const combined = [...mapped, ...localOnly];
          const unique = new Map();
          combined.forEach(s => {
            const key = `${s.userId}-${s.mediaUrl}`;
            if (!unique.has(key)) {
              unique.set(key, s);
            } else {
              const existing = unique.get(key);
              const isLocal = (id) => typeof id === 'string' && id.startsWith('s') && id.length < 20;
              if (isLocal(existing.id) && !isLocal(s.id)) {
                unique.set(key, s);
              }
            }
          });

          const next = dedupeStoriesById(Array.from(unique.values()));

          if (Array.isArray(prev) && prev.length === next.length) {
            const prevById = new Map(prev.map(s => [s?.id, s]));
            const isSame = next.every(s => {
              const p = prevById.get(s?.id);
              if (!p) return false;
              const prevMedia = p?.media_url ?? p?.mediaUrl ?? p?.imageUrl;
              const nextMedia = s?.media_url ?? s?.mediaUrl ?? s?.imageUrl;
              const prevUser = p?.user_id ?? p?.userId;
              const nextUser = s?.user_id ?? s?.userId;
              return prevMedia === nextMedia && prevUser === nextUser;
            });
            if (isSame) return prev;
          }

          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  const calculateAge = (birthday) => {
    const raw = (birthday || '').toString().trim();
    if (!raw) return null;

    let year = 0;
    let month = 0;
    let day = 0;

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return null;
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }

    if (!year || !month || !day) return null;

    const today = new Date();
    let age = today.getFullYear() - year;

    const hasHadBirthdayThisYear =
      today.getMonth() + 1 > month ||
      (today.getMonth() + 1 === month && today.getDate() >= day);

    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }

    return age;
  };

  const saveProfile = async (updatedData) => {
    const effectiveUserId = authUserId || getUserId();
    const merged = { ...profileData, ...updatedData, id: effectiveUserId };

    const normalizedLookingForRaw =
      merged.looking_for ??
      merged.lookingFor ??
      profileData.looking_for ??
      profileData.lookingFor ??
      '';

    const normalizedLookingFor = Array.isArray(normalizedLookingForRaw)
      ? (normalizedLookingForRaw[0] || '')
      : normalizedLookingForRaw;

    const resolvedBirthdayRaw =
      updatedData?.birthday ??
      updatedData?.birth_date ??
      merged.birthday ??
      merged.birth_date ??
      profileData?.birthday ??
      profileData?.birth_date ??
      '';

    const resolvedBirthday = (resolvedBirthdayRaw || '').toString().trim();

    const resolvedAvatarUrl =
      typeof (merged.avatarUrl ?? merged.avatar_url) === 'string' &&
      String(merged.avatarUrl ?? merged.avatar_url).trim()
        ? String(merged.avatarUrl ?? merged.avatar_url).trim()
        : DEFAULT_PROFILE_AVATAR;

    const newProfile = {
      ...merged,
      id: effectiveUserId,
      displayName: merged.displayName ?? merged.display_name ?? '',
      avatarUrl: resolvedAvatarUrl,
      avatar_url: resolvedAvatarUrl,
      birthday: resolvedBirthday,
      city: merged.city ?? 'Miami',
      country: merged.country ?? '',
      bio: merged.bio ?? 'Open to new vibes.',
      gender: merged.gender ?? '',
      interested_in: merged.interested_in ?? merged.interestedIn ?? '',
      looking_for: normalizedLookingFor || 'Vibes',
      lookingFor: normalizedLookingFor ? [normalizedLookingFor] : ['Vibes'],
      instagram: merged.instagram ?? '',
      tiktok: merged.tiktok ?? '',
      isVisible: merged.isVisible !== undefined ? !!merged.isVisible : true
    };

    const isSignupFlow =
      !!updatedData &&
      (
        Object.prototype.hasOwnProperty.call(updatedData, 'displayName') ||
        Object.prototype.hasOwnProperty.call(updatedData, 'display_name') ||
        Object.prototype.hasOwnProperty.call(updatedData, 'birthday') ||
        Object.prototype.hasOwnProperty.call(updatedData, 'birth_date')
      );

    const age = calculateAge(newProfile.birthday);

    if (isSignupFlow) {
      if (age === null || age < 18) {
        throw new Error('You must be 18 or older to use Vibes.');
      }
    } else if (newProfile.birthday && age !== null && age < 18) {
      throw new Error('You must be 18 or older to use Vibes.');
    }

    localStorage.setItem('vibes_profile', JSON.stringify(newProfile));
    setProfileData(newProfile);

    const dbUserId = authUserId;
    if (!supabase || !dbUserId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: dbUserId,
          display_name: newProfile.displayName || '',
          avatar_url: newProfile.avatarUrl || '',
          bio: newProfile.bio || 'Open to new vibes.',
          birth_date: newProfile.birthday || null,
          city: newProfile.city || null,
          country: newProfile.country || null,
          gender: newProfile.gender || null,
          interested_in: newProfile.interested_in || null,
          is_visible: newProfile.isVisible !== undefined ? !!newProfile.isVisible : true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (err) {
      console.error('Supabase save error:', err);
    }
  };

  React.useEffect(() => {
    if (!authReady) return;

    const hasSeenOnboarding = localStorage.getItem('vibes_onboarding_seen');

    const savedBlocks = localStorage.getItem('vibes_blocked_users');
    if (savedBlocks) setBlockedUserIds(JSON.parse(savedBlocks));

    const savedHiddenConvs = localStorage.getItem('vibes_hidden_conversations');
    if (savedHiddenConvs) setHiddenConversationIds(JSON.parse(savedHiddenConvs));

    setShowOnboarding(false);
    setShowIdentity(false);

    if (isPasswordRecovery) {
      setShowOnboarding(false);
      setShowIdentity(true);
      return;
    }

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
      setShowIdentity(false);
      return;
    }

    if (!authUserId) {
      setShowOnboarding(false);
      setShowIdentity(true);
      return;
    }

    if (!profileData.displayName || !profileData.birthday) {
      setShowOnboarding(false);
      setShowIdentity(true);
      return;
    }

    const hydrate = async () => {
      const dbUserId = authUserId;
      if (!supabase || !dbUserId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, birth_date, city, country, gender, interested_in, is_visible, updated_at')
          .eq('id', dbUserId)
          .maybeSingle();

        if (data && !error) {
          const hydratedProfile = {
            id: data.id,
            displayName: data.display_name || '',
            birthday: data.birth_date || '',
            city: data.city || 'Miami',
            country: data.country || '',
            gender: data.gender || '',
            interested_in: data.interested_in || '',
            looking_for: profileData?.looking_for || 'Vibes',
            lookingFor: [profileData?.looking_for || 'Vibes'],
            isVisible: data.is_visible !== undefined ? data.is_visible : true,
            bio: data.bio || 'Open to new vibes.',
            avatarUrl: data.avatar_url || ''
          };

          setProfileData(prev => {
            const next = { ...prev, ...hydratedProfile };
            try {
              localStorage.setItem('vibes_profile', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }

        const { data: blocks } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', dbUserId);

        if (blocks) {
          const ids = blocks.map(b => b.blocked_id);
          setBlockedUserIds(ids);
          localStorage.setItem('vibes_blocked_users', JSON.stringify(ids));
        }

        fetchStories();
      } catch (err) {
        console.error('Supabase hydration error:', err);
      }
    };

    hydrate();
  }, [authReady, authUserId, isPasswordRecovery]);

  // eliminado: limpieza duplicada de vibes.storyViewerSession.v1


  const appResumeEpoch = useAppResume();

  React.useEffect(() => {
    if (!appResumeEpoch) return;
    if (document.visibilityState === 'hidden') return;

    try {
      const vids = Array.from(document.querySelectorAll('video'));
      vids.forEach((v) => {
        try {
          const shouldPlay = !!(v.autoplay || v.loop || v.dataset?.resume === 'true');
          if (!shouldPlay) return;
          const p = v.play?.();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (e) {}
      });
    } catch (e) {}

    try {
      window.dispatchEvent(new Event('resize'));
    } catch (e) {}
  }, [appResumeEpoch]);

  React.useEffect(() => {
    const dbUserId = authUserId;
    if (!supabase || !dbUserId || showOnboarding || showIdentity) return;

    const visibilityCandidates = [
      profileData?.isVisible,
      profileData?.is_visible,
      profileData?.profileVisibility,
      profileData?.profile_visibility,
      profileData?.visible,
      profileData?.showOnMap,
      profileData?.show_on_map
    ];

    let isProfileVisible = true;

    for (const value of visibilityCandidates) {
      if (typeof value === 'boolean') {
        isProfileVisible = value;
        break;
      }
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['false', '0', 'off', 'hidden', 'no'].includes(v)) {
          isProfileVisible = false;
          break;
        }
        if (['true', '1', 'on', 'visible', 'yes'].includes(v)) {
          isProfileVisible = true;
          break;
        }
      }
      if (typeof value === 'number') {
        isProfileVisible = value !== 0;
        break;
      }
    }

    const updatePresence = async (status) => {
      try {
        const now = new Date().toISOString();

        const rawLookingFor =
          profileData?.looking_for ??
          profileData?.lookingFor ??
          null;

        const normalizedLookingFor = Array.isArray(rawLookingFor)
          ? rawLookingFor[0] || null
          : rawLookingFor || null;

        await supabase
          .from('presence')
          .upsert(
            {
              user_id: dbUserId,
              status,
              vibe: isProfileVisible ? normalizedLookingFor : null,
              mood: null,
              last_seen_at: now,
              updated_at: now
            },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        console.error('Presence update error:', err);
      }
    };

    if (!isProfileVisible) {
      updatePresence('offline');
      return;
    }

    updatePresence('online');
    const interval = setInterval(() => updatePresence('online'), 120000);

    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible' ? 'online' : 'away');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence('offline');
    };
  }, [
    supabase,
    authUserId,
    showOnboarding,
    showIdentity,
    selectedVibe?.id,
    profileData?.isVisible,
    profileData?.is_visible,
    profileData?.profileVisibility,
    profileData?.profile_visibility,
    profileData?.visible,
    profileData?.showOnMap,
    profileData?.show_on_map
  ]);

  React.useEffect(() => {
    setUnreadCount(0);
    setActivityUnreadCount(0);
  }, [profileData.id, showOnboarding, showIdentity]);

  const myStoryId = React.useMemo(() => {
    return activeStories.find(s => s.userId === profileData.id)?.id;
  }, [activeStories, profileData.id]);

  React.useEffect(() => {
    setUserStoryViewerCount(0);
  }, [myStoryId, profileData.id]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        saveProfile({ notificationsEnabled: true });
        localStorage.setItem('vibes_notif_requested', 'true');
        showToast('Notifications enabled');
      } else {
        localStorage.setItem('vibes_notif_requested', 'true');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const blurActiveField = React.useCallback(() => {
    try {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function') {
        el.blur();
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    setConnectionStatus(null);
  }, [selectedVibe]);

  const normalizeDemoProfile = React.useCallback((raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};

    const id = (src.id ?? src.userId ?? src.user_id ?? '').toString().trim();
    if (!id) {
      console.warn('[chat] Missing/invalid selected user id:', raw);
      return null;
    }

    const displayName = (src.displayName ?? src.display_name ?? src.name ?? '').toString().trim() || 'Vibe';
    const avatarUrl = (src.avatarUrl ?? src.avatar_url ?? '').toString();
    const city = (src.city ?? '').toString();
    const country = (src.country ?? '').toString();
    const bio = (src.bio ?? '').toString();
    const birthday = (src.birthday ?? src.birth_date ?? '').toString();

    const lookingForRaw = src.lookingFor ?? src.looking_for;
    const lookingFor = Array.isArray(lookingForRaw) ? lookingForRaw : lookingForRaw ? [lookingForRaw] : [];

    const isOnline = src.isOnline ?? src.is_online;
    const lastSeen = src.lastSeen ?? src.last_seen ?? src.lastSeenAt ?? src.last_seen_at ?? '';

    const instagram = (src.instagram ?? src.instagram_username ?? src.instagram_url ?? '').toString();
    const tiktok = (src.tiktok ?? src.tiktok_username ?? src.tiktok_url ?? '').toString();
    const gender = (src.gender ?? '').toString();
    const interestedIn = (src.interested_in ?? src.interestedIn ?? '').toString();

    return {
      id,
      displayName,
      avatarUrl,
      city,
      country,
      bio,
      birthday,
      lookingFor,
      isOnline: typeof isOnline === 'boolean' ? isOnline : !!isOnline,
      lastSeen: lastSeen ? lastSeen.toString() : '',
      instagram,
      tiktok,
      gender,
      interested_in: interestedIn
    };
  }, []);

  const handleSendMessage = async (vibe) => {
    const normalized = normalizeDemoProfile(vibe);
    if (!normalized) {
      console.warn('[chat] Prevented chat start due to missing/invalid user id:', vibe);
      return;
    }

    blurActiveField();

    const freshConversation = {
      ...normalized,
      __openNonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`
    };

    setSelectedVibe(null);
    setActiveConversationVibe(null);
    setActivePanel(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blurActiveField();
        setMessagesViewNonce((n) => n + 1);
        setActiveConversationVibe(freshConversation);
        setActiveTab('messages');
        setActivePanel('messages');
      });
    });

    if (isMessageNotificationsEnabled && !localStorage.getItem('vibes_notif_requested')) {
      requestNotificationPermission();
    }
  };

  const openVibeProfile = async (vibe) => {
    blurActiveField();
    setIsActionSheetOpen(false);
    resetStoryComposer();

    const normalizedBase = normalizeDemoProfile(vibe);
    if (!normalizedBase) return;

    const myId = profileData.id;
    const myUserId = profileData.user_id || myId;

    const tappedId = normalizedBase.id;
    const tappedUserId = vibe?.userId || vibe?.user_id || tappedId;

    const isMe = (
      String(tappedId) === String(myId) ||
      String(tappedUserId) === String(myId) ||
      String(tappedId) === String(myUserId) ||
      String(tappedUserId) === String(myUserId) ||
      vibe?.isCurrentUser === true ||
      vibe?.isOwnProfile === true
    );

    if (isMe) {
      setSelectedVibe(null);
      setActiveTab('profile');
      setActivePanel('profile');
      return;
    }

    const seedProfile = {
      ...normalizedBase,
      displayName:
        normalizedBase.displayName && normalizedBase.displayName !== 'Nearby user'
          ? normalizedBase.displayName
          : (vibe?.displayName || vibe?.display_name || 'Vibe'),
      avatarUrl:
        normalizedBase.avatarUrl ||
        vibe?.avatarUrl ||
        vibe?.avatar_url ||
        '',
      city:
        normalizedBase.city ||
        vibe?.city ||
        'Nearby',
      bio:
        normalizedBase.bio ||
        vibe?.bio ||
        '',
      birthday:
        normalizedBase.birthday ||
        vibe?.birth_date ||
        ''
    };

    setSelectedVibe(seedProfile);
    setActiveTab('profile');
    setActivePanel('profile');

    if (!supabase) return;

    try {
      const lookupId = String(normalizedBase.id || tappedUserId || '').trim();
      if (!lookupId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, birth_date, city, country, gender, interested_in, is_visible, updated_at')
        .eq('id', lookupId)
        .maybeSingle();

      if (error || !data) return;

      const bustedAvatar =
        typeof data.avatar_url === 'string' && data.avatar_url.trim()
          ? `${data.avatar_url.trim()}${data.avatar_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(data.updated_at || Date.now()))}`
          : '';

      const enriched =
        normalizeDemoProfile({
          ...seedProfile,
          id: data.id,
          userId: data.id,
          displayName: data.display_name || seedProfile.displayName || 'Vibe',
          avatarUrl: bustedAvatar || seedProfile.avatarUrl || '',
          city: data.city || seedProfile.city || 'Nearby',
          country: data.country || seedProfile.country || '',
          bio: data.bio || seedProfile.bio || '',
          birthday: data.birth_date || seedProfile.birthday || '',
          interested_in: data.interested_in || seedProfile.interested_in || '',
          gender: data.gender || seedProfile.gender || '',
          isOnline: vibe?.isOnline,
          lastSeen: vibe?.lastSeen,
          updated_at: data.updated_at
        }) || seedProfile;

      setSelectedVibe((prev) => {
        if (!prev) return enriched;
        if (String(prev.id) !== String(seedProfile.id)) return prev;
        return {
          ...prev,
          ...enriched
        };
      });
    } catch (err) {
      console.error('Error fetching full profile for openVibeProfile:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    setInAppNotification(null);
    if (!supabase) return;

    try {
      const { data: sender } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, birth_date, city, updated_at')
        .eq('id', notification.senderId)
        .maybeSingle();

      if (sender) {
        const vibe = {
          id: sender.id,
          displayName: sender.display_name,
          city: sender.city,
          bio: sender.bio,
          birthday: sender.birth_date,
          avatarUrl: sender.avatar_url
        };

        if (notification.type === 'message' || notification.type === 'acceptance' || notification.type === 'story_reaction') {
          handleSendMessage(vibe);
        } else if (notification.type === 'request' || notification.type === 'story_view') {
          openVibeProfile(vibe);
        }
      }
    } catch (err) {
      console.error('Error opening from notification:', err);
    }
  };

  React.useEffect(() => {
    const onRequestLogout = () => setShowLogoutConfirm(true);
    const onRequestDelete = () => {
      // No backend delete flow in this demo; treat as logout + local wipe.
      setConfirmation({ type: 'delete_account' });
    };

    window.addEventListener('vibes:request-logout', onRequestLogout);
    window.addEventListener('vibes:request-delete-account', onRequestDelete);

    return () => {
      window.removeEventListener('vibes:request-logout', onRequestLogout);
      window.removeEventListener('vibes:request-delete-account', onRequestDelete);
    };
  }, []);

  const handleFinishOnboarding = () => {
    localStorage.setItem('vibes_onboarding_seen', 'true');
    setShowOnboarding(false);
    setShowIdentity(true);
  };

  const handleFinishIdentity = async (identityData) => {
    const mode = identityData?.authMode || 'signup';

    if (mode === 'signup') {
      await saveProfile(identityData);
    } else {
      try {
        const dbUserId = authUserId || (await supabase.auth.getUser())?.data?.user?.id;
        if (supabase && dbUserId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, bio, birth_date, city, country, gender, interested_in, is_visible, updated_at')
            .eq('id', dbUserId)
            .maybeSingle();

          if (data && !error) {
            const hydratedProfile = {
              id: data.id,
              displayName: data.display_name || '',
              birthday: data.birth_date || '',
              city: data.city || 'Miami',
              country: data.country || '',
              gender: data.gender || '',
              interested_in: data.interested_in || '',
              looking_for: profileData?.looking_for || 'Vibes',
              lookingFor: [profileData?.looking_for || 'Vibes'],
              isVisible: data.is_visible !== undefined ? data.is_visible : true,
              bio: data.bio || 'Open to new vibes.',
              avatarUrl: data.avatar_url || ''
            };

            setProfileData((prev) => {
              const next = { ...prev, ...hydratedProfile };
              try {
                localStorage.setItem('vibes_profile', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
        }
      } catch (err) {
        console.error('Login hydration failed:', err);
      }
    }

    setShowIdentity(false);

    if (isPasswordRecovery) {
      try {
        window.location.hash = '#/';
      } catch (e) {}
      setIsPasswordRecovery(false);
    }
  };

  const handleLocationUpdate = async (loc) => {
    const coords = loc?.coords && typeof loc.coords === 'object' ? loc.coords : loc;

    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setProfileData((prev) => {
      if (!prev) return prev;

      if (prev.latitude === lat && prev.longitude === lng) {
        return prev;
      }

      const next = {
        ...prev,
        latitude: lat,
        longitude: lng,
        last_location_update: new Date().toISOString()
      };

      try {
        localStorage.setItem('vibes_profile', JSON.stringify(next));
      } catch (e) {}

      return next;
    });

    const dbUserId = authUserId;
    if (!supabase || !dbUserId) return;

    try {
      await supabase
        .from('user_locations')
        .upsert(
          {
            user_id: dbUserId,
            latitude: lat,
            longitude: lng,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.error('Error saving user location:', err);
    }
  };

  const isMessageNotificationsEnabled = (() => {
    const candidates = [
      profileData?.notificationsEnabled,
      profileData?.notifications_enabled,
      profileData?.messageNotifications,
      profileData?.message_notifications,
      profileData?.messageNotificationsEnabled,
      profileData?.message_notifications_enabled
    ];

    for (const value of candidates) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['false', '0', 'off', 'no', 'disabled'].includes(v)) return false;
        if (['true', '1', 'on', 'yes', 'enabled'].includes(v)) return true;
      }
      if (typeof value === 'number') return value !== 0;
    }

    try {
      const saved = JSON.parse(localStorage.getItem('vibes_profile') || '{}');
      const savedCandidates = [
        saved?.notificationsEnabled,
        saved?.notifications_enabled,
        saved?.messageNotifications,
        saved?.message_notifications,
        saved?.messageNotificationsEnabled,
        saved?.message_notifications_enabled
      ];

      for (const value of savedCandidates) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const v = value.trim().toLowerCase();
          if (['false', '0', 'off', 'no', 'disabled'].includes(v)) return false;
          if (['true', '1', 'on', 'yes', 'enabled'].includes(v)) return true;
        }
        if (typeof value === 'number') return value !== 0;
      }
    } catch (e) {}

    return false;
  })();

  const appProfileRef = React.useRef(profileData);
  const activePanelRef = React.useRef(activePanel);
  const activeConversationVibeRef = React.useRef(activeConversationVibe);
  const inAppNotificationTimeoutRef = React.useRef(null);
  const inboxAudioRef = React.useRef(null);

  React.useEffect(() => {
    appProfileRef.current = profileData;
  }, [profileData]);

  React.useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  React.useEffect(() => {
    activeConversationVibeRef.current = activeConversationVibe;
  }, [activeConversationVibe]);

  React.useEffect(() => {
    const syncUnreadFromLocal = () => {
      const state = readLocalMessagesState(appProfileRef.current?.id);
      const total = (state?.conversations || []).reduce(
        (sum, item) => sum + Number(item?.unreadCount || 0),
        0
      );
      setUnreadCount(total);
    };

    syncUnreadFromLocal();

    const onStorage = (event) => {
      const key = `vibes_messages_state_${String(appProfileRef.current?.id || 'guest')}`;
      if (!event?.key || event.key === key) {
        syncUnreadFromLocal();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncUnreadFromLocal();
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profileData?.id]);

  React.useEffect(() => {
    try {
      const audio = new Audio(
        'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA///////////////////////////////8AAAA8TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnE0J4fQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      );
      audio.preload = 'auto';
      audio.volume = 0.9;
      inboxAudioRef.current = audio;
    } catch (e) {
      inboxAudioRef.current = null;
    }

    return () => {
      try {
        if (inboxAudioRef.current) {
          inboxAudioRef.current.pause?.();
          inboxAudioRef.current.src = '';
        }
      } catch (e) {}
      inboxAudioRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const syncUnreadFromLocal = () => {
      const state = readLocalMessagesState(appProfileRef.current?.id);
      const total = (state?.conversations || []).reduce(
        (sum, item) => sum + Number(item?.unreadCount || 0),
        0
      );
      setUnreadCount(total);
    };

    const emitMessageEvent = (detail = {}) => {
      try {
        window.dispatchEvent(
          new CustomEvent('vibes:messages-updated', {
            detail: {
              ...detail,
              userId: appProfileRef.current?.id || null,
              emittedAt: Date.now()
            }
          })
        );
      } catch (e) {}
    };

    const playInboxSound = () => {
      try {
        const audio = inboxAudioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        const p = audio.play?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    };

    const showInboxBanner = (payload) => {
      if (!isMessageNotificationsEnabled) return;

      setInAppNotification({
        type: 'message',
        senderId: payload.senderId,
        title: payload.title || 'New message',
        body: payload.body || '',
        avatarUrl: payload.avatarUrl || ''
      });

      if (inAppNotificationTimeoutRef.current) {
        clearTimeout(inAppNotificationTimeoutRef.current);
      }

      inAppNotificationTimeoutRef.current = setTimeout(() => {
        setInAppNotification(null);
        inAppNotificationTimeoutRef.current = null;
      }, 3500);
    };

    if (!supabase || !authUserId || showOnboarding || showIdentity) return;

    const channel = supabase.channel(`app_global_messages_${authUserId}`);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          try {
            const msg = payload?.new;
            if (!msg?.id || !msg?.conversation_id) return;

            const myUserId = String(authUserId || '');
            const senderId = String(msg.sender_id || '');
            const isMine = senderId === myUserId;

            const { data: participants, error: participantsError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', msg.conversation_id);

            if (participantsError) return;

            const participantIds = Array.isArray(participants)
              ? participants.map((p) => String(p?.user_id || '')).filter(Boolean)
              : [];

            if (!participantIds.includes(myUserId)) return;

            const otherUserId =
              participantIds.find((id) => id && id !== myUserId) || senderId || '';

            let senderProfile = null;
            if (otherUserId) {
              const { data: profileRow } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url, city, bio, birth_date, updated_at')
                .eq('id', otherUserId)
                .maybeSingle();

              senderProfile = profileRow || null;
            }

            const currentPanel = activePanelRef.current;
            const currentConversation = activeConversationVibeRef.current;
            const isInsideMessages = currentPanel === 'messages';
            const isOpenThread =
              isInsideMessages &&
              String(currentConversation?.id || currentConversation?.userId || '') === String(otherUserId || senderId || '');

            const avatarBase =
              (senderProfile?.avatar_url || currentConversation?.avatarUrl || '').toString().trim();

            const avatarBusted = avatarBase
              ? `${avatarBase}${avatarBase.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(senderProfile?.updated_at || msg.created_at || Date.now()))}`
              : '';

            const conversationShell = {
              id: msg.conversation_id,
              unreadCount: isMine || isOpenThread ? 0 : 1,
              last_message: msg.body || '',
              last_message_at: msg.created_at || new Date().toISOString(),
              messages: [],
              otherUser: {
                id: otherUserId || senderId || '',
                display_name:
                  senderProfile?.display_name ||
                  currentConversation?.displayName ||
                  'Vibe',
                avatar_url: avatarBusted,
                avatarUrl: avatarBusted,
                city:
                  senderProfile?.city ||
                  currentConversation?.city ||
                  '',
                bio:
                  senderProfile?.bio ||
                  currentConversation?.bio ||
                  '',
                birth_date:
                  senderProfile?.birth_date ||
                  currentConversation?.birthday ||
                  '',
                birthday:
                  senderProfile?.birth_date ||
                  currentConversation?.birthday ||
                  '',
                looking_for:
                  currentConversation?.lookingFor ||
                  [],
                lookingFor:
                  currentConversation?.lookingFor ||
                  [],
                energy: currentConversation?.energy || 'Vibes',
                is_online: false,
                last_seen: senderProfile?.updated_at || null
              }
            };

            if (isMine || isOpenThread) {
              upsertLocalConversation(appProfileRef.current?.id, {
                ...conversationShell,
                unreadCount: 0
              });

              if (!isMine) {
                appendLocalMessage(
                  appProfileRef.current?.id,
                  {
                    ...conversationShell,
                    unreadCount: 0
                  },
                  msg,
                  { unreadCount: 0 }
                );

                markConversationReadLocal(appProfileRef.current?.id, msg.conversation_id);

                try {
                  await supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', msg.id);
                } catch (e) {}
              }
            } else {
              appendLocalMessage(
                appProfileRef.current?.id,
                {
                  ...conversationShell,
                  unreadCount: Number(conversationShell.unreadCount || 0)
                },
                msg,
                {
                  unreadCount: Number(conversationShell.unreadCount || 0)
                }
              );

              playInboxSound();

              if (document.visibilityState === 'visible') {
                showInboxBanner({
                  senderId: otherUserId || senderId,
                  title: senderProfile?.display_name || 'New message',
                  body: msg.body || 'Sent you a message',
                  avatarUrl: avatarBusted
                });
              }
            }

            syncUnreadFromLocal();
            emitMessageEvent({
              type: 'message_insert',
              conversationId: msg.conversation_id,
              otherUserId: otherUserId || senderId || '',
              messageId: msg.id,
              isMine,
              isOpenThread
            });
          } catch (err) {
            console.error('Global messages realtime error:', err);
          }
        }
      )
      .subscribe();

    return () => {
      if (inAppNotificationTimeoutRef.current) {
        clearTimeout(inAppNotificationTimeoutRef.current);
        inAppNotificationTimeoutRef.current = null;
      }

      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [
    supabase,
    authUserId,
    showOnboarding,
    showIdentity,
    isMessageNotificationsEnabled
  ]);

  const selectedMood = (
    profileData?.looking_for ||
    (Array.isArray(profileData?.lookingFor) ? profileData.lookingFor[0] : profileData?.lookingFor) ||
    'Vibes'
  );

  const setSelectedMood = async (value) => {
    try {
      const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
      if (canVibrate) navigator.vibrate(10);
    } catch (e) {}

    await saveProfile({
      looking_for: value,
      lookingFor: [value]
    });

    setActivePanel(null);
    setActiveTab('map');
  };

  React.useEffect(() => {
    if (isMessageNotificationsEnabled) return;
    setInAppNotification(null);
  }, [isMessageNotificationsEnabled]);

  const openPanel = (name) => {
    setIsActionSheetOpen(false);
    resetStoryComposer();

    setConfirmation(null);
    setReportingUser(null);

    if (name === 'map') {
      setActiveTab('map');
      setActivePanel(null);
      setSelectedVibe(null);
      setActiveConversationVibe(null);
      return;
    }

    if (name === 'settings' || name === 'edit-profile') {
      setActiveTab('profile');
    } else if (name === 'activity') {
      setActiveTab('activity');
    } else {
      setActiveTab(name);
    }

    setSelectedVibe(null);

    if (name !== 'messages') {
      setActiveConversationVibe(null);
    }

    if (name === 'activity') {
      if (isMessageNotificationsEnabled) {
        setActivityUnreadCount(0);
      }
      const now = Date.now();
      setLastActivityViewedAt(now);
      localStorage.setItem('vibes_last_activity_viewed_at', now.toString());
    }

    setActivePanel(name);
  };

  const closePanel = () => {
    setActivePanel(null);
    setActiveTab('map');
    setSelectedVibe(null);
    setActiveConversationVibe(null);
    setIsActionSheetOpen(false);
    resetStoryComposer();
  };

  const closeStoryExplicit = React.useCallback(() => {
    try {
      localStorage.removeItem('vibes.storyViewerSession.v1');
    } catch (e) {}

    setStorySession({ isOpen: false, activeStoryId: null, currentTime: 0, paused: false });

    setActiveStorySnapshot(null);
    setActiveStorySequence(null);
    setCurrentStoryViewers([]);
  }, []);

  React.useEffect(() => {
    if (!storySession?.activeStoryId) return;
    safeWriteStoryViewerSession({
      activeStoryId: storySession.activeStoryId,
      currentTime: storySession.currentTime,
      paused: storySession.paused,
      isOpen: storySession.isOpen
    });
  }, [storySession.activeStoryId, storySession.currentTime, storySession.paused, storySession.isOpen]);

  const handleViewStory = (story, sequence = null) => {
    const rawStories = Array.isArray(sequence) && sequence.length > 0 ? sequence : story ? [story] : [];
    const normalized = normalizeStories(rawStories);

    if (!normalized.length) return;

    const targetId = story?.id || story?.storyId || null;
    const resolvedIndex = Math.max(0, Math.min(normalized.length - 1, normalized.findIndex((s) => `${s.id}` === `${targetId}`)));

    setActiveStorySnapshot(normalized[resolvedIndex >= 0 ? resolvedIndex : 0]);
    setActiveStorySequence({ stories: normalized, index: resolvedIndex >= 0 ? resolvedIndex : 0 });

    setStorySession({ isOpen: true, activeStoryId: normalized[resolvedIndex >= 0 ? resolvedIndex : 0].id, currentTime: 0, paused: false });
  };

  const handleStoryView = async (_storyId) => {
    setCurrentStoryViewers([]);
  };

  const handleReaction = async (_storyId, _emoji) => {
    return;
  };

  const handleStoryReply = async ({ storyId, targetUserId, text, type }) => {
    try {
      const story = activeStories.find(s => s.id === storyId);
      const vibe = {
        id: targetUserId,
        displayName: story?.displayName || 'Vibe',
        avatarUrl: story?.avatarUrl || '',
        city: story?.city,
        bio: story?.bio,
        birthday: story?.birthday
      };

      setActiveConversationVibe(vibe);
      setActiveTab('messages');
      setActivePanel('messages');

      try {
        localStorage.setItem(
          'vibes_pending_story_reply',
          JSON.stringify({ storyId, targetUserId, text, type: type || 'story_reply', createdAt: new Date().toISOString() })
        );
      } catch (e) {}
    } catch (e) {}
  };

  const getStoriesInsertableColumns = React.useCallback(async () => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('stories').select('*').limit(1);
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : null;
      if (!row || typeof row !== 'object') return null;
      return new Set(Object.keys(row));
    } catch (err) {
      console.warn('Could not introspect stories schema; falling back to safe defaults.', err);
      return null;
    }
  }, []);

  const handleAddStory = async (storyData) => {
    const dbUserId = authUserId;

    try {
      const actualFile = storyData?.file;
      if (!(actualFile instanceof File)) {
        throw new Error('No file selected.');
      }

      const type = (actualFile.type || '').toLowerCase();
      const originalName = (actualFile.name || '').toLowerCase();

      const isVideo =
        type.startsWith('video/') ||
        /\.(mp4|mov|m4v|webm|ogg)$/i.test(originalName);

      const isImage =
        type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(originalName);

      if (!isVideo && !isImage) {
        throw new Error('Invalid file type.');
      }

      if (!supabase || !dbUserId) {
        throw new Error('You must be signed in to post a story.');
      }

      const mediaType = isVideo ? 'video' : 'image';
      const detectedIsVideo = isVideo;
      const caption = typeof storyData?.caption === 'string' ? storyData.caption : '';
      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const extFromName = (actualFile.name || '').split('.').pop();
      const extFromType = isImage
        ? type.includes('png')
          ? 'png'
          : type.includes('webp')
            ? 'webp'
            : type.includes('gif')
              ? 'gif'
              : type.includes('heic')
                ? 'heic'
                : type.includes('heif')
                  ? 'heif'
                  : 'jpg'
        : type.includes('mp4')
          ? 'mp4'
          : type.includes('quicktime')
            ? 'mov'
            : type.includes('webm')
              ? 'webm'
              : 'mp4';

      const fileExt = (extFromName && extFromName.length <= 8 ? extFromName : extFromType).toLowerCase();
      const fileName = `${crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${dbUserId}/${fileName}`;

      /* IMPORTANT:
         WE UPLOAD THE ORIGINAL FILE DIRECTLY.
         NO canvas
         NO toBlob
         NO toDataURL
         NO compression
         NO resize
      */
      const { error: uploadError } = await supabase.storage.from('stories').upload(filePath, actualFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: actualFile.type || undefined
      });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('stories').getPublicUrl(filePath);
      const mediaUrl = publicData?.publicUrl;

      if (!mediaUrl || typeof mediaUrl !== 'string' || !/^https?:\/\//.test(mediaUrl)) {
        throw new Error('Upload succeeded but returned an invalid media URL.');
      }

      const schemaCols = await getStoriesInsertableColumns();
      const hasCol = (col) => !schemaCols || schemaCols.has(col);

      const rawInsert = {
        user_id: dbUserId,
        media_url: mediaUrl,
        caption,
        media_type: mediaType,
        type: mediaType,
        created_at: nowIso,
        expires_at: expiresIso,
        visibility: undefined
      };

      const storyInsert = {};
      Object.keys(rawInsert).forEach((k) => {
        if (rawInsert[k] === undefined) return;
        if (!hasCol(k)) return;
        storyInsert[k] = rawInsert[k];
      });

      if (!schemaCols) {
        const minimal = { user_id: dbUserId, media_url: mediaUrl, caption };
        if (hasCol('media_type')) minimal.media_type = mediaType;
        if (hasCol('created_at')) minimal.created_at = nowIso;
        if (hasCol('expires_at')) minimal.expires_at = expiresIso;
        if (!minimal.media_type && hasCol('type')) minimal.type = mediaType;

        Object.keys(minimal).forEach((k) => {
          if (minimal[k] === undefined) delete minimal[k];
        });

        Object.keys(storyInsert).forEach((k) => delete storyInsert[k]);
        Object.assign(storyInsert, minimal);
      }

      const { data: inserted, error: dbError } = await supabase
        .from('stories')
        .insert(storyInsert)
        .select('id')
        .maybeSingle();

      if (dbError) throw dbError;
      if (!inserted?.id) throw new Error('Story saved failed.');

      const localStory = {
        id: inserted.id,
        userId: dbUserId,
        displayName: profileData.displayName || 'You',
        avatarUrl: profileData.avatarUrl || '',
        imageUrl: mediaUrl,
        mediaUrl,
        caption,
        timestamp: new Date(nowIso).getTime(),
        createdAt: nowIso,
        isVideo: !!detectedIsVideo,
        mediaType: detectedIsVideo ? 'video' : 'image'
      };

      setStories((prev) => {
        const combined = [localStory, ...(Array.isArray(prev) ? prev : [])];
        return dedupeStoriesById(combined);
      });

      showToast('Story posted');

      try {
        const waveBase =
          (profileData &&
            Number.isFinite(Number(profileData.latitude)) &&
            Number.isFinite(Number(profileData.longitude)))
            ? { lat: Number(profileData.latitude), lng: Number(profileData.longitude) }
            : null;

        if (waveBase) {
          window.dispatchEvent(
            new CustomEvent('vibes:story-posted-wave', {
              detail: {
                lat: waveBase.lat,
                lng: waveBase.lng,
                color: 'bg-blue-400'
              }
            })
          );
        }
      } catch (e) {}

      setTimeout(() => {
        fetchStories().catch((err) => {
          console.error('Background fetchStories failed:', err);
        });
      }, 0);
    } catch (err) {
      console.error('Error posting story:', err);
      throw new Error(err?.message ? err.message : 'Story upload failed.');
    }
  };

  const handleDeleteStory = async (storyId) => {
    const dbUserId = authUserId;
    if (!supabase || !dbUserId) return;

    try {
      if (typeof storyId === 'string' && storyId.startsWith('s') && storyId.length < 20) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        showToast('Story deleted');
        return;
      }

      const { error } = await supabase.from('stories').delete().eq('id', storyId).eq('user_id', dbUserId);

      if (error) throw error;

      setStories(prev => prev.filter(s => s.id !== storyId));
      showToast('Story deleted');
    } catch (err) {
      console.error('Error deleting story:', err);
      showToast('Failed to delete story');
    }
  };

  const handlePhotoUpload = async (file) => {
    const dbUserId = authUserId;
    if (!supabase || !dbUserId) return '';

    try {
      const rawExt = (file?.name || 'jpg').split('.').pop() || 'jpg';
      const safeExt = String(rawExt).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const version = Date.now();
      const fileName = `avatar_${version}.${safeExt}`;
      const filePath = `${dbUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file?.type || undefined,
          cacheControl: '0'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = (data?.publicUrl || '').toString().trim();
      const finalUrl = publicUrl ? `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}v=${version}` : '';

      if (!finalUrl) {
        throw new Error('Upload succeeded but no public URL was returned.');
      }

      setProfileData((prev) => {
        const next = {
          ...prev,
          avatarUrl: finalUrl,
          avatar_url: finalUrl
        };

        try {
          localStorage.setItem('vibes_profile', JSON.stringify(next));
        } catch (e) {}

        return next;
      });

      await saveProfile({
        avatarUrl: finalUrl,
        avatar_url: finalUrl
      });

      showToast('Photo updated');
      return finalUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      showToast(err?.message || 'Upload failed');
      return '';
    }
  };

  // Settings should autosave silently and must NOT navigate away on toggle changes.
  // Navigation back to the map should happen ONLY when the user taps the Close button.
  const handleSaveSettings = async (updatedProfile, opts = {}) => {
    try {
      await saveProfile(updatedProfile);

      if (opts?.silent) return;

      showToast('Changes saved');
      closePanel();
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast(err?.message || 'Could not save changes');
    }
  };

  const handleLiveUpdate = (updatedFields) => {
    setProfileData(prev => {
      const next = {
        ...prev,
        ...updatedFields,
        interestedIn: updatedFields.interestedIn ?? prev.interestedIn,
        interested_in: updatedFields.interestedIn ?? prev.interested_in,
        lookingFor: updatedFields.lookingFor
          ? (Array.isArray(updatedFields.lookingFor) ? updatedFields.lookingFor : [updatedFields.lookingFor])
          : prev.lookingFor,
        looking_for: updatedFields.lookingFor ?? prev.looking_for
      };

      try {
        localStorage.setItem('vibes_profile', JSON.stringify(next));
      } catch (e) {}

      return next;
    });
  };

  const blockUser = async (userId) => {
    const newBlocked = [...blockedUserIds, userId];
    setBlockedUserIds(newBlocked);
    localStorage.setItem('vibes_blocked_users', JSON.stringify(newBlocked));

    if (selectedVibe?.id === userId) closePanel();
    if (activeConversationVibe?.id === userId) setActiveConversationVibe(null);

    showToast('User blocked');
    setConfirmation(null);

    const dbUserId = authUserId;
    if (supabase && dbUserId) {
      try {
        await supabase.from('blocks').insert({ blocker_id: dbUserId, blocked_id: userId });
      } catch (err) {
        console.error('Error blocking user in Supabase:', err);
      }
    }
  };

  const unblockUser = async (userId) => {
    const newBlocked = blockedUserIds.filter(id => id !== userId);
    setBlockedUserIds(newBlocked);
    localStorage.setItem('vibes_blocked_users', JSON.stringify(newBlocked));
    showToast('User unblocked');

    const dbUserId = authUserId;
    if (supabase && dbUserId) {
      try {
        await supabase.from('blocks').delete().eq('blocker_id', dbUserId).eq('blocked_id', userId);
      } catch (err) {
        console.error('Error unblocking user in Supabase:', err);
      }
    }
  };

  const reportUser = async (userId, reason) => {
    showToast('Report sent');
    setReportingUser(null);

    const dbUserId = authUserId;
    if (supabase && dbUserId) {
      try {
        await supabase.from('reports').insert({ reporter_id: dbUserId, reported_user_id: userId, reason });
      } catch (err) {
        console.error('Error reporting user in Supabase:', err);
      }
    }
  };

  const removeConversation = async (conversationId) => {
    const newHidden = [...hiddenConversationIds, conversationId];
    setHiddenConversationIds(newHidden);
    localStorage.setItem('vibes_hidden_conversations', JSON.stringify(newHidden));

    setActiveConversationVibe(null);
    showToast('Conversation removed');
    setConfirmation(null);
  };

  const cleanupActivity = React.useCallback(async () => {
    const dbUserId = authUserId;
    if (!supabase || !dbUserId) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await supabase.from('stories').delete().eq('user_id', dbUserId).lt('created_at', sevenDaysAgo);
    } catch (err) {
      console.error('Error during activity cleanup:', err);
    }
  }, [supabase, authUserId]);

  React.useEffect(() => {
    if (authUserId && !showOnboarding && !showIdentity) {
      cleanupActivity();
    }
  }, [authUserId, showOnboarding, showIdentity, cleanupActivity]);

  const panelBody = () => {
    if (activePanel === 'mood') return html`<${MoodView} selectedMood=${selectedMood} setSelectedMood=${setSelectedMood} onDone=${closePanel} />`;
    if (activePanel === 'messages')
      return html`<${MessagesView}
        key=${`messages_${messagesViewNonce}_${activeConversationVibe?.id || 'inbox'}_${activeConversationVibe?.__openNonce || 'base'}`}
        supabase=${supabase}
        currentUser=${profileData}
        activeConversationVibe=${activeConversationVibe}
        onClose=${closePanel}
        onBackToInbox=${() => setActiveConversationVibe(null)}
        onSelectConversation=${(rawVibe) => {
          const safe = rawVibe && typeof rawVibe === 'object' ? rawVibe : {};

          const resolvedId = (
            safe.id ??
            safe.userId ??
            safe.user_id ??
            safe.otherUser?.id ??
            ''
          ).toString().trim();

          if (!resolvedId) return;

          const resolvedAvatar = (
            safe.avatarUrl ??
            safe.avatar_url ??
            safe.otherUser?.avatar_url ??
            safe.otherUser?.avatarUrl ??
            selectedVibe?.avatarUrl ??
            selectedVibe?.avatar_url ??
            ''
          ).toString().trim();

          const resolvedDisplayName = (
            safe.displayName ??
            safe.display_name ??
            safe.otherUser?.display_name ??
            safe.otherUser?.displayName ??
            'Vibe'
          ).toString().trim() || 'Vibe';

          const resolvedCity = (
            safe.city ??
            safe.otherUser?.city ??
            ''
          ).toString();

          const resolvedBio = (
            safe.bio ??
            safe.otherUser?.bio ??
            ''
          ).toString();

          const resolvedBirthday = (
            safe.birthday ??
            safe.birth_date ??
            safe.otherUser?.birth_date ??
            safe.otherUser?.birthday ??
            ''
          ).toString();

          const resolvedLookingForRaw =
            safe.lookingFor ??
            safe.looking_for ??
            safe.otherUser?.looking_for ??
            safe.otherUser?.lookingFor ??
            [];

          const resolvedLookingFor = Array.isArray(resolvedLookingForRaw)
            ? resolvedLookingForRaw
            : (resolvedLookingForRaw ? [resolvedLookingForRaw] : []);

          const normalizedConversationVibe = {
            id: resolvedId,
            userId: resolvedId,
            user_id: resolvedId,
            displayName: resolvedDisplayName,
            display_name: resolvedDisplayName,
            avatarUrl: resolvedAvatar,
            avatar_url: resolvedAvatar,
            city: resolvedCity,
            bio: resolvedBio,
            birthday: resolvedBirthday,
            birth_date: resolvedBirthday,
            lookingFor: resolvedLookingFor,
            looking_for: resolvedLookingFor,
            energy: safe.energy ?? safe.otherUser?.energy ?? 'Vibes',
            isOnline:
              typeof (safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online) === 'boolean'
                ? (safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online)
                : !!(safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online),
            lastSeen: (
              safe.lastSeen ??
              safe.last_seen ??
              safe.otherUser?.last_seen ??
              ''
            ).toString(),
            __openNonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`
          };

          setMessagesViewNonce((n) => n + 1);
          setActiveConversationVibe(normalizedConversationVibe);
        }}
        onViewProfile=${(rawVibe) => {
          const safe = rawVibe && typeof rawVibe === 'object' ? rawVibe : {};

          const resolvedId = (
            safe.id ??
            safe.userId ??
            safe.user_id ??
            safe.otherUser?.id ??
            ''
          ).toString().trim();

          if (!resolvedId) return;

          const resolvedAvatar = (
            safe.avatarUrl ??
            safe.avatar_url ??
            safe.otherUser?.avatar_url ??
            safe.otherUser?.avatarUrl ??
            ''
          ).toString().trim();

          openVibeProfile({
            id: resolvedId,
            userId: resolvedId,
            user_id: resolvedId,
            displayName: (
              safe.displayName ??
              safe.display_name ??
              safe.otherUser?.display_name ??
              safe.otherUser?.displayName ??
              'Vibe'
            ).toString().trim() || 'Vibe',
            avatarUrl: resolvedAvatar,
            avatar_url: resolvedAvatar,
            city: (
              safe.city ??
              safe.otherUser?.city ??
              ''
            ).toString(),
            bio: (
              safe.bio ??
              safe.otherUser?.bio ??
              ''
            ).toString(),
            birthday: (
              safe.birthday ??
              safe.birth_date ??
              safe.otherUser?.birth_date ??
              safe.otherUser?.birthday ??
              ''
            ).toString(),
            lookingFor:
              Array.isArray(
                safe.lookingFor ??
                safe.looking_for ??
                safe.otherUser?.looking_for ??
                safe.otherUser?.lookingFor
              )
                ? (
                    safe.lookingFor ??
                    safe.looking_for ??
                    safe.otherUser?.looking_for ??
                    safe.otherUser?.lookingFor
                  )
                : (
                    safe.lookingFor ??
                    safe.looking_for ??
                    safe.otherUser?.looking_for ??
                    safe.otherUser?.lookingFor
                  )
                  ? [(
                      safe.lookingFor ??
                      safe.looking_for ??
                      safe.otherUser?.looking_for ??
                      safe.otherUser?.lookingFor
                    )]
                  : [],
            isOnline:
              typeof (safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online) === 'boolean'
                ? (safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online)
                : !!(safe.isOnline ?? safe.is_online ?? safe.otherUser?.is_online),
            lastSeen: (
              safe.lastSeen ??
              safe.last_seen ??
              safe.otherUser?.last_seen ??
              ''
            ).toString(),
            energy: safe.energy ?? safe.otherUser?.energy ?? 'Vibes'
          });
        }}
        onGoToMap=${() => openPanel('map')}
        blockedUserIds=${blockedUserIds}
        hiddenConversationIds=${hiddenConversationIds}
        onBlockUser=${(userId) => setConfirmation({ type: 'block', userId })}
        onReportUser=${(userId) => setReportingUser(userId)}
        onRemoveConversation=${(convId) => setConfirmation({ type: 'remove_conv', convId })}
      />`;

    if (activePanel === 'profile') {
      const currentProfile = selectedVibe || profileData;
      const profileStories = activeStories.filter(s => s.userId === currentProfile.id);
      return html`<${ProfileView}
        profileData=${currentProfile}
        currentUserLocation=${{ lat: profileData.latitude, lng: profileData.longitude }}
        isOwnProfile=${!selectedVibe}
        stories=${profileStories}
        connectionStatus=${connectionStatus}
        onOpenEditProfile=${() => openPanel('edit-profile')}
        onOpenSettings=${() => openPanel('settings')}
        onOpenActivity=${() => openPanel('activity')}
        onSendMessage=${handleSendMessage}
        onViewStory=${(story) => handleViewStory(story, profileStories)}
        onBlockUser=${() => setConfirmation({ type: 'block', userId: currentProfile.id })}
        onReportUser=${() => setReportingUser(currentProfile.id)}
        viewerCount=${!selectedVibe ? userStoryViewerCount : 0}
        onRequestLogout=${() => setShowLogoutConfirm(true)}
        onUpdateProfile=${saveProfile}
      />`;
    }

    if (activePanel === 'edit-profile')
      return html`<${EditProfileView}
        profileData=${profileData}
        onSave=${handleSaveSettings}
        onPhotoChange=${async (avatarUrl, file) => {
          if (file) {
            return await handlePhotoUpload(file);
          }

          await saveProfile({ avatarUrl });
          return avatarUrl;
        }}
        onClose=${closePanel}
        onDiscardChanges=${() => {
          try {
            localStorage.setItem('vibes_profile', JSON.stringify(profileData));
          } catch (e) {}
          setProfileData(profileData);
          closePanel();
        }}
      />`;

    if (activePanel === 'settings')
      return html`<${SettingsView}
        profileData=${profileData}
        onSave=${handleSaveSettings}
        onClose=${closePanel}
        onDiscardChanges=${() => {
          try {
            localStorage.setItem('vibes_profile', JSON.stringify(profileData));
          } catch (e) {}
          setProfileData(profileData);
          closePanel();
        }}
        blockedUserIds=${blockedUserIds}
        onUnblockUser=${unblockUser}
      />`;

    if (activePanel === 'activity')
      return html`<${ActivityPanel}
        supabase=${supabase}
        currentUser=${profileData}
        onOpenVibe=${openVibeProfile}
        onClose=${closePanel}
        lastActivityViewedAt=${lastActivityViewedAt}
      />`;

    return null;
  };

  const hasRealSession =
    !!authReady &&
    !!authUserId &&
    !!supabase &&
    !!supabase.auth &&
    typeof supabase.auth.getUser === 'function';

  const showChrome =
    hasRealSession &&
    !showOnboarding &&
    !showIdentity &&
    !isStoryCreatorOpen;

  const isMainMapView =
    hasRealSession &&
    !showOnboarding &&
    !showIdentity;

  const isMapScreenActive =
    hasRealSession &&
    activeTab === 'map' &&
    !activePanel &&
    !isStoryCreatorOpen &&
    !showOnboarding &&
    !showIdentity;

  React.useEffect(() => {
    if (isMapScreenActive && !wasMapScreenActiveRef.current) {
      setResumeToken((t) => t + 1);
    }

    wasMapScreenActiveRef.current = isMapScreenActive;
  }, [isMapScreenActive]);

  React.useEffect(() => {
    return () => {
      cleanupInitialStoryObjectUrl();
    };
  }, [cleanupInitialStoryObjectUrl]);

  if (!authReady) {
    return html`
      <${MapStateProvider}>
        <${SavedPlacesProvider} currentUserId=${profileData.id}>
          <${OrientationLock} />
          <div
            className="w-screen bg-black text-white flex flex-col overflow-hidden safe-area-left safe-area-right"
            style=${{
              height: '100vh',
              height: '100dvh',
              minHeight: '100vh',
              minHeight: '100dvh',
              maxHeight: '100vh',
              maxHeight: '100dvh',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div className="vibes-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
              <div className="vibes-loading-card">
                <div className="vibes-loading-mark">VIBES</div>
                <div className="vibes-loading-spinner" aria-hidden="true"></div>
                <div className="vibes-loading-sub">Loading</div>
                <div className="vibes-loading-dots" aria-hidden="true">
                  <span className="vibes-loading-dot"></span>
                  <span className="vibes-loading-dot"></span>
                  <span className="vibes-loading-dot"></span>
                </div>
              </div>
            </div>
          </div>
        </${SavedPlacesProvider}>
      </${MapStateProvider}>
    `;
  }

  if (isLandscape) {
    return html`
      <${MapStateProvider}>
        <${SavedPlacesProvider} currentUserId=${profileData.id}>
          <${LandscapeBlocker} />
        </${SavedPlacesProvider}>
      </${MapStateProvider}>
    `;
  }

  if (!hasRealSession && !showOnboarding && !showIdentity && !isPasswordRecovery) {
    return html`
      <${MapStateProvider}>
        <${SavedPlacesProvider} currentUserId=${profileData.id}>
          <${OrientationLock} />
          <div
            className="w-screen bg-black text-white flex flex-col overflow-hidden safe-area-left safe-area-right"
            style=${{
              height: '100vh',
              height: '100dvh',
              minHeight: '100vh',
              minHeight: '100dvh',
              maxHeight: '100vh',
              maxHeight: '100dvh',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <${IdentityStep}
              profileData=${profileData}
              onLiveUpdate=${handleLiveUpdate}
              onFinish=${handleFinishIdentity}
              isPasswordRecovery=${false}
            />
          </div>
        </${SavedPlacesProvider}>
      </${MapStateProvider}>
    `;
  }

  return html`
    <${MapStateProvider}>
      <${SavedPlacesProvider} currentUserId=${profileData.id}>
        <${OrientationLock} />
        <div
          className="w-screen bg-black text-white flex flex-col overflow-hidden safe-area-left safe-area-right"
          style=${{
            height: '100vh',
            height: '100dvh',
            minHeight: '100vh',
            minHeight: '100dvh',
            maxHeight: '100vh',
            maxHeight: '100dvh',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          ${!authReady && html`
            <div className="vibes-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
              <div className="vibes-loading-card">
                <div className="vibes-loading-mark">VIBES</div>
                <div className="vibes-loading-spinner" aria-hidden="true"></div>
                <div className="vibes-loading-sub">Loading</div>
                <div className="vibes-loading-dots" aria-hidden="true">
                  <span className="vibes-loading-dot"></span>
                  <span className="vibes-loading-dot"></span>
                  <span className="vibes-loading-dot"></span>
                </div>
              </div>
            </div>
          `}
          ${authReady && showOnboarding && html`<${Onboarding} onFinish=${handleFinishOnboarding} />`}
          ${authReady && !showOnboarding && showIdentity && html`
            <${IdentityStep}
              profileData=${profileData}
              onLiveUpdate=${handleLiveUpdate}
              onFinish=${handleFinishIdentity}
              isPasswordRecovery=${isPasswordRecovery}
            />
          `}

          ${showChrome && hasRealSession && html`<${Header}
            selectedMood=${selectedMood}
            activePanel=${activePanel}
            openProfile=${() => openPanel('profile')}
            openActivity=${() => openPanel('activity')}
            openPanel=${openPanel}
            profileData=${profileData}
            stories=${activeStories}
            onViewStory=${handleViewStory}
            onOpenAddStory=${() => {
              setIsActionSheetOpen(false);
              cleanupInitialStoryObjectUrl();
              setStoryFile(null);
              setInitialStoryImage(null);
              setInitialStoryIsVideo(false);
              setIsStoryCreatorOpen(true);
            }}
            viewerCount=${userStoryViewerCount}
            activityUnreadCount=${activityUnreadCount}
          />`}

          <main
            className="flex-1 relative overflow-hidden mb-0"
            style=${{
              minHeight: 0,
              overscrollBehavior: 'none'
            }}
          >
            ${hasRealSession && html`
              <${MapView}
                isActive=${activeTab === 'map' && !activePanel && !isStoryCreatorOpen}
                isMainMapView=${isMainMapView}
                isActionSheetOpen=${false}
                supabase=${supabase}
                currentUser=${profileData}
                selectedMood=${selectedMood}
                onOpenVibe=${openVibeProfile}
                stories=${activeStories}
                onViewStory=${handleViewStory}
                onOpenActionSheet=${() => {
                  setIsActionSheetOpen(false);
                  cleanupInitialStoryObjectUrl();
                  setStoryFile(null);
                  setInitialStoryImage(null);
                  setInitialStoryIsVideo(false);
                  setIsStoryCreatorOpen(true);
                }}
                onOpenActivity=${() => openPanel('activity')}
                onLocationUpdate=${handleLocationUpdate}
                blockedUserIds=${blockedUserIds}
                resumeToken=${resumeToken}
                storyOpen=${storySession.isOpen}
                activeStory=${activeStorySnapshot}
              />
            `}

            ${authReady && !hasRealSession && !showOnboarding && !showIdentity && html`
              <div
                className="absolute inset-0 flex items-center justify-center bg-black text-white"
                style=${{
                  zIndex: 20
                }}
              >
                <div className="text-center px-6">
                  <div className="text-[11px] font-black tracking-[0.22em] uppercase text-white/42">Session required</div>
                  <div className="mt-2 text-[16px] font-black tracking-tight text-white/90">Please sign in again</div>
                </div>
              </div>
            `}
          </main>

          ${showChrome && hasRealSession && html`<${BottomNav} activeTab=${activeTab} openPanel=${openPanel} unreadCount=${unreadCount} />`}

          <${Panel}
            isOpen=${!!activePanel}
            onClose=${closePanel}
            variant=${activePanel === 'mood'
              ? 'mood'
              : activePanel === 'messages'
                ? (activeConversationVibe ? 'messages' : 'messages-empty')
                : activePanel === 'activity'
                  ? 'activity'
                  : 'default'
            }
            title=${
              activePanel === 'edit-profile' ? 'Edit Profile' :
              activePanel === 'settings' ? 'Settings' :
              activePanel === 'profile' ? 'Profile' :
              activePanel === 'messages' ? 'Messages' :
              activePanel === 'mood' ? 'Discover' :
              activePanel === 'activity' ? 'Match' : ''
            }
          >
            ${panelBody()}
          </${Panel}>

          <${ActionSheet}
            isOpen=${false}
            onClose=${() => setIsActionSheetOpen(false)}
            onAddStory=${() => {
              setIsActionSheetOpen(false);
              cleanupInitialStoryObjectUrl();
              setStoryFile(null);
              setInitialStoryImage(null);
              setInitialStoryIsVideo(false);
              setIsStoryCreatorOpen(true);
            }}
          />

          <${VisibilitySheet}
            isOpen=${isVisibilitySheetOpen}
            isVisible=${profileData?.isVisible !== false}
            onClose=${() => setIsVisibilitySheetOpen(false)}
            onSelect=${handleSelectVisibility}
          />

          <${StoryCreator}
            isOpen=${isStoryCreatorOpen}
            initialImage=${initialStoryImage}
            initialIsVideo=${initialStoryIsVideo}
            initialFile=${storyFile}
            onClose=${resetStoryComposer}
            onPost=${handleAddStory}
          />

          ${isMainMapView && storySession.isOpen && activeStorySequence?.stories?.length > 0 && html`
            <${StoryViewer}
              stories=${activeStorySequence.stories}
              initialIndex=${activeStorySequence.index || 0}
              currentUserId=${profileData.id}
              onClose=${closeStoryExplicit}
              onStoryView=${handleStoryView}
              onReaction=${handleReaction}
              onReply=${handleStoryReply}
              onDelete=${handleDeleteStory}
              onOpenProfile=${openVibeProfile}
            />
          `}

          <Toast message=${toast.message} isVisible=${toast.visible} />

          ${isMessageNotificationsEnabled ? html`
            <${InAppNotification}
              notification=${inAppNotification}
              onClick=${() => handleNotificationClick(inAppNotification)}
              onClose=${() => setInAppNotification(null)}
            />
          ` : null}

          <${ConfirmationModal}
            isOpen=${!!confirmation}
            title=${confirmation?.type === 'block'
              ? 'Block User?'
              : confirmation?.type === 'remove_conv'
                ? 'Remove Conversation?'
                : 'Delete account?'
            }
            message=${confirmation?.type === 'block'
              ? "They won't be able to see you on the map or send you messages. This action is immediate."
              : confirmation?.type === 'remove_conv'
                ? 'This conversation will be removed from your inbox. You can still message them again later.'
                : 'This will clear your local profile data and log you out.'
            }
            confirmLabel=${confirmation?.type === 'block'
              ? 'Block'
              : confirmation?.type === 'remove_conv'
                ? 'Remove'
                : 'Delete'
            }
            isDestructive=${true}
            onConfirm=${() => {
              if (confirmation?.type === 'block') return blockUser(confirmation.userId);
              if (confirmation?.type === 'remove_conv') return removeConversation(confirmation.convId);
              if (confirmation?.type === 'delete_account') {
                setConfirmation(null);
                try {
                  localStorage.removeItem('vibes_profile');
                  localStorage.removeItem('vibes_blocked_users');
                  localStorage.removeItem('vibes_hidden_conversations');
                } catch (e) {}
                return handleLogout();
              }
            }}
            onCancel=${() => setConfirmation(null)}
          />

          <${ReportSheet}
            isOpen=${!!reportingUser}
            onClose=${() => setReportingUser(null)}
            onSubmit=${(reason) => reportUser(reportingUser, reason)}
          />

          ${showLogoutConfirm && html`
            <div className="fixed inset-0 z-[400] flex items-center justify-center px-6">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick=${() => setShowLogoutConfirm(false)}
              ></div>

              <div className="relative w-full max-w-[20rem] rounded-[2rem] border border-white/10 bg-[#161b2c]/95 p-7 shadow-2xl animate-slide-up">
                <div className="text-center">
                  <h3 className="text-white text-lg font-black tracking-tight">Log out?</h3>
                  <p className="text-white/50 text-sm leading-relaxed mt-1.5">
                    You’ll need to sign in again to enter the map.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick=${confirmLogout}
                    className="h-14 rounded-2xl font-black tracking-[0.2em] uppercase text-[12px] bg-rose-600 text-white shadow-lg shadow-rose-600/20 tap-feedback"
                  >
                    Log out
                  </button>
                  <button
                    type="button"
                    onClick=${() => setShowLogoutConfirm(false)}
                    className="h-14 rounded-2xl font-black tracking-[0.2em] uppercase text-[12px] border border-white/5 bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/60 tap-feedback"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          `}
        </div>
      </${SavedPlacesProvider}>
    </${MapStateProvider}>
  `;
}

export { getUserId, isVideoMedia, Header, BottomNav, ActionSheet, VisibilitySheet, Toast, InAppNotification, ConfirmationModal, ReportSheet, STORY_SESSION_KEY, safeReadStoryViewerSession, safeWriteStoryViewerSession };
