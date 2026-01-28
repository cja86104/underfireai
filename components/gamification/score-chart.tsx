'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ScoreDataPoint {
  date: string;
  score: number;
  label?: string;
}

interface ScoreChartProps {
  data: ScoreDataPoint[];
  height?: number;
  showTrend?: boolean;
  showLabels?: boolean;
  className?: string;
}

interface ScoreSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

interface ScoreTrendProps {
  current: number;
  previous: number;
  period?: string;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#16a34a'; // green-600
  if (score >= 80) return '#65a30d'; // lime-600
  if (score >= 70) return '#ca8a04'; // yellow-600
  if (score >= 60) return '#ea580c'; // orange-600
  return '#dc2626'; // red-600
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ScoreChart({
  data,
  height = 200,
  showTrend = true,
  showLabels = true,
  className,
}: ScoreChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], min: 0, max: 100, avg: 0, trend: 0 };

    const scores = data.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate trend (comparing first half to second half)
    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
    const trend = secondAvg - firstAvg;

    // Normalize points for chart
    const chartHeight = height - 40; // Leave room for labels
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = ((d.score - 0) / (100 - 0)) * chartHeight;
      return { x, y: chartHeight - y, score: d.score, date: d.date, label: d.label };
    });

    return { points, min, max, avg, trend };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-stone-200 bg-white p-6 flex items-center justify-center',
          className
        )}
        style={{ height }}
      >
        <div className="text-center text-charcoal-400">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No score data yet</p>
        </div>
      </div>
    );
  }

  // Create SVG path
  const pathD = chartData.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}`)
    .join(' ');

  // Create area path (for gradient fill)
  const areaD = `${pathD} L 100% ${height - 40} L 0% ${height - 40} Z`;

  return (
    <div className={cn('rounded-xl border border-stone-200 bg-white shadow-card', className)}>
      {/* Header */}
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-fire-500" />
            <span className="font-medium text-charcoal-900">Score History</span>
          </div>

          {showTrend && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                chartData.trend > 2
                  ? 'text-green-600'
                  : chartData.trend < -2
                  ? 'text-red-600'
                  : 'text-charcoal-500'
              )}
            >
              {chartData.trend > 2 ? (
                <TrendingUp className="h-4 w-4" />
              ) : chartData.trend < -2 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {chartData.trend > 0 ? '+' : ''}
              {chartData.trend.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <svg
          viewBox={`0 0 100 ${height - 40}`}
          className="w-full"
          style={{ height: height - 40 }}
          preserveAspectRatio="none"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = ((100 - val) / 100) * (height - 40);
            return (
              <line
                key={val}
                x1="0%"
                y1={y}
                x2="100%"
                y2={y}
                stroke="#e7e5e4"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#scoreGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <circle
              key={i}
              cx={`${point.x}%`}
              cy={point.y}
              r="4"
              fill="white"
              stroke={getScoreColor(point.score)}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        {showLabels && data.length <= 10 && (
          <div className="flex justify-between mt-2 text-xs text-charcoal-400">
            {data.map((d, i) => (
              <span key={i}>{formatDate(d.date)}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 divide-x divide-stone-200 border-t border-stone-200">
        <div className="p-3 text-center">
          <p className="text-xs text-charcoal-500">Average</p>
          <p className="text-lg font-bold" style={{ color: getScoreColor(chartData.avg) }}>
            {chartData.avg.toFixed(0)}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-charcoal-500">Highest</p>
          <p className="text-lg font-bold" style={{ color: getScoreColor(chartData.max) }}>
            {chartData.max}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-charcoal-500">Sessions</p>
          <p className="text-lg font-bold text-charcoal-900">{data.length}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact sparkline for inline score trends
 */
export function ScoreSparkline({
  data,
  width = 80,
  height = 24,
  color = '#f97316',
  className,
}: ScoreSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((score, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((score - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Score trend indicator with comparison
 */
export function ScoreTrend({
  current,
  previous,
  period = 'vs last session',
  className,
}: ScoreTrendProps) {
  const diff = current - previous;
  const percentage = previous ? ((diff / previous) * 100).toFixed(1) : '0';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-full px-2 py-1',
          diff > 0
            ? 'bg-green-50 text-green-600'
            : diff < 0
            ? 'bg-red-50 text-red-600'
            : 'bg-stone-50 text-charcoal-500'
        )}
      >
        {diff > 0 ? (
          <TrendingUp className="h-3 w-3" />
        ) : diff < 0 ? (
          <TrendingDown className="h-3 w-3" />
        ) : (
          <Minus className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {diff > 0 ? '+' : ''}
          {diff} ({percentage}%)
        </span>
      </div>
      <span className="text-xs text-charcoal-400">{period}</span>
    </div>
  );
}
