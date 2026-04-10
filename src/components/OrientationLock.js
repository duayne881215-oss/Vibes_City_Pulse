/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = React.useState(false);

  React.useEffect(() => {
    const checkOrientation = () => {
      try {
        setIsLandscape(window.innerWidth > window.innerHeight);
      } catch (e) {
        setIsLandscape(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return html`
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center px-6"
      style=${{
        background: 'linear-gradient(180deg, #05070d 0%, #000000 100%)'
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style=${{
          background: 'radial-gradient(circle at center, rgba(59,130,246,0.10) 0%, rgba(168,85,247,0.07) 28%, rgba(0,0,0,0) 62%)'
        }}
      ></div>

      <div className="relative z-10 w-full max-w-sm text-center">
        <div
          className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[28px]"
          style=${{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            boxShadow: '0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          <div
            style=${{
              fontSize: '42px',
              lineHeight: '1',
              color: 'rgba(255,255,255,0.92)'
            }}
          >
            ↻
          </div>
        </div>

        <div
          className="mb-4"
          style=${{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)'
          }}
        >
          Portrait Only
        </div>

        <h1
          className="mb-3"
          style=${{
            color: '#ffffff',
            fontSize: '42px',
            lineHeight: '0.95',
            fontWeight: '900',
            letterSpacing: '-0.04em'
          }}
        >
          Rotate your phone
        </h1>

        <p
          className="mx-auto"
          style=${{
            maxWidth: '320px',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '17px',
            lineHeight: '1.6',
            fontWeight: '500'
          }}
        >
          City Pulse works in vertical mode
        </p>

        <div className="mt-14 flex justify-center">
          <div
            style=${{
              height: '8px',
              width: '220px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
            }}
          >
            <div
              style=${{
                height: '100%',
                width: '100%',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.90)',
                boxShadow: '0 0 18px rgba(255,255,255,0.18)'
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
