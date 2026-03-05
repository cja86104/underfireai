'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flame,
  Loader2,
  Mic,
  MessageSquare,
  Sparkles,
  Building2,
  Briefcase,
  Gauge,
  Lock,
  ChevronRight,
  Users,
  Clock,
  Wand2,
  Brain,
  AlertTriangle,
  SlidersHorizontal,
  Shield,
  Target,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import {
  SESSION_LENGTH_CONFIG,
  type Interviewer,
  type InterviewType,
  type CompanyStyle,
  type SessionLength,
  type PersonalityBase,
} from '@/types/database';
import type { InterviewerArchetype } from '@/types/interviewer';

interface SavedJobDescription {
  id: string;
  companyName: string | null;
  roleTitle: string | null;
  matchPercentage: number | null;
}

interface InterviewSetupFormProps {
  interviewers: Interviewer[];
  hasResume: boolean;
  resumeSkills: string[];
  hasPurchased: boolean;
  voiceModeEnabled: boolean;
  hasVulnerabilityScan?: boolean;
  vulnerabilityCount?: number;
  savedJobDescriptions?: SavedJobDescription[];
  focusClaim?: string | null;
}

const INTERVIEW_TYPES: { value: InterviewType; label: string; description: string }[] = [
  { value: 'behavioral',    label: 'Behavioral',    description: 'Tell me about a time...' },
  { value: 'technical',     label: 'Technical',     description: 'System design & coding' },
  { value: 'case',          label: 'Case Study',    description: 'Business problem solving' },
  { value: 'hr',            label: 'HR Screen',     description: 'Culture fit & logistics' },
  { value: 'panel',         label: 'Panel',         description: 'Multiple interviewers' },
  { value: 'phone_screen',  label: 'Phone Screen',  description: 'Initial screening' },
];

const COMPANY_STYLES: { value: CompanyStyle; label: string }[] = [
  { value: 'faang',       label: 'FAANG / Big Tech' },
  { value: 'startup',     label: 'Startup' },
  { value: 'consulting',  label: 'Consulting' },
  { value: 'enterprise',  label: 'Enterprise' },
  { value: 'agency',      label: 'Agency' },
  { value: 'government',  label: 'Government' },
];

const DIFFICULTY_LEVELS = [
  { value: 3, label: 'Easy',   description: 'Friendly, more guidance' },
  { value: 5, label: 'Medium', description: 'Balanced challenge' },
  { value: 7, label: 'Hard',   description: 'Tough questions, less hints' },
  { value: 9, label: 'Expert', description: 'Intense pressure' },
];

const SESSION_LENGTHS: {
  value: SessionLength;
  label: string;
  description: string;
  questions: string;
}[] = [
  {
    value:       'short',
    label:       SESSION_LENGTH_CONFIG.short.label,
    description: SESSION_LENGTH_CONFIG.short.description,
    questions:   `${SESSION_LENGTH_CONFIG.short.questionRange[0]}-${SESSION_LENGTH_CONFIG.short.questionRange[1]} questions`,
  },
  {
    value:       'standard',
    label:       SESSION_LENGTH_CONFIG.standard.label,
    description: SESSION_LENGTH_CONFIG.standard.description,
    questions:   `${SESSION_LENGTH_CONFIG.standard.questionRange[0]}-${SESSION_LENGTH_CONFIG.standard.questionRange[1]} questions`,
  },
  {
    value:       'deep',
    label:       SESSION_LENGTH_CONFIG.deep.label,
    description: SESSION_LENGTH_CONFIG.deep.description,
    questions:   `${SESSION_LENGTH_CONFIG.deep.questionRange[0]}-${SESSION_LENGTH_CONFIG.deep.questionRange[1]} questions`,
  },
];

const ARCHETYPE_OPTIONS: { value: InterviewerArchetype; label: string; description: string }[] = [
  { value: 'skeptic',          label: 'Skeptic',          description: 'Doubts everything, wants proof' },
  { value: 'griller',          label: 'Griller',          description: '5 levels deep on any topic' },
  { value: 'friendly',         label: 'Friendly',         description: 'Warm, then surprises you' },
  { value: 'silent_judge',     label: 'Silent Judge',     description: 'Poker face, long pauses' },
  { value: 'rapid_fire',       label: 'Rapid Fire',       description: 'Fast-paced, may interrupt' },
  { value: 'culture_fit',      label: 'Culture Fit',      description: 'Values & team dynamics' },
  { value: 'technical_expert', label: 'Tech Expert',      description: 'Tests depth of knowledge' },
  { value: 'executive',        label: 'Executive',        description: 'Big picture & strategy' },
];

