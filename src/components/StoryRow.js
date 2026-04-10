/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import StoryTile from './StoryTile.js';

export default function StoryRow({
  stories = [],
  relevanceVibes = [],
  currentUserId = null,
  isMapDragging = false,
  onViewStory,
  getStoryUserId,
  getStoryMediaUrl,
  isStoryEligible
}) {
  const visibleStories = React.useMemo(() => {
    const visibleVibeIds = new Set(
      (Array.isArray(relevanceVibes) ? relevanceVibes : [])
        .filter((v) => !v?.isHidden)
        .map((v) => String(v.id))
        .filter((id) => !currentUserId || id !== String(currentUserId))
    );

    const seenUsers = new Set();
    const list = [];

    (Array.isArray(stories) ? stories : []).forEach((story) => {
      const key = String(getStoryUserId?.(story) || '');
      if (!key) return;
      if (currentUserId && key === String(currentUserId)) return;
      if (seenUsers.has(key)) return;
      if (!visibleVibeIds.has(key)) return;
      if (!isStoryEligible?.(story)) return;

      const src = getStoryMediaUrl?.(story);
      if (!src) return;

      seenUsers.add(key);
      list.push({ key, story, src });
    });

    return list;
  }, [stories, relevanceVibes, currentUserId, getStoryUserId, getStoryMediaUrl, isStoryEligible]);

  if (visibleStories.length === 0) return null;

  const dragRowOpacity = isMapDragging ? 0.84 : 1;

  return html`
    <div
      className=${`vibes-stories-row pointer-events-auto ${isMapDragging ? 'is-dragging' : ''}`}
      style=${{
        pointerEvents: 'auto',
        position: 'absolute',
        top: '8px',
        left: '176px',
        right: '92px',
        zIndex: 1002,
        paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
        overflow: 'visible',
        opacity: dragRowOpacity,
        filter: isMapDragging ? 'saturate(0.92) contrast(0.98)' : 'none'
      }}
      aria-label="Recent Stories"
    >
      <div
        className="vibes-stories-scroll"
        style=${{
          overflowX: 'auto',
          overflowY: 'visible',
          paddingTop: '8px',
          paddingBottom: '2px',
          paddingLeft: '2px',
          paddingRight: '6px',
          gap: '14px'
        }}
      >
        ${visibleStories.map(({ key, story, src }) => {
          const isActive = key === String(currentUserId || '');
          const label = isActive ? '' : (story?.displayName || story?.display_name || '');

          return html`
            <${StoryTile}
              key=${key}
              story=${story}
              approvedSrc=${src}
              isActive=${isActive}
              label=${label}
              onOpen=${() => onViewStory?.(story, visibleStories.map((x) => x.story))}
              onInvalid=${() => {}}
            />
          `;
        })}
      </div>

      <style>
        .vibes-stories-row .vibes-stories-scroll {
          display: flex;
          align-items: flex-start;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .vibes-stories-row .vibes-stories-scroll::-webkit-scrollbar {
          display: none;
        }

        .vibes-stories-row .vibes-story-item {
          transform: translateZ(0);
        }

        .vibes-stories-row .vibes-story-thumb {
          width: 74px;
          height: 74px;
        }

        .vibes-stories-row .vibes-story-thumb::before {
          inset: -12px;
          opacity: 0.34;
          filter: blur(14px);
        }

        .vibes-stories-row .vibes-story-thumb::after {
          inset: -2px;
          opacity: 0.96;
        }

        .vibes-stories-row .vibes-story-media {
          box-shadow:
            0 16px 34px rgba(0,0,0,0.52),
            inset 0 0 0 1px rgba(255,255,255,0.08),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .vibes-stories-row .vibes-story-label {
          width: 78px;
          margin-top: 2px;
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.72);
        }

        .vibes-stories-row.is-dragging .vibes-story-thumb {
          filter: saturate(0.92);
        }

        .vibes-stories-row.is-dragging .vibes-story-thumb::before {
          opacity: 0.18;
          filter: blur(10px);
        }

        @media (max-width: 640px) {
          .vibes-stories-row {
            left: 170px !important;
            right: 82px !important;
          }

          .vibes-stories-row .vibes-story-thumb {
            width: 68px;
            height: 68px;
          }

          .vibes-stories-row .vibes-story-label {
            width: 72px;
            font-size: 9px;
          }
        }

        @media (max-width: 420px) {
          .vibes-stories-row {
            left: 166px !important;
            right: 78px !important;
          }

          .vibes-stories-row .vibes-story-thumb {
            width: 62px;
            height: 62px;
          }

          .vibes-stories-row .vibes-story-label {
            width: 66px;
            font-size: 8px;
          }
        }
      </style>
    </div>
  `;
}
