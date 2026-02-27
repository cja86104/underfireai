'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Star, AlertTriangle, TrendingUp } from 'lucide-react';
import type { InterviewMessage, KeyMoment } from '@/types/database';

interface InterviewTimelineProps {
  messages: InterviewMessage[];
  keyMoments: KeyMoment[];
  currentMessageIndex: number;
  onMessageSelect: (index: number) => void;
  totalDuration: number;
}

export function InterviewTimeline({
  messages,
  keyMoments,
  currentMessageIndex,
  onMessageSelect,
  totalDuration,
}: InterviewTimelineProps): React.JSX.Element {
  // Calculate message positions on timeline
  const messagePositions = useMemo(() => {
    if (messages.length === 0 || totalDuration === 0) return [];

    const startTime = new Date(messages[0].created_at).getTime();

    return messages.map((msg, idx) => {
      const msgTime = new Date(msg.created_at).getTime();
      const position = ((msgTime - startTime) / (totalDuration * 1000)) * 100;
      return {
        index: idx,
        position: Math.min(Math.max(position, 0), 100),
        role: msg.role,
        hasAnalysis: !!msg.analysis,
      };
    });
  }, [messages, totalDuration]);

  // Map key moments to positions
  const momentPositions = useMemo(() => {
    return keyMoments.map((moment) => {
      const position = (moment.timestamp / totalDuration) * 100;
      return {
        ...moment,
        position: Math.min(Math.max(position, 0), 100),
      };
    });
  }, [keyMoments, totalDuration]);

  // Find message index for a key moment
  const findMessageForMoment = (moment: KeyMoment): number => {
    if (moment.message_id) {
      const idx = messages.findIndex((m) => m.id === moment.message_id);
      if (idx !== -1) return idx;
    }
    // Fall back to timestamp-based search
    const startTime = new Date(messages[0]?.created_at ?? 0).getTime();
    const momentTime = startTime + moment.timestamp * 1000;

    for (let i = 0; i < messages.length; i++) {
      const msgTime = new Date(messages[i].created_at).getTime();
      if (msgTime >= momentTime) return i;
    }
    return messages.length - 1;
  };

  const getMomentIcon = (type: KeyMoment['type']): React.JSX.Element => {
    switch (type) {
      case 'strong':
        return <Star className="h-4 w-4" />;
      case 'weak':
        return <AlertTriangle className="h-4 w-4" />;
      case 'turning_point':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getMomentColor = (type: KeyMoment['type']): string => {
    switch (type) {
      case 'strong':
        return 'bg-green-500 border-green-400';
      case 'weak':
        return 'bg-red-500 border-red-400';
      case 'turning_point':
        return 'bg-blue-500 border-blue-400';
      default:
        return 'bg-[#3D3229]/50 dark:bg-slate-500 border-[#3D3229]/30 dark:border-slate-400';
    }
  };

  return (
    <div className="space-y-5">
      {/* Timeline Bar */}
      <div className="relative">
        {/* Track */}
        <div className="h-3 bg-[#3D3229]/10 dark:bg-slate-700 rounded-full relative">
          {/* Progress indicator */}
          <div
            className="absolute h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
            style={{
              width: `${messagePositions[currentMessageIndex]?.position ?? 0}%`,
            }}
          />

          {/* Message markers */}
          {messagePositions.map((pos) => (
            <button
              key={`msg-${pos.index}`}
              onClick={() => onMessageSelect(pos.index)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-200',
                'hover:scale-150 hover:z-10',
                pos.role === 'interviewer'
                  ? 'bg-[#3D3229]/40 dark:bg-slate-500 hover:bg-[#3D3229]/60 dark:hover:bg-slate-400'
                  : 'bg-orange-500 hover:bg-orange-400',
                pos.index === currentMessageIndex && 'ring-2 ring-[#3D3229] dark:ring-white scale-150 z-10'
              )}
              style={{ left: `${pos.position}%`, marginLeft: '-8px' }}
              title={`Message ${pos.index + 1} (${pos.role})`}
            />
          ))}

          {/* Key moment markers */}
          {momentPositions.map((moment) => (
            <button
              key={`${moment.type}-${moment.position}-${moment.description}`}
              onClick={() => onMessageSelect(findMessageForMoment(moment))}
              className={cn(
                'absolute -top-5 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                'transition-all duration-200 hover:scale-125 hover:z-20',
                getMomentColor(moment.type),
                'text-white'
              )}
              style={{ left: `${moment.position}%`, marginLeft: '-16px' }}
              title={moment.description}
            >
              {getMomentIcon(moment.type)}
            </button>
          ))}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-3 text-base text-[#3D3229] dark:text-slate-400 font-medium">
          <span>0:00</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Key Moments Legend */}
      {keyMoments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {keyMoments.map((moment) => (
            <button
              key={`legend-${moment.type}-${moment.timestamp}-${moment.description}`}
              onClick={() => onMessageSelect(findMessageForMoment(moment))}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-base font-medium transition-colors',
                moment.type === 'strong' && 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30',
                moment.type === 'weak' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30',
                moment.type === 'turning_point' && 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30'
              )}
            >
              {getMomentIcon(moment.type)}
              <span className="truncate max-w-[200px]">{moment.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
