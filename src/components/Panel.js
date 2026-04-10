/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

export default function Panel({ isOpen, onClose, title, children, variant = 'default' }) {
  const bodyRef = React.useRef(null);

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const childDiscard = React.useMemo(() => {
    const findDiscard = (node) => {
      if (!node) return null;

      if (Array.isArray(node)) {
        for (const n of node) {
          const found = findDiscard(n);
          if (found) return found;
        }
        return null;
      }

      if (React.isValidElement(node)) {
        const fn = node.props?.onDiscardChanges;
        if (typeof fn === 'function') return fn;

        const nested = node.props?.children;
        if (nested) return findDiscard(nested);
      }

      return null;
    };

    return findDiscard(children);
  }, [children]);

  const safeClose = React.useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const fn = onCloseRef.current;
    if (typeof fn === 'function') fn(e);
  }, []);

  const safeDiscardOrClose = React.useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();

      if (typeof childDiscard === 'function') {
        try {
          childDiscard(e);
          return;
        } catch (err) {
          console.error('[Panel] onDiscardChanges threw:', err);
        }
      }

      const fn = onCloseRef.current;
      if (typeof fn === 'function') fn(e);
    },
    [childDiscard]
  );

  React.useLayoutEffect(() => {
    if (!isOpen) return;

    const el = bodyRef.current;
    if (!el) return;

    let raf = 0;
    let t = 0;
    let cancelled = false;

    const scrollTopNow = () => {
      if (cancelled) return;
      const node = bodyRef.current;
      if (!node) return;
      node.scrollTop = 0;
    };

    scrollTopNow();
    raf = requestAnimationFrame(scrollTopNow);
    t = setTimeout(scrollTopNow, 150);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (t) clearTimeout(t);
    };
  }, [isOpen]);

  const handlePanelClick = React.useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
  }, []);

  const isMedium = variant === 'medium';
  const isMessages = variant === 'messages';
  const isMessagesEmpty = variant === 'messages-empty';
  const isActivity = variant === 'activity';
  const isMood = variant === 'mood';

  const panelStyle = React.useMemo(() => {
    if (isMedium) {
      return {
        height: '72vh',
        maxHeight: '72vh'
      };
    }

    if (isMessages) {
      return {
        height: '56dvh',
        maxHeight: '56dvh',
        minHeight: '56dvh'
      };
    }

    if (isMessagesEmpty) {
      return {
        height: '40dvh',
        maxHeight: '40dvh',
        minHeight: '40dvh'
      };
    }

    if (isActivity) {
      return {
        height: '46vh',
        maxHeight: '46vh',
        minHeight: '46vh'
      };
    }

    if (isMood) {
      return {
        height: '76vh',
        maxHeight: '76vh',
        minHeight: '76vh'
      };
    }

    return {
      height: '92vh',
      maxHeight: '92vh'
    };
  }, [isMedium, isMessages, isMessagesEmpty, isActivity, isMood]);

  const bodyClassName = React.useMemo(() => {
    if (isMood) {
      return 'overflow-y-auto scrollbar-hide px-6 pt-1 pb-24 flex-1 min-h-0 vibes-mood-panel-body';
    }

    if (isMessagesEmpty) {
      return 'overflow-hidden scrollbar-hide px-6 pt-2 pb-2 min-h-0 vibes-messages-panel-body';
    }

    if (isActivity) {
      return 'overflow-y-auto scrollbar-hide px-6 pt-2 pb-24 flex-1 min-h-0';
    }

    if (isMessages) {
      return 'overflow-y-auto scrollbar-hide px-6 pt-2 pb-24 flex-1 min-h-0';
    }

    const pb = isMedium ? 'pb-6' : 'pb-20';
    const flex = isMedium ? '' : 'flex-1';
    return `overflow-y-auto scrollbar-hide px-6 pt-2 ${pb} ${flex} min-h-0`;
  }, [isMedium, isMessagesEmpty, isMood, isMessages, isActivity]);

  const rootClassName = React.useMemo(
    () =>
      `fixed inset-0 z-[100] flex items-end justify-center transition-all duration-500 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`,
    [isOpen]
  );

  const overlayClassName = React.useMemo(
    () =>
      `absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`,
    [isOpen]
  );

  const panelClassName = React.useMemo(
    () =>
      `relative w-full max-w-lg bg-gradient-to-b from-[#121829] to-[#0b1020] ring-1 ring-white/5 rounded-t-[2.5rem] overflow-hidden shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.8),0_-1px_0_rgba(255,255,255,0.04)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform flex flex-col ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`,
    [isOpen]
  );

  if (!isOpen) return null;

  return html`
    <div className=${rootClassName}>
      <div className=${overlayClassName} onClick=${safeClose} />

      <div onClick=${handlePanelClick} className=${panelClassName} style=${panelStyle}>
        <div
          className="sticky top-0 z-20 px-6 py-4 flex items-center justify-end shrink-0 relative"
          style=${{
            background: 'transparent'
          }}
        >
          <h2
            className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-white tracking-tight text-center whitespace-nowrap"
            style=${{
              textShadow: '0 1px 0 rgba(0,0,0,0.25), 0 0 20px rgba(96,165,250,0.16)'
            }}
          >
            ${title}
          </h2>

          <button
            onClick=${safeDiscardOrClose}
            className="h-10 w-10 rounded-full inline-flex items-center justify-center text-white/76 transition-all tap-feedback shrink-0"
            style=${{
              border: '1px solid rgba(255,255,255,0.045)',
              background: 'linear-gradient(180deg, rgba(10,14,28,0.74), rgba(7,10,22,0.92))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.018)'
            }}
            aria-label="Close panel"
            title="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.15"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div
          ref=${bodyRef}
          className=${bodyClassName}
          style=${{
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          ${children ?? null}
        </div>
      </div>
    </div>
  `;
}