const CONSTRAINT_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'behavioral-only',   label: 'Behavioural Only',    description: 'No technical questions' },
  { value: 'compensation-push', label: 'Compensation Pushback', description: 'Challenges salary expectations' },
  { value: 'mood-swings',       label: 'Mood Swings',         description: 'Unpredictable demeanour shifts' },
  { value: 'heavy-follow-ups',  label: 'Heavy Follow-Ups',    description: 'Drills deep into every answer' },
  { value: 'time-pressure',     label: 'Time Pressure',       description: 'Signals urgency throughout' },
  { value: 'panel-dynamic',     label: 'Panel Dynamic',       description: 'Switches between supportive and critical' },
];

const TRAIT_SLIDERS: { key: keyof PersonalityBase; label: string; lowLabel: string; highLabel: string }[] = [
  { key: 'directness',       label: 'Directness',      lowLabel: 'Diplomatic', highLabel: 'Blunt' },
  { key: 'depth_preference', label: 'Depth',           lowLabel: 'Surface',    highLabel: 'Deep dives' },
  { key: 'warmth',           label: 'Warmth',          lowLabel: 'Cold',       highLabel: 'Friendly' },
  { key: 'patience',         label: 'Patience',        lowLabel: 'Impatient',  highLabel: 'Patient' },
  { key: 'skepticism',       label: 'Skepticism',      lowLabel: 'Trusting',   highLabel: 'Sceptical' },
  { key: 'technical_focus',  label: 'Technical Focus', lowLabel: 'Soft skills', highLabel: 'Hard skills' },
];

