/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.ogg'];

// Minimize debug overhead in normal runtime.
const safeStoryLog = (..._args) => {
  // no-op (enable temporarily for debugging if needed)
};

const getRawStoryMediaUrl = (story) => {
  const candidates = [story?.videoUrl, story?.imageUrl, story?.media_url, story?.mediaUrl, story?.url, story?.src];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const inferStoryType = (story, mediaUrl) => {
  const explicitType = typeof story?.type === 'string' ? story.type.trim().toLowerCase() : '';
  const explicitMediaType = typeof story?.mediaType === 'string' ? story.mediaType.trim().toLowerCase() : '';
  const explicitMimeType = typeof story?.mimeType === 'string' ? story.mimeType.trim().toLowerCase() : '';
  const combined = String(explicitType || '') + ' ' + String(explicitMediaType || '') + ' ' + String(explicitMimeType || '');
  if (combined.includes('video')) return 'video';
  if (combined.includes('image')) return 'image';
  const clean = (mediaUrl || '').split('?')[0].split('#')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext)) ? 'video' : 'image';
};

const normalizeStory = (story) => {
  if (!story || typeof story !== 'object') return null;
  const id = story.id ?? story.storyId ?? story.story_id ?? null;
  if (!id) return null;
  const mediaUrl = getRawStoryMediaUrl(story);
  if (!mediaUrl) return null;
  const type = inferStoryType(story, mediaUrl);
  if (type !== 'image' && type !== 'video') return null;
  return {
    ...story,
    id,
    mediaUrl,
    type,
    user: story.user || story.displayName || story.display_name || story.username || 'Vibe',
    caption: typeof story.caption === 'string' ? story.caption : '',
    timestamp: story.timestamp || story.createdAt || story.created_at || null
  };
};

const isStoryVideo = (story) => !!story && story.type === 'video';

const formatTimeAgo = (ts) => {
  const t = typeof ts === 'number' ? ts : (ts ? new Date(ts).getTime() : Date.now());
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return String(m) + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return String(h) + 'h';
  const d = Math.floor(h / 24);
  return String(d) + 'd';
};

const getStorySessionKey = (storyId) => 'vibes.storyPlayback.' + String(storyId);

const readStorySession = (storyId) => {
  if (!storyId) return null;
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorySessionKey(storyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      activeStoryId: parsed.activeStoryId || storyId,
      currentTime: Number.isFinite(parsed.currentTime) ? parsed.currentTime : 0,
      paused: !!parsed.paused,
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now()
    };
  } catch (e) {
    return null;
  }
};

const writeStorySession = (storyId, payload) => {
  if (!storyId) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      getStorySessionKey(storyId),
      JSON.stringify({
        activeStoryId: storyId,
        currentTime: Number.isFinite(payload?.currentTime) ? payload.currentTime : 0,
        paused: !!payload?.paused,
        savedAt: Date.now()
      })
    );
  } catch (e) {
    // ignore
  }
};

const clearStorySession = (storyId) => {
  if (!storyId) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(getStorySessionKey(storyId));
  } catch (e) {
    // ignore
  }
};

const StoryFallbackCard = ({ title = 'Story unavailable', subtitle = 'This story could not be loaded.', onClose }) => html`
  <div className="absolute inset-0 flex items-center justify-center px-6 z-[60]">
    <div className="rounded-3xl border border-white/10 bg-neutral-950/85 backdrop-blur-xl px-6 py-5 text-center shadow-2xl max-w-xs w-full">
      <div className="text-white text-base font-semibold">${title}</div>
      <div className="mt-1 text-sm text-neutral-300">${subtitle}</div>
      <button
        type="button"
        onClick=${(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="mt-4 w-full h-11 rounded-2xl border border-white/10 bg-white/5 text-white/90 text-sm font-bold tap-feedback hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        Close
      </button>
    </div>
  </div>
`;

const StoryLoadingState = () => html`
  <div className="absolute inset-0 flex items-center justify-center px-6 z-[60]">
    <div className="rounded-3xl border border-white/10 bg-neutral-950/70 backdrop-blur-xl px-6 py-5 text-center shadow-2xl max-w-xs w-full">
      <div className="mx-auto h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"></div>
      <div className="mt-3 text-white text-sm font-semibold">Loading story</div>
    </div>
  </div>
`;

