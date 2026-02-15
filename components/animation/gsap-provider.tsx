'use client';

import { useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type LenisType from 'lenis';

interface GSAPContextValue {
  lenis: LenisType | null;
}

const GSAPContext = createContext<GSAPContextValue>({ lenis: null });

export function useGSAP(): GSAPContextValue {
  return useContext(GSAPContext);
}

interface GSAPProviderProps {
  children: ReactNode;
}

export function GSAPProvider({ children }: GSAPProviderProps): React.JSX.Element {
  const lenisRef = useRef<LenisType | null>(null);

  useEffect(() => {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis smooth scroll
    const initLenis = async (): Promise<void> => {
      const LenisModule = (await import('lenis')).default;
      
      const lenis = new LenisModule({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        touchMultiplier: 2,
      });

      lenisRef.current = lenis;

      // Connect Lenis to ScrollTrigger
      lenis.on('scroll', () => { ScrollTrigger.update(); });

      // Add Lenis to GSAP ticker
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      // Disable GSAP lag smoothing for better scroll performance
      gsap.ticker.lagSmoothing(0);

      // Add lenis class to html element
      document.documentElement.classList.add('lenis');
    };

    void initLenis();

    // Cleanup
    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.ticker.remove(() => {});
      document.documentElement.classList.remove('lenis');
    };
  }, []);

  return (
    <GSAPContext.Provider value={{ lenis: lenisRef.current }}>
      {children}
    </GSAPContext.Provider>
  );
}

/**
 * Hook to create scroll-triggered animations
 * Usage:
 * ```tsx
 * const ref = useScrollAnimation({
 *   from: { y: 60, opacity: 0 },
 *   to: { y: 0, opacity: 1 },
 *   start: 'top 85%',
 * });
 * return <div ref={ref}>Animated content</div>
 * ```
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(options: {
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  markers?: boolean;
  delay?: number;
  duration?: number;
  ease?: string;
  once?: boolean;
}): React.RefObject<T> {
  const ref = useRef<T>(null);

  const {
    from = { y: 60, opacity: 0 },
    to = { y: 0, opacity: 1 },
    start = 'top 85%',
    end,
    scrub = false,
    markers = false,
    delay = 0,
    duration = 0.8,
    ease = 'power3.out',
    once = true,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    // Set initial state
    gsap.set(element, from);

    // Create animation
    const animation = gsap.to(element, {
      ...to,
      duration,
      delay,
      ease,
      scrollTrigger: {
        trigger: element,
        start,
        end,
        scrub,
        markers,
        once,
      },
    });

    return () => {
      animation.kill();
    };
  }, [from, to, start, end, scrub, markers, delay, duration, ease, once]);

  return ref;
}

/**
 * Hook for staggered animations of child elements
 * Usage:
 * ```tsx
 * const ref = useStaggerAnimation({
 *   childSelector: '.card',
 *   stagger: 0.1,
 * });
 * return <div ref={ref}>{cards}</div>
 * ```
 */
export function useStaggerAnimation<T extends HTMLElement = HTMLDivElement>(options: {
  childSelector: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  stagger?: number;
  start?: string;
  duration?: number;
  ease?: string;
  once?: boolean;
}): React.RefObject<T> {
  const ref = useRef<T>(null);

  const {
    childSelector,
    from = { y: 40, opacity: 0 },
    to = { y: 0, opacity: 1 },
    stagger = 0.1,
    start = 'top 85%',
    duration = 0.6,
    ease = 'power3.out',
    once = true,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const container = ref.current;
    const children = container.querySelectorAll(childSelector);

    if (children.length === 0) return;

    // Set initial state
    gsap.set(children, from);

    // Create staggered animation
    const animation = gsap.to(children, {
      ...to,
      duration,
      stagger,
      ease,
      scrollTrigger: {
        trigger: container,
        start,
        once,
      },
    });

    return () => {
      animation.kill();
    };
  }, [childSelector, from, to, stagger, start, duration, ease, once]);

  return ref;
}

/**
 * Hook for parallax effects
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(options: {
  speed?: number;
  direction?: 'up' | 'down';
}): React.RefObject<T> {
  const ref = useRef<T>(null);

  const { speed = 0.5, direction = 'up' } = options;

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const yOffset = direction === 'up' ? -100 * speed : 100 * speed;

    const animation = gsap.to(element, {
      y: yOffset,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      animation.kill();
    };
  }, [speed, direction]);

  return ref;
}
