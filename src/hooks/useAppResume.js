/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';

const SOFT_RESUME_MS = 8000;
const HARD_RELOAD_MS = 180000;

function safeReload() {
  try {
    window.location.reload();
  } catch (_e) {}
}

function emit(name, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch (_e) {}
}

export default function useAppResume() {
  const lastHiddenAt = React.useRef(0);
  const [epoch, setEpoch] = React.useState(0);

  React.useEffect(() => {
    const runResumeFix = () => {
      const hiddenAt = lastHiddenAt.current || 0;
      if (!hiddenAt) return;

      const diff = Date.now() - hiddenAt;

      if (diff >= HARD_RELOAD_MS) {
        safeReload();
        return;
      }

      if (diff >= SOFT_RESUME_MS) {
        setEpoch((v) => v + 1);

        emit('vibes:app-resume', {
          long: true,
          at: Date.now(),
          diff
        });

        try {
          window.dispatchEvent(new Event('resize'));
        } catch (_e) {}
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt.current = Date.now();
        return;
      }

      if (document.visibilityState === 'visible') {
        runResumeFix();
      }
    };

    const onFocus = () => {
      runResumeFix();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return epoch;
}