export default React.memo(function StoryViewer({
  stories,
  initialIndex = 0,
  currentUserId,
  onClose,
  onStoryView,
  onReaction,
  onReply,
  onDelete,
  onOpenProfile
}) {
  const normalizedStories = React.useMemo(() => {
    const incoming = Array.isArray(stories) ? stories : [];
    safeStoryLog('raw stories received count', incoming.length);
    const normalized = incoming.map(normalizeStory).filter(Boolean);
    safeStoryLog('normalized stories count', normalized.length);
    return normalized;
  }, [stories]);

  const [index, setIndex] = React.useState(() => {
    const i = Number.isFinite(initialIndex) ? initialIndex : 0;
    safeStoryLog('requested index', i);
    const resolved = Math.max(0, Math.min(i, Math.max(0, normalizedStories.length - 1)));
    safeStoryLog('resolved index', resolved);
    return resolved;
  });

  React.useEffect(() => {
    const i = Number.isFinite(initialIndex) ? initialIndex : 0;
    const resolved = Math.max(0, Math.min(i, Math.max(0, normalizedStories.length - 1)));
    setIndex(resolved);
  }, [initialIndex, normalizedStories.length]);

  const [showMenu, setShowMenu] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [showSaveHelp, setShowSaveHelp] = React.useState(false);
  const [isMediaLoading, setIsMediaLoading] = React.useState(true);
  const [mediaFailed, setMediaFailed] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [sentReaction, setSentReaction] = React.useState(null);
  const [showTapForSound, setShowTapForSound] = React.useState(false);

  const mediaTimeoutRef = React.useRef(null);
  const failSafeTimeoutRef = React.useRef(null);

  const clampedIndex = React.useMemo(() => {
    if (normalizedStories.length === 0) return 0;
    return Math.max(0, Math.min(index, normalizedStories.length - 1));
  }, [index, normalizedStories.length]);

  const story = normalizedStories[clampedIndex] || null;
  const storyId = story?.id || null;
  const isVideo = isStoryVideo(story);
  const storyOwnerId = story?.userId || story?.user_id || null;
  const isOwner = !!(story && currentUserId && storyOwnerId && String(storyOwnerId) === String(currentUserId));
  const stableMediaSrc = story?.mediaUrl || '';

  const canShowMenu = !!story;

  const videoRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const sentReactionTimeoutRef = React.useRef(null);
  const lastViewedStoryIdRef = React.useRef(null);
  const restoreTimeRef = React.useRef(0);
  const shouldResumePlayingRef = React.useRef(true);
  const lastPersistedRef = React.useRef({ storyId: null, currentTime: 0, paused: false });
  const progressSnapshotRef = React.useRef(0);
  const rafRef = React.useRef(null);
  const startRef = React.useRef(0);

  // Single safe autoplay path guard.
  const autoPlayAttemptedRef = React.useRef(false);

  // Ensure we only advance once per story end.
  const endedAdvanceRef = React.useRef({ storyId: null, didAdvance: false });

  const DURATION_MS = 6000;
  const [progress, setProgress] = React.useState(0);

  const isPaused = showMenu || showConfirm || showReport || isSaving || isMediaLoading || mediaFailed || !story;

  // Heavy-media pause/resume coordination
  const isHeavyPausedRef = React.useRef(false);

  const clearMediaTimeout = React.useCallback(() => {
    if (mediaTimeoutRef.current) {
      clearTimeout(mediaTimeoutRef.current);
      mediaTimeoutRef.current = null;
    }
  }, []);

  const clearFailSafeTimeout = React.useCallback(() => {
    if (failSafeTimeoutRef.current) {
      clearTimeout(failSafeTimeoutRef.current);
      failSafeTimeoutRef.current = null;
    }
  }, []);

  const pauseProgressLoop = React.useCallback(() => {
    if (rafRef.current) {
      try {
        cancelAnimationFrame(rafRef.current);
      } catch (e) {}
      rafRef.current = null;
    }
  }, []);

  const close = React.useCallback(() => {
    safeStoryLog('closing viewer');
    clearMediaTimeout();
    clearFailSafeTimeout();
    if (storyId) clearStorySession(storyId);
    try {
      onClose?.();
    } catch (e) {
      // silent
    }
  }, [onClose, storyId, clearMediaTimeout, clearFailSafeTimeout]);

  const resetProgressAndTimers = React.useCallback(() => {
    setProgress(0);
    startRef.current = performance.now();
    pauseProgressLoop();
    if (sentReactionTimeoutRef.current) {
      clearTimeout(sentReactionTimeoutRef.current);
      sentReactionTimeoutRef.current = null;
    }
  }, [pauseProgressLoop]);

  const findNextValidIndex = React.useCallback(
    (from, dir) => {
      const len = normalizedStories.length;
      if (len === 0) return -1;
      let i = from;
      for (let step = 0; step < len; step++) {
        i += dir;
        if (i < 0 || i >= len) break;
        const s = normalizedStories[i];
        if (s && typeof s.mediaUrl === 'string' && s.mediaUrl.trim()) return i;
      }
      return -1;
    },
    [normalizedStories]
  );

  const goPrev = React.useCallback(() => {
    resetProgressAndTimers();

    if (isVideo && videoRef.current) {
      const v = videoRef.current;

      try {
        if (v.currentTime > 1.2) {
          v.currentTime = 0;
          setProgress(0);

          requestAnimationFrame(() => {
            try {
              const p = v.play?.();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } catch (e) {}
          });

          return;
        }
      } catch (e) {}
    }

    if (storyId) clearStorySession(storyId);
    const prevValid = findNextValidIndex(clampedIndex, -1);

    if (prevValid < 0) {
      setProgress(0);

      if (isVideo && videoRef.current) {
        const v = videoRef.current;
        try {
          v.currentTime = 0;
        } catch (e) {}

        requestAnimationFrame(() => {
          try {
            const p = v.play?.();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (e) {}
        });
      }

      return;
    }

    setIndex(prevValid);
  }, [clampedIndex, resetProgressAndTimers, storyId, findNextValidIndex, isVideo]);

  const goNext = React.useCallback(() => {
    if (storyId) clearStorySession(storyId);
    const nextValid = findNextValidIndex(clampedIndex, +1);
    if (nextValid < 0) {
      close();
      return;
    }
    resetProgressAndTimers();
    setIndex(nextValid);
  }, [clampedIndex, resetProgressAndTimers, storyId, findNextValidIndex, close]);

  const advanceOnce = React.useCallback(() => {
    if (!storyId) return;
    if (endedAdvanceRef.current.storyId !== storyId) {
      endedAdvanceRef.current = { storyId, didAdvance: false };
    }
    if (endedAdvanceRef.current.didAdvance) return;
    endedAdvanceRef.current.didAdvance = true;
    goNext();
  }, [goNext, storyId]);

  React.useEffect(() => {
    if (normalizedStories.length === 0) {
      safeStoryLog('no valid stories, closing');
      close();
      return;
    }
    if (!storyId || !stableMediaSrc) {
      safeStoryLog('story missing stable media, waiting for next render');
      return;
    }
  }, [normalizedStories.length, storyId, stableMediaSrc, close]);

  React.useEffect(() => {
    safeStoryLog('current story id', story?.id || null);
    safeStoryLog('current media url', story?.mediaUrl || '');
  }, [story?.id, story?.mediaUrl]);

  React.useEffect(() => {
    progressSnapshotRef.current = progress;
  }, [progress]);

  const persistCurrentStorySession = React.useCallback(
    (overrides = {}) => {
      if (!storyId) return;
      const v = videoRef.current;
      const currentTime = Number.isFinite(overrides.currentTime)
        ? overrides.currentTime
        : (v && Number.isFinite(v.currentTime)
            ? v.currentTime
            : lastPersistedRef.current.storyId === storyId
              ? lastPersistedRef.current.currentTime
              : 0);
      const paused = typeof overrides.paused === 'boolean' ? overrides.paused : (v ? !!v.paused : !!lastPersistedRef.current.paused);

      lastPersistedRef.current = { storyId, currentTime, paused };
      writeStorySession(storyId, { currentTime, paused });
    },
    [storyId]
  );

  React.useEffect(() => {
    if (!story) return;
    if (lastViewedStoryIdRef.current === story.id) return;
    lastViewedStoryIdRef.current = story.id;
    try {
      onStoryView?.(story.id);
    } catch (e) {
      // silent
    }
  }, [story?.id, onStoryView, story]);

  React.useEffect(() => {
    if (!storyId) return;
    const saved = readStorySession(storyId);
    restoreTimeRef.current = saved?.activeStoryId === storyId ? Math.max(0, saved.currentTime || 0) : 0;
    shouldResumePlayingRef.current = saved?.activeStoryId === storyId ? !saved.paused : true;
    lastPersistedRef.current = {
      storyId,
      currentTime: restoreTimeRef.current,
      paused: !shouldResumePlayingRef.current
    };

    // Reset per-story end guard.
    endedAdvanceRef.current = { storyId, didAdvance: false };
  }, [storyId]);

  // Persist session lightly while playing so resume is consistent.
  React.useEffect(() => {
    if (!storyId) return;
    if (!isVideo) return;
    if (isPaused) return;
    if (isHeavyPausedRef.current) return;

    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;
    let lastWriteAt = 0;

    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastWriteAt >= 2500) {
        lastWriteAt = now;
        persistCurrentStorySession();
      }
    };

    const onPause = () => persistCurrentStorySession({ paused: true });
    const onPlay = () => persistCurrentStorySession({ paused: false });

    v.addEventListener('timeupdate', tick, { passive: true });
    v.addEventListener('pause', onPause, { passive: true });
    v.addEventListener('play', onPlay, { passive: true });

    return () => {
      cancelled = true;
      try {
        v.removeEventListener('timeupdate', tick);
        v.removeEventListener('pause', onPause);
        v.removeEventListener('play', onPlay);
      } catch (e) {}
    };
  }, [storyId, isVideo, isPaused, persistCurrentStorySession]);

  // Single safe autoplay path for the active video.
  const attemptAutoPlayActiveVideo = React.useCallback(
    (reason = '') => {
      if (!isVideo) return;
      if (!storyId || !stableMediaSrc) return;
      if (isHeavyPausedRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!containerRef.current || !containerRef.current.isConnected) return;
      if (isPaused) return;

      const v = videoRef.current;
      if (!v) return;
      if (autoPlayAttemptedRef.current) return;
      autoPlayAttemptedRef.current = true;

      try {
        v.preload = 'metadata';
        v.playsInline = true;
        v.defaultMuted = true;
        v.muted = true;
      } catch (e) {}

      const restoreTime = restoreTimeRef.current;
      if (Number.isFinite(restoreTime) && restoreTime > 0) {
        try {
          if (Number.isFinite(v.duration) && v.duration > 0) {
            v.currentTime = Math.min(Math.max(0, restoreTime), Math.max(0, v.duration - 0.25));
            restoreTimeRef.current = 0;
          }
        } catch (e) {}
      }

      if (!shouldResumePlayingRef.current) return;

      try {
        const p = v.play?.();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            setShowTapForSound(true);
          });
        }
      } catch (e) {}

      safeStoryLog('attemptAutoPlayActiveVideo', reason);
    },
    [isVideo, storyId, stableMediaSrc, isPaused]
  );

  // Pause/resume heavy media based on global events.
  React.useEffect(() => {
    const onPauseHeavy = () => {
      isHeavyPausedRef.current = true;
      pauseProgressLoop();
      const v = videoRef.current;
      if (v) {
        try {
          v.pause?.();
        } catch (e) {}
      }
    };

    const onResumeHeavy = () => {
      isHeavyPausedRef.current = false;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!containerRef.current || !containerRef.current.isConnected) return;
      if (!story || !stableMediaSrc) return;

      // Allow a fresh autoplay attempt after a heavy pause.
      autoPlayAttemptedRef.current = false;

      if (isVideo) {
        attemptAutoPlayActiveVideo('resume-heavy-media');
      }
    };

    window.addEventListener('vibes:pause-heavy-media', onPauseHeavy, { passive: true });
    window.addEventListener('vibes:resume-heavy-media', onResumeHeavy, { passive: true });

    return () => {
      window.removeEventListener('vibes:pause-heavy-media', onPauseHeavy);
      window.removeEventListener('vibes:resume-heavy-media', onResumeHeavy);
    };
  }, [pauseProgressLoop, story, stableMediaSrc, isVideo, attemptAutoPlayActiveVideo]);

  // Reset media lifecycle state whenever the active story changes.
  React.useEffect(() => {
    autoPlayAttemptedRef.current = false;

    try {
      const v = videoRef.current;
      if (v) {
        v.autoplay = false;
        v.removeAttribute('autoplay');
        v.pause?.();
      }
    } catch (e) {}

    setVideoReady(false);
    setVideoFailed(false);
    setShowTapForSound(false);
  }, [storyId, clampedIndex, isVideo]);

  // Media lifecycle: loading/fail-safe timers + UI state reset on story change.
  React.useEffect(() => {
    clearMediaTimeout();
    clearFailSafeTimeout();

    if (!story || !story.mediaUrl) {
      setIsMediaLoading(false);
      setMediaFailed(true);
      return;
    }

    resetProgressAndTimers();
    setSentReaction(null);
    setShowMenu(false);
    setShowConfirm(false);

    setIsMediaLoading(true);
    setMediaFailed(false);
    setVideoReady(false);
    setVideoFailed(false);
    setShowReport(false);
    setReportReason('');
    setSaveError('');
    setShowSaveHelp(false);
    setIsSaving(false);

    let cancelled = false;
    let preloadImg = null;

    if (!isVideo) {
      preloadImg = new Image();

      preloadImg.onload = () => {
        if (cancelled) return;
        clearMediaTimeout();
        clearFailSafeTimeout();
        setIsMediaLoading(false);
        setMediaFailed(false);
      };

      preloadImg.onerror = () => {
        if (cancelled) return;
        clearMediaTimeout();
        clearFailSafeTimeout();
        setIsMediaLoading(false);
        setMediaFailed(true);
      };

      preloadImg.src = stableMediaSrc;
    }

    mediaTimeoutRef.current = setTimeout(() => {
      safeStoryLog('media load timeout', story?.id || null);

      if (isVideo) {
        setIsMediaLoading(false);
        setMediaFailed(false);
        setVideoFailed(false);
        setVideoReady(true);
      } else {
        setIsMediaLoading(false);
        setMediaFailed(true);
      }

      mediaTimeoutRef.current = null;
    }, 8000);

    failSafeTimeoutRef.current = setTimeout(() => {
      if (!stableMediaSrc) {
        safeStoryLog('hard fail-safe: media still missing after delay');
        setIsMediaLoading(false);
        setMediaFailed(true);
      }
    }, 800);

    return () => {
      cancelled = true;
      clearMediaTimeout();
      clearFailSafeTimeout();
      try {
        preloadImg && (preloadImg.onload = preloadImg.onerror = null);
      } catch (e) {}
    };
  }, [story?.id, story?.mediaUrl, stableMediaSrc, isVideo, resetProgressAndTimers, clearMediaTimeout, clearFailSafeTimeout]);

  React.useEffect(() => {
    pauseProgressLoop();

    if (isPaused) return;
    if (isVideo) return;
    if (isHeavyPausedRef.current) return;

    startRef.current = performance.now() - (progressSnapshotRef.current * DURATION_MS);

    const tick = (now) => {
      const p = clamp01((now - startRef.current) / DURATION_MS);
      setProgress(p);

      if (p >= 1) {
        goNext();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      pauseProgressLoop();
    };
  }, [clampedIndex, goNext, isPaused, isVideo, pauseProgressLoop]);

  // Resume handler: avoid expensive reloads; only attempt play if needed.
  React.useEffect(() => {
    const onResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!isVideo || !videoRef.current || !stableMediaSrc || mediaFailed) return;
      if (isHeavyPausedRef.current) return;
      if (isPaused) return;

      // Allow a fresh autoplay attempt on resume.
      autoPlayAttemptedRef.current = false;
      requestAnimationFrame(() => attemptAutoPlayActiveVideo('app-resume'));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('vibes:app-resume', onResume, { passive: true });
      return () => window.removeEventListener('vibes:app-resume', onResume);
    }
    return undefined;
  }, [isVideo, stableMediaSrc, mediaFailed, isPaused, attemptAutoPlayActiveVideo]);

  // Visibility resume: keep lightweight and only act when needed.
  React.useEffect(() => {
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        persistCurrentStorySession();
        return;
      }
      if (!isVideo) return;
      if (isPaused) return;
      if (isHeavyPausedRef.current) return;

      autoPlayAttemptedRef.current = false;
      requestAnimationFrame(() => attemptAutoPlayActiveVideo('visibility-resume'));
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility, { passive: true });
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }
    return undefined;
  }, [attemptAutoPlayActiveVideo, isPaused, isVideo, persistCurrentStorySession]);

  React.useEffect(() => {
    return () => {
      clearMediaTimeout();
      clearFailSafeTimeout();
      persistCurrentStorySession();
      pauseProgressLoop();
      if (sentReactionTimeoutRef.current) {
        clearTimeout(sentReactionTimeoutRef.current);
        sentReactionTimeoutRef.current = null;
      }
    };
  }, [persistCurrentStorySession, clearMediaTimeout, clearFailSafeTimeout, pauseProgressLoop]);

  const handleReply = () => {
    if (!story) return;
    try {
      onReply?.({
        storyId: story.id,
        targetUserId: story.userId || story.user_id || null,
        text: '',
        type: 'story_reply',
        prefill: true
      });
    } catch (e) {
      // silent
    }
    close();
  };

  const handleDelete = async () => {
    if (!story) return;
    try {
      const deletedIndex = clampedIndex;
      const totalBeforeDelete = normalizedStories.length;

      await onDelete?.(story.id);
      clearStorySession(story.id);

      if (totalBeforeDelete <= 1) {
        close();
      } else if (deletedIndex >= totalBeforeDelete - 1) {
        setIndex(Math.max(0, deletedIndex - 1));
      } else {
        setIndex(deletedIndex);
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
    setShowConfirm(false);
    setShowMenu(false);
  };

  const inferDownloadFilename = React.useCallback(
    (url, fallbackExt) => {
      const clean = String(url || '').split('#')[0].split('?')[0];
      const last = clean.split('/').pop() || '';
      const hasExt = /\.[a-z0-9]{2,5}$/i.test(last);
      const ext = hasExt ? '' : (fallbackExt || '');
      const base = last && last.length < 80 ? last : 'story_' + String(storyId || Date.now());
      return String(base) + String(ext);
    },
    [storyId]
  );

const downloadStoryMedia = React.useCallback(
  async (e) => {
    try { e?.stopPropagation?.(); } catch (err) {}
    try { e?.preventDefault?.(); } catch (err) {}

    const mediaUrl = stableMediaSrc;

    if (!story || !mediaUrl) {
      setSaveError('Could not get the media link.');
      setShowSaveHelp(true);
      setShowMenu(false);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Story media',
            url: mediaUrl
          });
          setShowMenu(false);
          setIsSaving(false);
          return;
        } catch (err) {
          // continue to clipboard fallback
        }
      }

      let copied = false;

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(mediaUrl);
          copied = true;
        }
      } catch (err) {
        copied = false;
      }

      if (!copied) {
        setSaveError('Could not share or copy the media link.');
      } else {
        setSaveError('');
      }

      setShowSaveHelp(true);
      setShowMenu(false);
    } catch (err) {
      setSaveError('Could not share or copy the media link.');
      setShowSaveHelp(true);
      setShowMenu(false);
    } finally {
      setIsSaving(false);
    }
  },
  [story, stableMediaSrc]
);

  const submitReport = React.useCallback(() => {
    safeStoryLog('report submitted', { storyId: story?.id, reason: reportReason });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('vibes:story-report', {
            detail: {
              storyId: story?.id,
              storyOwnerId,
              reason: reportReason
            }
          })
        );
      } catch (e) {
        // ignore
      }
    }
    setShowReport(false);
    setReportReason('');
    setShowMenu(false);
  }, [reportReason, story?.id, storyOwnerId]);

  const sendReaction = (emoji) => {
    if (!story) return;
    try {
      onReaction?.(story.id, emoji);
    } catch (e) {
      // silent
    }
    setSentReaction(emoji);
    if (sentReactionTimeoutRef.current) {
      clearTimeout(sentReactionTimeoutRef.current);
      sentReactionTimeoutRef.current = null;
    }
    sentReactionTimeoutRef.current = setTimeout(() => {
      setSentReaction(null);
      sentReactionTimeoutRef.current = null;
    }, 900);
  };

  const actionBtn = (label, onClick, extra = '') => html`
    <button
      type="button"
      onClick=${onClick}
      className=${
        'h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-white/90 text-sm font-bold tap-feedback hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ' +
        (extra || '')
      }
    >
      ${label}
    </button>
  `;

  const total = normalizedStories.length;
  const canRenderMedia = !!(story && stableMediaSrc && !mediaFailed);
  const shouldRenderLoading = !!(!mediaFailed && (isMediaLoading || (isVideo && canRenderMedia && !videoReady)));
  const shouldRenderFallback = !!mediaFailed;

  if (!canRenderMedia && !shouldRenderLoading && !shouldRenderFallback) {
    return null;
  }

  return html`
    <div
      className="bg-black"
      style=${{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <div className="absolute inset-0" ref=${containerRef}>
        ${canRenderMedia && isVideo
          ? html`