export function InterviewSetupForm({
  interviewers,
  hasResume,
  resumeSkills,
  hasPurchased,
  voiceModeEnabled,
  hasVulnerabilityScan = false,
  vulnerabilityCount = 0,
  savedJobDescriptions = [],
  focusClaim = null,
}: InterviewSetupFormProps): React.JSX.Element {
  const router  = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [targetResumeWeakSpots, setTargetResumeWeakSpots] = useState(false);
  const [targetJobDescriptionId, setTargetJobDescriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (focusClaim && hasPurchased) {
      setTargetResumeWeakSpots(true);
    }
  }, [focusClaim, hasPurchased]);

  const [formData, setFormData] = useState({
    interviewType:          'behavioral' as InterviewType,
    companyStyle:           'startup' as CompanyStyle,
    targetRole:             '',
    targetCompany:          '',
    difficulty:             5,
    sessionLength:          'standard' as SessionLength,
    useVoiceMode:           false,
    selectedInterviewerId:  null as string | null,
    generateNewInterviewer: true,
  });

  const [archetypeMix,   setArchetypeMix]   = useState<InterviewerArchetype[]>([]);
  const [constraints,    setConstraints]    = useState<string[]>([]);
  const [traitOverrides, setTraitOverrides] = useState<Partial<PersonalityBase>>({});
  const [activeTraits,   setActiveTraits]   = useState<Set<keyof PersonalityBase>>(new Set());
  const [togglingArchetype,   setTogglingArchetype]   = useState<InterviewerArchetype | null>(null);
  const [togglingConstraint,  setTogglingConstraint]  = useState<string | null>(null);

  function toggleArchetype(value: InterviewerArchetype): void {
    setTogglingArchetype(value);
    setArchetypeMix((prev) => {
      if (prev.includes(value)) return prev.filter((a) => a !== value);
      if (prev.length >= 2)    return prev;
      return [...prev, value];
    });
    setTimeout(() => setTogglingArchetype(null), 150);
  }

  function toggleConstraint(value: string): void {
    setTogglingConstraint(value);
    setConstraints((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
    setTimeout(() => setTogglingConstraint(null), 150);
  }

  function toggleTrait(key: keyof PersonalityBase): void {
    setActiveTraits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setTraitOverrides((o) => {
          const updated = { ...o };
          delete updated[key as keyof typeof updated];
          return updated;
        });
      } else {
        next.add(key);
        setTraitOverrides((o) => ({ ...o, [key]: 50 }));
      }
      return next;
    });
  }

  function setTraitValue(key: keyof PersonalityBase, value: number): void {
    setTraitOverrides((prev) => ({ ...prev, [key]: value }));
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        interview_type:         formData.interviewType,
        company_style:          formData.companyStyle,
        target_role:            formData.targetRole   || null,
        target_company:         formData.targetCompany || null,
        difficulty:             formData.difficulty,
        session_length:         formData.sessionLength,
        use_voice_mode:         formData.useVoiceMode,
        interviewer_id:         formData.generateNewInterviewer ? null : formData.selectedInterviewerId,
        generate_new_interviewer: formData.generateNewInterviewer,
      };

      if (hasPurchased) {
        if (archetypeMix.length > 0)           payload.archetype_mix    = archetypeMix;
        if (constraints.length > 0)            payload.constraints      = constraints;
        if (Object.keys(traitOverrides).length > 0) payload.trait_overrides = traitOverrides;
        if (targetResumeWeakSpots)             payload.target_resume_weak_spots = true;
        if (targetJobDescriptionId)            payload.target_job_description_id = targetJobDescriptionId;
      }

      const response = await fetch('/api/interview/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message ?? 'Failed to create interview');
      }

      const data = await response.json() as { session_id: string };
      toast.success('Interview session created!');
      router.push(`/interview/${data.session_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">

      {/* Focus Claim Banner */}
      {focusClaim && (
        <div className="flex items-start gap-4 rounded-2xl border border-[#8B5A2B]/30 bg-[#FAF8F5] dark:bg-[#3D3229]/30 dark:border-[#8B5A2B]/40 px-6 py-5 mb-8">
          <div className="flex-shrink-0 rounded-xl bg-[#8B5A2B]/10 dark:bg-[#5D3A1A]/50 p-2.5 mt-0.5">
            <Shield className="h-5 w-5 text-[#8B5A2B] dark:text-[#8B5A2B]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#3D3229] dark:text-[#8B5A2B] text-sm">Practicing a resume vulnerability</p>
            <p className="text-[#6B5744] dark:text-[#8B5A2B]/90 text-sm mt-1 italic truncate">&ldquo;{focusClaim}&rdquo;</p>
            <p className="text-[#6B5744] dark:text-[#8B5A2B] text-xs mt-1">
              {hasPurchased ? 'Resume targeting has been enabled automatically.' : 'Purchase interview credits to have the AI specifically probe this claim.'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TWO COLUMN LAYOUT - Core Settings
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN
        ════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* Interview Type */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                <MessageSquare className="h-6 w-6 text-[#8B5A2B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Interview Type</h2>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">What kind of interview are you preparing for?</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {INTERVIEW_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, interviewType: type.value })}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition-colors',
                    formData.interviewType === type.value
                      ? 'border-[#8B5A2B] bg-[#8B5A2B]/5 border-2'
                      : 'border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#3D3229]/30'
                  )}
                >
                  <p className={cn('font-semibold text-[#3D3229] dark:text-white', formData.interviewType === type.value && 'text-[#8B5A2B] dark:text-[#8B5A2B]')}>{type.label}</p>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Company Style */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                <Building2 className="h-6 w-6 text-[#8B5A2B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Company Style</h2>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">Match the interview culture</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMPANY_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, companyStyle: style.value })}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    formData.companyStyle === style.value
                      ? 'border-[#8B5A2B] bg-[#8B5A2B]/10 text-[#8B5A2B] dark:text-[#8B5A2B] border-2'
                      : 'border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-[#3D3229] dark:text-slate-300 hover:border-[#3D3229]/30'
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Position */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                <Briefcase className="h-6 w-6 text-[#8B5A2B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Target Position</h2>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">Optional: Customize for specific roles</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#6B5744] dark:text-slate-300 mb-2">Role / Title</label>
                <input
                  type="text"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-4 py-3 text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-[#8B5A2B] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B5744] dark:text-slate-300 mb-2">Company (optional)</label>
                <input
                  type="text"
                  value={formData.targetCompany}
                  onChange={(e) => setFormData({ ...formData, targetCompany: e.target.value })}
                  placeholder="e.g., Google, Stripe, etc."
                  className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-4 py-3 text-[#3D3229] dark:text-white placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-[#8B5A2B] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20"
                />
              </div>
            </div>
            {hasResume && resumeSkills.length > 0 && (
              <div>
                <p className="text-sm text-[#6B5744] dark:text-slate-400 mb-2">From your resume:</p>
                <div className="flex flex-wrap gap-2">
                  {resumeSkills.slice(0, 8).map((skill) => (
                    <span key={skill} className="rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 px-3 py-1 text-sm text-[#3D3229] dark:text-slate-300">{skill}</span>
                  ))}
                  {resumeSkills.length > 8 && <span className="text-sm text-[#8B7355] dark:text-slate-500">+{resumeSkills.length - 8} more</span>}
                </div>
              </div>
            )}
          </div>

          {/* Difficulty & Session Length */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                  <Gauge className="h-6 w-6 text-[#8B5A2B]" />
                </div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Difficulty</h2>
              </div>
              <div className="space-y-2">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: level.value })}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                      formData.difficulty === level.value
                        ? 'border-[#8B5A2B] bg-[#8B5A2B]/5 border-2'
                        : 'border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#3D3229]/30'
                    )}
                  >
                    <p className={cn('font-medium text-[#3D3229] dark:text-white', formData.difficulty === level.value && 'font-semibold')}>{level.label}</p>
                    <p className="text-xs text-[#6B5744] dark:text-slate-400">{level.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                  <Clock className="h-6 w-6 text-[#8B5A2B]" />
                </div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Session Length</h2>
              </div>
              <div className="space-y-2">
                {SESSION_LENGTHS.map((length) => (
                  <button
                    key={length.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, sessionLength: length.value })}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                      formData.sessionLength === length.value
                        ? 'border-[#8B5A2B] bg-[#8B5A2B]/5 border-2'
                        : 'border-[#3D3229]/10 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#3D3229]/30'
                    )}
                  >
                    <p className={cn('font-medium text-[#3D3229] dark:text-white', formData.sessionLength === length.value && 'font-semibold')}>{length.label}</p>
                    <p className="text-xs text-[#6B5744] dark:text-slate-400">{length.description} • {length.questions}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN
        ════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* Interviewer Selection */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-[#6B5744]/10 dark:bg-slate-700 p-2">
                <Users className="h-6 w-6 text-[#6B5744] dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Interviewer</h2>
                <p className="text-sm text-[#6B5744] dark:text-slate-400">Generate a new personality or use an existing one</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, generateNewInterviewer: true, selectedInterviewerId: null })}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all flex items-center gap-4 cursor-pointer',
                  formData.generateNewInterviewer
                    ? 'border-[#8B5A2B] bg-[#8B5A2B]/10 border-2 shadow-lg shadow-[#8B5A2B]/10'
                    : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]/50 hover:bg-[#8B5A2B]/5'
                )}
              >
                <div className={cn('rounded-xl p-3 transition-colors', formData.generateNewInterviewer ? 'bg-[#8B5A2B]' : 'bg-[#3D3229]/10 dark:bg-slate-700')}>
                  <Sparkles className={cn('h-6 w-6', formData.generateNewInterviewer ? 'text-white' : 'text-[#6B5744] dark:text-slate-400')} />
                </div>
                <div className="flex-1">
                  <p className={cn('font-bold', formData.generateNewInterviewer ? 'text-[#8B5A2B] dark:text-[#8B5A2B]' : 'text-[#3D3229] dark:text-white')}>Generate New Interviewer</p>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">Create a fresh personality with hidden traits</p>
                </div>
                {formData.generateNewInterviewer && (
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#8B5A2B] flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              {interviewers.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#3D3229]/15 dark:border-slate-700" /></div>
                    <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-900 px-4 text-sm text-[#6B5744] dark:text-slate-400">or select existing</span></div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto" data-lenis-prevent>
                    {interviewers.slice(0, 4).map((interviewer) => (
                      <button
                        key={interviewer.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, generateNewInterviewer: false, selectedInterviewerId: interviewer.id })}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left transition-all flex items-center gap-3 cursor-pointer',
                          !formData.generateNewInterviewer && formData.selectedInterviewerId === interviewer.id
                            ? 'border-[#8B5A2B] bg-[#8B5A2B]/10 border-2'
                            : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]/50'
                        )}
                      >
                        <div className="relative h-10 w-10 rounded-full bg-[#6B5744] dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-white overflow-hidden flex-shrink-0">
                          {interviewer.avatar_url ? (
                            <Image src={interviewer.avatar_url} alt={interviewer.name} fill className="object-cover" unoptimized />
                          ) : (
                            interviewer.name[0]
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#3D3229] dark:text-white truncate">{interviewer.name}</p>
                          <p className="text-xs text-[#6B5744] dark:text-slate-400">{interviewer.total_sessions} sessions</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Voice Mode */}
          <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-xl p-2', voiceModeEnabled ? 'bg-[#8B5A2B]/10' : 'bg-[#FAF8F5] dark:bg-slate-800')}>
                  {voiceModeEnabled ? <Mic className="h-6 w-6 text-[#8B5A2B]" /> : <Lock className="h-6 w-6 text-[#8B7355] dark:text-slate-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Voice Mode</h2>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">{voiceModeEnabled ? 'Practice speaking your answers out loud' : 'Purchase credits for voice interviews'}</p>
                </div>
              </div>
              {voiceModeEnabled ? (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, useVoiceMode: !formData.useVoiceMode })}
                  className={cn('relative inline-flex h-8 w-14 items-center rounded-full transition-colors', formData.useVoiceMode ? 'bg-[#8B5A2B]' : 'bg-[#3D3229]/10 dark:bg-slate-700')}
                >
                  <span className={cn('inline-block h-6 w-6 transform rounded-full bg-white transition-transform', formData.useVoiceMode ? 'translate-x-7' : 'translate-x-1')} />
                </button>
              ) : (
                <Link href="/settings?tab=billing" className="text-sm text-[#8B5A2B] hover:text-[#8B5A2B] font-semibold">Buy Credits</Link>
              )}
            </div>
          </div>

          {/* Resume Targeting */}
          {hasPurchased && hasResume ? (
            <div className="rounded-2xl border border-[#8B5A2B]/30 bg-[#8B5A2B]/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
                  <Target className="h-6 w-6 text-[#8B5A2B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Resume Targeting</h2>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">Focus on your resume weak points or job-specific gaps</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-[#8B5A2B]/20 mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#8B5A2B]/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-[#8B5A2B]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#3D3229] dark:text-white text-sm">Target Resume Weak Spots</p>
                    <p className="text-xs text-[#6B5744] dark:text-slate-400">{hasVulnerabilityScan ? `Interviewer will probe ${vulnerabilityCount} vulnerable claims` : 'Run a vulnerability scan on your resume first'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetResumeWeakSpots(!targetResumeWeakSpots)}
                  disabled={!hasVulnerabilityScan}
                  className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition-colors', !hasVulnerabilityScan && 'opacity-50 cursor-not-allowed', targetResumeWeakSpots ? 'bg-[#8B5A2B]' : 'bg-[#3D3229]/10 dark:bg-slate-700')}
                >
                  <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white transition-transform', targetResumeWeakSpots ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </div>

              {savedJobDescriptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">Or target a saved job description:</p>
                  {savedJobDescriptions.slice(0, 3).map((jd) => (
                    <button
                      key={jd.id}
                      type="button"
                      onClick={() => setTargetJobDescriptionId(targetJobDescriptionId === jd.id ? null : jd.id)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-colors flex items-center justify-between',
                        targetJobDescriptionId === jd.id ? 'border-[#8B5A2B] bg-[#8B5A2B]/10' : 'border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#8B5A2B]/50'
                      )}
                    >
                      <div>
                        <p className="font-medium text-[#3D3229] dark:text-white text-sm">{jd.roleTitle ?? 'Unknown Role'}</p>
                        <p className="text-xs text-[#6B5744] dark:text-slate-400">{jd.companyName ?? 'Unknown Company'}</p>
                      </div>
                      {jd.matchPercentage !== null && (
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', jd.matchPercentage >= 80 ? 'bg-[#8B5A2B]/20 text-[#8B5A2B]' : jd.matchPercentage >= 60 ? 'bg-[#8B5A2B]/20 text-[#8B5A2B]' : 'bg-[#8B5A2B]/20 text-[#8B5A2B]')}>{jd.matchPercentage}%</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <Link href="/job-analysis" className="flex items-center justify-center gap-2 text-[#8B5A2B] dark:text-[#8B5A2B] hover:text-[#8B5A2B] font-medium text-sm mt-4">
                Analyze a Job Description <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : hasPurchased && !hasResume ? (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-800/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-[#3D3229]/5 dark:bg-slate-700 p-2">
                  <FileText className="h-6 w-6 text-[#8B7355] dark:text-slate-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Resume Targeting</h2>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">Upload your resume to unlock interview targeting based on your weak spots and job gaps</p>
                </div>
              </div>
              <Link href="/resume" className="inline-flex items-center gap-2 text-[#8B5A2B] hover:text-[#8B5A2B] font-semibold text-sm">Upload Resume <ChevronRight className="h-4 w-4" /></Link>
            </div>
          ) : !hasPurchased ? (
            <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-800/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-[#3D3229]/5 dark:bg-slate-700 p-2">
                  <Lock className="h-6 w-6 text-[#8B7355] dark:text-slate-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Resume Targeting</h2>
                  <p className="text-sm text-[#6B5744] dark:text-slate-400">Focus on your resume weak points or job-specific gaps</p>
                </div>
              </div>
              <Link href="/settings?tab=billing" className="inline-flex items-center gap-2 text-[#8B5A2B] hover:text-[#8B5A2B] font-semibold text-sm">Buy Credits <ChevronRight className="h-4 w-4" /></Link>
            </div>
          ) : null}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOM SCENARIO BUILDER (Full Width - Below Grid)
      ══════════════════════════════════════════════════════════════════════ */}
      {hasPurchased ? (
        <div className="mt-8 rounded-2xl border border-[#8B5A2B]/30 bg-[#8B5A2B]/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-[#8B5A2B]/10 p-2">
              <Wand2 className="h-6 w-6 text-[#8B5A2B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Custom Scenario Builder</h2>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">Hand-pick archetype, add constraints, and dial individual traits</p>
            </div>
          </div>

          {(archetypeMix.length > 0 || constraints.length > 0 || activeTraits.size > 0) && (
            <div className="p-3 bg-[#8B5A2B]/10 border border-[#8B5A2B]/30 rounded-xl mb-6">
              <p className="text-sm font-bold text-[#8B5A2B] dark:text-[#8B5A2B] mb-1">Custom scenario active</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8B5A2B] dark:text-[#8B5A2B]">
                {archetypeMix.length > 0 && <span>Archetypes: {archetypeMix.join(' + ')}</span>}
                {constraints.length > 0 && <span>Constraints: {constraints.length}</span>}
                {activeTraits.size > 0 && <span>Trait overrides: {activeTraits.size}</span>}
              </div>
            </div>
          )}

          {/* Three Column Layout for Scenario Builder */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Archetype Mix */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-[#8B5A2B]" />
                <h3 className="font-bold text-[#3D3229] dark:text-white">Archetype Mix</h3>
                {archetypeMix.length > 0 && <span className="text-sm text-[#6B5744] dark:text-slate-400">({archetypeMix.length}/2)</span>}
              </div>
              <p className="text-xs text-[#6B5744] dark:text-slate-400 mb-3">Select up to 2 — first is primary, second is blended in.</p>
              <div className="grid grid-cols-2 gap-2">
                {ARCHETYPE_OPTIONS.map((archetype) => {
                  const selectedIdx = archetypeMix.indexOf(archetype.value);
                  const isSelected  = selectedIdx !== -1;
                  const isDisabled  = !isSelected && archetypeMix.length >= 2;
                  return (
                    <button
                      key={archetype.value}
                      type="button"
                      onClick={() => toggleArchetype(archetype.value)}
                      disabled={isDisabled || togglingArchetype === archetype.value}
                      className={cn(
                        'relative rounded-xl border p-2 text-left transition-all duration-150',
                        togglingArchetype === archetype.value && 'scale-95 opacity-70',
                        isSelected ? 'border-[#8B5A2B] bg-[#8B5A2B]/10' : isDisabled ? 'border-[#3D3229]/10 dark:border-slate-800 opacity-40 cursor-not-allowed' : 'border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#8B5A2B]/50'
                      )}
                    >
                      {isSelected && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B5A2B] text-xs font-bold text-black">{selectedIdx + 1}</span>}
                      <p className="font-semibold text-[#3D3229] dark:text-white text-sm pr-5">{archetype.label}</p>
                      <p className="text-xs text-[#6B5744] dark:text-slate-400">{archetype.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Constraints */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-[#8B5A2B]" />
                <h3 className="font-bold text-[#3D3229] dark:text-white">Behavioural Constraints</h3>
              </div>
              <p className="text-xs text-[#6B5744] dark:text-slate-400 mb-3">Add modifiers that shape interviewer behaviour.</p>
              <div className="grid grid-cols-2 gap-2">
                {CONSTRAINT_OPTIONS.map((constraint) => {
                  const isActive = constraints.includes(constraint.value);
                  return (
                    <button
                      key={constraint.value}
                      type="button"
                      onClick={() => toggleConstraint(constraint.value)}
                      disabled={togglingConstraint === constraint.value}
                      className={cn(
                        'rounded-xl border p-2 text-left transition-all duration-150',
                        togglingConstraint === constraint.value && 'scale-95 opacity-70',
                        isActive ? 'border-[#8B5A2B] bg-[#8B5A2B]/10' : 'border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-[#8B5A2B]/50'
                      )}
                    >
                      <p className="font-semibold text-[#3D3229] dark:text-white text-sm">{constraint.label}</p>
                      <p className="text-xs text-[#6B5744] dark:text-slate-400">{constraint.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trait Overrides */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="h-5 w-5 text-[#8B5A2B]" />
                <h3 className="font-bold text-[#3D3229] dark:text-white">Trait Overrides</h3>
              </div>
              <p className="text-xs text-[#6B5744] dark:text-slate-400 mb-3">Enable traits to override archetype defaults.</p>
              <div className="space-y-2">
                {TRAIT_SLIDERS.map((trait) => {
                  const isActive    = activeTraits.has(trait.key);
                  const sliderValue = traitOverrides[trait.key] ?? 50;
                  return (
                    <div key={trait.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTrait(trait.key)}
                        className={cn('relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors', isActive ? 'bg-[#8B5A2B]' : 'bg-[#3D3229]/10 dark:bg-slate-700')}
                      >
                        <span className={cn('inline-block h-3 w-3 transform rounded-full bg-white transition-transform', isActive ? 'translate-x-5' : 'translate-x-1')} />
                      </button>
                      <span className="w-20 text-xs font-medium text-[#3D3229] dark:text-white truncate">{trait.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sliderValue}
                        onChange={(e) => setTraitValue(trait.key, Number(e.target.value))}
                        disabled={!isActive}
                        className={cn('flex-1 h-1.5 rounded-full appearance-none cursor-pointer', isActive ? 'bg-[#8B5A2B]/20 dark:bg-[#5D3A1A] accent-[#8B5A2B]' : 'bg-[#3D3229]/10 dark:bg-slate-700 opacity-40 cursor-not-allowed')}
                      />
                      <span className="w-6 text-xs text-[#3D3229] dark:text-slate-300 text-right">{isActive ? sliderValue : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-800/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-[#3D3229]/5 dark:bg-slate-700 p-2">
              <Lock className="h-6 w-6 text-[#8B7355] dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#3D3229] dark:text-white">Custom Scenario Builder</h2>
              <p className="text-sm text-[#6B5744] dark:text-slate-400">Hand-pick archetype, add constraints, and dial individual traits</p>
            </div>
          </div>
          <p className="text-sm text-[#6B5744] dark:text-slate-400 mb-4">Purchase interview credits to unlock custom interviewer scenarios.</p>
          <Link href="/settings?tab=billing" className="inline-flex items-center gap-2 text-[#8B5A2B] hover:text-[#8B5A2B] font-semibold text-sm">Buy Credits <ChevronRight className="h-4 w-4" /></Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUBMIT (Full Width)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 flex items-center justify-between p-6 rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <p className="text-lg text-[#6B5744] dark:text-slate-400">Uses 1 interview credit</p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-3 rounded-xl bg-[#8B5A2B] px-8 py-4 text-xl font-bold text-white hover:bg-[#6B4420] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <><Loader2 className="h-6 w-6 animate-spin" />Creating...</>
          ) : (
            <><Flame className="h-6 w-6" />Start Interview<ChevronRight className="h-6 w-6" /></>
          )}
        </button>
      </div>

    </form>
  );
}
