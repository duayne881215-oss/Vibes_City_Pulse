/* REPLACE ENTIRE FILE: src/components/Onboarding.js */
/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

// Keep steps stable across renders
const ONBOARDING_STEPS = [
  {
    title: "The city is alive",
    subtitle: "See people around you in real time.\nEvery vibe. Every moment.",
    helper: "Swipe to feel the pulse",
    color: "rgba(37,99,235,0.18)"
  },
  {
    title: "Tap the energy",
    subtitle: "Explore nearby profiles\nand see who matches your vibe.",
    helper: "Discover what's happening around you",
    color: "rgba(147,51,234,0.18)"
  },
  {
    title: "Join the pulse",
    subtitle: "Share your vibe. Meet people nearby.\nSee what's happening right now.",
    color: "rgba(5,150,105,0.18)"
  }
];

const MIN_SWIPE_DISTANCE = 50;

export default function Onboarding({ onFinish }) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isExiting, setIsExiting] = React.useState(false);

  const gestureStartXRef = React.useRef(null);
  const gestureEndXRef = React.useRef(null);
  const isPointerDownRef = React.useRef(false);
  const finishTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };
  }, []);

  const steps = ONBOARDING_STEPS;
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const applySwipe = React.useCallback(() => {
    const startX = gestureStartXRef.current;
    const endX = gestureEndXRef.current;

    gestureStartXRef.current = null;
    gestureEndXRef.current = null;
    isPointerDownRef.current = false;

    if (startX === null || endX === null) return;

    const distance = startX - endX;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      return;
    }

    if (isRightSwipe) {
      setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [steps.length]);

  const onTouchStart = React.useCallback((e) => {
    gestureEndXRef.current = null;
    gestureStartXRef.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchMove = React.useCallback((e) => {
    gestureEndXRef.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = React.useCallback(() => {
    applySwipe();
  }, [applySwipe]);

  const onPointerDown = React.useCallback((e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      isPointerDownRef.current = true;
      gestureEndXRef.current = null;
      gestureStartXRef.current = e.clientX;
    }
  }, []);

  const onPointerMove = React.useCallback((e) => {
    if (!isPointerDownRef.current) return;
    gestureEndXRef.current = e.clientX;
  }, []);

  const onPointerUp = React.useCallback(() => {
    if (!isPointerDownRef.current) return;
    applySwipe();
  }, [applySwipe]);

  const onPointerCancel = React.useCallback(() => {
    gestureStartXRef.current = null;
    gestureEndXRef.current = null;
    isPointerDownRef.current = false;
  }, []);

  const onKeyDown = React.useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
      return;
    }

    if (e.key === 'ArrowRight') {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && isLastStep) {
      e.preventDefault();
      handleFinish();
    }
  }, [isLastStep]);

  const handleFinish = React.useCallback(() => {
    setIsExiting(true);

    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    finishTimeoutRef.current = setTimeout(() => {
      onFinish?.();
      finishTimeoutRef.current = null;
    }, 600);
  }, [onFinish]);

  const dots = React.useMemo(() => {
    return steps.map((_, i) => html`
      <div
        key=${i}
        className=${`h-1.5 rounded-full transition-all duration-300 ${
          currentStep === i ? 'w-8 bg-white' : 'w-1.5 bg-white/20'
        }`}
      ></div>
    `);
  }, [steps, currentStep]);

  return html`
    <div
      className=${`fixed inset-0 z-[300] bg-black flex flex-col overflow-hidden transition-all duration-700 ease-in-out select-none ${isExiting ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}
      onTouchStart=${onTouchStart}
      onTouchMove=${onTouchMove}
      onTouchEnd=${onTouchEnd}
      onPointerDown=${onPointerDown}
      onPointerMove=${onPointerMove}
      onPointerUp=${onPointerUp}
      onPointerCancel=${onPointerCancel}
      onKeyDown=${onKeyDown}
      tabIndex="0"
      style=${{
        touchAction: 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square rounded-full opacity-40 blur-[100px] transition-all duration-1000 animate-pulse-slow"
          style=${{
            background: `radial-gradient(circle, ${step.color} 0%, rgba(0,0,0,0) 65%)`
          }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </div>

      <div className="absolute top-5 right-5 z-20">
        <button
          onClick=${handleFinish}
          className="h-10 px-4 rounded-full border border-white/12 bg-white/6 backdrop-blur-xl text-white/70 text-[11px] font-bold tracking-[0.18em] uppercase"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="w-full max-w-xs space-y-6">
          <div className="space-y-4 animate-slide-up">
            <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
              ${step.title}
            </h1>
            <p className="text-lg text-white/50 font-medium leading-relaxed whitespace-pre-line">
              ${step.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-10 flex flex-col items-center gap-8 relative z-10">
        <div className="flex gap-2">
          ${dots}
        </div>

        ${isLastStep ? html`
          <div className="w-full max-w-xs flex flex-col items-center gap-3 animate-fade-in">
            <div className="text-white/50 text-xs font-bold tracking-widest uppercase -mt-1">
              <span className="text-emerald-400">●</span> 23 people active near you
            </div>
            <button
              onClick=${handleFinish}
              className="w-full h-16 rounded-2xl bg-white text-black font-black tracking-[0.15em] uppercase text-sm shadow-[0_0_30px_rgba(255,255,255,0.2)] tap-feedback"
            >
              ENTER THE LIVE MAP
            </button>
          </div>
        ` : html`
          <div className="h-16 flex flex-col items-center justify-center gap-2 animate-pulse">
            <div className="text-white/40 text-xs font-bold tracking-widest uppercase">
              ${step.helper || 'Swipe to continue'}
            </div>
            <div className="text-white/25 text-[10px] font-semibold tracking-[0.16em] uppercase">
              Drag • Arrow keys • Skip
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}