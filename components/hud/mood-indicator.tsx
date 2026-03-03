'use client';

interface MoodIndicatorProps {
  moodScore: number; // -1 to +1
}

function moodLabel(m: number): string {
  if (m >= 0.5)   return 'Impressed';
  if (m >= 0.15)  return 'Engaged';
  if (m >= -0.15) return 'Neutral';
  if (m >= -0.5)  return 'Skeptical';
  return 'Concerned';
}

function moodColor(m: number): string {
  if (m >= 0.5)   return '#10b981'; // emerald
  if (m >= 0.15)  return '#f97316'; // orange (brand)
  if (m >= -0.15) return '#3b82f6'; // blue
  if (m >= -0.5)  return '#f59e0b'; // amber
  return '#ef4444';                 // red
}

export function MoodIndicator({ moodScore }: MoodIndicatorProps): React.JSX.Element {
  const pct = Math.round(((moodScore + 1) / 2) * 100);
  const clr = moodColor(moodScore);

  return (
    <div className="flex flex-col gap-1.5 w-full px-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
          Interviewer
        </span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: clr }}
        >
          {moodLabel(moodScore)}
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width:     `${pct}%`,
            background: clr,
            boxShadow: `0 0 8px ${clr}88`,
          }}
        />
      </div>
    </div>
  );
}
