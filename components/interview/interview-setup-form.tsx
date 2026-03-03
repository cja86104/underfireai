'use client';

import { useState, useEffect } from 'react';
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
  /** True if user has purchased credits (unlocks all features) */
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
  hasPurchased,
  voiceModeEnabled,
  hasVulnerabilityScan = false,
  vulnerabilityCount = 0,
  savedJobDescriptions = [],
  focusClaim = null,
}: InterviewSetupFormProps): React.JSX.Element {
  const router  = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // ── Resume targeting state ──────────────────────────────────────────────────
  const [targetResumeWeakSpots, setTargetResumeWeakSpots] = useState(false);
  const [targetJobDescriptionId, setTargetJobDescriptionId] = useState<string | null>(null);

  // Auto-enable resume weak spot targeting when arriving from the vulnerability card
  useEffect(() => {
    if (focusClaim && hasPurchased) {
      setTargetResumeWeakSpots(true);
    }
  }, [focusClaim, hasPurchased]);

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

  // ── Advanced customization state ───────────────────────────────────────────
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

      // Attach advanced customization fields when user has purchased and set values
      if (hasPurchased) {
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
    <form onSubmit={handleSubmit} className="space-y-10 max-w-[1200px] mx-auto">

      {/* ── Focus Claim Banner (from vulnerability card deep-link) ─────────── */}
      {focusClaim && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600/40 px-6 py-5">
          <div className="flex-shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5 mt-0.5">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
              Practicing a resume vulnerability
            </p>
            <p className="text-amber-800 dark:text-amber-400/90 text-sm mt-1 italic truncate">
              &ldquo;{focusClaim}&rdquo;
            </p>
            {hasPurchased ? (
              <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                Resume targeting has been enabled automatically — the interviewer will probe this claim.
              </p>
            ) : (
              <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                Purchase interview credits to have the AI specifically probe this claim during your session.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Interview Type ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-orange-500/10 p-3">
            <MessageSquare className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Interview Type</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">What kind of interview are you preparing for?</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTERVIEW_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, interviewType: type.value })}
              className={cn(
                'rounded-xl border p-5 text-left transition-colors relative',
                formData.interviewType === type.value
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]'
              )}
            >
              <p className="text-lg font-bold text-[#3D3229] dark:text-white">{type.label}</p>
              <p className="text-lg text-[#3D3229] dark:text-slate-200 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Company Style ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-purple-500/10 p-3">
            <Building2 className="h-8 w-8 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Company Style</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">Match the interview culture</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {COMPANY_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => setFormData({ ...formData, companyStyle: style.value })}
              className={cn(
                'rounded-full border px-6 py-3 text-lg font-semibold transition-colors',
                formData.companyStyle === style.value
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 text-[#3D3229] dark:text-slate-200 hover:border-[#8B5A2B]'
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Target Position ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-blue-500/10 p-3">
            <Briefcase className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Target Position</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">Optional: Customize for specific roles</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="targetRole" className="block text-lg font-semibold text-[#3D3229] dark:text-slate-200 mb-2">
              Role / Title
            </label>
            <input
              id="targetRole"
              type="text"
              value={formData.targetRole}
              onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-5 py-4 text-lg text-[#3D3229] dark:text-slate-100 placeholder:text-[#3D3229]/50 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div>
            <label htmlFor="targetCompany" className="block text-lg font-semibold text-[#3D3229] dark:text-slate-200 mb-2">
              Company (optional)
            </label>
            <input
              id="targetCompany"
              type="text"
              value={formData.targetCompany}
              onChange={(e) => setFormData({ ...formData, targetCompany: e.target.value })}
              placeholder="e.g., Google, Stripe, etc."
              className="w-full rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 px-5 py-4 text-lg text-[#3D3229] dark:text-slate-100 placeholder:text-[#3D3229]/50 dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {hasResume && resumeSkills.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#3D3229]/15 dark:border-slate-700">
            <p className="text-lg text-[#3D3229] dark:text-slate-200 mb-3 font-medium">From your resume:</p>
            <div className="flex flex-wrap gap-3">
              {resumeSkills.slice(0, 8).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#FAF8F5] dark:bg-slate-800 border border-[#3D3229]/10 dark:border-slate-700 px-4 py-2 text-base font-medium text-[#3D3229] dark:text-slate-200"
                >
                  {skill}
                </span>
              ))}
              {resumeSkills.length > 8 && (
                <span className="text-base text-[#3D3229] dark:text-slate-300 font-medium">+{resumeSkills.length - 8} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Difficulty ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-amber-500/10 p-3">
            <Gauge className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Difficulty Level</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">How challenging should this be?</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFICULTY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData({ ...formData, difficulty: level.value })}
              className={cn(
                'rounded-xl border p-5 text-left transition-colors',
                formData.difficulty === level.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]'
              )}
            >
              <p className="text-lg font-bold text-[#3D3229] dark:text-white">{level.label}</p>
              <p className="text-base text-[#3D3229] dark:text-slate-200 mt-1">{level.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Session Length ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <Clock className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Session Length</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">How long do you want to practice?</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SESSION_LENGTHS.map((length) => (
            <button
              key={length.value}
              type="button"
              onClick={() => setFormData({ ...formData, sessionLength: length.value })}
              className={cn(
                'rounded-xl border p-5 text-left transition-colors',
                formData.sessionLength === length.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]'
              )}
            >
              <p className="text-lg font-bold text-[#3D3229] dark:text-white">{length.label}</p>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">{length.description}</p>
              <p className="text-base text-[#3D3229]/70 dark:text-slate-300 mt-2">{length.questions}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Interviewer Selection ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-green-500/10 p-3">
            <Users className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Interviewer</h2>
            <p className="text-lg text-[#3D3229] dark:text-slate-200">Generate a new personality or use an existing one</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, generateNewInterviewer: true, selectedInterviewerId: null })
            }
            className={cn(
              'w-full rounded-xl border p-5 text-left transition-colors flex items-center gap-5',
              formData.generateNewInterviewer
                ? 'border-green-500 bg-green-500/10'
                : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]'
            )}
          >
            <div className="rounded-full bg-gradient-to-br from-orange-500 to-amber-500 p-3">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#3D3229] dark:text-white">Generate New Interviewer</p>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">Create a fresh personality with hidden traits</p>
            </div>
          </button>

          {interviewers.length > 0 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3D3229]/15 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-900 px-4 text-lg text-[#3D3229] dark:text-slate-300 font-medium">or select existing</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                      'rounded-xl border p-5 text-left transition-colors flex items-center gap-4',
                      !formData.generateNewInterviewer &&
                        formData.selectedInterviewerId === interviewer.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800/50 hover:border-[#8B5A2B]'
                    )}
                  >
                    <div className="relative h-14 w-14 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-[#3D3229] dark:text-white overflow-hidden">
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
                      <p className="text-lg font-bold text-[#3D3229] dark:text-white truncate">{interviewer.name}</p>
                      <p className="text-base text-[#3D3229] dark:text-slate-200 capitalize">
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

      {/* ── Custom Scenario Builder ───────────────────────────────────────── */}
      {hasPurchased ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 space-y-10">

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3">
              <Wand2 className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">
                Custom Scenario Builder
              </h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">
                Hand-pick archetype, add constraints, and dial individual traits
              </p>
            </div>
          </div>

          {/* Active scenario summary banner */}
          {(archetypeMix.length > 0 || constraints.length > 0 || activeTraits.size > 0) && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mb-2">Custom scenario active</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {archetypeMix.length > 0 && (
                  <p className="text-base text-amber-600 dark:text-amber-300">
                    Archetypes: {archetypeMix.join(' + ')}
                  </p>
                )}
                {constraints.length > 0 && (
                  <p className="text-base text-amber-600 dark:text-amber-300">
                    Constraints: {constraints.join(', ')}
                  </p>
                )}
                {activeTraits.size > 0 && (
                  <p className="text-base text-amber-600 dark:text-amber-300">
                    Trait overrides: {activeTraits.size} active
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Archetype Mix */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-[#3D3229] dark:text-white">Archetype Mix</h3>
              {archetypeMix.length > 0 && (
                <span className="text-base text-[#3D3229] dark:text-slate-300">
                  ({archetypeMix.length}/2 selected
                  {archetypeMix.length === 2 ? ' — personalities blended' : ''})
                </span>
              )}
            </div>
            <p className="text-base text-[#3D3229] dark:text-slate-200 mb-4">
              Select up to 2 — first is the primary personality; second is blended in.
              Leave empty for a random archetype (default Pro behaviour).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      'relative rounded-xl border p-4 text-left transition-all duration-150',
                      togglingArchetype === archetype.value && 'scale-95 opacity-70',
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDisabled
                          ? 'border-[#3D3229]/10 dark:border-slate-800 bg-[#3D3229]/3 dark:bg-slate-800/30 opacity-40 cursor-not-allowed'
                          : 'border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-amber-400'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-black">
                        {selectedIdx + 1}
                      </span>
                    )}
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white pr-6">{archetype.label}</p>
                    <p className="text-base text-[#3D3229] dark:text-slate-200 mt-1">{archetype.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-[#3D3229] dark:text-white">Behavioural Constraints</h3>
            </div>
            <p className="text-base text-[#3D3229] dark:text-slate-200 mb-4">
              Add modifiers that shape how the interviewer behaves throughout the session.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CONSTRAINT_OPTIONS.map((constraint) => {
                const isActive = constraints.includes(constraint.value);
                return (
                  <button
                    key={constraint.value}
                    type="button"
                    onClick={() => toggleConstraint(constraint.value)}
                    disabled={togglingConstraint === constraint.value}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all duration-150',
                      togglingConstraint === constraint.value && 'scale-95 opacity-70',
                      isActive
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-amber-400'
                    )}
                  >
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white">{constraint.label}</p>
                    <p className="text-base text-[#3D3229] dark:text-slate-200 mt-1">{constraint.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trait Overrides */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SlidersHorizontal className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-[#3D3229] dark:text-white">Trait Overrides</h3>
            </div>
            <p className="text-base text-[#3D3229] dark:text-slate-200 mb-4">
              Enable individual traits to override the archetype defaults. Disabled traits use
              archetype + difficulty values.
            </p>
            <div className="space-y-5">
              {TRAIT_SLIDERS.map((trait) => {
                const isActive    = activeTraits.has(trait.key);
                const sliderValue = traitOverrides[trait.key] ?? 50;
                return (
                  <div key={trait.key} className="flex items-center gap-5">
                    {/* Enable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleTrait(trait.key)}
                      className={cn(
                        'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors',
                        isActive ? 'bg-amber-500' : 'bg-[#3D3229]/10 dark:bg-slate-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>

                    {/* Trait label */}
                    <span
                      className={cn(
                        'w-36 text-lg font-semibold flex-shrink-0',
                        isActive ? 'text-[#3D3229] dark:text-white' : 'text-[#3D3229]/50 dark:text-slate-500'
                      )}
                    >
                      {trait.label}
                    </span>

                    {/* Slider + labels */}
                    <div
                      className={cn(
                        'flex flex-1 items-center gap-3 transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'
                      )}
                    >
                      <span className="text-base text-[#3D3229] dark:text-slate-300 w-20 text-right flex-shrink-0">
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
                        className="flex-1 accent-amber-500 h-2"
                      />
                      <span className="text-base text-[#3D3229] dark:text-slate-300 w-20 flex-shrink-0">
                        {trait.highLabel}
                      </span>
                      <span className="text-base text-amber-600 dark:text-amber-400 font-bold font-mono w-10 text-right flex-shrink-0">
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
        /* Locked teaser for users who haven't purchased */
        <div className="rounded-2xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5]/50 dark:bg-slate-900/30 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[#FAF8F5] dark:bg-slate-800 p-3">
                <Lock className="h-8 w-8 text-[#3D3229] dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#3D3229] dark:text-slate-300">
                  Custom Scenario Builder
                </h2>
                <p className="text-lg text-[#3D3229] dark:text-slate-300">
                  Hand-pick archetypes, add constraints, and dial individual personality traits
                </p>
              </div>
            </div>
            <a
              href="/settings?tab=billing"
              className="flex-shrink-0 text-lg text-amber-500 hover:text-amber-400 font-semibold"
            >
              Buy Credits
            </a>
          </div>
        </div>
      )}
      {/* ── Voice Mode ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('rounded-xl p-3', voiceModeEnabled ? 'bg-cyan-500/10' : 'bg-[#FAF8F5] dark:bg-slate-800')}>
              {voiceModeEnabled ? (
                <Mic className="h-8 w-8 text-cyan-500" />
              ) : (
                <Lock className="h-8 w-8 text-[#3D3229] dark:text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">Voice Mode</h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">
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
                'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                formData.useVoiceMode ? 'bg-cyan-500' : 'bg-[#3D3229]/10 dark:bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                  formData.useVoiceMode ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          ) : (
            <a
              href="/settings?tab=billing"
              className="text-lg text-orange-500 hover:text-orange-400 font-semibold"
            >
              Upgrade
            </a>
          )}
        </div>
      </div>
      {/* ── Resume Targeting ──────────────────────────────────────────────── */}
      {hasPurchased ? (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-xl bg-purple-500/10 p-3">
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#3D3229] dark:text-white">
                Resume Targeting
              </h2>
              <p className="text-lg text-[#3D3229] dark:text-slate-200">
                Focus the interview on your resume weak points or job-specific gaps
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Target Resume Weak Spots */}
            {hasVulnerabilityScan && vulnerabilityCount > 0 && (
              <div className="flex items-center justify-between p-5 rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-7 w-7 text-amber-500" />
                  <div>
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white">Target Resume Weak Spots</p>
                    <p className="text-lg text-[#3D3229] dark:text-slate-200">
                      Interviewer will probe {vulnerabilityCount} vulnerable claims from your resume
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetResumeWeakSpots(!targetResumeWeakSpots)}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    targetResumeWeakSpots ? 'bg-purple-500' : 'bg-[#3D3229]/10 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                      targetResumeWeakSpots ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )}

            {!hasVulnerabilityScan && hasResume && (
              <div className="p-5 rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-center">
                <p className="text-lg text-[#3D3229] dark:text-slate-200">
                  Run a vulnerability scan on your resume to enable targeted practice.
                </p>
                <a
                  href="/dashboard"
                  className="text-lg text-purple-500 hover:text-purple-400 mt-3 inline-block font-semibold"
                >
                  Go to Dashboard →
                </a>
              </div>
            )}

            {/* Target Job Description */}
            {savedJobDescriptions.length > 0 && (
              <div className="p-5 rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <div className="flex items-center gap-4 mb-4">
                  <Target className="h-7 w-7 text-blue-500" />
                  <div>
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white">Practice for Job</p>
                    <p className="text-lg text-[#3D3229] dark:text-slate-200">
                      Target gaps from a saved job description
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setTargetJobDescriptionId(null)}
                    className={cn(
                      'w-full text-left rounded-xl border p-4 transition-colors',
                      targetJobDescriptionId === null
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#3D3229]/20 dark:border-slate-600 bg-[#FAF8F5] dark:bg-slate-800/30 hover:border-[#8B5A2B]'
                    )}
                  >
                    <p className="text-lg font-bold text-[#3D3229] dark:text-white">No specific job</p>
                    <p className="text-base text-[#3D3229] dark:text-slate-200">General interview practice</p>
                  </button>
                  {savedJobDescriptions.slice(0, 3).map((jd) => (
                    <button
                      key={jd.id}
                      type="button"
                      onClick={() => setTargetJobDescriptionId(jd.id)}
                      className={cn(
                        'w-full text-left rounded-xl border p-4 transition-colors',
                        targetJobDescriptionId === jd.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[#3D3229]/20 dark:border-slate-600 bg-[#FAF8F5] dark:bg-slate-800/30 hover:border-[#8B5A2B]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-[#3D3229] dark:text-white">
                            {jd.roleTitle ?? 'Unknown Role'}
                          </p>
                          <p className="text-base text-[#3D3229] dark:text-slate-200">
                            {jd.companyName ?? 'Unknown Company'}
                          </p>
                        </div>
                        {jd.matchPercentage !== null && (
                          <span
                            className={cn(
                              'text-base font-bold px-3 py-1 rounded-lg',
                              jd.matchPercentage >= 80
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : jd.matchPercentage >= 60
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
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
                      className="block text-center text-lg text-blue-500 hover:text-blue-400 py-3 font-semibold"
                    >
                      View all {savedJobDescriptions.length} jobs →
                    </a>
                  )}
                </div>
              </div>
            )}

            {savedJobDescriptions.length === 0 && (
              <div className="p-5 rounded-xl border border-[#3D3229]/15 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-center">
                <p className="text-lg text-[#3D3229] dark:text-slate-200">
                  Save job descriptions to practice for specific roles.
                </p>
                <a
                  href="/job-analysis"
                  className="text-lg text-blue-500 hover:text-blue-400 mt-3 inline-block font-semibold"
                >
                  Analyze a Job Description →
                </a>
              </div>
            )}

            {/* Active targeting summary */}
            {(targetResumeWeakSpots || targetJobDescriptionId) && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-base font-bold text-purple-600 dark:text-purple-400 mb-2">Targeting active</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {targetResumeWeakSpots && (
                    <p className="text-base text-purple-600 dark:text-purple-300">
                      Resume vulnerabilities: {vulnerabilityCount} claims
                    </p>
                  )}
                  {targetJobDescriptionId && (
                    <p className="text-base text-purple-600 dark:text-purple-300">
                      Job: {savedJobDescriptions.find(j => j.id === targetJobDescriptionId)?.roleTitle ?? 'Selected'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Locked teaser for users who haven't purchased */
        <div className="rounded-2xl border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5]/50 dark:bg-slate-900/30 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[#FAF8F5] dark:bg-slate-800 p-3">
                <Lock className="h-8 w-8 text-[#3D3229] dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#3D3229] dark:text-slate-300">
                  Resume Targeting
                </h2>
                <p className="text-lg text-[#3D3229] dark:text-slate-300">
                  Practice defending your resume weak spots and job-specific gaps
                </p>
              </div>
            </div>
            <a
              href="/settings?tab=billing"
              className="flex-shrink-0 text-lg text-purple-500 hover:text-purple-400 font-semibold"
            >
              Buy Credits
            </a>
          </div>
        </div>
      )}
      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-6">
        <p className="text-lg text-[#3D3229] dark:text-slate-300">
          Uses 1 interview credit
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-3 rounded-xl bg-orange-500 px-8 py-4 text-xl font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Flame className="h-6 w-6" />
              Start Interview
              <ChevronRight className="h-6 w-6" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
