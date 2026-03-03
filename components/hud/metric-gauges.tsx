'use client';

import { cn } from '@/lib/utils/cn';
import type { HudTurnAnalysis, MetricTrend } from '@/types/hud';

interface MetricGaugesProps {
  latest: HudTurnAnalysis | null;
}

interface MetricDef {
  key: keyof Pick<
    HudTurnAnalysis,
    'clarity' | 'structure' | 'impact' | 'confidence' | 'technicalDepth'
  >;
  label: string;
  abbr: string;
}

const METRICS: MetricDef[] = [
  { key: 'clarity',        label: 'Clarity',    abbr: 'CLR' },
  { key: 'structure',      label: 'Structure',  abbr: 'STR' },
  { key: 'impact',         label: 'Impact',     abbr: 'IMP' },
  { key: 'confidence',     label: 'Confidence', abbr: 'CON' },
  { key: 'technicalDepth', label: 'Depth',      abbr: 'DEP' },
];

function trendIcon(t: MetricTrend | undefined): string {
  if (t === 'up')   return '▲';
  if (t === 'down') return '▼';
  return '–';
}

function trendCls(t: MetricTrend | undefined): string {
  if (t === 'up')   return 'text-emerald-400';
  if (t === 'down') return 'text-red-400';
  return 'text-slate-500';
}

function scoreColor(v: number): string {
  if (v >= 75) return '#10b981'; // emerald
  if (v >= 50) return '#f97316'; // orange-500 (brand)
  return '#ef4444';              // red
}

/** SVG radial arc gauge covering 270° of a circle, gap at the bottom. */
function RadialGauge({ value, color }: { value: number; color: string }): React.JSX.Element {
  const r    = 24;
  const cx   = 32;
  const cy   = 32;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;
  const fill = arc * (Math.max(0, Math.min(100, value)) / 100);

  return (
    <svg width={64} height={64} viewBox="0 0 64 64" className="block">
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={5}
        strokeDasharray={`${arc} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Filled arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

export function MetricGauges({ latest }: MetricGaugesProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {METRICS.map(({ key, label, abbr }) => {
        const metric = latest?.[key];
        const value  = metric?.value ?? 0;
        const trend  = metric?.trend;
        const color  = scoreColor(value);
        const has    = latest !== null;

        return (
          <div
            key={key}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2.5',
              'bg-white/[0.03] border border-white/[0.06] transition-colors duration-300',
            )}
          >
            {/* Gauge + centered value */}
            <div className="relative flex-shrink-0">
              <RadialGauge value={has ? value : 0} color={color} />
              <span
                className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums"
                style={{ color: has ? color : '#4b5563' }}
              >
                {has ? value : abbr}
              </span>
            </div>

            {/* Label + trend */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-slate-300 leading-none">{label}</span>
              <span className={cn('text-[11px] font-mono mt-1', trendCls(trend))}>
                {has ? `${trendIcon(trend)} ${trend ?? 'first'}` : '–'}
              </span>
            </div>

            {/* Subtle score fill behind the row */}
            {has && (
              <div
                className="absolute inset-0 rounded-lg opacity-[0.04] pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, ${color} ${value}%, transparent ${value}%)`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
