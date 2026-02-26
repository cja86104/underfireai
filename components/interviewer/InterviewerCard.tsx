'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User, Briefcase, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  INTERVIEWER_ARCHETYPES,
  VOICE_OPTIONS,
} from '@/types/interviewer';
import type { Interviewer } from '@/types/database';

interface InterviewerCardProps {
  interviewer: Interviewer;
  onSelect?: (interviewer: Interviewer) => void;
  onPreviewVoice?: (voiceId: string) => void;
  selected?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function InterviewerCard({
  interviewer,
  onSelect,
  onPreviewVoice,
  selected = false,
  showDetails = false,
  className,
}: InterviewerCardProps): React.JSX.Element {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const archetype = Object.entries(INTERVIEWER_ARCHETYPES).find(
    ([, data]) => data.name === interviewer.name ||
    interviewer.backstory?.toLowerCase().includes(data.id)
  );
  const archetypeData = archetype ? archetype[1] : null;

  const voiceConfig = interviewer.voice_config as { voice_id?: string } | null;
  const voiceId = voiceConfig?.voice_id ?? 'katie';
  const voice = VOICE_OPTIONS.find(v => v.id === voiceId);

  const personalityBase = interviewer.personality_base;

  const getDifficultyLabel = (level: number): { label: string; color: string } => {
    if (level <= 3) return { label: 'Easy', color: 'bg-green-500/20 text-green-400' };
    if (level <= 5) return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' };
    if (level <= 7) return { label: 'Hard', color: 'bg-orange-500/20 text-orange-400' };
    return { label: 'Expert', color: 'bg-red-500/20 text-red-400' };
  };

  const difficulty = getDifficultyLabel(interviewer.difficulty_level);

  const handleVoicePreview = (): void => {
    if (onPreviewVoice && voiceId) {
      setIsPlayingVoice(true);
      onPreviewVoice(voiceId);
      setTimeout(() => setIsPlayingVoice(false), 3000);
    }
  };

  const getInterviewTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      behavioral: 'Behavioral',
      technical: 'Technical',
      case: 'Case Study',
      hr: 'HR Screen',
      panel: 'Panel',
      phone_screen: 'Phone Screen',
    };
    return labels[type] || type;
  };

  const getCompanyStyleLabel = (style: string | null): string | null => {
    if (!style) return null;
    const labels: Record<string, string> = {
      faang: 'FAANG',
      startup: 'Startup',
      consulting: 'Consulting',
      enterprise: 'Enterprise',
      agency: 'Agency',
      government: 'Government',
    };
    return labels[style] || style;
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80',
        selected && 'ring-2 ring-orange-500 border-orange-500/50',
        onSelect && 'cursor-pointer',
        className
      )}
      onClick={() => onSelect?.(interviewer)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            {interviewer.avatar_url ? (
              <Image
                src={interviewer.avatar_url}
                alt={interviewer.name}
                fill
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <User className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{interviewer.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={difficulty.color}>
                {difficulty.label}
              </Badge>
              <Badge variant="outline" className="bg-slate-800/50 text-slate-300">
                {getInterviewTypeLabel(interviewer.interview_type)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Archetype & Company Style */}
        <div className="flex flex-wrap gap-2 mb-3">
          {archetypeData && (
            <span className="text-xs text-orange-400 font-medium">
              {archetypeData.name}
            </span>
          )}
          {interviewer.company_style && (
            <span className="text-xs text-slate-400">
              • {getCompanyStyleLabel(interviewer.company_style)}
            </span>
          )}
          {interviewer.role_focus && (
            <span className="text-xs text-slate-400">
              • {interviewer.role_focus}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            <span>{interviewer.total_sessions} sessions</span>
          </div>
          {voice && (
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              <span>{voice.name}</span>
            </div>
          )}
        </div>

        {/* Personality Preview */}
        {showDetails && personalityBase && (
          <div className="space-y-2 mb-3">
            <PersonalityBar label="Directness" value={personalityBase.directness} />
            <PersonalityBar label="Warmth" value={personalityBase.warmth} />
            <PersonalityBar label="Skepticism" value={personalityBase.skepticism} />
            <PersonalityBar label="Technical" value={personalityBase.technical_focus} />
          </div>
        )}

        {/* Description */}
        {archetypeData && (
          <p className="text-xs text-slate-400 line-clamp-2">
            {archetypeData.description}
          </p>
        )}

        {/* Actions */}
        {(onPreviewVoice != null || showDetails) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
            {onPreviewVoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoicePreview();
                }}
                disabled={isPlayingVoice}
                className="text-xs"
              >
                {isPlayingVoice ? (
                  <VolumeX className="w-3 h-3 mr-1" />
                ) : (
                  <Volume2 className="w-3 h-3 mr-1" />
                )}
                {isPlayingVoice ? 'Playing...' : 'Preview Voice'}
              </Button>
            )}
            {onSelect && (
              <Button
                size="sm"
                className="ml-auto text-xs bg-orange-500 hover:bg-orange-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(interviewer);
                }}
              >
                Select
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
        </div>
      )}
    </Card>
  );
}

function PersonalityBar({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{value}</span>
    </div>
  );
}
