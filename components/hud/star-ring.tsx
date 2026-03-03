'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { HudStarBreakdown } from '@/types/hud';

interface StarRingProps {
  star: HudStarBreakdown | null;
}

interface SegDef {
  key:         keyof Omit<HudStarBreakdown, 'overallScore'>;
  label:       string;
  fullLabel:   string;
  baseColor:   string;
  glowColor:   string;
  startAngle:  number; // degrees, 0 = right, clockwise
  endAngle:    number;
}

const SEGS: SegDef[] = [
  { key: 'situation', label: 'S', fullLabel: 'Situation', baseColor: '#1d4ed8', glowColor: '#3b82f6', startAngle: -90, endAngle: 0   },
  { key: 'task',      label: 'T', fullLabel: 'Task',      baseColor: '#047857', glowColor: '#10b981', startAngle: 0,   endAngle: 90  },
  { key: 'action',    label: 'A', fullLabel: 'Action',    baseColor: '#92400e', glowColor: '#f97316', startAngle: 90,  endAngle: 180 },
  { key: 'result',    label: 'R', fullLabel: 'Result',    baseColor: '#6b21a8', glowColor: '#a855f7', startAngle: 180, endAngle: 270 },
];

const RO = 52;   // outer radius
const RI = 28;   // inner radius
const CX = 60;   // centre x
const CY = 60;   // centre y

function polarXY(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function annularPath(start: number, end: number, ro: number, ri: number): string {
  const [x1, y1] = polarXY(start, ro);
  const [x2, y2] = polarXY(end,   ro);
  const [x3, y3] = polarXY(end,   ri);
  const [x4, y4] = polarXY(start, ri);
  const large    = end - start > 180 ? 1 : 0;
  return (
    `M ${x1} ${y1} A ${ro} ${ro} 0 ${large} 1 ${x2} ${y2}` +
    ` L ${x3} ${y3} A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4} Z`
  );
}

/** Map a 0–100 score to a filled outer radius between RI and RO. */
function scoreRadius(score: number): number {
  return RI + ((RO - RI) * Math.max(0, Math.min(100, score))) / 100;
}

export function StarRing({ star }: StarRingProps): React.JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null);

  const overall = star?.overallScore ?? 0;
  const has     = star !== null;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg
        width={120}
        height={120}
        viewBox="0 0 120 120"
        className="overflow-visible"
      >
        {/* Track segments (background) */}
        {SEGS.map((s) => (
          <path
            key={`${s.key}-bg`}
            d={annularPath(s.startAngle, s.endAngle, RO, RI)}
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
        ))}

        {/* Filled segments, scaled to score */}
        {SEGS.map((s) => {
          const part = has ? star?.[s.key] : null;
          const score = part?.score ?? 0;
          const rFill = scoreRadius(score);
          const isHov = hovered === s.key;
          return (
            <path
              key={s.key}
              d={annularPath(s.startAngle, s.endAngle, rFill, RI)}
              fill={isHov ? s.glowColor : s.baseColor}
              stroke={s.glowColor}
              strokeWidth={isHov ? 1 : 0.5}
              opacity={has && score > 0 ? (isHov ? 0.9 : 0.7) : 0.15}
              style={{
                transition:  'all 0.4s ease',
                filter:      isHov ? `drop-shadow(0 0 6px ${s.glowColor})` : undefined,
                cursor:      has ? 'pointer' : 'default',
              }}
              onMouseEnter={() => has && setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Centre labels */}
        <text
          x={CX} y={CY - 5}
          textAnchor="middle"
          style={{ fontSize: 10, fontFamily: 'monospace', fill: '#94a3b8' }}
        >
          STAR
        </text>
        <text
          x={CX} y={CY + 9}
          textAnchor="middle"
          style={{
            fontSize:   13,
            fontWeight: 700,
            fontFamily: 'monospace',
            fill:       has ? '#f97316' : '#4b5563',
          }}
        >
          {has ? overall : '–'}
        </text>

        {/* Segment letter labels outside the ring */}
        {SEGS.map((s) => {
          const mid       = (s.startAngle + s.endAngle) / 2;
          const [lx, ly]  = polarXY(mid, RO + 11);
          return (
            <text
              key={`${s.key}-lbl`}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize:   9,
                fontWeight: 700,
                fontFamily: 'monospace',
                fill:       hovered === s.key ? s.glowColor : '#94a3b8',
                transition: 'fill 0.2s',
              }}
            >
              {s.label}
            </text>
          );
        })}
      </svg>

      {/* Hover detail card */}
      {hovered && star ? (() => {
        const s = SEGS.find((x) => x.key === hovered)!;
        const p = star[s.key];
        return (
          <div className={cn(
            'w-full rounded-lg px-3 py-2 text-xs border',
            'bg-slate-900/80 border-white/10 backdrop-blur-sm',
          )}>
            <p className="font-semibold mb-1" style={{ color: s.glowColor }}>
              {s.fullLabel} — {p?.score ?? 0}/100
            </p>
            {p?.text
              ? <p className="text-slate-400 leading-relaxed line-clamp-3">{p.text}</p>
              : <p className="text-slate-600 italic">Awaiting analysis…</p>
            }
          </div>
        );
      })() : (
        <p className="text-[10px] text-slate-600 text-center">
          Hover a segment for detail
        </p>
      )}
    </div>
  );
}
