import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

/**
 * UNDERFIREAI TAILWIND CONFIG
 * ===========================
 * 🔥 Fire Light Mode Theme
 * 
 * Design System:
 * - Warm cream/white backgrounds
 * - Fire palette (orange, red, amber)
 * - Cool blue accent for contrast
 * - GSAP animation support
 */

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // CSS Variable Based Colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        // 🔥 Fire Palette - Light Mode Optimized
        fire: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        
        // Warm Cream Backgrounds
        cream: {
          50: '#FFFDFB',
          100: '#FFFBF5',
          200: '#FFF7ED',
          300: '#FFF3E5',
          400: '#FFEDD5',
          500: '#FDE8CD',
        },
        
        // Charcoal Text Colors
        charcoal: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        
        // Stone (neutral)
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        
        // Interview Score Colors
        score: {
          excellent: '#16a34a',
          good: '#65a30d',
          average: '#ca8a04',
          poor: '#ea580c',
          critical: '#dc2626',
        },
        
        // Interviewer Mood Indicators
        mood: {
          impressed: '#16a34a',
          neutral: '#78716c',
          skeptical: '#d97706',
          critical: '#dc2626',
          engaged: '#2563eb',
        },
        
        // Semantic Colors
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',
        info: '#2563eb',
      },
      
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': '24px',
      },
      
      fontFamily: {
        sans: ['Inter', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'var(--font-mono)', 'monospace'],
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.02em' }],
        '7xl': ['4.5rem', { lineHeight: '4.75rem', letterSpacing: '-0.02em' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'pulse-fire': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.25)' },
          '50%': { boxShadow: '0 0 40px rgba(249, 115, 22, 0.4)' },
        },
        'typing-dot': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'glow-fire': {
          '0%, 100%': { boxShadow: '0 0 25px rgba(249, 115, 22, 0.25)' },
          '50%': { boxShadow: '0 0 45px rgba(249, 115, 22, 0.4)' },
        },
        'timer-pulse': {
          '0%, 100%': { transform: 'scale(1)', color: 'inherit' },
          '50%': { transform: 'scale(1.05)', color: '#ef4444' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fire': 'pulse-fire 2s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        'glow-fire': 'glow-fire 3s ease-in-out infinite',
        'timer-pulse': 'timer-pulse 1s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s linear infinite',
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'fire-gradient': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
        'fire-gradient-soft': 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)',
        'cream-gradient': 'linear-gradient(180deg, #FFFBF5 0%, #FFF7ED 100%)',
        'glow-fire-radial': 'radial-gradient(circle at center, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
        'hero-glow': 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(249, 115, 22, 0.15), transparent)',
      },
      
      boxShadow: {
        'glow-fire': '0 0 30px rgba(249, 115, 22, 0.25)',
        'glow-fire-lg': '0 0 50px rgba(249, 115, 22, 0.35)',
        'glow-fire-xl': '0 20px 50px rgba(249, 115, 22, 0.25)',
        'glow-red': '0 0 30px rgba(239, 68, 68, 0.25)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.25)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'elevation-2': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'elevation-4': '0 16px 48px rgba(0, 0, 0, 0.12)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 30px rgba(249, 115, 22, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      },
      
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
