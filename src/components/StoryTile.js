/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const getStoryUserId = (item) => item?.userId || item?.user_id || '';

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

const isVideoUrl = (u) => {
  const s = (u || '').toString().toLowerCase();
  return (
    s.endsWith('.mp4') ||
    s.endsWith('.mov') ||
    s.endsWith('.m4v') ||
    s.endsWith('.webm') ||
    s.endsWith('.ogg')
  );
};

export default function StoryTile({ story, isActive, label, onOpen, onInvalid, approvedSrc }) {
  const src =
    approvedSrc ||
    story?.mediaUrl ||
    story?.media_url ||
    story?.imageUrl ||
    story?.image_url ||
    story?.videoUrl ||
    story?.video_url ||
    story?.src ||
    story?.url ||
    '';

  const fallback = React.useMemo(() => {
    const avatar =
      story?.avatarUrl ||
      story?.avatar_url ||
      story?.userAvatarUrl ||
      story?.user_avatar_url ||
      '';
    return isValidMediaUrl(avatar) ? avatar : '';
  }, [story]);

  const finalSrc = React.useMemo(() => {
    if (!src && fallback) return fallback;
    if (!src) return '';
    if (isVideoUrl(src)) return fallback || '';
    return src;
  }, [src, fallback]);

  const safeLabel = (label || story?.displayName || story?.userName || '').toString().trim();

  if (!finalSrc) return null;

  return html`
    <button
      type="button"
      onClick=${onOpen}
      className="vibes-story-item tap-feedback"
      aria-label=${safeLabel ? `Open story: ${safeLabel}` : 'Open story'}
    >
      <div className=${`vibes-story-thumb ${isActive ? 'is-active' : ''}`}>
        <div className="vibes-story-media">
          <img
            src=${finalSrc}
            className="vibes-story-img"
            alt=""
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onError=${() => {
              onInvalid?.(getStoryUserId(story) || story?.id);
            }}
          />
        </div>
      </div>

      ${
        safeLabel
          ? html`<span className="vibes-story-label">${safeLabel}</span>`
          : null
      }
    </button>
  `;
}
