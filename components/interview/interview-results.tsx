'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Target,
  MessageSquare,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Play,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Mic,
  BookOpen,
  Zap,
  Star,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';
import type { InterviewMessage, InterviewType, CompanyStyle, ResponseAnalysis } from '@/types/database';

interface InterviewResultsProps {
  session: {
    id: string;
    interviewType: InterviewType;
    targetRole: string | null;
    targetCompany: string | null;
    difficulty: number;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
  };
  interviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    interviewType: InterviewType;
    companyStyle: CompanyStyle | null;
  };
  scores: {
    overallScore: number | null;
    clarityScore: number | null;
    confidenceScore: number | null;
    technicalDepth: number | null;
    starUsageScore: number | null;
    communicationScore: number | null;
    relevanceScore: number | null;
    strengths: string[] | null;
    improvements: string[] | null;
    aiFeedback: string | null;
    interviewerImpression: string | null;
    keyMoments: { type: string; description: string }[] | null;
  } | null;
  messages: InterviewMessage[];
  isPaidUser: boolean;
}

interface QAPair {
  question: string;
  answer: string;
  questionIndex: number;
  analysis: ResponseAnalysis | null;
  responseTimeSeconds: number | null;
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-[#3D3229] dark:text-slate-300';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number | null): string {
  if (score === null) return 'bg-[#3D3229]/5';
  if (score >= 80) return 'bg-green-500/15';
  if (score >= 60) return 'bg-amber-500/15';
  return 'bg-red-500/15';
}

function getBarColor(score: number | null): string {
  if (score === null) return 'bg-[#3D3229]/20';
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Weak';
  return 'Poor';
}

function buildQAPairs(messages: InterviewMessage[]): QAPair[] {
  const pairs: QAPair[] = [];
  let questionIndex = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'interviewer') {
      const next = messages[i + 1];
      if (next && next.role === 'candidate') {
        pairs.push({
          question: msg.content,
          answer: next.content,
          questionIndex: questionIndex++,
          analysis: (next.analysis as ResponseAnalysis | null) ?? null,
          responseTimeSeconds: next.response_time_seconds ?? null,
        });
        i++;
      }
    }
  }
  return pairs;
}

