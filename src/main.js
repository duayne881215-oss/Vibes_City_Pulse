/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import ReactDOM from 'https://esm.sh/react-dom@19.2.0/client?deps=react@19.2.0';
import { html } from './jsx.js';

// Global visibility handler to improve stability on iOS/mobile webviews.
let __visibilityHandlerRegistered = false;
let __onVisibilityChange = null;

function dispatchAppResume(reason) {
  try {
    window.dispatchEvent(
      new CustomEvent('vibes:app-resume', {
        detail: { reason, at: Date.now() }
      })
    );
  } catch (e) {
    try {
      window.dispatchEvent(new Event('vibes:app-resume'));
    } catch (_) {}
  }
}

function safelyResumeVisibleVideos() {
  const videos = document.querySelectorAll('video');

  videos.forEach((v) => {
    try {
      if (v.paused && !v.ended) {
        const p = v.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } catch (_) {}
  });
}

function registerGlobalVisibilityVideoHandler() {
  if (__visibilityHandlerRegistered) return;
  __visibilityHandlerRegistered = true;

  __onVisibilityChange = () => {
    const videos = document.querySelectorAll('video');

    if (document.hidden) {
      videos.forEach((v) => {
        try {
          v.pause();
        } catch (_) {}
      });
      return;
    }

    safelyResumeVisibleVideos();

    requestAnimationFrame(() => {
      safelyResumeVisibleVideos();
      dispatchAppResume('visibilitychange');
    });

    requestAnimationFrame(() => {
      safelyResumeVisibleVideos();
      dispatchAppResume('visibilitychange');
    });
  };

  document.addEventListener('visibilitychange', __onVisibilityChange, { passive: true });

  window.addEventListener(
    'pageshow',
    () => {
      requestAnimationFrame(() => {
        safelyResumeVisibleVideos();
        dispatchAppResume('pageshow');
      });

      requestAnimationFrame(() => {
        safelyResumeVisibleVideos();
        dispatchAppResume('pageshow');
      });
    },
    { passive: true }
  );
}

function attemptPortraitOrientationLock() {
  try {
    if (window.screen?.orientation?.lock) {
      const lockPromise = window.screen.orientation.lock('portrait');
      if (lockPromise && typeof lockPromise.catch === 'function') {
        lockPromise.catch(() => {});
      }
    }
  } catch (_) {}
}

function renderFatalError(message, detail = '') {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  rootEl.innerHTML = `
    <div style="
      min-height: 100vh;
      background: #05070c;
      color: white;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    ">
      <div style="
        width: 100%;
        max-width: 680px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(14,20,34,0.96), rgba(8,12,22,0.98));
        box-shadow: 0 18px 50px rgba(0,0,0,0.45);
        padding: 22px;
      ">
        <div style="
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(96,165,250,0.92);
          margin-bottom: 10px;
          font-weight: 800;
        ">Runtime Error</div>
        <div style="
          font-size: 22px;
          line-height: 1.2;
          font-weight: 800;
          margin-bottom: 10px;
        ">The app failed to load</div>
        <div style="
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255,255,255,0.72);
          white-space: pre-wrap;
          word-break: break-word;
        ">${String(message || 'Unknown error')}</div>
        ${
          detail
            ? `<pre style="
                margin-top: 14px;
                padding: 14px;
                border-radius: 16px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.78);
                font-size: 12px;
                line-height: 1.45;
                white-space: pre-wrap;
                word-break: break-word;
                overflow: auto;
              ">${String(detail)}</pre>`
            : ''
        }
      </div>
    </div>
  `;
}

registerGlobalVisibilityVideoHandler();
attemptPortraitOrientationLock();

window.addEventListener('error', (event) => {
  const msg = event?.error?.message || event?.message || 'Unknown script error';
  const stack = event?.error?.stack || '';
  renderFatalError(msg, stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg =
    reason?.message ||
    (typeof reason === 'string' ? reason : 'Unhandled promise rejection');
  const stack = reason?.stack || '';
  renderFatalError(msg, stack);
});

async function boot() {
  try {
    const mod = await import('./App.js');
    const App = mod.default;

    if (!App) {
      throw new Error('App.js loaded but default export is missing.');
    }

    const rootNode = document.getElementById('root');
    if (!rootNode) {
      throw new Error('Missing #root element.');
    }

    const root = ReactDOM.createRoot(rootNode);
    root.render(html`<${App} />`);
  } catch (error) {
    console.error('Boot error:', error);
    renderFatalError(
      error?.message || 'Failed to import App.js',
      error?.stack || ''
    );
  }
}

boot();