'use client';

import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils/cn';

// Ensure ScrollTrigger is registered
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// ANIMATED SECTION
// ============================================

type AnimationType = 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'fadeScale' | 'none';

interface AnimatedSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  start?: string;
  once?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main';
}

const ANIMATION_PRESETS: Record<AnimationType, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
  fadeUp: {
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  fadeDown: {
    from: { y: -60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  fadeLeft: {
    from: { x: -60, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  fadeRight: {
    from: { x: 60, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  fadeScale: {
    from: { scale: 0.9, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  none: {
    from: {},
    to: {},
  },
};

export function AnimatedSection({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.8,
  start = 'top 85%',
  once = true,
  as: Component = 'div',
  className,
  ...props
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || animation === 'none') return;

    const element = ref.current;
    const preset = ANIMATION_PRESETS[animation];

    // Set initial state
    gsap.set(element, preset.from);

    // Create animation
    const anim = gsap.to(element, {
      ...preset.to,
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        once,
      },
    });

    return () => {
      anim.kill();
    };
  }, [animation, delay, duration, start, once]);

  return (
    <Component ref={ref} className={className} {...props}>
      {children}
    </Component>
  );
}

// ============================================
// ANIMATED CARD
// ============================================

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  index?: number;
  staggerDelay?: number;
  hoverLift?: boolean;
  hoverGlow?: boolean;
  start?: string;
}

export function AnimatedCard({
  children,
  index = 0,
  staggerDelay = 0.1,
  hoverLift = true,
  hoverGlow = true,
  start = 'top 85%',
  className,
  ...props
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    // Set initial state
    gsap.set(element, { y: 60, opacity: 0 });

    // Create entrance animation
    const anim = gsap.to(element, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      delay: index * staggerDelay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        once: true,
      },
    });

    return () => {
      anim.kill();
    };
  }, [index, staggerDelay, start]);

  return (
    <div
      ref={ref}
      className={cn(
        'fire-card',
        hoverLift && 'hover:-translate-y-2 transition-transform duration-500',
        hoverGlow && 'hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// ANIMATED TEXT
// ============================================

interface AnimatedTextProps extends HTMLAttributes<HTMLDivElement> {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  animation?: 'words' | 'chars' | 'lines';
  stagger?: number;
  delay?: number;
  duration?: number;
  start?: string;
}

export function AnimatedText({
  children,
  as: Component = 'p',
  animation = 'words',
  stagger = 0.05,
  delay = 0,
  duration = 0.6,
  start = 'top 85%',
  className,
  ...props
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const text = container.querySelector('[data-animated-text]');
    
    if (!text) return;

    // Split text into spans
    const content = text.textContent || '';
    let elements: string[] = [];

    switch (animation) {
      case 'chars':
        elements = content.split('');
        break;
      case 'words':
        elements = content.split(' ');
        break;
      case 'lines':
        elements = content.split('\n');
        break;
    }

    // Wrap each element
    text.innerHTML = elements
      .map((el, i) => {
        const space = animation === 'words' && i < elements.length - 1 ? '&nbsp;' : '';
        return `<span class="inline-block overflow-hidden"><span class="animated-element inline-block" style="display: inline-block;">${el}${space}</span></span>`;
      })
      .join('');

    const animatedElements = text.querySelectorAll('.animated-element');

    // Set initial state
    gsap.set(animatedElements, { y: '100%', opacity: 0 });

    // Animate
    const anim = gsap.to(animatedElements, {
      y: '0%',
      opacity: 1,
      duration,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start,
        once: true,
      },
    });

    return () => {
      anim.kill();
    };
  }, [children, animation, stagger, delay, duration, start]);

  return (
    <div ref={containerRef} className={className} {...props}>
      <Component data-animated-text>{children}</Component>
    </div>
  );
}

// ============================================
// ANIMATED STAGGER CONTAINER
// ============================================

interface AnimatedStaggerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  childSelector?: string;
  stagger?: number;
  from?: gsap.TweenVars;
  duration?: number;
  start?: string;
}

export function AnimatedStagger({
  children,
  childSelector = '& > *',
  stagger = 0.1,
  from = { y: 40, opacity: 0 },
  duration = 0.6,
  start = 'top 85%',
  className,
  ...props
}: AnimatedStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const container = ref.current;
    const selector = childSelector.replace('& > ', '');
    const children = selector === '*' 
      ? Array.from(container.children) 
      : container.querySelectorAll(selector);

    if (children.length === 0) return;

    // Set initial state
    gsap.set(children, from);

    // Animate
    const anim = gsap.to(children, {
      y: 0,
      x: 0,
      opacity: 1,
      scale: 1,
      duration,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start,
        once: true,
      },
    });

    return () => {
      anim.kill();
    };
  }, [childSelector, stagger, from, duration, start]);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

// ============================================
// ANIMATED COUNTER
// ============================================

interface AnimatedCounterProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  start?: string;
}

export function AnimatedCounter({
  value,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  start = 'top 85%',
  className,
  ...props
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;

    const element = ref.current;

    ScrollTrigger.create({
      trigger: element,
      start,
      once: true,
      onEnter: () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;

        const counter = { value: 0 };
        gsap.to(counter, {
          value,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            element.textContent = `${prefix}${counter.value.toFixed(decimals)}${suffix}`;
          },
        });
      },
    });
  }, [value, duration, decimals, prefix, suffix, start]);

  return (
    <span ref={ref} className={cn('counter', className)} {...props}>
      {prefix}0{suffix}
    </span>
  );
}

// ============================================
// PARALLAX WRAPPER
// ============================================

interface ParallaxProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  speed?: number;
  direction?: 'up' | 'down';
}

export function Parallax({
  children,
  speed = 0.5,
  direction = 'up',
  className,
  ...props
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const yOffset = direction === 'up' ? -100 * speed : 100 * speed;

    const anim = gsap.to(element, {
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
      anim.kill();
    };
  }, [speed, direction]);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

// ============================================
// REVEAL ON SCROLL (Simple wrapper)
// ============================================

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className,
  ...props
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    
    const directions: Record<string, gsap.TweenVars> = {
      up: { y: 60, opacity: 0 },
      down: { y: -60, opacity: 0 },
      left: { x: -60, opacity: 0 },
      right: { x: 60, opacity: 0 },
    };

    gsap.set(element, directions[direction]);

    const anim = gsap.to(element, {
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.8,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        once: true,
      },
    });

    return () => {
      anim.kill();
    };
  }, [direction, delay]);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}
