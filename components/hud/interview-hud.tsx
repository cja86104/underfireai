'use client';

/**
 * InterviewHUD
 *
 * Full-viewport 3-column layout rendered when NEXT_PUBLIC_ENABLE_3D_HUD=true
 * and WebGL is available.
 *
 * ┌──────────────┬────────────────────┬──────────────┐
 * │  LEFT        │     CENTRE         │    RIGHT     │
 * │  Messages    │  3D Avatar Scene   │  Metrics     │
 * │  + STAR ring │  + Mood bar        │  + Chart     │
 * │              │  + Input / Voice   │  + Stats     │
 * └──────────────┴────────────────────┴──────────────┘
 *
 * Data flow:
 *   VoiceMode  → onAudioFrame → AudioLevelContext ref (60fps, no re-renders)
 *   Chat API   → addTurn      → useHudSessionStore   (Zustand, ~1 / min)
 *   moodScore  → 3D scene colour + MoodIndicator
 */

import dynamic from 'next/dynamic';
import { Square, Pause, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useHudSessionStore, selectLatestTurn, selectMoodScore } from '@/lib/hud/session-store';
import { MetricGauges }  from './metric-gauges';
import { StarRing }      from './star-ring';
import { HistoryChart }  from './history-chart';
import { MoodIndicator } from './mood-indicator';
import type { SessionStatus } from '@/types/database';

// Heavy 3-D canvas — dynamic import so it never runs server-side
const InterviewerScene3D = dynamic(
  () => import('./interviewer-scene-3d').then((m) => m.InterviewerScene3D),
  {
    ssr:     false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border border-blue-500/30 animate-pulse" />
      </div>
    ),
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Internal UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-500 select-none">
      {children}
    </span>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface InterviewHUDProps {
  /** Rendered message bubbles — InterviewHUD provides its own scroll container */
  messageHistory: React.ReactNode;
  /** Voice mode panel rendered inside the centre column input area */
  voicePanel: React.ReactNode;
  /** Textarea + send button */
  inputArea: React.ReactNode;
  /** True while TTS audio is actively playing — drives avatar speak animation */
  isSpeaking: boolean;
  /** Displayed below the 3D scene */
  interviewerName: string;
  /** Candidate turn count shown in the stats grid */
  turnCount: number;
  // ── Header data ─────────────────────────────────────────────────────────────
  sessionStatus: SessionStatus;
  elapsedTime:   number;
  formatTime:    (seconds: number) => string;
  onEnd:         () => Promise<void>;
  onPause:       () => Promise<void>;
  onResume:      () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function InterviewHUD({
  messageHistory,
  voicePanel,
  inputArea,
  isSpeaking,
  interviewerName,
  turnCount,
  sessionStatus,
  elapsedTime,
  formatTime,
  onEnd,
  onPause,
  onResume,
}: InterviewHUDProps): React.JSX.Element {
  const latest    = useHudSessionStore(selectLatestTurn);
  const moodScore = useHudSessionStore(selectMoodScore);
  const turns     = useHudSessionStore((s) => s.turns);
  const avgScore  = useHudSessionStore((s) => s.sessionMetrics?.averages.overall ?? 0);

  return (
    <div className="flex flex-col h-full bg-[#08080a] text-white overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/40">
        {/* Left: interviewer name + status */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'h-2 w-2 rounded-full flex-shrink-0',
              sessionStatus === 'in_progress' && 'bg-emerald-400 animate-pulse',
              sessionStatus === 'paused'      && 'bg-amber-400',
              sessionStatus === 'completed'   && 'bg-blue-400',
            )}
          />
          <span className="text-[13px] font-semibold text-slate-200 tracking-wide">
            {interviewerName}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {sessionStatus.replace('_', ' ')}
          </span>
        </div>

        {/* Centre: timer */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-mono tabular-nums">{formatTime(elapsedTime)}</span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          {sessionStatus === 'in_progress' && (
            <button
              onClick={() => void onPause()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            >
              <Pause className="h-3 w-3" />
              Pause
            </button>
          )}
          {sessionStatus === 'paused' && (
            <button
              onClick={() => void onResume()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              <Play className="h-3 w-3" />
              Resume
            </button>
          )}
          <button
            onClick={() => void onEnd()}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            <Square className="h-3 w-3" />
            End
          </button>
        </div>
      </div>

      {/* ── 3-column body ─────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[340px_1fr_280px] min-h-0 overflow-hidden">

        {/* ── LEFT: messages only ────────────────────────────────────────── */}
        <div className="flex flex-col border-r border-white/[0.06] overflow-hidden">
          {/* Full-height scrollable messages — nothing pinned below */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
            <SectionLabel>Conversation</SectionLabel>
            <div className="mt-2 space-y-3">{messageHistory}</div>
          </div>
        </div>

        {/* ── CENTRE: 3D scene + mood + input ───────────────────────────── */}
        <div className="flex flex-col overflow-hidden">
          {/* 3D canvas */}
          <div className="relative flex-1 min-h-0">
            <InterviewerScene3D
              moodScore={moodScore}
              isSpeaking={isSpeaking}
            />

            {/* Mood bar overlaid at the bottom of the scene */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
              <div className="w-52">
                <MoodIndicator moodScore={moodScore} />
              </div>
            </div>
          </div>

          {/* Voice + text input */}
          {sessionStatus === 'in_progress' && (
            <div className="flex-shrink-0 border-t border-white/[0.06] p-3 space-y-2">
              {voicePanel}
              {inputArea}
            </div>
          )}

          {/* Paused / completed notice */}
          {sessionStatus !== 'in_progress' && (
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 border-t text-sm font-medium',
              sessionStatus === 'paused'    && 'border-amber-500/30 text-amber-400 bg-amber-500/10',
              sessionStatus === 'completed' && 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
              sessionStatus === 'abandoned' && 'border-red-500/30 text-red-400 bg-red-500/10',
            )}>
              {sessionStatus === 'paused'    && 'Interview paused — click Resume above to continue.'}
              {sessionStatus === 'completed' && 'Interview complete — generating your feedback…'}
              {sessionStatus === 'abandoned' && 'Interview abandoned.'}
            </div>
          )}
        </div>

        {/* ── RIGHT: stats + metrics + chart ────────────────────────────── */}
        <div className="flex flex-col gap-4 border-l border-white/[0.06] p-4 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>

          {/* Quick stats grid */}
          <div>
            <SectionLabel>Session</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <StatPill label="Turns" value={turnCount} />
              <StatPill label="Avg"   value={turns.length > 0 ? avgScore : '–'} />
              <StatPill label="Words" value={latest?.wordCount ?? '–'} />
              <StatPill label="WPM"   value={latest?.speakingPaceWpm ?? '–'} />
            </div>
          </div>

          {/* Per-metric gauges */}
          <div>
            <SectionLabel>Metrics</SectionLabel>
            <div className="mt-2">
              <MetricGauges latest={latest} />
            </div>
          </div>

          {/* Score trend */}
          <div>
            <SectionLabel>Score trend</SectionLabel>
            <div className="mt-2">
              <HistoryChart turns={turns} />
            </div>
          </div>

          {/* STAR Analysis */}
          <div>
            <SectionLabel>STAR Analysis</SectionLabel>
            <div className="mt-2">
              <StarRing star={latest?.star ?? null} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
