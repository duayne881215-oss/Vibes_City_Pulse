/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

export default function Header({
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
  const userStory = stories.find((s) => s.userId === profileData.id);

  const profilePhotoUrl =
    typeof profileData?.avatarUrl === 'string' ? profileData.avatarUrl.trim() : '';

  const fallbackAvatar =
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

  return html`
    <header className="px-4 pt-1.5 pb-1.5 border-b border-white/10 bg-black/82 backdrop-blur-sm z-50 safe-area-top safe-area-left safe-area-right">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 shrink-0">
          <div
            className="text-[17px] tracking-[0.26em] uppercase font-black bg-clip-text text-transparent leading-none"
            style=${{
              backgroundImage:
                'linear-gradient(90deg, rgba(110,231,183,0.98), rgba(16,185,129,0.96), rgba(5,150,105,0.92))',
              textShadow:
                '0 0 10px rgba(16,185,129,0.16), 0 0 22px rgba(5,150,105,0.10)'
            }}
          >
            VIBES
          </div>

          <div className="text-[26px] leading-none font-black mt-[2px] tracking-tight whitespace-nowrap">
            <span className="text-white">City </span>
            <span
              className="bg-clip-text text-transparent"
              style=${{
                backgroundImage:
                  'linear-gradient(90deg, rgba(251,113,133,0.92), rgba(190,24,93,0.94), rgba(127,29,29,0.96))',
                textShadow:
                  '0 0 8px rgba(190,24,93,0.10), 0 0 14px rgba(127,29,29,0.06)'
              }}
            >
              Pulse
            </span>
          </div>

          <div
            className="mt-[4px]"
            style=${{
              position: 'relative',
              left: '-52px'
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
                border: '1px solid rgba(16,185,129,0.16)',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.08) inset',
                outline: 'none',
                WebkitBoxShadow: '0 0 0 1px rgba(16,185,129,0.08) inset',
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
              onClick=${() => (userStory ? onViewStory(userStory) : openProfile())}
              onContextMenu=${(e) => {
                e.preventDefault();
                openProfile();
              }}
              className="w-[62px] h-[62px] rounded-full bg-transparent flex items-center justify-center overflow-visible tap-feedback shadow-lg relative z-10"
              aria-label="Open profile"
            >
              ${userStory && html`
                <span
                  aria-hidden="true"
                  className="absolute -inset-[3px] rounded-full pointer-events-none"
                  style=${{
                    border: '2px solid rgba(96,165,250,0.62)',
                    boxShadow:
                      '0 0 10px rgba(96,165,250,0.22), 0 0 16px rgba(59,130,246,0.10)'
                  }}
                ></span>
              `}

              <span
                className="w-full h-full rounded-full overflow-hidden block"
                style=${{
                  border: '1.5px solid rgba(255,255,255,0.20)',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow:
                    '0 0 0 1px rgba(59,130,246,0.10), 0 0 18px rgba(59,130,246,0.22)'
                }}
              >
                <img
                  src=${profilePhotoUrl || fallbackAvatar}
                  alt="Profile"
                  className="block w-full h-full"
                  style=${{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center'
                  }}
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
