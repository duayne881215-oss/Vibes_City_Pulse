/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const PREMIUM_GLASS_BUTTON = 'rgba(255,255,255,0.014)';
const PREMIUM_GLASS_BORDER = '1px solid rgba(255,255,255,0.07)';
const PREMIUM_GLASS_BUTTON_SHADOW = '0 0 0 1px rgba(255,255,255,0.01) inset, 0 6px 14px rgba(0,0,0,0.035)';
const PREMIUM_GLASS_BLUR = 'blur(10px) saturate(135%)';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

function isVideoFile(file) {
  if (!(file instanceof File)) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(name);
}

function isImageFile(file) {
  if (!(file instanceof File)) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(name);
}

export default function StoryCreator({ isOpen, onClose, onPost, initialImage, initialIsVideo, initialFile }) {
  const [caption, setCaption] = React.useState('');
  const [media, setMedia] = React.useState(null);
  const [isVideoPreview, setIsVideoPreview] = React.useState(false);
  const [file, setFile] = React.useState(null);
  const [isPosting, setIsPosting] = React.useState(false);
  const [error, setError] = React.useState('');

  const objectUrlRef = React.useRef(null);
  const previewVideoRef = React.useRef(null);

  const photoInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);

  const cleanupObjectUrl = React.useCallback(() => {
    if (!objectUrlRef.current) return;
    try {
      URL.revokeObjectURL(objectUrlRef.current);
    } catch (e) {}
    objectUrlRef.current = null;
  }, []);

  const stopPreviewVideo = React.useCallback(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    try {
      v.pause();
      try {
        v.currentTime = 0;
      } catch (e) {}
      v.removeAttribute('src');
      v.load();
    } catch (e) {}
  }, []);

  const resetDraftState = React.useCallback(() => {
    setCaption('');
    setMedia(null);
    setFile(null);
    setIsVideoPreview(false);
    setIsPosting(false);
    setError('');
    stopPreviewVideo();
    cleanupObjectUrl();

    try {
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    } catch (e) {}
  }, [cleanupObjectUrl, stopPreviewVideo]);

  const safeClose = React.useCallback(() => {
    if (isPosting) return;
    resetDraftState();
    onClose?.();
  }, [isPosting, onClose, resetDraftState]);

  const validateFile = React.useCallback((f) => {
    if (!(f instanceof File)) return 'No file selected.';

    const video = isVideoFile(f);
    const image = isImageFile(f);

    if (!video && !image) return 'Invalid file type. Please choose an image or video.';
    if (f.size <= 0) return 'Invalid file. Please choose a different one.';
    if (image && f.size > MAX_IMAGE_BYTES) return 'Image is too large. Please choose one under 30MB.';
    if (video && f.size > MAX_VIDEO_BYTES) return 'Video is too large. Please choose one under 150MB.';

    return '';
  }, []);

  const loadSelectedFile = React.useCallback((selectedFile) => {
    if (!(selectedFile instanceof File)) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setMedia(null);
      setIsVideoPreview(false);
      stopPreviewVideo();
      cleanupObjectUrl();
      return;
    }

    setError('');
    setFile(selectedFile);
    setIsVideoPreview(isVideoFile(selectedFile));
    stopPreviewVideo();
    cleanupObjectUrl();

    try {
      const url = URL.createObjectURL(selectedFile);
      objectUrlRef.current = url;
      setMedia(url);
    } catch (err) {
      setError('Preview failed. Please try a different file.');
      setMedia(null);
      setFile(null);
      setIsVideoPreview(false);
    }
  }, [cleanupObjectUrl, stopPreviewVideo, validateFile]);

  React.useEffect(() => {
    if (!isOpen) {
      stopPreviewVideo();
      cleanupObjectUrl();
      return;
    }

    setCaption('');
    setIsPosting(false);
    setError('');
    stopPreviewVideo();
    cleanupObjectUrl();

    if (initialFile instanceof File) {
      loadSelectedFile(initialFile);
      return;
    }

    if (initialImage) {
      setMedia(initialImage);
      setIsVideoPreview(!!initialIsVideo);
      setFile(null);
      return;
    }

    setMedia(null);
    setFile(null);
    setIsVideoPreview(false);
  }, [
    isOpen,
    initialImage,
    initialIsVideo,
    initialFile,
    cleanupObjectUrl,
    stopPreviewVideo,
    loadSelectedFile
  ]);

  React.useEffect(() => {
    return () => {
      stopPreviewVideo();
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl, stopPreviewVideo]);

  React.useEffect(() => {
    const v = previewVideoRef.current;
    if (!v || !media || !isVideoPreview) return;

    const playIfVisible = () => {
      if (document.visibilityState !== 'visible') {
        try {
          v.pause();
        } catch (e) {}
        return;
      }
      try {
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', playIfVisible);
    playIfVisible();

    return () => document.removeEventListener('visibilitychange', playIfVisible);
  }, [media, isVideoPreview]);

  if (!isOpen) return null;

  const canPost = !!file && !error && !isPosting;

  const handleInputChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    try { e.target.value = ''; } catch (err) {}
    if (!selectedFile) return;
    loadSelectedFile(selectedFile);
  };

  const openPhotoCamera = () => {
    setError('');
    try {
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
        photoInputRef.current.click();
      }
    } catch (e) {}
  };

  const openVideoCamera = () => {
    setError('For best video quality on iPhone, record in the Camera app and upload from Gallery.');
    try {
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
        galleryInputRef.current.click();
      }
    } catch (e) {}
  };

  const openGallery = () => {
    setError('');
    try {
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
        galleryInputRef.current.click();
      }
    } catch (e) {}
  };

  const handlePost = async () => {
    if (isPosting) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!(file instanceof File)) {
      setError('Please choose a photo or video first.');
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      if (!onPost) {
        throw new Error('Story upload is unavailable right now.');
      }

      await Promise.resolve(onPost({
        caption,
        isVideo: isVideoFile(file),
        file
      }));

      resetDraftState();
      onClose?.();
    } catch (err) {
      setError(err?.message ? err.message : 'Story upload failed. Please try again.');
      setIsPosting(false);
    }
  };

  return html`
    <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in story-modal">
      <input
        ref=${photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange=${handleInputChange}
      />

      <input
        ref=${videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange=${handleInputChange}
      />

      <input
        ref=${galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange=${handleInputChange}
      />

      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button onClick=${safeClose} className="text-white/70 text-sm font-medium tap-feedback">
          Cancel
        </button>

        <h2 className="text-sm font-bold tracking-widest uppercase">New Story</h2>

        <button
          onClick=${handlePost}
          disabled=${!canPost}
          className=${`px-4 py-1.5 rounded-full text-xs font-semibold text-white tap-feedback transition-all ${
            canPost ? 'story-post-btn' : 'bg-white/10 text-white/25 cursor-not-allowed'
          }`}
        >
          ${isPosting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2.5 flex flex-col gap-6">
        ${error && html`
          <div className="max-w-[320px] mx-auto w-full">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200 font-medium">
              ${error}
            </div>
          </div>
        `}

        <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
          ${media ? (
            isVideoPreview ? html`
              <video
                ref=${previewVideoRef}
                src=${media}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate"
              />
            ` : html`
              <img
                src=${media}
                className="w-full h-full object-cover"
                alt="Selected media preview"
              />
            `
          ) : html`
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/20 px-6 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span className="text-xs font-bold tracking-widest uppercase">Choose photo or video</span>
              <span className="text-[11px] text-white/28">Native iPhone camera = better quality and no fake screen recording issue</span>
            </div>
          `}

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none"></div>

          ${caption && media && html`
            <div className="absolute bottom-6 left-4 right-4 text-center pointer-events-none">
              <p className="text-white text-sm font-medium drop-shadow-lg">${caption}</p>
            </div>
          `}
        </div>

        <div className="space-y-4 max-w-[320px] mx-auto w-full">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick=${openPhotoCamera}
              className="h-11 rounded-2xl border bg-white text-black border-white text-xs font-semibold tracking-[0.12em] uppercase tap-feedback"
            >
              Photo
            </button>

            <button
              onClick=${openVideoCamera}
              className="h-11 rounded-2xl border bg-white/5 text-white border-white/10 text-xs font-semibold tracking-[0.12em] uppercase tap-feedback"
            >
              Video Upload
            </button>
          </div>

          <button
            onClick=${openGallery}
            className="w-full h-11 rounded-2xl text-white text-xs font-semibold tracking-[0.12em] uppercase tap-feedback"
            style=${{
              background: PREMIUM_GLASS_BUTTON,
              border: PREMIUM_GLASS_BORDER,
              boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
              backdropFilter: PREMIUM_GLASS_BLUR,
              WebkitBackdropFilter: PREMIUM_GLASS_BLUR
            }}
          >
            Gallery
          </button>

          ${media && html`
            <button
              onClick=${() => {
                setCaption('');
                setFile(null);
                setMedia(null);
                setIsVideoPreview(false);
                setError('');
                stopPreviewVideo();
                cleanupObjectUrl();
              }}
              className="w-full h-11 rounded-2xl text-white text-xs font-semibold tracking-[0.12em] uppercase tap-feedback"
              style=${{
                background: PREMIUM_GLASS_BUTTON,
                border: PREMIUM_GLASS_BORDER,
                boxShadow: PREMIUM_GLASS_BUTTON_SHADOW,
                backdropFilter: PREMIUM_GLASS_BLUR,
                WebkitBackdropFilter: PREMIUM_GLASS_BLUR
              }}
            >
              Retake
            </button>
          `}

          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.2em] text-white/30 uppercase ml-1">
              Caption
            </label>
            <input
              type="text"
              value=${caption}
              onChange=${(e) => setCaption(e.target.value)}
              placeholder="Add a short caption..."
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <button
            onClick=${safeClose}
            className="w-full h-12 rounded-2xl story-cancel-btn flex items-center justify-center gap-2 text-xs font-semibold text-white tap-feedback"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

export { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES };
