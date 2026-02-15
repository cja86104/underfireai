'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils/cn';
import {
  INTERVIEWER_ARCHETYPES,
  type InterviewerArchetype,
} from '@/types/interviewer';
import type { PersonalityBase, CommunicationStyle, QuestionPatterns } from '@/types/database';

interface PersonalityConfigProps {
  archetype?: InterviewerArchetype;
  initialPersonality?: PersonalityBase;
  initialCommunicationStyle?: CommunicationStyle;
  initialQuestionPatterns?: QuestionPatterns;
  difficulty?: number;
  onChange?: (config: PersonalityConfigResult) => void;
  className?: string;
}

export interface PersonalityConfigResult {
  personality: PersonalityBase;
  communicationStyle: CommunicationStyle;
  questionPatterns: QuestionPatterns;
}

const DEFAULT_PERSONALITY: PersonalityBase = {
  directness: 50,
  depth_preference: 50,
  warmth: 50,
  patience: 50,
  technical_focus: 50,
  skepticism: 50,
};

const DEFAULT_COMMUNICATION: CommunicationStyle = {
  style: 'direct',
  formality: 50,
  verbosity: 50,
};

const DEFAULT_PATTERNS: QuestionPatterns = {
  follow_up_tendency: 50,
  depth_preference: 50,
  curveball_frequency: 30,
};

