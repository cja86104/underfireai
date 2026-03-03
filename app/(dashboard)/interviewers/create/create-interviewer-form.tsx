'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  ChevronLeft,
  Sparkles,
  Wand2,
  Save,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import {
  INTERVIEWER_ARCHETYPES,
  VOICE_OPTIONS,
  type InterviewerArchetype,
} from '@/types/interviewer';
import type {
  InterviewType,
  CompanyStyle,
  PersonalityBase,
  CommunicationStyle,
  QuestionPatterns,
} from '@/types/database';

// ── Types ────────────────────────────────────────────────────────────────────

interface TagListEditorProps {
  label: string;
  description: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  colorClass: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'case', label: 'Case Study' },
  { value: 'hr', label: 'HR Screen' },
  { value: 'panel', label: 'Panel' },
  { value: 'phone_screen', label: 'Phone Screen' },
];

const COMPANY_STYLE_OPTIONS: { value: CompanyStyle; label: string }[] = [
  { value: 'faang', label: 'FAANG / Big Tech' },
  { value: 'startup', label: 'Startup' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'agency', label: 'Agency' },
  { value: 'government', label: 'Government' },
];

const COMMUNICATION_STYLE_OPTIONS: { value: CommunicationStyle['style']; label: string; description: string }[] = [
  { value: 'direct', label: 'Direct', description: 'Gets straight to the point' },
  { value: 'probing', label: 'Probing', description: 'Asks deep follow-up questions' },
  { value: 'supportive', label: 'Supportive', description: 'Encourages and guides' },
  { value: 'challenging', label: 'Challenging', description: 'Pushes back on everything' },
];

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Very Easy', color: 'text-green-400' },
  2: { label: 'Easy', color: 'text-green-400' },
  3: { label: 'Easy', color: 'text-green-400' },
  4: { label: 'Medium', color: 'text-yellow-400' },
  5: { label: 'Medium', color: 'text-yellow-400' },
  6: { label: 'Medium', color: 'text-yellow-400' },
  7: { label: 'Hard', color: 'text-orange-400' },
  8: { label: 'Hard', color: 'text-orange-400' },
  9: { label: 'Expert', color: 'text-red-400' },
  10: { label: 'Expert', color: 'text-red-400' },
};

const PERSONALITY_TRAITS: { key: keyof PersonalityBase; label: string; lowLabel: string; highLabel: string }[] = [
  { key: 'directness', label: 'Directness', lowLabel: 'Diplomatic', highLabel: 'Very Blunt' },
  { key: 'depth_preference', label: 'Depth', lowLabel: 'Surface-level', highLabel: 'Deep Dives' },
  { key: 'warmth', label: 'Warmth', lowLabel: 'Cold & Reserved', highLabel: 'Friendly' },
  { key: 'patience', label: 'Patience', lowLabel: 'Rapid-fire', highLabel: 'Very Patient' },
  { key: 'technical_focus', label: 'Technical Focus', lowLabel: 'Soft Skills', highLabel: 'Hard Skills' },
  { key: 'skepticism', label: 'Skepticism', lowLabel: 'Trusting', highLabel: 'Challenges Everything' },
];

const DEFAULT_PERSONALITY: PersonalityBase = {
  directness: 60,
  depth_preference: 65,
  warmth: 50,
  patience: 60,
  technical_focus: 60,
  skepticism: 55,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-[#3D3229] dark:text-white">{title}</h2>
      <p className="text-sm text-[#6B5744] dark:text-slate-400 mt-0.5">{description}</p>
    </div>
  );
}