<video
  key=${String(story.id) + '_' + String(clampedIndex)}
  ref=${videoRef}
  src=${stableMediaSrc}
  className="w-full h-full object-cover"
  autoPlay
  playsInline
  muted
  defaultMuted=${true}
  preload="auto"
  controls=${false}
  onLoadedMetadata=${() => {
    const v = videoRef.current;
    clearMediaTimeout();
    setIsMediaLoading(false);
    setMediaFailed(false);
    setVideoReady(true);
    setVideoFailed(false);
    try {
      v.playsInline = true;
      v.defaultMuted = true;
      v.muted = true;
    } catch (err) {}
    attemptAutoPlayActiveVideo('loaded-metadata');
  }}
  onLoadedData=${() => {
    const v = videoRef.current;
    clearMediaTimeout();
    setIsMediaLoading(false);
    setMediaFailed(false);
    setVideoReady(true);
    setVideoFailed(false);
    try {
      const p = v?.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {}
  }}
  onCanPlay=${() => {
    const v = videoRef.current;
    clearMediaTimeout();
    setIsMediaLoading(false);
    setMediaFailed(false);
    setVideoReady(true);
    setVideoFailed(false);
    try {
      const p = v?.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {}
  }}
  onPlaying=${() => {
    setIsMediaLoading(false);
    setMediaFailed(false);
    setVideoReady(true);
    setVideoFailed(false);
    setShowTapForSound(false);
  }}
  onClick=${(e) => {
    e.stopPropagation();
    const v = e.currentTarget;
    setShowTapForSound(false);
    try {
      v.defaultMuted = false;
      v.muted = false;
      v.volume = 1;
    } catch (err) {}
    try {
      if (v.paused) {
        const p = v.play?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (err) {}
  }}
  onPointerDown=${(e) => {
    const v = e.currentTarget;
    try {
      if (!v.paused) v.pause?.();
    } catch (err) {}
  }}
  onPointerUp=${(e) => {
    const v = e.currentTarget;
    try {
      const p = v.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {}
  }}
  onPointerCancel=${(e) => {
    const v = e.currentTarget;
    try {
      const p = v.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {}
  }}
  onPointerLeave=${(e) => {
    const v = e.currentTarget;
    try {
      const p = v.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {}
  }}
  onWaiting=${() => {
    if (!videoReady) setIsMediaLoading(true);
  }}
  onStalled=${() => {
    if (!videoReady) setIsMediaLoading(true);
  }}
  onTimeUpdate=${(e) => {
    const v = e.currentTarget;
    const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    const current = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    if (duration > 0) {
      const nextProgress = clamp01(current / duration);
      setProgress(nextProgress);
      if (current >= Math.max(0, duration - 0.12)) {
        setProgress(1);
        advanceOnce();
      }
    }
  }}
  onEnded=${() => {
    setProgress(1);
    advanceOnce();
  }}
  onError=${() => {
    safeStoryLog('media load error', story?.id || null);
    clearMediaTimeout();
    setIsMediaLoading(false);
    setMediaFailed(true);
    setVideoReady(false);
    setVideoFailed(true);
  }}
></video>
            `
          : null}

        ${canRenderMedia && !isVideo
          ? html`
              <img
                key=${story.id}
                src=${stableMediaSrc}
                className="w-full h-full object-cover"
                alt="Story"
                loading="eager"
                decoding="async"
                onLoad=${() => {
                  safeStoryLog('media load success', story?.id || null);
                  clearMediaTimeout();
                  setIsMediaLoading(false);
                  setMediaFailed(false);
                }}
                onError=${() => {
                  safeStoryLog('media load error', story?.id || null);
                  clearMediaTimeout();
                  setIsMediaLoading(false);
                  setMediaFailed(true);
                }}
              />
            `
          : null}

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/55 via-black/10 to-black/70"></div>

        ${isVideo && showTapForSound
          ? html`
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="px-3 py-1.5 rounded-full border border-white/10 bg-black/45 backdrop-blur-md text-white/85 text-[11px] font-semibold tracking-wide shadow-lg">
                  Tap center for sound
                </div>
              </div>
            `
          : null}
        ${shouldRenderLoading ? html`<${StoryLoadingState} />` : null}
        ${shouldRenderFallback
          ? html`<${StoryFallbackCard}
              title="Story unavailable"
              subtitle="This story could not be loaded."
              onClose=${close}
            />`
          : null}
      </div>

      <div className="absolute inset-0 z-10 flex pointer-events-none">
        <button type="button" className="w-[34%] h-full pointer-events-auto" onClick=${goPrev} aria-label="Previous story"></button>

        <div className="flex-1 h-full pointer-events-none"></div>

        <button type="button" className="w-[34%] h-full pointer-events-auto" onClick=${goNext} aria-label="Next story"></button>
      </div>

      <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-3">
        <div className="flex gap-1.5">
          ${Array.from({ length: total }).map((_, i) => {
            const filled = i < clampedIndex ? 1 : i > clampedIndex ? 0 : progress;
            return html`
              <div key=${'seg_' + i} className="h-1 flex-1 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white/90" style=${{ width: String(Math.round(clamp01(filled) * 100)) + '%' }}></div>
              </div>
            `;
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full border border-white/10 shrink-0 overflow-hidden bg-neutral-800"
            style=${{
              position: 'relative',
              fontSize: '0',
              lineHeight: '0',
              color: 'transparent'
            }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover bg-no-repeat"
              style=${{
                backgroundImage: (story?.avatarUrl || story?.avatar_url || story?.headerAvatarUrl)
                  ? `url(${story?.avatarUrl || story?.avatar_url || story?.headerAvatarUrl})`
                  : 'none'
              }}
            ></div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-semibold leading-5 truncate">${story?.user || story?.displayName || story?.display_name || 'Vibe'}</div>
            <div className="text-neutral-300 text-xs leading-4 truncate">${formatTimeAgo(story?.timestamp)}</div>
          </div>
          <div className="flex items-center gap-1">
            ${story && !isOwner && html`
              <button
                type="button"
                onClick=${(e) => {
                  e.stopPropagation();
                  const userId = story?.userId || story?.user_id;
                  if (!userId) return;
                  onOpenProfile?.({
                    id: userId,
                    userId,
                    displayName: story?.user || story?.displayName || story?.display_name || 'Vibe',
                    avatarUrl: story?.avatarUrl || story?.avatar_url || ''
                  });
                  close();
                }}
                className="pointer-events-auto relative z-30 h-10 px-3 rounded-full bg-neutral-900/40 border border-white/10 text-white/80 text-[12px] font-bold tracking-wide flex items-center justify-center tap-feedback"
                aria-label="Open profile"
              >
                Profile
              </button>
            `}
            ${canShowMenu && html`
              <button
                type="button"
                onClick=${(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="pointer-events-auto relative z-30 h-10 w-10 rounded-full bg-neutral-900/40 border border-white/10 text-white/70 text-lg flex items-center justify-center tap-feedback"
                aria-label="Story options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            `}
            <button
              type="button"
              onClick=${(e) => {
                e.stopPropagation();
                close();
              }}
              className="pointer-events-auto relative z-30 h-10 w-10 rounded-full bg-neutral-900/40 border border-white/10 text-white/70 text-xl leading-none flex items-center justify-center tap-feedback"
              aria-label="Close story viewer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      ${showMenu && html`
        <div className="absolute top-16 right-3 z-40 animate-in fade-in zoom-in duration-200 origin-top-right">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]">
            ${isOwner
              ? html`
                  <button
                    onClick=${downloadStoryMedia}
                    className="w-full px-4 py-3.5 text-left text-white/90 text-sm font-bold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12"/>
                      <path d="m7 10 5 5 5-5"/>
                      <path d="M5 21h14"/>
                    </svg>
                    Copy Link / Save
                  </button>
                  <div className="h-px bg-white/5"></div>
                  <button
                    onClick=${() => {
                      setShowConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3.5 text-left text-rose-500 text-sm font-bold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete story
                  </button>
                `
              : html`
                  <button
                    onClick=${downloadStoryMedia}
                    className="w-full px-4 py-3.5 text-left text-white/90 text-sm font-bold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12"/>
                      <path d="m7 10 5 5 5-5"/>
                      <path d="M5 21h14"/>
                    </svg>
                    Copy Link / Save
                  </button>
                  <div className="h-px bg-white/5"></div>
                  <button
                    onClick=${() => {
                      setShowReport(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3.5 text-left text-white/90 text-sm font-bold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4v16"/>
                      <path d="M4 4h10l-1.5 3L14 10H4"/>
                    </svg>
                    Report story
                  </button>
                `}
          </div>
        </div>
        <div className="absolute inset-0 z-30" onClick=${() => setShowMenu(false)}></div>
      `}

      ${showConfirm && html`
        <div className="absolute inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick=${() => setShowConfirm(false)}></div>
          <div className="relative w-full max-w-[280px] bg-[#1a1a1a] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Delete this story?</h3>
            <p className="text-xs text-white/50 leading-relaxed mb-6">This action cannot be undone.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick=${handleDelete}
                className="h-12 rounded-xl bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-600/20 tap-feedback active:scale-95 transition-transform"
              >
                Delete
              </button>
              <button
                onClick=${() => setShowConfirm(false)}
                className="h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm tap-feedback active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      `}

      ${showReport && !isOwner && html`
  <div className="absolute inset-0 z-[100] flex items-center justify-center px-6">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick=${() => setShowReport(false)}></div>
    <div className="relative w-full max-w-[320px] bg-[#1a1a1a] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 p-6 text-center">
      <h3 className="text-lg font-bold text-white mb-2">Report story</h3>
      <p className="text-xs text-white/50 leading-relaxed mb-5">Why are you reporting this story?</p>
      <div className="flex flex-col gap-2 text-left">
        ${['Spam', 'Harassment', 'Nudity', 'Violence', 'False information'].map((reason) => html`
          <button
            key=${reason}
            onClick=${() => setReportReason(reason)}
            className=${
              'h-11 px-4 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-between ' +
              (reportReason === reason
                ? 'border-blue-500/50 bg-blue-500/10 text-white'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10')
            }
          >
            <span>${reason}</span>
            ${reportReason === reason ? html`<span className="text-blue-300">✓</span>` : null}
          </button>
        `)}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick=${submitReport}
          disabled=${!reportReason}
          className=${
            'h-12 rounded-xl font-bold text-sm tap-feedback active:scale-95 transition-transform ' +
            (reportReason ? 'bg-white text-black' : 'bg-white/5 text-white/30 cursor-not-allowed')
          }
        >
          Submit report
        </button>
        <button
          onClick=${() => {
            setShowReport(false);
            setReportReason('');
          }}
          className="h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm tap-feedback active:scale-95 transition-transform"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
`}

${showSaveHelp && html`
  <div className="absolute inset-0 z-[120] flex items-center justify-center px-6">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick=${() => setShowSaveHelp(false)}></div>
    <div className="relative w-full max-w-[340px] bg-[#1a1a1a] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 p-6 text-center">
<h3 className="text-lg font-bold text-white mb-2">Save to device</h3>
<p className="text-sm text-white/70 leading-relaxed">
  The video link was copied.
  <span className="block mt-2 text-white/90 font-semibold">
    Open Safari, paste the link, open the video, then tap Share → Save Video.
  </span>
</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick=${() => {
            setShowSaveHelp(false);
            setSaveError('');
          }}
          className="h-12 rounded-xl bg-white text-black font-bold text-sm tap-feedback active:scale-95 transition-transform"
        >
          OK
        </button>
      </div>
    </div>
  </div>
`}

<div className="absolute left-0 right-0 bottom-10 z-20 px-6">
  <div className="mx-auto w-full max-w-sm">
    ${!isOwner && story && html`
      <div className="mb-3 grid grid-cols-4 gap-2">
        ${actionBtn('😍', () => sendReaction('😍'), 'text-base')}
        ${actionBtn('🔥', () => sendReaction('🔥'), 'text-base')}
        ${actionBtn('❤️', () => sendReaction('❤️'), 'text-base')}
        ${actionBtn('Reply', handleReply)}
      </div>
    `}
    ${sentReaction && html`<div className="text-center text-white/90 text-sm font-semibold">Sent ${sentReaction}</div>`}
  </div>
</div>
    </div>
  `;
});

export {
  clamp01,
  VIDEO_EXTENSIONS,
  safeStoryLog,
  getRawStoryMediaUrl,
  inferStoryType,
  normalizeStory,
  isStoryVideo,
  formatTimeAgo,
  getStorySessionKey,
  readStorySession,
  writeStorySession,
  clearStorySession,
  StoryFallbackCard,
  StoryLoadingState
};
