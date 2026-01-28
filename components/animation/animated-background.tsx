'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * AnimatedBackground
 * 
 * Fire-themed animated background with floating gradient orbs.
 * Place at the root of your layout for a dynamic backdrop.
 */
export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const orbs = containerRef.current.querySelectorAll('.gradient-orb');

    // Add subtle mouse movement effect
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth - 0.5) * 20;
      const yPercent = (clientY / window.innerHeight - 0.5) * 20;

      orbs.forEach((orb, i) => {
        const factor = (i + 1) * 0.3;
        gsap.to(orb, {
          x: xPercent * factor,
          y: yPercent * factor,
          duration: 1.5,
          ease: 'power2.out',
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="gradient-bg" aria-hidden="true">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      <div className="gradient-orb gradient-orb-4" />
      <div className="grid-pattern absolute inset-0" />
      <div className="noise-overlay" />
    </div>
  );
}

/**
 * HeroGlow
 * 
 * Concentrated fire glow effect for hero sections.
 */
export function HeroGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Top center glow */}
      <div 
        className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Left accent */}
      <div 
        className="absolute top-1/3 -left-20 w-[400px] h-[400px]"
        style={{
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Right accent */}
      <div 
        className="absolute top-1/4 -right-20 w-[400px] h-[400px]"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

/**
 * FireGlow
 * 
 * Pulsing fire glow effect for highlighting elements.
 */
export function FireGlow({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
  };

  return (
    <div 
      className={`absolute rounded-full animate-pulse-fire pointer-events-none ${sizes[size]} ${className}`}
      style={{
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * ScrollIndicator
 * 
 * Animated scroll indicator for hero sections.
 */
export function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-[3px] text-charcoal-400 font-medium">
        Scroll
      </span>
      <div className="scroll-line" />
    </div>
  );
}

/**
 * SectionDivider
 * 
 * Decorative divider with fire gradient.
 */
export function SectionDivider() {
  return (
    <div className="relative py-20">
      <div className="absolute left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-fire-500/50 to-transparent" />
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-fire-500"
        style={{ boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' }}
      />
    </div>
  );
}