function PersonalitySlider({
  trait,
  value,
  onChange,
}: {
  trait: typeof PERSONALITY_TRAITS[number];
  value: number;
  onChange: (key: keyof PersonalityBase, value: number) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-[#3D3229] dark:text-slate-300">{trait.label}</Label>
        <span className="text-sm font-mono text-orange-400">{value}</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={5}
        value={[value]}
        onValueChange={([v]) => onChange(trait.key, v)}
        className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500"
      />
      <div className="flex justify-between text-xs text-[#8B7355] dark:text-slate-500">
        <span>{trait.lowLabel}</span>
        <span>{trait.highLabel}</span>
      </div>
    </div>
  );
}

function TagListEditor({
  label,
  description,
  tags,
  onChange,
  placeholder,
  colorClass,
}: TagListEditorProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback((): void => {
    const trimmed = inputValue.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 8) return;
    onChange([...tags, trimmed]);
    setInputValue('');
  }, [inputValue, tags, onChange]);

  const removeTag = useCallback((tag: string): void => {
    onChange(tags.filter(t => t !== tag));
  }, [tags, onChange]);

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm text-[#3D3229] dark:text-slate-300">{label}</Label>
        <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 bg-white dark:bg-slate-800/50 border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          disabled={!inputValue.trim() || tags.length >= 8}
          className="border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-slate-300 hover:text-[#3D3229] dark:hover:text-white shrink-0"
        >
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                colorClass
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface CreateInterviewerFormProps {
  hasPurchased: boolean;
}

export function CreateInterviewerForm({ hasPurchased }: CreateInterviewerFormProps): React.JSX.Element {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('behavioral');
  const [archetype, setArchetype] = useState<InterviewerArchetype>('skeptic');
  const [companyStyle, setCompanyStyle] = useState<CompanyStyle | null>(null);
  const [roleFocus, setRoleFocus] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(5);
  const [voiceId, setVoiceId] = useState<string>('kiefer');
  const [personality, setPersonality] = useState<PersonalityBase>(DEFAULT_PERSONALITY);
  const [commStyle, setCommStyle] = useState<CommunicationStyle['style']>('direct');
  const [formality, setFormality] = useState(60);
  const [verbosity, setVerbosity] = useState(50);
  const [questionPatterns, setQuestionPatterns] = useState<QuestionPatterns>({
    follow_up_tendency: 70,
    depth_preference: 65,
    curveball_frequency: 40,
  });
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [petPeeves, setPetPeeves] = useState<string[]>([]);
  const [favoriteTopics, setFavoriteTopics] = useState<string[]>([]);

  // ── Archetype preload ───────────────────────────────────────────────────────
  const loadArchetypeDefaults = useCallback((key: InterviewerArchetype): void => {
    const data = INTERVIEWER_ARCHETYPES[key];
    setPersonality({ ...data.basePersonality });
    setCommStyle(data.communicationStyle.style);
    setFormality(data.communicationStyle.formality);
    setVerbosity(data.communicationStyle.verbosity);
    setQuestionPatterns({ ...data.questionPatterns });
    setRedFlags([...data.defaultRedFlags]);
    setGreenFlags([...data.defaultGreenFlags]);
    setPetPeeves([...data.defaultPetPeeves]);
    setFavoriteTopics([...data.favoriteTopics]);
    // Pick first suggested voice for the archetype
    const suggestedVoice = data.suggestedVoices[0];
    if (suggestedVoice) setVoiceId(suggestedVoice);
  }, []);

  const handleArchetypeChange = useCallback((key: InterviewerArchetype): void => {
    setArchetype(key);
    loadArchetypeDefaults(key);
  }, [loadArchetypeDefaults]);

  const handlePersonalityChange = useCallback((key: keyof PersonalityBase, value: number): void => {
    setPersonality(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error('Interviewer name is required');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/interviewer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          interview_type: interviewType,
          archetype,
          company_style: companyStyle,
          role_focus: roleFocus.trim() || null,
          difficulty_level: difficultyLevel,
          voice_id: voiceId,
          personality,
          communication_style: {
            style: commStyle,
            formality,
            verbosity,
          },
          question_patterns: questionPatterns,
          red_flags: redFlags,
          green_flags: greenFlags,
          pet_peeves: petPeeves,
          favorite_topics: favoriteTopics,
        }),
      });

      const data = await response.json() as { interviewer_id?: string; error?: string; message?: string };

      if (!response.ok) {
        toast.error(data.message ?? 'Failed to create interviewer');
        return;
      }

      toast.success('Custom interviewer created!');
      router.push('/interviewers');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasPurchased) {
    return (
      <div className="rounded-xl border border-[#8B5A2B]/30 bg-[#8B5A2B]/10 p-8 text-center max-w-md mx-auto">
        <Wand2 className="h-10 w-10 text-[#8B5A2B] mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-[#3D3229] dark:text-white mb-2">Purchase Credits to Unlock</h3>
        <p className="text-[#3D3229] dark:text-slate-300 text-sm mb-4">
          Custom Interviewer Creator is included with every purchase.
        </p>
        <Link href="/settings?tab=billing">
          <Button className="bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] hover:from-[#9A6B3C] hover:to-[#6B4420] text-white">
            Buy Credits
          </Button>
        </Link>
      </div>
    );
  }

  const difficultyInfo = DIFFICULTY_LABELS[difficultyLevel] ?? { label: 'Medium', color: 'text-yellow-400' };

  return (
    <div className="max-w-3xl space-y-8">

      {/* ── Section 1: Identity ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Identity"
          description="Name your interviewer and set the interview context."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name" className="text-[#3D3229] dark:text-slate-300">Interviewer Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Mitchell"
              maxLength={80}
              className="bg-white dark:bg-slate-800/50 border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500"
            />
          </div>

          {/* Interview Type */}
          <div className="space-y-1.5">
            <Label className="text-[#3D3229] dark:text-slate-300">Interview Type</Label>
            <Select
              value={interviewType}
              onValueChange={v => setInterviewType(v as InterviewType)}
            >
              <SelectTrigger className="bg-white dark:bg-slate-800/50 border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-[#3D3229]/15 dark:border-slate-700">
                {INTERVIEW_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[#3D3229] dark:text-slate-200 focus:bg-[#FAF8F5] dark:focus:bg-slate-800">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Style */}
          <div className="space-y-1.5">
            <Label className="text-[#3D3229] dark:text-slate-300">Company Style</Label>
            <Select
              value={companyStyle ?? 'none'}
              onValueChange={v => setCompanyStyle(v === 'none' ? null : v as CompanyStyle)}
            >
              <SelectTrigger className="bg-white dark:bg-slate-800/50 border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-white">
                <SelectValue placeholder="General (none)" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-[#3D3229]/15 dark:border-slate-700">
                <SelectItem value="none" className="text-[#3D3229] dark:text-slate-400 focus:bg-[#FAF8F5] dark:focus:bg-slate-800">General (none)</SelectItem>
                {COMPANY_STYLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[#3D3229] dark:text-slate-200 focus:bg-[#FAF8F5] dark:focus:bg-slate-800">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Focus */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="role-focus" className="text-[#3D3229] dark:text-slate-300">Role Focus <span className="text-[#8B7355] dark:text-slate-500 font-normal">(optional)</span></Label>
            <Input
              id="role-focus"
              value={roleFocus}
              onChange={e => setRoleFocus(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="bg-white dark:bg-slate-800/50 border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Archetype ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Archetype Base"
          description="Choose a starting personality. You can fine-tune every trait below."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.entries(INTERVIEWER_ARCHETYPES) as [InterviewerArchetype, typeof INTERVIEWER_ARCHETYPES[InterviewerArchetype]][]).map(([key, data]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleArchetypeChange(key)}
              className={cn(
                'text-left rounded-lg border p-3 transition-all',
                archetype === key
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 hover:border-slate-600'
              )}
            >
              <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{data.name}</p>
              <p className="text-xs text-[#6B5744] dark:text-slate-400 mt-0.5 line-clamp-2">{data.description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-3 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Selecting an archetype loads its default personality, voice, and tags — you can change everything after.
        </p>
      </section>

      {/* ── Section 3: Personality ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Personality Traits"
          description="Fine-tune how this interviewer behaves on a 0–100 scale."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PERSONALITY_TRAITS.map(trait => (
            <PersonalitySlider
              key={trait.key}
              trait={trait}
              value={personality[trait.key]}
              onChange={handlePersonalityChange}
            />
          ))}
        </div>
      </section>

      {/* ── Section 4: Communication & Difficulty ────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Communication Style & Difficulty"
          description="Set how they communicate and how hard the session will be."
        />
        <div className="space-y-6">
          {/* Communication style */}
          <div className="space-y-2">
            <Label className="text-[#3D3229] dark:text-slate-300">Communication Style</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMMUNICATION_STYLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCommStyle(opt.value)}
                  className={cn(
                    'rounded-lg border p-2.5 text-left transition-all',
                    commStyle === opt.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 hover:border-slate-600'
                  )}
                >
                  <p className="text-xs font-semibold text-[#3D3229] dark:text-white">{opt.label}</p>
                  <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Formality & Verbosity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-[#3D3229] dark:text-slate-300">Formality</Label>
                <span className="text-sm font-mono text-orange-400">{formality}</span>
              </div>
              <Slider min={0} max={100} step={5} value={[formality]} onValueChange={([v]) => setFormality(v)}
                className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500" />
              <div className="flex justify-between text-xs text-[#8B7355] dark:text-slate-500"><span>Casual</span><span>Very Formal</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-[#3D3229] dark:text-slate-300">Verbosity</Label>
                <span className="text-sm font-mono text-orange-400">{verbosity}</span>
              </div>
              <Slider min={0} max={100} step={5} value={[verbosity]} onValueChange={([v]) => setVerbosity(v)}
                className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500" />
              <div className="flex justify-between text-xs text-[#8B7355] dark:text-slate-500"><span>Brief</span><span>Detailed</span></div>
            </div>
          </div>

          {/* Question patterns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              { key: 'follow_up_tendency' as const, label: 'Follow-up Tendency', low: 'Rarely follows up', high: 'Always follows up' },
              { key: 'depth_preference' as const, label: 'Question Depth', low: 'Surface', high: 'Very deep' },
              { key: 'curveball_frequency' as const, label: 'Curveballs', low: 'Predictable', high: 'Unpredictable' },
            ]).map(p => (
              <div key={p.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[#3D3229] dark:text-slate-300">{p.label}</Label>
                  <span className="text-sm font-mono text-orange-400">{questionPatterns[p.key]}</span>
                </div>
                <Slider
                  min={0} max={100} step={5}
                  value={[questionPatterns[p.key]]}
                  onValueChange={([v]) => setQuestionPatterns(prev => ({ ...prev, [p.key]: v }))}
                  className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500"
                />
                <div className="flex justify-between text-xs text-[#8B7355] dark:text-slate-500"><span>{p.low}</span><span>{p.high}</span></div>
              </div>
            ))}
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#3D3229] dark:text-slate-300">Difficulty</Label>
              <span className={cn('text-sm font-semibold', difficultyInfo.color)}>
                {difficultyLevel}/10 — {difficultyInfo.label}
              </span>
            </div>
            <Slider min={1} max={10} step={1} value={[difficultyLevel]} onValueChange={([v]) => setDifficultyLevel(v)}
              className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500" />
            <div className="flex justify-between text-xs text-[#8B7355] dark:text-slate-500"><span>Very Easy</span><span>Expert</span></div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Voice ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Voice"
          description="Choose the voice used when voice mode is active."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VOICE_OPTIONS.map(voice => (
            <button
              key={voice.id}
              type="button"
              onClick={() => setVoiceId(voice.id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all',
                voiceId === voice.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 hover:border-slate-600'
              )}
            >
              <p className="text-sm font-semibold text-[#3D3229] dark:text-white">{voice.name}</p>
              <p className="text-xs text-[#6B5744] dark:text-slate-400 mt-0.5">{voice.description}</p>
              <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-0.5 capitalize">{voice.tone} · {voice.gender}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 6: Behaviour Flags ───────────────────────────────────────── */}
      <section className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
        <SectionHeading
          title="Behaviour Flags"
          description="What triggers this interviewer's reactions. Up to 8 per category."
        />
        <div className="space-y-6">
          <TagListEditor
            label="Red Flags"
            description="Answers or behaviours that make them skeptical or critical."
            tags={redFlags}
            onChange={setRedFlags}
            placeholder="e.g. vague answers, no metrics"
            colorClass="bg-red-500/15 text-red-400 border border-red-500/30"
          />
          <TagListEditor
            label="Green Flags"
            description="Answers or behaviours that impress them."
            tags={greenFlags}
            onChange={setGreenFlags}
            placeholder="e.g. specific data, concrete examples"
            colorClass="bg-green-500/15 text-green-400 border border-green-500/30"
          />
          <TagListEditor
            label="Pet Peeves"
            description="Things they personally dislike regardless of answer quality."
            tags={petPeeves}
            onChange={setPetPeeves}
            placeholder="e.g. saying 'we' when meaning 'I'"
            colorClass="bg-amber-500/15 text-amber-400 border border-amber-500/30"
          />
          <TagListEditor
            label="Favourite Topics"
            description="Subjects they love to dig into."
            tags={favoriteTopics}
            onChange={setFavoriteTopics}
            placeholder="e.g. system design, trade-offs"
            colorClass="bg-blue-500/15 text-blue-400 border border-blue-500/30"
          />
        </div>
      </section>

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-8">
        <Link href="/interviewers">
          <Button variant="outline" className="border-[#3D3229]/15 dark:border-slate-700 text-[#3D3229] dark:text-slate-300 hover:text-[#3D3229] dark:hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            Cancel
          </Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={isSaving || !name.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-[#3D3229] dark:text-white min-w-32"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Creating…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Create Interviewer
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

// Default export for direct page use
export default function CreateInterviewerFormPage(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <User className="h-8 w-8 text-[#8B7355] dark:text-slate-600 mx-auto mb-3" />
        <p className="text-[#6B5744] dark:text-slate-400">Loading…</p>
      </div>
    </div>
  );
}
