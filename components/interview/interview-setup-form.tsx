'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  subscriptionTier: 'free' | 'pro' | 'premium';
  voiceModeEnabled: boolean;
  hasVulnerabilityScan?: boolean;
  vulnerabilityCount?: number;
  savedJobDescriptions?: SavedJobDescription[];
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

// ── Premium: archetype options ─────────────────────────────────────────────────
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

// ── Premium: constraint options ────────────────────────────────────────────────
const CONSTRAINT_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'behavioral-only',   label: 'Behavioural Only',    description: 'No technical questions' },
  { value: 'compensation-push', label: 'Compensation Pushback', description: 'Challenges salary expectations' },
  { value: 'mood-swings',       label: 'Mood Swings',         description: 'Unpredictable demeanour shifts' },
  { value: 'heavy-follow-ups',  label: 'Heavy Follow-Ups',    description: 'Drills deep into every answer' },
  { value: 'time-pressure',     label: 'Time Pressure',       description: 'Signals urgency throughout' },
  { value: 'panel-dynamic',     label: 'Panel Dynamic',       description: 'Switches between supportive and critical' },
];

// ── Premium: trait slider config ───────────────────────────────────────────────
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
  subscriptionTier,
  voiceModeEnabled,
  hasVulnerabilityScan = false,
  vulnerabilityCount = 0,
  savedJobDescriptions = [],
}: InterviewSetupFormProps): React.JSX.Element {
  const router  = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // ── Resume targeting state (Premium) ────────────────────────────────────────
  const [targetResumeWeakSpots, setTargetResumeWeakSpots] = useState(false);
  const [targetJobDescriptionId, setTargetJobDescriptionId] = useState<string | null>(null);

  // ── Standard form state ────────────────────────────────────────────────────
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

  // ── Premium state ──────────────────────────────────────────────────────────
  // archetype_mix: up to 2 selections; first is primary, second is blended in
  const [archetypeMix,   setArchetypeMix]   = useState<InterviewerArchetype[]>([]);
  const [constraints,    setConstraints]    = useState<string[]>([]);
  // trait overrides: only the keys the user explicitly touches are sent
  const [traitOverrides, setTraitOverrides] = useState<Partial<PersonalityBase>>({});
  // track which traits the user has enabled for override
  const [activeTraits,   setActiveTraits]   = useState<Set<keyof PersonalityBase>>(new Set());
  // brief visual loading feedback on toggle actions
  const [togglingArchetype,   setTogglingArchetype]   = useState<InterviewerArchetype | null>(null);
  const [togglingConstraint,  setTogglingConstraint]  = useState<string | null>(null);

  // ── Archetype toggle (max 2) ───────────────────────────────────────────────
  function toggleArchetype(value: InterviewerArchetype): void {
    setTogglingArchetype(value);
    setArchetypeMix((prev) => {
      if (prev.includes(value)) return prev.filter((a) => a !== value);
      if (prev.length >= 2)    return prev;
      return [...prev, value];
    });
    setTimeout(() => setTogglingArchetype(null), 150);
  }

  // ── Constraint toggle ──────────────────────────────────────────────────────
  function toggleConstraint(value: string): void {
    setTogglingConstraint(value);
    setConstraints((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
    setTimeout(() => setTogglingConstraint(null), 150);
  }

  // ── Trait toggle + value change ────────────────────────────────────────────
  function toggleTrait(key: keyof PersonalityBase): void {
    setActiveTraits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setTraitOverrides((o) => {
          const { [key]: _, ...rest } = o;
          return rest;
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

  // ── Submit ─────────────────────────────────────────────────────────────────
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

      // Only attach premium fields when the user is on premium and has set values
      if (subscriptionTier === 'premium') {
        if (archetypeMix.length > 0)           payload.archetype_mix    = archetypeMix;
        if (constraints.length > 0)            payload.constraints      = constraints;
        if (Object.keys(traitOverrides).length > 0) payload.trait_overrides = traitOverrides;
        // Resume targeting
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
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Interview Type ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-orange-500/10 p-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Interview Type</h2>
            <p className="text-sm text-slate-400">What kind of interview are you preparing for?</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTERVIEW_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, interviewType: type.value })}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                formData.interviewType === type.value
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              )}
            >
              <p className="font-medium text-white">{type.label}</p>
              <p className="text-sm text-slate-400">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Company Style ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Building2 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Company Style</h2>
            <p className="text-sm text-slate-400">Match the interview culture</p>
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
                  ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Target Position ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Briefcase className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Target Position</h2>
            <p className="text-sm text-slate-400">Optional: Customize for specific roles</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="targetRole" className="block text-sm font-medium text-slate-300 mb-1.5">
              Role / Title
            </label>
            <input
              id="targetRole"
              type="text"
              value={formData.targetRole}
              onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label htmlFor="targetCompany" className="block text-sm font-medium text-slate-300 mb-1.5">
              Company (optional)
            </label>
            <input
              id="targetCompany"
              type="text"
              value={formData.targetCompany}
              onChange={(e) => setFormData({ ...formData, targetCompany: e.target.value })}
              placeholder="e.g., Google, Stripe, etc."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {hasResume && resumeSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400 mb-2">From your resume:</p>
            <div className="flex flex-wrap gap-2">
              {resumeSkills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
                >
                  {skill}
                </span>
              ))}
              {resumeSkills.length > 8 && (
                <span className="text-xs text-slate-500">+{resumeSkills.length - 8} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Difficulty ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-amber-500/10 p-2">
            <Gauge className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Difficulty Level</h2>
            <p className="text-sm text-slate-400">How challenging should this be?</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFICULTY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData({ ...formData, difficulty: level.value })}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                formData.difficulty === level.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              )}
            >
              <p className="font-medium text-white">{level.label}</p>
              <p className="text-xs text-slate-400">{level.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Session Length ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <Clock className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Session Length</h2>
            <p className="text-sm text-slate-400">How long do you want to practice?</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {SESSION_LENGTHS.map((length) => (
            <button
              key={length.value}
              type="button"
              onClick={() => setFormData({ ...formData, sessionLength: length.value })}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                formData.sessionLength === length.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              )}
            >
              <p className="font-medium text-white">{length.label}</p>
              <p className="text-sm text-slate-400">{length.description}</p>
              <p className="text-xs text-slate-500 mt-1">{length.questions}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Interviewer Selection ────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Users className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Interviewer</h2>
            <p className="text-sm text-slate-400">Generate a new personality or use an existing one</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, generateNewInterviewer: true, selectedInterviewerId: null })
            }
            className={cn(
              'w-full rounded-lg border p-4 text-left transition-colors flex items-center gap-4',
              formData.generateNewInterviewer
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            )}
          >
            <div className="rounded-full bg-gradient-to-br from-orange-500 to-amber-500 p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">Generate New Interviewer</p>
              <p className="text-sm text-slate-400">Create a fresh personality with hidden traits</p>
            </div>
          </button>

          {interviewers.length > 0 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900 px-3 text-sm text-slate-500">or select existing</span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {interviewers.slice(0, 4).map((interviewer) => (
                  <button
                    key={interviewer.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        generateNewInterviewer:  false,
                        selectedInterviewerId: interviewer.id,
                      })
                    }
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors flex items-center gap-3',
                      !formData.generateNewInterviewer &&
                        formData.selectedInterviewerId === interviewer.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <div className="relative h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white overflow-hidden">
                      {interviewer.avatar_url ? (
                        <Image
                          src={interviewer.avatar_url}
                          alt={interviewer.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        interviewer.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{interviewer.name}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {interviewer.interview_type.replace('_', ' ')} •{' '}
                        {interviewer.total_sessions} sessions
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Voice Mode ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', voiceModeEnabled ? 'bg-cyan-500/10' : 'bg-slate-800')}>
              {voiceModeEnabled ? (
                <Mic className="h-5 w-5 text-cyan-500" />
              ) : (
                <Lock className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white">Voice Mode</h2>
              <p className="text-sm text-slate-400">
                {voiceModeEnabled
                  ? 'Practice speaking your answers out loud'
                  : 'Upgrade to Pro for voice interviews'}
              </p>
            </div>
          </div>

          {voiceModeEnabled ? (
            <button
              type="button"
              onClick={() => setFormData({ ...formData, useVoiceMode: !formData.useVoiceMode })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                formData.useVoiceMode ? 'bg-cyan-500' : 'bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  formData.useVoiceMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          ) : (
            <a
              href="/settings?tab=billing"
              className="text-sm text-orange-500 hover:text-orange-400 font-medium"
            >
              Upgrade
            </a>
          )}
        </div>
      </div>

      {/* ── Premium: Resume Targeting ────────────────────────────────────── */}
      {subscriptionTier === 'premium' ? (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                Resume Targeting
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                  Premium
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Focus the interview on your resume weak points or job-specific gaps
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Target Resume Weak Spots */}
            {hasVulnerabilityScan && vulnerabilityCount > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="font-medium text-white">Target Resume Weak Spots</p>
                    <p className="text-sm text-slate-400">
                      Interviewer will probe {vulnerabilityCount} vulnerable claims from your resume
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetResumeWeakSpots(!targetResumeWeakSpots)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    targetResumeWeakSpots ? 'bg-purple-500' : 'bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      targetResumeWeakSpots ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )}

            {!hasVulnerabilityScan && hasResume && (
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 text-center">
                <p className="text-sm text-slate-400">
                  Run a vulnerability scan on your resume to enable targeted practice.
                </p>
                <a
                  href="/dashboard"
                  className="text-sm text-purple-400 hover:text-purple-300 mt-2 inline-block"
                >
                  Go to Dashboard →
                </a>
              </div>
            )}

            {/* Target Job Description */}
            {savedJobDescriptions.length > 0 && (
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">Practice for Job</p>
                    <p className="text-sm text-slate-400">
                      Target gaps from a saved job description
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setTargetJobDescriptionId(null)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors',
                      targetJobDescriptionId === null
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                    )}
                  >
                    <p className="text-sm font-medium text-white">No specific job</p>
                    <p className="text-xs text-slate-400">General interview practice</p>
                  </button>
                  {savedJobDescriptions.slice(0, 3).map((jd) => (
                    <button
                      key={jd.id}
                      type="button"
                      onClick={() => setTargetJobDescriptionId(jd.id)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-colors',
                        targetJobDescriptionId === jd.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {jd.roleTitle ?? 'Unknown Role'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {jd.companyName ?? 'Unknown Company'}
                          </p>
                        </div>
                        {jd.matchPercentage !== null && (
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              jd.matchPercentage >= 80
                                ? 'bg-green-500/20 text-green-400'
                                : jd.matchPercentage >= 60
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            )}
                          >
                            {jd.matchPercentage}% match
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {savedJobDescriptions.length > 3 && (
                    <a
                      href="/job-analysis"
                      className="block text-center text-sm text-blue-400 hover:text-blue-300 py-2"
                    >
                      View all {savedJobDescriptions.length} jobs →
                    </a>
                  )}
                </div>
              </div>
            )}

            {savedJobDescriptions.length === 0 && (
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 text-center">
                <p className="text-sm text-slate-400">
                  Save job descriptions to practice for specific roles.
                </p>
                <a
                  href="/job-analysis"
                  className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
                >
                  Analyze a Job Description →
                </a>
              </div>
            )}

            {/* Active targeting summary */}
            {(targetResumeWeakSpots || targetJobDescriptionId) && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-xs font-medium text-purple-400 mb-1">Targeting active</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {targetResumeWeakSpots && (
                    <p className="text-xs text-purple-300">
                      Resume vulnerabilities: {vulnerabilityCount} claims
                    </p>
                  )}
                  {targetJobDescriptionId && (
                    <p className="text-xs text-purple-300">
                      Job: {savedJobDescriptions.find(j => j.id === targetJobDescriptionId)?.roleTitle ?? 'Selected'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Locked teaser for non-premium users */
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-400 flex items-center gap-2">
                  Resume Targeting
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    Premium
                  </span>
                </h2>
                <p className="text-sm text-slate-500">
                  Practice defending your resume weak spots and job-specific gaps
                </p>
              </div>
            </div>
            <a
              href="/settings?tab=billing"
              className="flex-shrink-0 text-sm text-purple-500 hover:text-purple-400 font-medium"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}

      {/* ── Premium: Custom Scenario Builder ─────────────────────────────── */}
      {subscriptionTier === 'premium' ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Wand2 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                Custom Scenario Builder
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  Premium
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Hand-pick archetype, add constraints, and dial individual traits
              </p>
            </div>
          </div>

          {/* Active scenario summary banner */}
          {(archetypeMix.length > 0 || constraints.length > 0 || activeTraits.size > 0) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs font-medium text-amber-400 mb-1">Custom scenario active</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {archetypeMix.length > 0 && (
                  <p className="text-xs text-amber-300">
                    Archetypes: {archetypeMix.join(' + ')}
                  </p>
                )}
                {constraints.length > 0 && (
                  <p className="text-xs text-amber-300">
                    Constraints: {constraints.join(', ')}
                  </p>
                )}
                {activeTraits.size > 0 && (
                  <p className="text-xs text-amber-300">
                    Trait overrides: {activeTraits.size} active
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Archetype Mix */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium text-white">Archetype Mix</h3>
              {archetypeMix.length > 0 && (
                <span className="text-xs text-slate-500">
                  ({archetypeMix.length}/2 selected
                  {archetypeMix.length === 2 ? ' — personalities blended' : ''})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Select up to 2 — first is the primary personality; second is blended in.
              Leave empty for a random archetype (default Pro behaviour).
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                      'relative rounded-lg border p-3 text-left transition-all duration-150',
                      togglingArchetype === archetype.value && 'scale-95 opacity-70',
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDisabled
                          ? 'border-slate-800 bg-slate-800/30 opacity-40 cursor-not-allowed'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                        {selectedIdx + 1}
                      </span>
                    )}
                    <p className="font-medium text-white text-sm pr-4">{archetype.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{archetype.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium text-white">Behavioural Constraints</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Add modifiers that shape how the interviewer behaves throughout the session.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CONSTRAINT_OPTIONS.map((constraint) => {
                const isActive = constraints.includes(constraint.value);
                return (
                  <button
                    key={constraint.value}
                    type="button"
                    onClick={() => toggleConstraint(constraint.value)}
                    disabled={togglingConstraint === constraint.value}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all duration-150',
                      togglingConstraint === constraint.value && 'scale-95 opacity-70',
                      isActive
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <p className="font-medium text-white text-sm">{constraint.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{constraint.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trait Overrides */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium text-white">Trait Overrides</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Enable individual traits to override the archetype defaults. Disabled traits use
              archetype + difficulty values.
            </p>
            <div className="space-y-4">
              {TRAIT_SLIDERS.map((trait) => {
                const isActive    = activeTraits.has(trait.key);
                const sliderValue = traitOverrides[trait.key] ?? 50;
                return (
                  <div key={trait.key} className="flex items-center gap-4">
                    {/* Enable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleTrait(trait.key)}
                      className={cn(
                        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors',
                        isActive ? 'bg-amber-500' : 'bg-slate-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                          isActive ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>

                    {/* Trait label */}
                    <span
                      className={cn(
                        'w-28 text-sm font-medium flex-shrink-0',
                        isActive ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      {trait.label}
                    </span>

                    {/* Slider + labels */}
                    <div
                      className={cn(
                        'flex flex-1 items-center gap-2 transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'
                      )}
                    >
                      <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0">
                        {trait.lowLabel}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={sliderValue}
                        onChange={(e) => setTraitValue(trait.key, Number(e.target.value))}
                        disabled={!isActive}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-xs text-slate-500 w-16 flex-shrink-0">
                        {trait.highLabel}
                      </span>
                      <span className="text-xs text-amber-400 font-mono w-8 text-right flex-shrink-0">
                        {sliderValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Locked teaser for non-premium users */
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-400 flex items-center gap-2">
                  Custom Scenario Builder
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    Premium
                  </span>
                </h2>
                <p className="text-sm text-slate-500">
                  Hand-pick archetypes, add constraints, and dial individual personality traits
                </p>
              </div>
            </div>
            <a
              href="/settings?tab=billing"
              className="flex-shrink-0 text-sm text-amber-500 hover:text-amber-400 font-medium"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500">
          {subscriptionTier === 'free' && 'Uses 1 of your 3 monthly interviews'}
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Flame className="h-4 w-4" />
              Start Interview
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
