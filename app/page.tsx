'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Brain,
  Target,
  Mic,
  Shield,
  CheckCircle2,
  ArrowRight,
  Zap,
  BarChart3,
  FileText,
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  Eye,
  MessageSquare,
  Sparkles,
  Building2,
  HeartHandshake,
  Code2,
  Lightbulb,
  DollarSign,
  Wand2,
  Menu,
  X,
} from 'lucide-react';

export default function LandingPage(): React.JSX.Element {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close the mobile menu when the viewport crosses the md (>=768px) breakpoint
  // (e.g. rotating a phone to landscape or resizing a small browser window) and
  // when the user presses Escape — keeps focus and DOM state consistent with
  // the desktop nav, which is rendered alongside it via the md: utilities.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleResize = (): void => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen]);

  const coreFeatures = [
    {
      icon: Brain,
      title: 'Hidden Personality Interviewers',
      desc: 'Every AI interviewer has a unique personality, backstory, and style you must discover through the conversation. Skeptical, warm, detail-obsessed, big-picture — just like real interviewers. This forces you to actually listen, adapt, and think on your feet instead of reciting memorized answers.',
      highlight: true,
    },
    {
      icon: Target,
      title: 'Real-Time STAR Method Analysis',
      desc: "As you answer, our AI breaks down your response into Situation, Task, Action, and Result. Get instant feedback on what's missing, what's weak, and how to strengthen the impact of every answer you give.",
    },
    {
      icon: Mic,
      title: 'Voice-Based Conversations',
      desc: 'Speak naturally and our AI responds in real time, just like a real interview. Reading answers is easy — speaking them confidently under pressure is the skill that actually gets you hired.',
    },
    {
      icon: BarChart3,
      title: 'Deep Performance Analytics',
      desc: 'Track clarity, confidence, technical depth, structure, and impact across every session. See your scores improve over time, spot patterns in your weak spots, and know exactly what to practice next.',
    },
    {
      icon: Shield,
      title: 'Company-Style Preparation',
      desc: "FAANG runs leadership-principles interviews. Consulting firms want structured thinking. Startups want scrappiness. We match the style, questions, and evaluation criteria to the company type you're targeting.",
    },
    {
      icon: Zap,
      title: 'Adaptive Difficulty',
      desc: "Start at your comfort level and grow. The AI adjusts difficulty based on how you perform — pushing harder when you're ready, easing up when you need it. Scale all the way from Easy to Expert.",
    },
    {
      icon: Wand2,
      title: 'Custom Interviewer Creator',
      desc: "Build your own AI interviewer from scratch. Set their personality traits, communication style, favourite topics, red flags, and voice. Create interviewers that mirror the exact people you'll face — a detail-obsessed CTO, a friendly but probing HR director, or a rapid-fire panel lead. Your practice, your rules.",
    },
    {
      icon: DollarSign,
      title: 'Salary Negotiation Simulator',
      desc: "Practice negotiating your offer against a realistic AI recruiter who pushes back. Navigate counter-offers, benefit tradeoffs, and hardball tactics in a safe environment. Get scored on confidence, framing, and strategy — and see what offer your technique would have closed.",
    },
    {
      icon: Target,
      title: 'Resume & JD-Targeted Interviews',
      desc: "Focus the entire interview on your actual resume weak spots or the exact skill gaps between your profile and a specific job description. Upload a JD, and our AI generates questions that drill into exactly where you're exposed — so you walk in with answers prepared for the hardest questions.",
    },
    {
      icon: Brain,
      title: 'Custom Scenario Builder',
      desc: "Blend two interviewer archetypes, add custom constraints, and dial individual personality traits for a scenario that matches exactly what you're walking into. Preparing for a panel with a skeptical VP and a detail-oriented engineer? Build it.",
    },
  ];

  const interviewTypes = [
    { icon: MessageSquare, name: 'Behavioral', desc: 'STAR-method situational questions' },
    { icon: Code2, name: 'Technical', desc: 'System design & coding challenges' },
    { icon: Lightbulb, name: 'Case Study', desc: 'Business problem solving' },
    { icon: HeartHandshake, name: 'HR Screen', desc: 'Culture fit & motivation' },
    { icon: Users, name: 'Panel Mode', desc: 'Multiple interviewers at once' },
    { icon: Clock, name: 'Phone Screen', desc: 'Quick 15-30 min rounds' },
  ];

  const resumeFeatures = [
    {
      icon: Eye,
      title: 'Vulnerability Scanner',
      desc: 'Our AI finds the red flags, gaps, and weak spots in your resume that interviewers will probe. Know your exposure before you walk in.',
    },
    {
      icon: TrendingUp,
      title: 'Resume Health Score',
      desc: "Get an overall quality score with a detailed breakdown of what's working and what needs fixing.",
    },
    {
      icon: Briefcase,
      title: 'Job Alignment Analysis',
      desc: 'Upload a job description and see exactly how your resume lines up. Identify skill gaps, missing keywords, and what to address in your interview.',
    },
    {
      icon: Sparkles,
      title: 'Post-Session Alignment',
      desc: 'After each interview, see how well your answers matched your resume and the target role — and get specific suggestions to improve.',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Upload Your Resume',
      desc: "Our AI extracts your skills, experience, and target role. We identify your strengths and find the gaps you'll need to prepare for.",
    },
    {
      step: '02',
      title: 'Choose Your Interview Type',
      desc: 'Behavioral, technical, case study, HR screen, or panel. Pick your target company style and difficulty level.',
    },
    {
      step: '03',
      title: 'Face a Hidden Personality',
      desc: "You're matched with an AI interviewer whose personality you must discover. Detail-oriented? Big-picture focused? Skeptical? Read the room and adapt.",
    },
    {
      step: '04',
      title: 'Get Brutally Honest Feedback',
      desc: 'After each session, get detailed scores on clarity, confidence, structure, and impact — plus the full interview replay to review.',
    },
    {
      step: '05',
      title: 'Track Your Progress',
      desc: 'Watch your scores improve session by session. Build streaks and see data-driven evidence of your growth across every dimension.',
    },
  ];

  const companyTypes = [
    { name: 'FAANG', icon: Building2, desc: 'Amazon, Google, Meta, Apple, Netflix' },
    { name: 'Startups', icon: Zap, desc: 'Series A-C growth companies' },
    { name: 'Consulting', icon: Briefcase, desc: 'McKinsey, BCG, Bain style' },
    { name: 'Finance', icon: TrendingUp, desc: 'Banks, hedge funds, PE firms' },
    { name: 'Enterprise', icon: Building2, desc: 'Fortune 500 corporations' },
    { name: 'Government', icon: Shield, desc: 'Public sector & contractors' },
  ];

  const pricing = [
    {
      name: 'Starter Pack',
      price: '25',
      period: 'one-time',
      desc: '6 AI mock interviews',
      perInterview: '~$4.17 per interview',
      features: [
        'All 6 interview types',
        'Voice mode',
        'All interviewer personalities',
        'STAR method scoring & feedback',
        'Resume vulnerability scanner',
        'Job description analysis',
        'Custom interviewer creator',
        'Salary negotiation simulator',
        'Full performance analytics',
        'Interview replay & history',
      ],
      cta: 'Get Starter Pack',
      ctaHref: '/register',
      highlight: false,
      variant: 'standard' as const,
    },
    {
      name: 'Pro Pack',
      price: '35',
      period: 'one-time',
      desc: '11 AI mock interviews',
      perInterview: '~$3.18 per interview',
      features: [
        'All 6 interview types',
        'Voice mode',
        'All interviewer personalities',
        'STAR method scoring & feedback',
        'Resume vulnerability scanner',
        'Job description analysis',
        'Custom interviewer creator',
        'Salary negotiation simulator',
        'Full performance analytics',
        'Interview replay & history',
      ],
      cta: 'Get Pro Pack',
      ctaHref: '/register',
      highlight: true,
      variant: 'popular' as const,
    },
    {
      name: 'Refill Pack',
      price: '10',
      period: 'per refill',
      desc: '+5 additional interviews',
      perInterview: '$2.00 per interview',
      features: [
        'All 6 interview types',
        'Voice mode',
        'All interviewer personalities',
        'STAR method scoring & feedback',
        'Resume vulnerability scanner',
        'Job description analysis',
        'Custom interviewer creator',
        'Salary negotiation simulator',
        'Full performance analytics',
        'Interview replay & history',
      ],
      cta: 'Get Refill Pack',
      ctaHref: '/register',
      highlight: false,
      variant: 'refill' as const,
    },
  ];

  const faqs = [
    {
      q: 'How is this different from practicing with ChatGPT?',
      a: "UnderFireAI is purpose-built for interview prep. ChatGPT can't offer hidden interviewer personalities that force adaptive thinking, real-time STAR method analysis, voice mode with natural conversation flow, performance tracking over time, or resume-aware question generation. It's the difference between a generic chatbot and a specialized training tool.",
    },
    {
      q: 'What are "hidden personalities" and why do they matter?',
      a: "Each AI interviewer has a unique personality — skeptical, friendly, detail-obsessed, big-picture — that you discover through the conversation, just like a real interview. This stops you from memorizing answers and forces you to actually listen, read social cues, and adapt your communication style in real time.",
    },
    {
      q: 'How does voice mode work?',
      a: 'Speak naturally into your microphone and the AI responds in real time, creating a conversational flow that matches the pressure of a real interview. Voice mode is included with every purchase.',
    },
    {
      q: 'What interview types are supported?',
      a: 'Behavioral (STAR-method), Technical (system design and coding), Case Study, HR Screen, Panel (multiple interviewers), and Phone Screen. All types are included with every purchase.',
    },
    {
      q: 'Can I prepare for a specific company?',
      a: "Yes. Select your target company type — FAANG, startup, consulting, enterprise, finance, or government — and the AI adjusts its style, questions, and evaluation criteria to match. You can also upload a job description for gap analysis and alignment scoring.",
    },
    {
      q: 'How does the credit system work?',
      a: "Each interview session costs one credit. Buy a Starter Pack (6 interviews for $25) or Pro Pack (11 for $35) to get started — every feature is unlocked immediately. When you need more, grab a Refill Pack (5 for $10). Credits never expire. No subscriptions, no recurring charges.",
    },
    {
      q: 'What is the Salary Negotiation Simulator?',
      a: "Practice negotiating a job offer against an AI recruiter who pushes back realistically. You're scored on confidence, framing, strategy, and composure — and you see what offer your technique would have closed.",
    },
    {
      q: 'Can I replay my interviews?',
      a: 'Yes — full interview replay is included with every purchase. After each completed session you can review every message, see your per-response STAR analysis, and go through key moments.',
    },
    {
      q: 'Is my data secure?',
      a: 'Your resume, interview data, and personal information are encrypted and never shared with third parties. You can delete your account and all associated data at any time.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080a] text-[#fafafa] antialiased overflow-x-hidden pb-20 md:pb-0">

      {/* Mouse-tracked glow */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          background: `radial-gradient(1100px circle at ${mousePos.x}% ${mousePos.y}%, rgba(249,115,22,0.06), transparent 40%)`,
        }}
      />

      {/* Static gradient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[900px] h-[900px] bg-gradient-to-br from-orange-500/[0.07] to-transparent blur-3xl" />
        <div className="absolute top-[30%] right-0 w-[700px] h-[700px] bg-gradient-to-bl from-red-500/[0.06] to-transparent blur-3xl" />
        <div className="absolute bottom-[10%] left-[30%] w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/[0.06] to-transparent blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#08080a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                <Flame className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-[#fafafa]">UnderFireAI</span>
          </Link>

          {/* Desktop section links (md+) */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-base text-[#a1a1aa] hover:text-[#fafafa] transition-colors rounded-lg"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop auth CTAs (md+) */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-base text-[#a1a1aa] hover:text-[#fafafa] transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 text-base font-semibold rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-orange-900/30"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu trigger (<md) — replaces the desktop links + CTAs which
              together overflow a 375px viewport. The full menu (section anchors,
              Sign in, Get Started Free) lives in the panel below. */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[#fafafa] hover:bg-white/[0.06] transition-colors min-h-[44px] min-w-[44px]"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu panel (<md only). Rendered inside the same fixed nav so
            it shares the backdrop blur and stays anchored to the top of the
            viewport. State is managed via mobileMenuOpen; the menu auto-closes
            on link tap, viewport resize past md, and Escape. */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden mt-4 pt-4 border-t border-white/[0.06] space-y-1"
          >
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white shadow-lg shadow-orange-900/30"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-24 pb-16 md:pt-28 md:pb-24 px-6 overflow-hidden">
        {/* Photo backdrop: real interview-panel photography, desaturated and
            scrimmed so the hero copy stays fully legible. Sits behind the
            existing mouse-tracked glow / gradient orbs / grid overlay (all
            fixed, page-wide, z-0) — this one is section-scoped. */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover grayscale opacity-[0.44]"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1573497701240-345a300b8d36?auto=format&fit=crop&w=2400&q=80')",
              backgroundPosition: '68% 35%',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/85 to-[#08080a]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08080a]/20 via-transparent to-[#08080a]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-base text-[#a1a1aa] font-medium">AI-powered interview coaching</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-7">
                <span className="text-[#fafafa]">Master Your Interviews</span>
                <br />
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                  WE PUT YOU UNDER FIRE FIRST
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-[#a1a1aa] leading-relaxed max-w-xl mb-8">
                Practice with AI interviewers who have{' '}
                <strong className="text-[#fafafa]">hidden personalities</strong> you must discover.
                Get <strong className="text-[#fafafa]">real-time STAR analysis</strong>, brutally honest feedback,
                and track your improvement over time.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-lg font-bold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-xl shadow-orange-900/30 hover:shadow-orange-900/50 hover:-translate-y-0.5"
                >
                  Start Practicing — Packs from $25
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <p className="text-base text-[#71717a]">
                No subscriptions &middot; Buy interview credits &middot; Use at your pace
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="relative py-16 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">Core Features</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#fafafa]">
              Everything you need to land the offer
            </h2>
            <p className="text-xl text-[#a1a1aa]">
              Every feature is designed to create real interview pressure and give you actionable feedback you can act on immediately.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {coreFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group p-9 rounded-2xl bg-[#18181b] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-900/15 ${
                    f.highlight
                      ? 'border-orange-500/25 shadow-lg shadow-orange-900/10'
                      : 'border-white/[0.06] hover:border-orange-500/25'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/25">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3 text-[#fafafa]">{f.title}</h3>
                      <p className="text-base text-[#a1a1aa] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                  {f.highlight && (
                    <div className="mt-6 pt-6 border-t border-orange-500/15">
                      <span className="inline-flex items-center gap-2 text-base font-semibold text-orange-400">
                        <Sparkles className="h-4 w-4" />
                        Our most unique feature — what makes us different
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interview Types */}
      <section className="relative py-14 md:py-24 px-6 bg-gradient-to-b from-transparent to-[#0f0f12]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">Interview Types</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-5 text-[#fafafa]">
              Prepare for any interview format
            </h2>
            <p className="text-xl text-[#a1a1aa]">
              All six types included with every purchase.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {interviewTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.name}
                  className="p-6 rounded-xl bg-[#18181b] border border-white/[0.06] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-900/15 transition-all text-center group"
                >
                  <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/20 transition-colors">
                    <Icon className="h-7 w-7 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-base text-[#fafafa] mb-1">{type.name}</h3>
                  <p className="text-sm text-[#71717a]">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resume Intelligence */}
      <section className="relative py-16 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">Resume Intelligence</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#fafafa]">
                Your resume becomes your interview prep guide
              </h2>
              <p className="text-xl text-[#a1a1aa] mb-12">
                Upload your resume and we identify exactly where interviewers will probe.
                Know your weak points before you walk in the door.
              </p>

              <div className="space-y-7">
                {resumeFeatures.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex gap-5">
                      <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[#fafafa] mb-1.5">{f.title}</h3>
                        <p className="text-base text-[#a1a1aa] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/8 to-amber-400/5 rounded-3xl blur-2xl" />
              <div className="relative bg-[#18181b] rounded-2xl border border-white/[0.06] p-7 shadow-xl shadow-black/30">
                <div className="flex items-center gap-3 mb-7">
                  <FileText className="h-6 w-6 text-orange-400" />
                  <span className="font-bold text-lg text-[#fafafa]">Resume Analysis</span>
                  <span className="ml-auto px-3 py-1.5 rounded-full bg-green-500/12 text-green-400 text-sm font-semibold">
                    Analyzed
                  </span>
                </div>

                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base text-[#a1a1aa]">Overall Health Score</span>
                    <span className="text-3xl font-bold text-orange-400">78/100</span>
                  </div>
                  <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full w-[78%] bg-gradient-to-r from-[#8B5A2B] to-orange-400 rounded-full" />
                  </div>
                </div>

                <div className="space-y-3 mb-7">
                  <div className="p-4 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Eye className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-amber-400 text-sm">Vulnerability Found</span>
                    </div>
                    <p className="text-sm text-[#a1a1aa]">3-month employment gap — prepare your story</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/8 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="font-semibold text-green-400 text-sm">Strong Point</span>
                    </div>
                    <p className="text-sm text-[#a1a1aa]">Clear quantified impact metrics in recent roles</p>
                  </div>
                </div>

                <button className="w-full py-3.5 rounded-xl bg-orange-500/8 text-orange-400 font-semibold hover:bg-orange-500/15 transition-colors text-base">
                  Generate Practice Questions from Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Types */}
      <section className="relative py-14 md:py-24 px-6 bg-gradient-to-b from-transparent to-[#0f0f12]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">Company-Specific Prep</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-5 text-[#fafafa]">
              Tailored to your target company
            </h2>
            <p className="text-xl text-[#a1a1aa]">
              Different companies interview differently. We match the style, questions, and evaluation criteria.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {companyTypes.map((company) => {
              const Icon = company.icon;
              return (
                <div
                  key={company.name}
                  className="p-6 rounded-xl bg-[#18181b] border border-white/[0.06] hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-900/15 transition-all text-center group"
                >
                  <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/20 transition-colors">
                    <Icon className="h-7 w-7 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-base text-[#fafafa] mb-1">{company.name}</h3>
                  <p className="text-sm text-[#71717a]">{company.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-16 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">How It Works</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#fafafa]">
              From nervous to offer-ready in 5 steps
            </h2>
            <p className="text-xl text-[#a1a1aa]">
              A systematic approach to interview preparation that actually builds real skills.
            </p>
          </div>

          <div className="relative mt-14">
            <div className="hidden lg:block absolute left-[calc(50%-1px)] top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500/15 via-orange-500/40 to-orange-500/15" />

            <div className="space-y-14 lg:space-y-0">
              {howItWorks.map((step, index) => (
                <div
                  key={step.step}
                  className="relative lg:grid lg:grid-cols-2 lg:gap-16 items-center"
                >
                  <div className={index % 2 === 0 ? 'lg:text-right lg:pr-20' : 'lg:order-2 lg:pl-20'}>
                    <div className={`inline-flex items-center gap-4 mb-5 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                      <span className="text-6xl font-bold text-orange-500/15">{step.step}</span>
                      <div className="hidden lg:block w-14 h-0.5 bg-orange-500/25" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-[#fafafa]">{step.title}</h3>
                    <p className="text-lg text-[#a1a1aa] leading-relaxed">{step.desc}</p>
                  </div>

                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-orange-500 border-4 border-[#08080a]" />

                  <div className={`${index % 2 === 0 ? 'lg:order-2' : ''} mt-6 lg:mt-0`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-16 md:py-28 px-6 bg-gradient-to-b from-transparent to-[#0f0f12]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">Pricing</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#fafafa]">
              Invest in your career
            </h2>
            <p className="text-xl text-[#a1a1aa]">
              Buy interview credits, use them at your pace. Every purchase unlocks all features &mdash; no tiers, no restrictions.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`relative p-9 rounded-2xl transition-all ${
                  p.highlight
                    ? 'bg-gradient-to-b from-orange-500/8 to-[#18181b] border-2 border-orange-500/40 shadow-2xl shadow-orange-900/15 lg:scale-105'
                    : p.variant === 'refill'
                      ? 'bg-[#18181b] border border-green-500/20 hover:border-green-500/40'
                      : 'bg-[#18181b] border border-white/[0.06] hover:border-orange-500/25'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-base font-bold">
                      Best Value
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1 text-[#fafafa]">{p.name}</h3>
                  <p className="text-base text-[#71717a]">{p.desc}</p>
                </div>

                <div className="mb-2">
                  <span className="text-5xl font-bold text-[#fafafa]">${p.price}</span>
                  <span className="text-lg text-[#71717a] ml-2">{p.period}</span>
                </div>

                <p className={`text-sm font-semibold mb-7 ${p.variant === 'refill' ? 'text-green-400' : 'text-orange-400'}`}>
                  {p.perInterview}
                </p>

                <ul className="space-y-3.5 mb-7">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          p.variant === 'refill' ? 'text-green-400' : 'text-orange-400'
                        }`}
                      />
                      <span className="text-base text-[#a1a1aa]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.ctaHref}
                  className={`block w-full py-4 rounded-xl text-center text-base font-bold transition-all ${
                    p.highlight
                      ? 'bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white hover:from-[#9A6B3C] hover:to-[#6B4420] shadow-lg shadow-orange-900/25'
                      : p.variant === 'refill'
                        ? 'bg-green-500/8 text-green-400 hover:bg-green-500/15 border border-green-500/25'
                        : 'bg-white/[0.05] text-[#fafafa] hover:bg-orange-500/8 border border-white/10'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-base text-[#71717a] mt-8 max-w-xl mx-auto">
            No subscriptions. No recurring charges. Credits never expire. Every purchase unlocks all features instantly.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-16 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-bold tracking-widest text-sm mb-5 uppercase">FAQ</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#fafafa]">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-7 rounded-xl bg-[#18181b] border border-white/[0.06] hover:border-orange-500/25 transition-all"
              >
                <h3 className="font-bold text-lg text-[#fafafa] mb-3">{faq.q}</h3>
                <p className="text-base text-[#a1a1aa] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 md:py-28 px-6 bg-gradient-to-b from-transparent to-[#0f0f12]/60">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-400/8 rounded-3xl blur-3xl" />
            <div className="relative p-14 lg:p-24 rounded-3xl bg-[#18181b] border border-white/10 text-center shadow-2xl shadow-black/40">
              <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] mb-9 shadow-xl shadow-orange-900/30 p-5">
                <Flame className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-7 text-[#fafafa]">
                Ready to transform your interviews?
              </h2>
              <p className="text-xl lg:text-2xl text-[#a1a1aa] mb-12 max-w-2xl mx-auto leading-relaxed">
                Grab a Starter or Pro Pack and unlock every feature instantly.
                No subscriptions, no limits on when you use your credits.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-xl font-bold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-xl shadow-orange-900/30 hover:shadow-orange-900/50 hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-base text-[#71717a] mt-7">
                Starter Pack $25 &middot; Pro Pack $35 &middot; Refills $10 &middot; Credits never expire
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-14 px-6 border-t border-white/[0.06] bg-[#0f0f12]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-[#fafafa]">UnderFireAI</span>
              </div>
              <p className="text-base text-[#71717a] leading-relaxed">
                AI-powered interview coaching that builds real skills under real pressure.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#fafafa] mb-5">Product</h4>
              <ul className="space-y-3 text-base text-[#a1a1aa]">
                <li><a href="#features" className="hover:text-orange-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-orange-400 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-orange-400 transition-colors">How It Works</a></li>
                <li><Link href="/faq" className="hover:text-orange-400 transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#fafafa] mb-5">Account</h4>
              <ul className="space-y-3 text-base text-[#a1a1aa]">
                <li><Link href="/login" className="hover:text-orange-400 transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-orange-400 transition-colors">Create Account</Link></li>
                <li><Link href="/settings" className="hover:text-orange-400 transition-colors">Settings</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#fafafa] mb-5">Packs</h4>
              <ul className="space-y-3 text-base text-[#71717a]">
                <li>Starter &mdash; $25 (6 interviews)</li>
                <li>Pro &mdash; $35 (11 interviews)</li>
                <li>Refill &mdash; $10 (5 interviews)</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-base text-[#71717a]">
              &copy; {new Date().getFullYear()} UnderFireAI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-base text-[#71717a]">
              <Link href="/privacy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA bar — visible only on <md viewports. Gives
          non-logged-in mobile visitors a persistent path to convert without
          having to scroll back to the top nav after a long page. Hidden on
          md+ so the desktop layout is unchanged. The root <div> has
          pb-20 md:pb-0 above to reserve room for this bar on mobile. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 bg-[#08080a]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <Link
          href="/register"
          className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-base font-bold shadow-xl shadow-orange-900/30"
        >
          Get Started Free
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
