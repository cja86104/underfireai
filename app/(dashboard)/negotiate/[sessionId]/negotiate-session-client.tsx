'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Square,
  DollarSign,
  Briefcase,
  Trophy,
  ChevronLeft,
  Lightbulb,
  Loader2,
  Target,
  TrendingUp,
  Award,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';
import type { NegotiationSession, NegotiationMessage } from '@/types/database';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NegotiationChatApiResponse {
  reply?: string;
  message?: string;
}

interface EndSessionApiResponse {
  success?: boolean;
  scores?: {
    overall_score: number;
    confidence_score: number;
    framing_score: number;
    strategy_score: number;
    composure_score: number;
  };
  final_simulated_offer?: number | null;
  key_tactics_used?: string[];
  improvements?: string[];
  ai_feedback?: string;
  message?: string;
}

interface NegotiationSessionClientProps {
  session: NegotiationSession;
  initialMessages: NegotiationMessage[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function ScoreBar({ label, value }: { label: string; value: number }): React.JSX.Element {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-lg">
        <span className="text-[#3D3229] dark:text-slate-300 font-medium">{label}</span>
        <span className="font-mono font-bold text-[#3D3229] dark:text-white">{value}</span>
      </div>
      <div className="h-3 bg-[#3D3229]/10 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result }: { result: EndSessionApiResponse }): React.JSX.Element {
  const scores = result.scores;
  const overallColor =
    (scores?.overall_score ?? 0) >= 80
      ? 'text-green-600 dark:text-green-400'
      : (scores?.overall_score ?? 0) >= 60
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-amber-500/10 p-3">
          <Trophy className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-3xl font-bold text-[#3D3229] dark:text-white">Negotiation Complete</h2>
      </div>

      {/* Overall score */}
      {scores && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Award className="h-7 w-7 text-orange-500" />
              <span className="text-xl text-[#3D3229] dark:text-slate-300 font-semibold">Overall Score</span>
            </div>
            <span className={cn('text-5xl font-bold', overallColor)}>{scores.overall_score}</span>
          </div>
          <div className="space-y-5">
            <ScoreBar label="Confidence" value={scores.confidence_score} />
            <ScoreBar label="Framing" value={scores.framing_score} />
            <ScoreBar label="Strategy" value={scores.strategy_score} />
            <ScoreBar label="Composure" value={scores.composure_score} />
          </div>
        </div>
      )}

      {/* Simulated outcome */}
      {result.final_simulated_offer !== null && result.final_simulated_offer !== undefined && (
        <div className="rounded-2xl border-2 border-green-500/30 bg-green-50 dark:bg-green-500/10 p-8">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-7 w-7 text-green-600 dark:text-green-400" />
            <p className="text-xl text-green-700 dark:text-green-400 font-bold">Simulated Outcome</p>
          </div>
          <p className="text-4xl font-bold text-[#3D3229] dark:text-white">{formatAmount(result.final_simulated_offer)}</p>
          <p className="text-lg text-[#3D3229]/70 dark:text-slate-400 mt-2">Estimated final offer based on your negotiation</p>
        </div>
      )}

      {/* AI feedback */}
      {result.ai_feedback && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="h-7 w-7 text-purple-500" />
            <p className="text-xl text-[#3D3229] dark:text-slate-300 font-bold">Coach Feedback</p>
          </div>
          <p className="text-xl text-[#3D3229] dark:text-slate-200 leading-relaxed">{result.ai_feedback}</p>
        </div>
      )}

      {/* Key tactics */}
      {(result.key_tactics_used ?? []).length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-7 w-7 text-green-500" />
            <p className="text-xl text-[#3D3229] dark:text-slate-300 font-bold">Tactics You Used</p>
          </div>
          <ul className="space-y-3">
            {(result.key_tactics_used ?? []).map((t, i) => (
              <li key={i} className="text-lg text-[#3D3229] dark:text-slate-200 flex items-start gap-3">
                <span className="text-green-600 dark:text-green-400 mt-1 text-xl">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {(result.improvements ?? []).length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-7 w-7 text-amber-500" />
            <p className="text-xl text-[#3D3229] dark:text-slate-300 font-bold">Areas to Improve</p>
          </div>
          <ul className="space-y-3">
            {(result.improvements ?? []).map((imp, i) => (
              <li key={i} className="text-lg text-[#3D3229] dark:text-slate-200 flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-1 shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/negotiate"
        className="block w-full text-center rounded-xl border-2 border-[#3D3229]/20 dark:border-slate-600 bg-white dark:bg-slate-800 text-xl font-bold text-[#3D3229] dark:text-white py-5 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors"
      >
        Practice Again
      </Link>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: NegotiationMessage }): React.JSX.Element {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0',
        isUser ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-slate-200'
      )}>
        {isUser ? 'You' : 'HR'}
      </div>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-6 py-4 text-lg leading-relaxed',
        isUser
          ? 'bg-orange-500/20 text-[#3D3229] dark:text-orange-50 rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 text-[#3D3229] dark:text-slate-100 rounded-tl-sm'
      )}>
        {message.content}
        <div className={cn('text-base mt-2 text-[#3D3229]/50 dark:text-slate-400', isUser ? 'text-right' : 'text-left')}>
          {format(new Date(message.created_at), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NegotiationSessionClient({
  session,
  initialMessages,
}: NegotiationSessionClientProps): React.JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartRef = useRef<number>(Date.now());

  const [messages, setMessages] = useState<NegotiationMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(session.status !== 'in_progress');
  const [result, setResult] = useState<EndSessionApiResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    if (sessionEnded) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionEnded]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatElapsed = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sendMessage = useCallback(async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading || sessionEnded) return;

    setInputValue('');
    setIsLoading(true);

    // Optimistic local message
    const optimisticMsg: NegotiationMessage = {
      id: `opt-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const response = await fetch(`/api/negotiate/${session.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json() as NegotiationChatApiResponse;

      if (!response.ok) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        toast.error(data.message ?? 'Failed to send message');
        return;
      }

      if (data.reply) {
        const recruiterMsg: NegotiationMessage = {
          id: `recv-${Date.now()}`,
          session_id: session.id,
          role: 'recruiter',
          content: data.reply,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, recruiterMsg]);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [inputValue, isLoading, sessionEnded, session.id]);

  const endSession = useCallback(async (): Promise<void> => {
    if (isEnding || sessionEnded) return;
    setIsEnding(true);

    try {
      const response = await fetch(`/api/negotiate/${session.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elapsed_seconds: elapsedSeconds }),
      });

      const data = await response.json() as EndSessionApiResponse;

      if (!response.ok) {
        toast.error(data.message ?? 'Failed to end session');
        return;
      }

      setSessionEnded(true);
      setResult(data);
    } catch {
      toast.error('Failed to end session. Please try again.');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, sessionEnded, session.id, elapsedSeconds]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

  const offerGap = session.target_amount - session.current_offer_amount;
  const gapLabel = offerGap > 0 ? `+${formatAmount(offerGap)}` : formatAmount(offerGap);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-6 pb-6 border-b border-[#3D3229]/10 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/negotiate" className="text-[#3D3229] dark:text-slate-400 hover:text-orange-500 transition-colors">
            <ChevronLeft className="h-8 w-8" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#3D3229] dark:text-white truncate">{session.target_role}</h1>
            <div className="flex items-center gap-4 text-lg text-[#3D3229] dark:text-slate-300 mt-1">
              {session.company_name && (
                <span className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {session.company_name}
                </span>
              )}
              <span className="flex items-center gap-2 font-semibold">
                <DollarSign className="h-5 w-5" />
                {formatAmount(session.current_offer_amount)} → {formatAmount(session.target_amount)}
                <span className="text-orange-600 dark:text-orange-400">({gapLabel})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {!sessionEnded && (
            <span className="font-mono text-xl font-bold text-[#3D3229] dark:text-slate-300">{formatElapsed(elapsedSeconds)}</span>
          )}
          {!sessionEnded && (
            <button
              onClick={() => void endSession()}
              disabled={isEnding}
              className="flex items-center gap-2 rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-6 py-3 text-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <Square className="h-5 w-5" />
              {isEnding ? 'Ending…' : 'End Session'}
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {sessionEnded && result ? (
        <div className="flex-1 overflow-y-auto py-8" data-lenis-prevent>
          <ResultsPanel result={result} />
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-6 space-y-6" data-lenis-prevent>
            {/* Opening context */}
            {messages.length === 0 && (
              <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/30 p-6">
                <p className="text-xl font-bold text-[#3D3229] dark:text-slate-200 mb-2">How this works</p>
                <p className="text-lg text-[#3D3229] dark:text-slate-300">
                  You&apos;re negotiating your {session.target_role} offer of{' '}
                  <span className="font-bold">{formatAmount(session.current_offer_amount)}</span>.{' '}
                  Your target is <span className="font-bold">{formatAmount(session.target_amount)}</span>.
                  The recruiter won&apos;t volunteer extra budget — you need to earn it.
                  Start by responding to the offer.
                </p>
              </div>
            )}

            {/* First recruiter message if no messages yet */}
            {messages.length === 0 && !isLoading && (
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-lg font-bold shrink-0 text-[#3D3229] dark:text-slate-200">
                  HR
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-6 py-4 text-lg bg-white dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 text-[#3D3229] dark:text-slate-100 leading-relaxed">
                  Hi! Thanks for taking the time to interview with us. I&apos;m excited to share that
                  we&apos;d like to extend an offer for the {session.target_role} role
                  {session.company_name ? ` at ${session.company_name}` : ''}.
                  The offer is <span className="font-bold">{formatAmount(session.current_offer_amount)}</span> annually.
                  What are your thoughts?
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-lg font-bold shrink-0 text-[#3D3229] dark:text-slate-200">
                  HR
                </div>
                <div className="rounded-2xl rounded-tl-sm px-6 py-5 bg-white dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#3D3229]/30 dark:bg-slate-500 animate-bounce [animation-delay:0ms]" />
                    <span className="h-3 w-3 rounded-full bg-[#3D3229]/30 dark:bg-slate-500 animate-bounce [animation-delay:150ms]" />
                    <span className="h-3 w-3 rounded-full bg-[#3D3229]/30 dark:bg-slate-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#3D3229]/10 dark:border-slate-800 pt-6 flex-shrink-0">
            <div className="flex gap-4 items-end">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Respond to the recruiter… (Enter to send)"
                rows={1}
                disabled={isLoading || sessionEnded}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-6 py-4 text-lg text-[#3D3229] dark:text-white placeholder:text-[#3D3229]/40 dark:placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'min-h-[60px] max-h-[150px] leading-relaxed'
                )}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isLoading || !inputValue.trim() || sessionEnded}
                className="h-14 w-14 shrink-0 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
              </button>
            </div>
            <p className="text-base text-[#3D3229]/50 dark:text-slate-500 mt-3 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
}