export function PersonalityConfig({
  archetype,
  initialPersonality,
  initialCommunicationStyle,
  initialQuestionPatterns,
  difficulty = 5,
  onChange,
  className,
}: PersonalityConfigProps): React.JSX.Element {
  const archetypeData = archetype ? INTERVIEWER_ARCHETYPES[archetype] : null;

  const [personality, setPersonality] = useState<PersonalityBase>(
    initialPersonality ?? archetypeData?.basePersonality ?? DEFAULT_PERSONALITY
  );
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle>(
    initialCommunicationStyle ?? archetypeData?.communicationStyle ?? DEFAULT_COMMUNICATION
  );
  const [questionPatterns, setQuestionPatterns] = useState<QuestionPatterns>(
    initialQuestionPatterns ?? archetypeData?.questionPatterns ?? DEFAULT_PATTERNS
  );

  useEffect(() => {
    onChange?.({ personality, communicationStyle, questionPatterns });
  }, [personality, communicationStyle, questionPatterns, onChange]);

  const handlePersonalityChange = (key: keyof PersonalityBase, value: number): void => {
    setPersonality(prev => ({ ...prev, [key]: value }));
  };

  const handleCommunicationChange = (key: keyof CommunicationStyle, value: number | string): void => {
    setCommunicationStyle(prev => ({ ...prev, [key]: value }));
  };

  const handlePatternsChange = (key: keyof QuestionPatterns, value: number): void => {
    setQuestionPatterns(prev => ({ ...prev, [key]: value }));
  };

  const resetToArchetype = (): void => {
    if (archetypeData) {
      setPersonality(archetypeData.basePersonality);
      setCommunicationStyle(archetypeData.communicationStyle);
      setQuestionPatterns(archetypeData.questionPatterns);
    }
  };

  const randomize = (): void => {
    setPersonality({
      directness: Math.floor(Math.random() * 100),
      depth_preference: Math.floor(Math.random() * 100),
      warmth: Math.floor(Math.random() * 100),
      patience: Math.floor(Math.random() * 100),
      technical_focus: Math.floor(Math.random() * 100),
      skepticism: Math.floor(Math.random() * 100),
    });
    setQuestionPatterns({
      follow_up_tendency: Math.floor(Math.random() * 100),
      depth_preference: Math.floor(Math.random() * 100),
      curveball_frequency: Math.floor(Math.random() * 60),
    });
  };

  const applyDifficultyModifier = (): void => {
    const modifier = (difficulty - 5) * 8;
    setPersonality(prev => ({
      directness: clamp(prev.directness + modifier),
      depth_preference: clamp(prev.depth_preference + modifier),
      warmth: clamp(prev.warmth - modifier),
      patience: clamp(prev.patience - modifier),
      technical_focus: clamp(prev.technical_focus + modifier / 2),
      skepticism: clamp(prev.skepticism + modifier),
    }));
  };

  return (
    <Card className={cn('border-slate-800 bg-slate-900/50 p-4', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Personality Configuration</h3>
            {archetypeData && (
              <p className="text-xs text-orange-400 mt-0.5">
                Based on: {archetypeData.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {archetypeData && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToArchetype}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={randomize}
              className="text-xs"
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Random
            </Button>
          </div>
        </div>

        {/* Personality Traits */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">Personality Traits</h4>

          <PersonalitySlider
            label="Directness"
            description="Diplomatic ↔ Blunt"
            value={personality.directness}
            onChange={(v) => handlePersonalityChange('directness', v)}
          />
          <PersonalitySlider
            label="Depth Preference"
            description="Surface-level ↔ Deep dives"
            value={personality.depth_preference}
            onChange={(v) => handlePersonalityChange('depth_preference', v)}
          />
          <PersonalitySlider
            label="Warmth"
            description="Cold ↔ Friendly"
            value={personality.warmth}
            onChange={(v) => handlePersonalityChange('warmth', v)}
          />
          <PersonalitySlider
            label="Patience"
            description="Rapid-fire ↔ Takes time"
            value={personality.patience}
            onChange={(v) => handlePersonalityChange('patience', v)}
          />
          <PersonalitySlider
            label="Technical Focus"
            description="Soft skills ↔ Hard skills"
            value={personality.technical_focus}
            onChange={(v) => handlePersonalityChange('technical_focus', v)}
          />
          <PersonalitySlider
            label="Skepticism"
            description="Trusting ↔ Needs proof"
            value={personality.skepticism}
            onChange={(v) => handlePersonalityChange('skepticism', v)}
          />
        </div>

        {/* Question Patterns */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-sm font-medium text-slate-300">Question Patterns</h4>

          <PersonalitySlider
            label="Follow-up Tendency"
            description="Moves on ↔ Digs deeper"
            value={questionPatterns.follow_up_tendency}
            onChange={(v) => handlePatternsChange('follow_up_tendency', v)}
          />
          <PersonalitySlider
            label="Question Depth"
            description="Broad ↔ Specific"
            value={questionPatterns.depth_preference}
            onChange={(v) => handlePatternsChange('depth_preference', v)}
          />
          <PersonalitySlider
            label="Curveball Frequency"
            description="Predictable ↔ Surprising"
            value={questionPatterns.curveball_frequency}
            onChange={(v) => handlePatternsChange('curveball_frequency', v)}
            max={60}
          />
        </div>

        {/* Communication Style */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-sm font-medium text-slate-300">Communication Style</h4>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Style</label>
            <div className="flex gap-2">
              {(['direct', 'probing', 'supportive', 'challenging'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => handleCommunicationChange('style', style)}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    communicationStyle.style === style
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <PersonalitySlider
            label="Formality"
            description="Casual ↔ Formal"
            value={communicationStyle.formality}
            onChange={(v) => handleCommunicationChange('formality', v)}
          />
          <PersonalitySlider
            label="Verbosity"
            description="Brief ↔ Detailed"
            value={communicationStyle.verbosity}
            onChange={(v) => handleCommunicationChange('verbosity', v)}
          />
        </div>

        {/* Apply Difficulty */}
        <div className="pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={applyDifficultyModifier}
            className="w-full text-xs"
          >
            Apply Difficulty Modifier (Level {difficulty})
          </Button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Adjusts traits based on difficulty level
          </p>
        </div>
      </div>
    </Card>
  );
}

interface PersonalitySliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function PersonalitySlider({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
}: PersonalitySliderProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
