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
  Volume2,
  MessageSquare,
  Sparkles,
  Building2,
  HeartHandshake,
  Code2,
  Lightbulb,
  DollarSign,
  Wand2,
  X,
  Lock,
} from 'lucide-react';

export default function LandingPage(): React.JSX.Element {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
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
      desc: 'Speak naturally and our AI responds in real time, just like a real interview. Reading answers is easy — speaking them confidently under pressure is the skill that actually gets you hired. Voice mode is available on Pro and Premium.',
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
      name: 'Free',
      price: '0',
      period: 'forever free',
      desc: 'Try the core experience',
      features: [
        '3 mock interviews per month',
        'All 6 interview types',
        'All company styles & difficulty levels',
        'STAR method scoring & feedback',
        'Interview replay',
        'Progress dashboard',
      ],
      limitations: [
        'No voice mode',
        'No resume vulnerability scanner',
        'No job description analysis',
        'No resume alignment on results',
      ],
      cta: 'Start Free',
      ctaHref: '/register',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '19',
      period: 'per month',
      desc: 'For serious job seekers',
      features: [
        'Unlimited mock interviews',
        'Voice mode (up to ~100 min/month)',
        'All 8 interviewer personalities',
        'Resume upload & vulnerability scanner',
        'Resume health score',
        'Post-session resume alignment',
        'Job description analysis (3/month)',
        'Full performance analytics',
        'Interview replay',
      ],
      limitations: [],
      cta: 'Get Pro',
      ctaHref: '/register',
      highlight: true,
    },
    {
      name: 'Premium',
      price: '39',
      period: 'per month',
      desc: 'Maximum preparation',
      features: [
        'Everything in Pro, plus:',
        'Voice mode (up to ~250 min/month)',
        'Unlimited job description analysis',
        'JD gap-targeted practice sessions',
        'Resume-targeted interviews',
        'Custom Scenario Builder',
        'Custom Interviewer Creator',
        'Salary Negotiation Simulator',
      ],
      limitations: [],
      cta: 'Go Premium',
      ctaHref: '/register',
      highlight: false,
    },
  ];

  const premiumOnlyFeatures = [
    {
      icon: Wand2,
      title: 'Custom Interviewer Creator',
      desc: 'Build your own AI interviewer from scratch. Set their personality traits, communication style, favourite topics, red flags, and voice. Your practice, your rules.',
    },
    {
      icon: DollarSign,
      title: 'Salary Negotiation Simulator',
      desc: "Practice negotiating your offer against a realistic AI recruiter who pushes back. Get scored on confidence, framing, and strategy — and see what offer your technique would have closed.",
    },
    {
      icon: Target,
      title: 'Resume & JD-Targeted Interviews',
      desc: 'Focus the entire interview on your actual resume weak spots or the exact skill gaps between your profile and a specific job description.',
    },
    {
      icon: Brain,
      title: 'Custom Scenario Builder',
      desc: "Blend two interviewer archetypes, add custom constraints, and dial individual personality traits for a scenario that matches exactly what you're walking into.",
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
      a: 'Speak naturally into your microphone and the AI responds in real time, creating a conversational flow that matches the pressure of a real interview. Voice mode is available on Pro and Premium plans.',
    },
    {
      q: 'What interview types are supported?',
      a: 'Behavioral (STAR-method), Technical (system design and coding), Case Study, HR Screen, Panel (multiple interviewers), and Phone Screen. All types are available on every plan.',
    },
    {
      q: 'Can I prepare for a specific company?',
      a: "Yes. Select your target company type — FAANG, startup, consulting, enterprise, finance, or government — and the AI adjusts its style, questions, and evaluation criteria to match. On Pro and Premium you can also upload a job description for gap analysis and alignment scoring.",
    },
    {
      q: 'What is the Salary Negotiation Simulator?',
      a: "A Premium feature where you practice negotiating a job offer against an AI recruiter who pushes back realistically. You're scored on confidence, framing, strategy, and composure — and you see what offer your technique would have closed.",
    },
    {
      q: 'Can I replay my interviews?',
      a: 'Yes — full interview replay is available on all plans. After each completed session you can review every message, see your per-response STAR analysis, and go through key moments.',
    },
    {
      q: 'Is my data secure?',
      a: 'Your resume, interview data, and personal information are encrypted and never shared with third parties. You can delete your account and all associated data at any time.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#3D3229] antialiased overflow-x-hidden">
      {/* Mouse-tracked warm glow */}
      <div
        className="fixed inset-0 z-0 transition-all duration-500 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(1100px circle at ${mousePos.x}% ${mousePos.y}%, rgba(139,90,43,0.05), transparent 40%)`,
        }}
      />

      {/* Static warm gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-[#D4A574]/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-[#8B5A2B]/8 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#C4956A]/6 to-transparent blur-3xl" />
      </div>

      {/* Subtle grid */}
      <div
        className="fixed inset-0 z-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(61,50,41,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(61,50,41,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#FAF8F5]/80 backdrop-blur-xl border-b border-[#3D3229]/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                <Flame className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-[#3D3229]">UnderFireAI</span>
          </Link>

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
                className="px-4 py-2 text-base text-[#6B5744] hover:text-[#3D3229] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-base text-[#6B5744] hover:text-[#3D3229] transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 text-base font-semibold rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-28 pb-24 px-6">
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5A2B]/10 border border-[#8B5A2B]/20 mb-8">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8B5A2B] animate-pulse" />
                <span className="text-base text-[#6B5744] font-medium">AI-powered interview coaching</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-7">
                <span className="text-[#3D3229]">Train Under Fire.</span>
                <br />
                <span className="bg-gradient-to-r from-[#8B5A2B] via-[#A0522D] to-[#CD853F] bg-clip-text text-transparent">
                  So the real thing feels easy.
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-[#6B5744] leading-relaxed max-w-xl mb-8">
                Practice with AI interviewers who have{' '}
                <strong className="text-[#3D3229]">hidden personalities</strong> you must discover.
                Get <strong className="text-[#3D3229]">real-time STAR analysis</strong>, brutally honest feedback,
                and track your improvement over time.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-lg font-bold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-xl shadow-[#8B5A2B]/25 hover:shadow-[#8B5A2B]/40 hover:-translate-y-0.5"
                >
                  Start Free — 3 Interviews Included
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <p className="text-base text-[#8B7355]">
                No credit card required &middot; Upgrade anytime &middot; Cancel anytime
              </p>
            </div>

            {/* Hero card */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B]/15 to-[#D4A574]/15 rounded-3xl blur-2xl" />
                <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-[#3D3229]/10 p-7 shadow-2xl shadow-[#8B5A2B]/10">
                  <div className="flex items-center gap-4 pb-5 border-b border-[#3D3229]/10">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] flex items-center justify-center text-2xl font-bold text-white">
                        AI
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-[#3D3229]">Technical Interviewer</p>
                      <p className="text-base text-[#8B7355]">Senior Engineering &middot; Personality: Hidden</p>
                    </div>
                    <div className="ml-auto px-3 py-1.5 rounded-full bg-[#8B5A2B]/10 text-sm font-semibold text-[#8B5A2B]">
                      Discover it
                    </div>
                  </div>

                  <div className="py-6 space-y-4">
                    <div className="bg-[#FAF8F5] rounded-2xl rounded-tl-sm p-5 max-w-[92%]">
                      <p className="text-base text-[#3D3229] leading-relaxed">
                        &ldquo;Tell me about a time you had to make a critical technical decision
                        with incomplete information. Walk me through your thought process.&rdquo;
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#8B7355]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#8B5A2B] animate-pulse" />
                      STAR Analysis: Listening for Situation...
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#3D3229]/10">
                    <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-xl px-5 py-3.5">
                      <Mic className="h-5 w-5 text-[#8B5A2B]" />
                      <span className="text-base text-[#8B7355]">Press to respond with voice...</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-[#8B5A2B]" />
                        <span className="text-sm text-[#8B5A2B] font-semibold">Voice Mode</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3">
                    {[
                      { label: 'Clarity', score: 87, color: 'text-green-600' },
                      { label: 'Structure', score: 72, color: 'text-[#D4A574]' },
                      { label: 'Impact', score: 91, color: 'text-green-600' },
                      { label: 'Confidence', score: 68, color: 'text-[#CD853F]' },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#FAF8F5] rounded-xl p-3 text-center">
                        <p className={`text-xl font-bold ${item.color}`}>{item.score}</p>
                        <p className="text-sm text-[#8B7355]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">Core Features</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#3D3229]">
              Everything you need to land the offer
            </h2>
            <p className="text-xl text-[#6B5744]">
              Every feature is designed to create real interview pressure and give you actionable feedback you can act on immediately.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {coreFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group p-9 rounded-2xl bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#8B5A2B]/10 ${
                    f.highlight
                      ? 'border-[#8B5A2B]/30 shadow-lg shadow-[#8B5A2B]/5'
                      : 'border-[#3D3229]/10 hover:border-[#8B5A2B]/30'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-[#8B5A2B]/20">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3 text-[#3D3229]">{f.title}</h3>
                      <p className="text-base text-[#6B5744] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                  {f.highlight && (
                    <div className="mt-6 pt-6 border-t border-[#8B5A2B]/20">
                      <span className="inline-flex items-center gap-2 text-base font-semibold text-[#8B5A2B]">
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
      <section className="relative py-24 px-6 bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">Interview Types</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-5 text-[#3D3229]">
              Prepare for any interview format
            </h2>
            <p className="text-xl text-[#6B5744]">
              All six types are available on every plan.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {interviewTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.name}
                  className="p-6 rounded-xl bg-white border border-[#3D3229]/10 hover:border-[#8B5A2B]/30 hover:shadow-lg transition-all text-center group"
                >
                  <div className="w-14 h-14 rounded-lg bg-[#8B5A2B]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#8B5A2B]/20 transition-colors">
                    <Icon className="h-7 w-7 text-[#8B5A2B]" />
                  </div>
                  <h3 className="font-bold text-base text-[#3D3229] mb-1">{type.name}</h3>
                  <p className="text-sm text-[#8B7355]">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resume Intelligence */}
      <section className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">Resume Intelligence</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#3D3229]">
                Your resume becomes your interview prep guide
              </h2>
              <p className="text-xl text-[#6B5744] mb-12">
                Upload your resume and we identify exactly where interviewers will probe.
                Know your weak points before you walk in the door. Available on Pro and Premium.
              </p>

              <div className="space-y-7">
                {resumeFeatures.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex gap-5">
                      <div className="w-12 h-12 rounded-lg bg-[#8B5A2B]/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-[#8B5A2B]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[#3D3229] mb-1.5">{f.title}</h3>
                        <p className="text-base text-[#6B5744] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B]/10 to-[#D4A574]/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-[#3D3229]/10 p-7 shadow-xl">
                <div className="flex items-center gap-3 mb-7">
                  <FileText className="h-6 w-6 text-[#8B5A2B]" />
                  <span className="font-bold text-lg text-[#3D3229]">Resume Analysis</span>
                  <span className="ml-auto px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                    Analyzed
                  </span>
                </div>

                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base text-[#6B5744]">Overall Health Score</span>
                    <span className="text-3xl font-bold text-[#8B5A2B]">78/100</span>
                  </div>
                  <div className="h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden">
                    <div className="h-full w-[78%] bg-gradient-to-r from-[#8B5A2B] to-[#D4A574] rounded-full" />
                  </div>
                </div>

                <div className="space-y-3 mb-7">
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-amber-800 text-sm">Vulnerability Found</span>
                    </div>
                    <p className="text-sm text-amber-700">3-month employment gap — prepare your story</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800 text-sm">Strong Point</span>
                    </div>
                    <p className="text-sm text-green-700">Clear quantified impact metrics in recent roles</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Lock className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-600 text-sm">Pro Feature</span>
                    </div>
                    <p className="text-sm text-slate-500">Upgrade to unlock full vulnerability scan</p>
                  </div>
                </div>

                <button className="w-full py-3.5 rounded-xl bg-[#8B5A2B]/10 text-[#8B5A2B] font-semibold hover:bg-[#8B5A2B]/20 transition-colors text-base">
                  Generate Practice Questions from Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-white to-[#FAF8F5]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 mb-6">
              <span className="text-base font-bold text-amber-700">Premium Only — $39/mo</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#3D3229]">
              Go deeper with Premium
            </h2>
            <p className="text-xl text-[#6B5744]">
              Tools for candidates who want the maximum competitive edge.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {premiumOnlyFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-9 rounded-2xl bg-white border border-amber-500/20 hover:border-amber-500/50 hover:shadow-2xl transition-all group"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                      <Icon className="h-7 w-7 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-[#3D3229]">{f.title}</h3>
                      <p className="text-base text-[#6B5744] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Company Types */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">Company-Specific Prep</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-5 text-[#3D3229]">
              Tailored to your target company
            </h2>
            <p className="text-xl text-[#6B5744]">
              Different companies interview differently. We match the style, questions, and evaluation criteria.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {companyTypes.map((company) => {
              const Icon = company.icon;
              return (
                <div
                  key={company.name}
                  className="p-6 rounded-xl bg-white border border-[#3D3229]/10 hover:border-[#8B5A2B]/30 hover:shadow-lg transition-all text-center group"
                >
                  <div className="w-14 h-14 rounded-lg bg-[#8B5A2B]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#8B5A2B]/20 transition-colors">
                    <Icon className="h-7 w-7 text-[#8B5A2B]" />
                  </div>
                  <h3 className="font-bold text-base text-[#3D3229] mb-1">{company.name}</h3>
                  <p className="text-sm text-[#8B7355]">{company.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">How It Works</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#3D3229]">
              From nervous to offer-ready in 5 steps
            </h2>
            <p className="text-xl text-[#6B5744]">
              A systematic approach to interview preparation that actually builds real skills.
            </p>
          </div>

          <div className="relative mt-14">
            <div className="hidden lg:block absolute left-[calc(50%-1px)] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#8B5A2B]/20 via-[#8B5A2B]/40 to-[#8B5A2B]/20" />

            <div className="space-y-14 lg:space-y-0">
              {howItWorks.map((step, index) => (
                <div
                  key={step.step}
                  className="relative lg:grid lg:grid-cols-2 lg:gap-16 items-center"
                >
                  <div className={index % 2 === 0 ? 'lg:text-right lg:pr-20' : 'lg:order-2 lg:pl-20'}>
                    <div className={`inline-flex items-center gap-4 mb-5 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                      <span className="text-6xl font-bold text-[#8B5A2B]/20">{step.step}</span>
                      <div className="hidden lg:block w-14 h-0.5 bg-[#8B5A2B]/30" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-[#3D3229]">{step.title}</h3>
                    <p className="text-lg text-[#6B5744] leading-relaxed">{step.desc}</p>
                  </div>

                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#8B5A2B] border-4 border-[#FAF8F5]" />

                  <div className={`${index % 2 === 0 ? 'lg:order-2' : ''} mt-6 lg:mt-0`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-28 px-6 bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">Pricing</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-[#3D3229]">
              Invest in your career
            </h2>
            <p className="text-xl text-[#6B5744]">
              Start free, upgrade when you&apos;re ready to get serious. Cancel anytime.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`relative p-9 rounded-2xl transition-all ${
                  p.highlight
                    ? 'bg-gradient-to-b from-[#8B5A2B]/10 to-white border-2 border-[#8B5A2B]/50 shadow-2xl shadow-[#8B5A2B]/10 lg:scale-105'
                    : 'bg-white border border-[#3D3229]/10 hover:border-[#8B5A2B]/30'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-base font-bold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1 text-[#3D3229]">{p.name}</h3>
                  <p className="text-base text-[#8B7355]">{p.desc}</p>
                </div>

                <div className="mb-7">
                  <span className="text-5xl font-bold text-[#3D3229]">${p.price}</span>
                  <span className="text-lg text-[#8B7355] ml-2">{p.period}</span>
                </div>

                <ul className="space-y-3.5 mb-7">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${p.highlight ? 'text-[#8B5A2B]' : 'text-[#A0522D]'}`} />
                      <span className="text-base text-[#3D3229]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {p.limitations.length > 0 && (
                  <ul className="space-y-2.5 mb-7 pt-5 border-t border-[#3D3229]/10">
                    {p.limitations.map((limitation) => (
                      <li key={limitation} className="flex items-start gap-3 text-base text-[#8B7355]">
                        <X className="h-5 w-5 text-[#C4956A] mt-0.5 flex-shrink-0" />
                        {limitation}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={p.ctaHref}
                  className={`block w-full py-4 rounded-xl text-center text-base font-bold transition-all ${
                    p.highlight
                      ? 'bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white hover:from-[#9A6B3C] hover:to-[#6B4420] shadow-lg shadow-[#8B5A2B]/20'
                      : 'bg-[#FAF8F5] text-[#3D3229] hover:bg-[#8B5A2B]/10 border border-[#3D3229]/10'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-base text-[#8B7355] mt-10">
            All paid plans include a 7-day money-back guarantee. No questions asked.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-5 uppercase">FAQ</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#3D3229]">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-7 rounded-xl bg-white border border-[#3D3229]/10 hover:border-[#8B5A2B]/30 transition-all"
              >
                <h3 className="font-bold text-lg text-[#3D3229] mb-3">{faq.q}</h3>
                <p className="text-base text-[#6B5744] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5A2B]/15 to-[#D4A574]/15 rounded-3xl blur-3xl" />
            <div className="relative p-14 lg:p-24 rounded-3xl bg-white border border-[#3D3229]/10 text-center shadow-xl">
              <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] mb-9 shadow-xl shadow-[#8B5A2B]/25 p-5">
                <Flame className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-7 text-[#3D3229]">
                Ready to transform your interviews?
              </h2>
              <p className="text-xl lg:text-2xl text-[#6B5744] mb-12 max-w-2xl mx-auto leading-relaxed">
                Start free today — 3 mock interviews included, no credit card required.
                Upgrade to Pro or Premium when you&apos;re ready to go all in.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-xl font-bold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-xl shadow-[#8B5A2B]/25 hover:shadow-[#8B5A2B]/40 hover:-translate-y-0.5"
              >
                Start Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-base text-[#8B7355] mt-7">
                No credit card required &middot; 3 free interviews &middot; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-14 px-6 border-t border-[#3D3229]/10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-[#3D3229]">UnderFireAI</span>
              </div>
              <p className="text-base text-[#8B7355] leading-relaxed">
                AI-powered interview coaching that builds real skills under real pressure.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#3D3229] mb-5">Product</h4>
              <ul className="space-y-3 text-base text-[#6B5744]">
                <li><a href="#features" className="hover:text-[#8B5A2B] transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#8B5A2B] transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-[#8B5A2B] transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-[#8B5A2B] transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#3D3229] mb-5">Account</h4>
              <ul className="space-y-3 text-base text-[#6B5744]">
                <li><Link href="/login" className="hover:text-[#8B5A2B] transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-[#8B5A2B] transition-colors">Create Account</Link></li>
                <li><Link href="/settings" className="hover:text-[#8B5A2B] transition-colors">Settings</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base text-[#3D3229] mb-5">Plans</h4>
              <ul className="space-y-3 text-base text-[#8B7355]">
                <li>Free &mdash; $0/mo</li>
                <li>Pro &mdash; $19/mo</li>
                <li>Premium &mdash; $39/mo</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#3D3229]/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-base text-[#8B7355]">
              &copy; {new Date().getFullYear()} UnderFireAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
