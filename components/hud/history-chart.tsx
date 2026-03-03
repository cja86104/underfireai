'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { HudTurnAnalysis } from '@/types/hud';

interface HistoryChartProps {
  turns: HudTurnAnalysis[];
}

interface ChartPoint {
  turn:  number;
  score: number;
}

export function HistoryChart({ turns }: HistoryChartProps): React.JSX.Element {
  const data: ChartPoint[] = turns.map((t) => ({
    turn:  t.turnIndex + 1,   // 1-based for display
    score: t.overallScore,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 rounded-lg bg-white/[0.02] border border-white/[0.05]">
        <span className="text-[11px] text-slate-600">Score trend appears here</span>
      </div>
    );
  }

  return (
    <div className="w-full h-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="turn"
            tick={{ fontSize: 9, fill: '#4b5563' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#4b5563' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background:   '#0f172a',
              border:       '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding:      '4px 8px',
            }}
            labelStyle={{ color: '#94a3b8', fontSize: 10 }}
            itemStyle={{ color: '#f97316', fontSize: 10 }}
            formatter={(v: number) => [v, 'Score']}
            labelFormatter={(l: number) => `Turn ${l}`}
          />
          <ReferenceLine
            y={50}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />
          <Line
            dataKey="score"
            type="monotone"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 2, fill: '#f97316', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