function aggregateFillerWords(pairs: QAPair[]): { word: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const pair of pairs) {
    for (const word of pair.analysis?.filler_words ?? []) {
      const normalized = word.toLowerCase().trim();
      counts[normalized] = (counts[normalized] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

function MiniScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base text-[#3D3229] dark:text-slate-200 w-28 flex-shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 overflow-hidden">
        <div className={cn('h-full rounded-full', getBarColor(value))} style={{ width: `${value}%` }} />
      </div>
      <span className={cn('text-base font-bold w-10 text-right', getScoreColor(value))}>{value}</span>
    </div>
  );
}

function QuestionCard({ pair, index }: { pair: QAPair; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const analysis = pair.analysis;
  const coachingNote = analysis?.coaching_note ?? null;
  const overallQuestionScore = analysis
    ? Math.round((analysis.star_score + analysis.clarity_score + analysis.confidence_score + analysis.relevance_score + analysis.depth_score) / 5)
    : null;
  const hasFillers = (analysis?.filler_words?.length ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6 flex items-start gap-5 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#8B5A2B]/10 flex items-center justify-center mt-0.5">
          <span className="text-base font-bold text-[#8B5A2B]">Q{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-[#3D3229] dark:text-white leading-snug">{pair.question}</p>
          {overallQuestionScore !== null && (
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className={cn('text-lg font-bold', getScoreColor(overallQuestionScore))}>
                {overallQuestionScore} — {getScoreLabel(overallQuestionScore)}
              </span>
              {hasFillers && (
                <span className="text-base bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-3 py-1 rounded-full font-medium">Filler words detected</span>
              )}
              {coachingNote && (
                <span className="text-base bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700 px-3 py-1 rounded-full font-medium">Coaching note available</span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="h-6 w-6 text-[#3D3229] dark:text-slate-300" /> : <ChevronDown className="h-6 w-6 text-[#3D3229] dark:text-slate-300" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#3D3229]/10 dark:border-slate-800">
          {/* Your Answer */}
          <div className="p-6 border-b border-[#3D3229]/10 dark:border-slate-800">
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="flex items-center gap-3 text-lg font-semibold text-[#3D3229] dark:text-white mb-4 hover:text-[#8B5A2B] transition-colors"
            >
              <Eye className="h-5 w-5" />
              Your Answer
              {showAnswer ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {showAnswer && (
              <p className="text-lg text-[#3D3229] dark:text-slate-200 leading-relaxed bg-[#FAF8F5] dark:bg-slate-800/40 rounded-xl p-5 border border-[#3D3229]/10">
                {pair.answer}
              </p>
            )}
            {pair.responseTimeSeconds !== null && (
              <p className="text-base text-[#3D3229] dark:text-slate-300 mt-3">
                Response time: {Math.floor(pair.responseTimeSeconds / 60)}m {pair.responseTimeSeconds % 60}s
              </p>
            )}
          </div>

          {/* Score Breakdown */}
          {analysis && (
            <div className="p-6 border-b border-[#3D3229]/10 dark:border-slate-800">
              <p className="text-lg font-bold text-[#3D3229] dark:text-white mb-4">Answer Analysis</p>
              <div className="space-y-3">
                <MiniScoreBar label="STAR Format" value={analysis.star_score} />
                <MiniScoreBar label="Clarity" value={analysis.clarity_score} />
                <MiniScoreBar label="Confidence" value={analysis.confidence_score} />
                <MiniScoreBar label="Relevance" value={analysis.relevance_score} />
                <MiniScoreBar label="Depth" value={analysis.depth_score} />
              </div>
              {analysis.key_points.length > 0 && (
                <div className="mt-5">
                  <p className="text-lg font-bold text-[#3D3229] dark:text-white mb-3">What you covered well</p>
                  <ul className="space-y-2">
                    {analysis.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-lg text-[#3D3229] dark:text-slate-200">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasFillers && (
                <div className="mt-5">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-3">Filler words in this answer</p>
                  <div className="flex flex-wrap gap-3">
                    {analysis.filler_words.map((word, i) => (
                      <span key={i} className="text-base bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-full font-medium">&ldquo;{word}&rdquo;</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coaching Note */}
          {coachingNote && (
            <div className="p-6 bg-[#FAF8F5] dark:bg-slate-800/30">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-[#8B5A2B]/15 p-2 mt-0.5">
                  <Lightbulb className="h-6 w-6 text-[#8B5A2B]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#3D3229] dark:text-white mb-2">Coach&apos;s Note</p>
                  <p className="text-lg text-[#3D3229] dark:text-slate-200 leading-relaxed">{coachingNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InterviewResults({ session, interviewer, scores, messages, isPaidUser }: InterviewResultsProps): React.JSX.Element {
  const [showTranscript, setShowTranscript] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const qaPairs = buildQAPairs(messages);
  const fillerWordSummary = aggregateFillerWords(qaPairs);
  const totalFillerWords = fillerWordSummary.reduce((a, b) => a + b.count, 0);

  const scoreCategories = [
    { key: 'clarityScore', label: 'Clarity', value: scores?.clarityScore ?? null, description: 'How clearly you structured and communicated your answers' },
    { key: 'confidenceScore', label: 'Confidence', value: scores?.confidenceScore ?? null, description: 'How assured and direct your language was throughout' },
    { key: 'technicalDepth', label: 'Technical Depth', value: scores?.technicalDepth ?? null, description: 'The specificity and detail of your technical explanations' },
    { key: 'starUsageScore', label: 'STAR Usage', value: scores?.starUsageScore ?? null, description: 'How consistently you used Situation, Task, Action, Result structure' },
    { key: 'communicationScore', label: 'Communication', value: scores?.communicationScore ?? null, description: 'Overall clarity, flow, and professionalism' },
    { key: 'relevanceScore', label: 'Relevance', value: scores?.relevanceScore ?? null, description: 'How directly your answers addressed what was actually asked' },
  ];

  const weakestScores = scoreCategories
    .filter((s) => s.value !== null && s.value < 75)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    .slice(0, 2);

  const nextStepRecommendations: Record<string, string> = {
    clarityScore: 'Practice structured answers — try a behavioral interview focused specifically on storytelling and clear structure.',
    confidenceScore: 'Use voice mode in your next session and listen back — it surfaces hedging language you can\'t hear while speaking.',
    technicalDepth: 'Run a technical interview at difficulty 7+ and challenge yourself to add specific metrics, technologies, or timelines to every answer.',
    starUsageScore: 'Do a behavioral interview and force yourself to explicitly work through each STAR component before moving to the next.',
    communicationScore: 'Practice phone screen interviews — the condensed format forces cleaner communication habits.',
    relevanceScore: 'After each question, restate it in your head before answering. If you tell a story, close with "...which is directly relevant because..."',
  };

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#3D3229] dark:text-white">Interview Results</h1>
          <p className="text-xl text-[#3D3229] dark:text-slate-200 mt-2">
            {format(new Date(session.startedAt), 'MMMM d, yyyy')} &bull; {interviewer.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/interview/${session.id}/replay`} className="inline-flex items-center gap-2 rounded-xl border border-orange-500/50 bg-orange-500/10 px-6 py-3 text-lg font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors">
            <RotateCcw className="h-5 w-5" />Replay
          </Link>
          <Link href="/history" className="rounded-xl border border-[#3D3229]/20 bg-white dark:bg-slate-800 px-6 py-3 text-lg font-medium text-[#3D3229] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors">History</Link>
          <Link href="/interview/new" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-600 transition-colors">
            <Play className="h-5 w-5" />New Interview
          </Link>
        </div>
      </div>

      {/* Overall Score */}
      <div className="rounded-2xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center gap-10">
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className={cn('relative h-48 w-48 rounded-full flex items-center justify-center', getScoreBgColor(scores?.overallScore ?? null))}>
              <div className="text-center">
                <p className={cn('text-6xl font-bold', getScoreColor(scores?.overallScore ?? null))}>{scores?.overallScore ?? '—'}</p>
                <p className="text-lg text-[#3D3229] dark:text-slate-200 font-medium">Overall</p>
              </div>
              {scores?.overallScore != null && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" className="text-[#3D3229]/10 dark:text-slate-700" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(scores.overallScore / 100) * 283} 283`} className={getScoreColor(scores.overallScore)} />
                </svg>
              )}
            </div>
            <p className={cn('text-2xl font-bold', getScoreColor(scores?.overallScore ?? null))}>{getScoreLabel(scores?.overallScore ?? null)}</p>
          </div>
          <div className="flex-1">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-base font-semibold text-[#3D3229] dark:text-slate-300 uppercase tracking-wide">Interview Type</p>
                <p className="text-2xl font-bold text-[#3D3229] dark:text-white capitalize mt-1">{session.interviewType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-base font-semibold text-[#3D3229] dark:text-slate-300 uppercase tracking-wide">Duration</p>
                <p className="text-2xl font-bold text-[#3D3229] dark:text-white mt-1">{session.durationSeconds ? formatDuration(session.durationSeconds) : '—'}</p>
              </div>
              <div>
                <p className="text-base font-semibold text-[#3D3229] dark:text-slate-300 uppercase tracking-wide">Difficulty</p>
                <p className="text-2xl font-bold text-[#3D3229] dark:text-white mt-1">{session.difficulty}/10</p>
              </div>
              <div>
                <p className="text-base font-semibold text-[#3D3229] dark:text-slate-300 uppercase tracking-wide">Questions</p>
                <p className="text-2xl font-bold text-[#3D3229] dark:text-white mt-1">{qaPairs.length}</p>
              </div>
            </div>
            {session.targetRole && (
              <div className="mt-6 pt-6 border-t border-[#3D3229]/10 dark:border-slate-700">
                <p className="text-base font-semibold text-[#3D3229] dark:text-slate-300 uppercase tracking-wide">Target Position</p>
                <p className="text-2xl font-bold text-[#3D3229] dark:text-white mt-1">{session.targetRole}{session.targetCompany && ` at ${session.targetCompany}`}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-Question Coaching */}
      {qaPairs.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-[#8B5A2B]/10 p-3">
              <BookOpen className="h-8 w-8 text-[#8B5A2B]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-[#3D3229] dark:text-white">Question-by-Question Coaching</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-1">Every answer scored individually. Expand any question to see what worked, what didn&apos;t, and how to fix it.</p>
            </div>
          </div>
          <div className="space-y-4">
            {qaPairs.map((pair, i) => (
              <QuestionCard key={i} pair={pair} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <h2 className="text-3xl font-bold text-[#3D3229] dark:text-white mb-8">Score Breakdown</h2>
        <div className="space-y-8">
          {scoreCategories.map((category) => (
            <div key={category.key}>
              <div className="flex items-center gap-5 mb-2">
                <div className="w-48 flex-shrink-0">
                  <p className="text-xl font-bold text-[#3D3229] dark:text-white">{category.label}</p>
                </div>
                <div className="flex-1">
                  <div className="h-5 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', getBarColor(category.value))} style={{ width: `${category.value ?? 0}%` }} />
                  </div>
                </div>
                <div className="w-32 text-right flex-shrink-0">
                  <span className={cn('text-2xl font-bold', getScoreColor(category.value))}>{category.value ?? '—'}</span>
                  <span className={cn('text-base ml-2', getScoreColor(category.value))}>{getScoreLabel(category.value)}</span>
                </div>
              </div>
              <p className="text-lg text-[#3D3229] dark:text-slate-200 pl-48">{category.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths + Improvements */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">What You Did Well</h2>
          </div>
          {scores?.strengths && scores.strengths.length > 0 ? (
            <ul className="space-y-4">
              {scores.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30">
                  <span className="mt-2 h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-lg text-[#3D3229] dark:text-slate-100 leading-relaxed">{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg text-[#3D3229] dark:text-slate-300">No strengths identified</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-8 w-8 text-amber-500" />
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">What Needs Work</h2>
          </div>
          {scores?.improvements && scores.improvements.length > 0 ? (
            <ul className="space-y-4">
              {scores.improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-[#3D3229] dark:text-slate-100 leading-relaxed">{improvement}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg text-[#3D3229] dark:text-slate-300">No improvements identified</p>
          )}
        </div>
      </div>

      {/* Filler Word Report */}
      {fillerWordSummary.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 p-8">
          <div className="flex items-start gap-4 mb-6">
            <Mic className="h-10 w-10 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Filler Word Report</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-2">
                You used <span className="font-bold text-amber-700 dark:text-amber-400">{totalFillerWords} filler word{totalFillerWords !== 1 ? 's' : ''}</span> across {qaPairs.length} answers. Filler words signal hesitation and reduce perceived confidence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-6">
            {fillerWordSummary.map(({ word, count }) => (
              <div key={word} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-full px-5 py-2">
                <span className="text-lg font-bold text-amber-800 dark:text-amber-300">&quot;{word}&quot;</span>
                <span className="text-base text-amber-600 dark:text-amber-400 font-semibold">&times;{count}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-amber-200 dark:border-amber-700/30 p-5">
            <p className="text-lg font-bold text-[#3D3229] dark:text-white mb-2">How to fix it</p>
            <p className="text-lg text-[#3D3229] dark:text-slate-200 leading-relaxed">
              When you feel the urge to say &quot;um&quot; or &quot;like&quot;, pause instead — silence is far more powerful than a filler word. Record yourself answering questions and listen back. Most people don&apos;t realise how often they use them until they hear it.
            </p>
          </div>
        </div>
      )}

      {/* AI Coach Feedback */}
      {scores?.aiFeedback && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
          <div className="flex items-center gap-4 mb-5">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-3">
              <Lightbulb className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">AI Coach Feedback</h2>
          </div>
          <p className="text-xl text-[#3D3229] dark:text-slate-100 leading-relaxed">{scores.aiFeedback}</p>
        </div>
      )}

      {/* Interviewer Impression */}
      {scores?.interviewerImpression && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-16 w-16 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {interviewer.avatarUrl ? (
                <Image src={interviewer.avatarUrl} alt={interviewer.name} fill className="object-cover" unoptimized />
              ) : (
                <span className="text-2xl font-bold text-[#3D3229] dark:text-slate-100">{interviewer.name[0]}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">How {interviewer.name} Saw You</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-300">Interviewer&apos;s impression after the session</p>
            </div>
          </div>
          <blockquote className="text-xl text-[#3D3229] dark:text-slate-100 leading-relaxed italic border-l-4 border-[#8B5A2B]/30 pl-6">
            &ldquo;{scores.interviewerImpression}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Key Moments */}
      {scores?.keyMoments && scores.keyMoments.length > 0 && (
        <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
          <div className="flex items-center gap-4 mb-6">
            <Star className="h-8 w-8 text-[#8B5A2B]" />
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Key Moments</h2>
          </div>
          <div className="space-y-4">
            {scores.keyMoments.map((moment, i) => (
              <div key={i} className={cn('flex items-start gap-5 rounded-xl p-5 border', moment.type === 'strong' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' : moment.type === 'weak' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30')}>
                {moment.type === 'strong' ? (
                  <CheckCircle className="h-7 w-7 text-green-500 flex-shrink-0 mt-0.5" />
                ) : moment.type === 'weak' ? (
                  <XCircle className="h-7 w-7 text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="h-7 w-7 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={cn('text-base font-bold uppercase tracking-wide', moment.type === 'strong' ? 'text-green-700 dark:text-green-400' : moment.type === 'weak' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400')}>
                    {moment.type === 'strong' ? 'Strong Moment' : moment.type === 'weak' ? 'Weak Moment' : 'Turning Point'}
                  </span>
                  <p className="text-lg text-[#3D3229] dark:text-slate-100 mt-2 leading-relaxed">{moment.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targeted Next Steps */}
      <div className="rounded-2xl border border-orange-400/30 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
            <Zap className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Your Next Steps</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-1">Based on your weakest areas this session</p>
          </div>
        </div>
        {weakestScores.length > 0 ? (
          <div className="space-y-4 mb-6">
            {weakestScores.map((ws) => (
              <div key={ws.key} className="flex items-start gap-4 bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-orange-200 dark:border-orange-700/30">
                <span className={cn('flex-shrink-0 text-xl font-bold mt-0.5 w-12', getScoreColor(ws.value))}>{ws.value}</span>
                <div className="flex-1">
                  <p className="text-lg font-bold text-[#3D3229] dark:text-white">{ws.label} — {getScoreLabel(ws.value)}</p>
                  <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-2 leading-relaxed">{nextStepRecommendations[ws.key]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-6">Great session — push yourself with higher difficulty and different interview types to keep improving.</p>
        )}
        <div className="flex flex-wrap gap-4">
          <Link href="/interview/new" className="inline-flex items-center gap-3 rounded-xl bg-orange-500 px-8 py-4 text-lg font-semibold text-white hover:bg-orange-600 transition-colors">
            Practice Again<ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/progress" className="inline-flex items-center gap-3 rounded-xl border border-[#3D3229]/20 bg-white dark:bg-slate-800/50 px-8 py-4 text-lg font-semibold text-[#3D3229] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors">
            View Progress
          </Link>
          {isPaidUser && (
            <Link href="/resume-insights" className="inline-flex items-center gap-3 rounded-xl border border-[#3D3229]/20 bg-white dark:bg-slate-800/50 px-8 py-4 text-lg font-semibold text-[#3D3229] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-slate-700 transition-colors">
              Resume Insights
            </Link>
          )}
        </div>
      </div>

      {/* Full Transcript */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between p-8 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <MessageSquare className="h-8 w-8 text-[#3D3229] dark:text-slate-300" />
            <h2 className="text-2xl font-bold text-[#3D3229] dark:text-white">Full Transcript</h2>
            <span className="text-lg text-[#3D3229] dark:text-slate-300">({messages.length} messages)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/interview/${session.id}/replay`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 text-lg text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors font-semibold">
              <RotateCcw className="h-5 w-5" />Detailed Replay
            </Link>
            {showTranscript ? <ChevronUp className="h-7 w-7 text-[#3D3229] dark:text-slate-300" /> : <ChevronDown className="h-7 w-7 text-[#3D3229] dark:text-slate-300" />}
          </div>
        </button>
        {showTranscript && (
          <div className="border-t border-[#3D3229]/10 dark:border-slate-800 p-8 space-y-5 max-h-[700px] overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex gap-4', message.role === 'candidate' && 'flex-row-reverse')}>
                <div className={cn('h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold', message.role === 'interviewer' ? 'bg-[#3D3229]/10 text-[#3D3229] dark:bg-slate-700 dark:text-white' : 'bg-orange-500 text-white')}>
                  {message.role === 'interviewer' ? interviewer.name[0] : 'Y'}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-6 py-4', message.role === 'interviewer' ? 'bg-[#FAF8F5] dark:bg-slate-800 text-[#3D3229] dark:text-slate-100' : 'bg-orange-50 dark:bg-orange-900/20 text-[#3D3229] dark:text-slate-100')}>
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
