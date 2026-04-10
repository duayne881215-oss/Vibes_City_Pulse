/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';

// Shared bottom-sheet close animation controller.
// - Adds a closing class to the sheet element
// - Waits for the animation to finish
// - Then calls the provided onClose callback
//
// This hook only coordinates closing. It does not change layout or styling.

const DEFAULT_DURATION_MS = 700;

export { DEFAULT_DURATION_MS };

export default function useSheetCloseAnimation({
  open,
  onClose,
  sheetRef,
  overlayRef,
  closingClassName = 'vibes-sheet--closing',
  overlayClosingClassName = 'vibes-sheet-overlay--closing',
  durationMs = DEFAULT_DURATION_MS
}) {
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef(null);
  const cleanupRefRef = React.useRef(null);

  const cleanupTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const cleanupListeners = React.useCallback(() => {
    if (typeof cleanupRefRef.current === 'function') {
      try {
        cleanupRefRef.current();
      } catch (e) {
        // ignore
      }
      cleanupRefRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;

    setIsClosing(false);
    cleanupTimer();
    cleanupListeners();

    const el = sheetRef?.current;
    if (el) {
      try {
        el.classList.remove(closingClassName);
      } catch (e) {
        // ignore
      }
    }

    const overlayEl = overlayRef?.current;
    if (overlayEl) {
      try {
        overlayEl.classList.remove(overlayClosingClassName);
      } catch (e) {
        // ignore
      }
    }
  }, [
    open,
    cleanupTimer,
    cleanupListeners,
    sheetRef,
    overlayRef,
    closingClassName,
    overlayClosingClassName
  ]);

  React.useEffect(() => {
    return () => {
      cleanupTimer();
      cleanupListeners();
    };
  }, [cleanupTimer, cleanupListeners]);

  const requestClose = React.useCallback(() => {
    if (!open || isClosing) return;

    setIsClosing(true);

    const el = sheetRef?.current;
    const overlayEl = overlayRef?.current;

    if (overlayEl) {
      try {
        overlayEl.classList.add(overlayClosingClassName);
      } catch (e) {
        // ignore
      }
    }

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      // IMPORTANT:
      // Do not remove the closing classes before unmount.
      // Removing them can reset transform/opacity for a single frame,
      // causing a visible "final blink" on some GPUs/browsers.
      cleanupTimer();
      cleanupListeners();

      onClose?.();
    };

    if (!el) {
      finish();
      return;
    }

    try {
      el.classList.add(closingClassName);
    } catch (e) {
      finish();
      return;
    }

    const onTransitionEnd = (evt) => {
      if (!evt || evt.target !== el) return;
      if (evt.propertyName && evt.propertyName !== 'transform' && evt.propertyName !== 'opacity') return;
      finish();
    };

    const onAnimationEnd = (evt) => {
      if (!evt || evt.target !== el) return;
      finish();
    };

    el.addEventListener('transitionend', onTransitionEnd);
    el.addEventListener('animationend', onAnimationEnd);

    cleanupRefRef.current = () => {
      el.removeEventListener('transitionend', onTransitionEnd);
      el.removeEventListener('animationend', onAnimationEnd);
    };

    cleanupTimer();
    closeTimerRef.current = setTimeout(() => {
      finish();
    }, durationMs + 80);
  }, [
    open,
    isClosing,
    sheetRef,
    overlayRef,
    closingClassName,
    overlayClosingClassName,
    durationMs,
    cleanupTimer,
    cleanupListeners,
    onClose
  ]);

  return { isClosing, requestClose };
}
