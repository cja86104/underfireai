'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Brain,
  Target,
  Mic,
  Shield,
  Star,
  CheckCircle2,
  ArrowRight,
  Zap,
  BarChart3,
  Play,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    { icon: Brain, title: 'Hidden Personalities', desc: 'AI interviewers with unique traits, biases, and communication styles you must discover through interaction.', gradient: 'from-violet-600 to-purple-600' },
    { icon: Target, title: 'STAR Method Analysis', desc: 'Real-time detection and scoring of Situation, Task, Action, Result structure in your responses.', gradient: 'from-orange-600 to-red-600' },
    { icon: Mic, title: 'Voice Conversations', desc: 'Natural voice-based practice with AI that responds in real-time, just like a real interview.', gradient: 'from-cyan-600 to-blue-600' },
    { icon: BarChart3, title: 'Performance Analytics', desc: 'Deep metrics tracking clarity, confidence, technical depth, and improvement over time.', gradient: 'from-emerald-600 to-teal-600' },
    { icon: Shield, title: 'Company-Specific Prep', desc: 'Tailored interview styles for FAANG, startups, consulting, finance, and more.', gradient: 'from-pink-600 to-rose-600' },
    { icon: Zap, title: 'Adaptive Difficulty', desc: 'Dynamic adjustment based on your performance - push your limits when ready.', gradient: 'from-amber-600 to-orange-600' },
  ];

  const results = [
    { metric: '94%', label: 'Success Rate', sub: 'Users who land offers' },
    { metric: '2.3x', label: 'Faster Prep', sub: 'vs traditional methods' },
    { metric: '50K+', label: 'Interviews', sub: 'Completed on platform' },
    { metric: '4.9/5', label: 'User Rating', sub: 'From 10K+ reviews' },
  ];

  const testimonials = [
    { quote: "I was skeptical about AI interview prep, but UnderFireAI is different. The hidden personality feature forced me to actually listen and adapt. Landed Google L5.", author: "Sarah Chen", role: "Senior SWE, Google", img: "SC" },
    { quote: "The feedback is brutal but honest. After two weeks, I went from fumbling behavioral questions to nailing them. Got competing offers from Meta and Stripe.", author: "Marcus Johnson", role: "Staff PM, Meta", img: "MJ" },
    { quote: "Voice mode changed everything. Reading answers is easy - speaking them under pressure is hard. Netflix DS offer, first try.", author: "Priya Patel", role: "Data Scientist, Netflix", img: "PP" },
  ];

  const pricing = [
    { 
      name: 'Starter', 
      price: '0', 
      period: 'forever free',
      desc: 'Try the core experience',
      features: ['5 AI interviews/month', 'Text-based practice', 'Basic feedback', 'STAR analysis', 'Progress tracking'],
      cta: 'Start Free',
      highlight: false 
    },
    { 
      name: 'Pro', 
      price: '29', 
      period: 'per month',
      desc: 'For serious job seekers',
      features: ['Unlimited interviews', 'Voice mode included', 'All interviewer personalities', 'Advanced analytics', 'Resume-tailored questions', 'Company-specific prep', 'Priority support'],
      cta: 'Start Pro Trial',
      highlight: true 
    },
    { 
      name: 'Premium', 
      price: '79', 
      period: 'per month',
      desc: 'Maximum preparation',
      features: ['Everything in Pro', 'Mock panel interviews', '1-on-1 strategy session', 'Custom scenario builder', 'Interview recordings', 'Salary negotiation prep', 'Dedicated success manager'],
      cta: 'Go Premium',
      highlight: false 
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080a] text-white antialiased overflow-x-hidden">
      {/* Interactive gradient that follows mouse */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-300 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(249,115,22,0.07), transparent 40%)`,
        }}
      />
      
      {/* Static gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-orange-600/8 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-red-900/10 to-transparent blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                <Flame className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="font-semibold text-lg tracking-tight">UnderFireAI</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'Results', 'Pricing'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 transition-all shadow-lg shadow-orange-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-32 px-6">
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-sm text-zinc-300">Now with GPT-4 powered feedback</span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-8">
              Interview practice that
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                actually prepares you
              </span>
            </h1>

            <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl mb-10">
              AI interviewers with hidden personalities that challenge you to think on your feet. 
              Real pressure. Real feedback. Real results.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-16">
              <Link 
                href="/register" 
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-base font-semibold hover:from-orange-400 hover:to-red-500 transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                <Play className="h-4 w-4" />
                See it in action
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <div className="flex -space-x-3">
                {['SC', 'MJ', 'PP', 'AK', 'JL'].map((initials, i) => (
                  <div 
                    key={initials}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-[#08080a] flex items-center justify-center text-xs font-medium"
                    style={{ zIndex: 5 - i }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-medium">4.9/5</span> from 10,000+ users
                </span>
              </div>
            </div>
          </div>

          {/* Hero card - Interview UI preview */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[480px]">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-3xl blur-2xl" />
              <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center gap-4 pb-5 border-b border-white/10">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl font-bold">
                      AI
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-zinc-900" />
                  </div>
                  <div>
                    <p className="font-semibold">Technical Interviewer</p>
                    <p className="text-sm text-zinc-500">Senior Engineering • Skeptical</p>
                  </div>
                </div>
                
                <div className="py-5 space-y-4">
                  <div className="bg-zinc-800/50 rounded-2xl rounded-tl-sm p-4 max-w-[90%]">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      &ldquo;Tell me about a time you had to make a critical technical decision with incomplete information. What was your process?&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Analyzing your response patterns...
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl px-4 py-3">
                    <Mic className="h-5 w-5 text-zinc-500" />
                    <span className="text-sm text-zinc-500">Press to respond with voice...</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Clarity', score: 87 },
                    { label: 'Structure', score: 72 },
                    { label: 'Impact', score: 91 },
                  ].map((item) => (
                    <div key={item.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-orange-400">{item.score}</p>
                      <p className="text-xs text-zinc-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results bar */}
      <section className="relative py-24 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {results.map((r) => (
              <div key={r.label} className="text-center lg:text-left">
                <p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
                  {r.metric}
                </p>
                <p className="text-white font-medium mb-1">{r.label}</p>
                <p className="text-sm text-zinc-500">{r.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-orange-500 font-semibold tracking-wide text-sm mb-4">FEATURES</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Everything you need to land the offer
            </h2>
            <p className="text-lg text-zinc-400">
              Purpose-built tools that prepare you for real interview pressure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div 
                  key={f.title}
                  className="group p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="results" className="relative py-32 px-6 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-orange-500 font-semibold tracking-wide text-sm mb-4">RESULTS</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              From anxious to offer-ready
            </h2>
            <p className="text-lg text-zinc-400">
              Real stories from people who transformed their interview performance
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div 
                key={t.author}
                className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-zinc-300 leading-relaxed mb-8">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-semibold">
                    {t.img}
                  </div>
                  <div>
                    <p className="font-semibold">{t.author}</p>
                    <p className="text-sm text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-orange-500 font-semibold tracking-wide text-sm mb-4">PRICING</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Invest in your career
            </h2>
            <p className="text-lg text-zinc-400">
              Start free, upgrade when you&apos;re ready to get serious
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div 
                key={p.name}
                className={`relative p-8 rounded-2xl transition-all ${
                  p.highlight 
                    ? 'bg-gradient-to-b from-orange-500/10 to-zinc-900/50 border-2 border-orange-500/50 lg:scale-105' 
                    : 'bg-zinc-900/50 border border-white/5 hover:border-white/10'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-1">{p.name}</h3>
                  <p className="text-sm text-zinc-500">{p.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="text-5xl font-bold">${p.price}</span>
                  <span className="text-zinc-500 ml-2">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${p.highlight ? 'text-orange-400' : 'text-zinc-600'}`} />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/register"
                  className={`block w-full py-3.5 rounded-xl text-center font-semibold transition-all ${
                    p.highlight 
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-lg shadow-orange-500/20' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-3xl blur-3xl" />
            <div className="relative p-12 lg:p-20 rounded-3xl bg-zinc-900/80 border border-white/10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-8 shadow-xl shadow-orange-500/30">
                <Flame className="h-8 w-8" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to transform your interviews?
              </h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                Join thousands of professionals who went from nervous to confident, from rejected to hired.
              </p>
              <Link 
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-lg font-semibold hover:from-orange-400 hover:to-red-500 transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                Start Your Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-zinc-500 text-sm mt-6">No credit card required • Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <Flame className="h-4 w-4" />
            </div>
            <span className="font-semibold">UnderFireAI</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-zinc-500">© 2024 UnderFireAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
