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
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
      ? 'text-green-400'
      : (scores?.overall_score ?? 0) >= 60
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Negotiation Complete</h2>
      </div>

      {/* Overall score */}
      {scores && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">Overall Score</span>
            <span className={cn('text-3xl font-bold', overallColor)}>{scores.overall_score}</span>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Confidence" value={scores.confidence_score} />
            <ScoreBar label="Framing" value={scores.framing_score} />
            <ScoreBar label="Strategy" value={scores.strategy_score} />
            <ScoreBar label="Composure" value={scores.composure_score} />
          </div>
        </div>
      )}

      {/* Simulated outcome */}
      {result.final_simulated_offer !== null && result.final_simulated_offer !== undefined && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-xs text-green-400 font-medium mb-1">Simulated Outcome</p>
          <p className="text-xl font-bold text-white">{formatAmount(result.final_simulated_offer)}</p>
          <p className="text-xs text-slate-400 mt-0.5">estimated final offer based on your negotiation</p>
        </div>
      )}

      {/* AI feedback */}
      {result.ai_feedback && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Coach Feedback</p>
          <p className="text-sm text-slate-200 leading-relaxed">{result.ai_feedback}</p>
        </div>
      )}

      {/* Key tactics */}
      {(result.key_tactics_used ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Tactics You Used</p>
          <ul className="space-y-1">
            {(result.key_tactics_used ?? []).map((t, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {(result.improvements ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Areas to Improve</p>
          <ul className="space-y-1">
            {(result.improvements ?? []).map((imp, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/negotiate">
        <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:text-white">
          Practice Again
        </Button>
      </Link>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: NegotiationMessage }): React.JSX.Element {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        isUser ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'
      )}>
        {isUser ? 'You' : 'HR'}
      </div>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-orange-500/20 text-orange-50 rounded-tr-sm'
          : 'bg-slate-800 text-slate-100 rounded-tl-sm'
      )}>
        {message.content}
        <div className={cn('text-xs mt-1 opacity-50', isUser ? 'text-right' : 'text-left')}>
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
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const offerGap = session.target_amount - session.current_offer_amount;
  const gapLabel = offerGap > 0 ? `+${formatAmount(offerGap)}` : formatAmount(offerGap);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/negotiate" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold text-white truncate">{session.target_role}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {session.company_name && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {session.company_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatAmount(session.current_offer_amount)} → {formatAmount(session.target_amount)}
                <span className="text-orange-400">({gapLabel})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!sessionEnded && (
            <span className="font-mono text-sm text-slate-400">{formatElapsed(elapsedSeconds)}</span>
          )}
          {!sessionEnded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void endSession()}
              disabled={isEnding}
              className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              <Square className="h-3.5 w-3.5" />
              {isEnding ? 'Ending…' : 'End'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {sessionEnded && result ? (
        <div className="flex-1 overflow-y-auto py-6">
          <ResultsPanel result={result} />
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Opening context */}
            {messages.length === 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300 mb-1">How this works</p>
                <p>
                  You&apos;re negotiating your {session.target_role} offer of{' '}
                  {formatAmount(session.current_offer_amount)}.{' '}
                  Your target is {formatAmount(session.target_amount)}.
                  The recruiter won&apos;t volunteer extra budget — you need to earn it.
                  Start by responding to the offer.
                </p>
              </div>
            )}

            {/* First recruiter message if no messages yet */}
            {messages.length === 0 && !isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 text-slate-300">
                  HR
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-slate-800 text-slate-100 leading-relaxed">
                  Hi! Thanks for taking the time to interview with us. I&apos;m excited to share that
                  we&apos;d like to extend an offer for the {session.target_role} role
                  {session.company_name ? ` at ${session.company_name}` : ''}.
                  The offer is {formatAmount(session.current_offer_amount)} annually.
                  What are your thoughts?
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 text-slate-300">
                  HR
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-slate-800">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 pt-4 flex-shrink-0">
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Respond to the recruiter… (Enter to send)"
                rows={1}
                disabled={isLoading || sessionEnded}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500',
                  'focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'min-h-[44px] max-h-[120px] leading-relaxed'
                )}
              />
              <Button
                onClick={() => void sendMessage()}
                disabled={isLoading || !inputValue.trim() || sessionEnded}
                size="icon"
                className="h-11 w-11 shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
}
