'use client';

import { useState } from 'react';
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
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import type { Interviewer, InterviewType, CompanyStyle } from '@/types/database';

interface InterviewSetupFormProps {
  interviewers: Interviewer[];
  hasResume: boolean;
  resumeSkills: string[];
  subscriptionTier: 'free' | 'pro' | 'premium';
  voiceModeEnabled: boolean;
}

const INTERVIEW_TYPES: { value: InterviewType; label: string; description: string }[] = [
  { value: 'behavioral', label: 'Behavioral', description: 'Tell me about a time...' },
  { value: 'technical', label: 'Technical', description: 'System design & coding' },
  { value: 'case', label: 'Case Study', description: 'Business problem solving' },
  { value: 'hr', label: 'HR Screen', description: 'Culture fit & logistics' },
  { value: 'panel', label: 'Panel', description: 'Multiple interviewers' },
  { value: 'phone_screen', label: 'Phone Screen', description: 'Initial screening' },
];

const COMPANY_STYLES: { value: CompanyStyle; label: string }[] = [
  { value: 'faang', label: 'FAANG / Big Tech' },
  { value: 'startup', label: 'Startup' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'agency', label: 'Agency' },
  { value: 'government', label: 'Government' },
];

const DIFFICULTY_LEVELS = [
  { value: 3, label: 'Easy', description: 'Friendly, more guidance' },
  { value: 5, label: 'Medium', description: 'Balanced challenge' },
  { value: 7, label: 'Hard', description: 'Tough questions, less hints' },
  { value: 9, label: 'Expert', description: 'Intense pressure' },
];

export function InterviewSetupForm({
  interviewers,
  hasResume,
  resumeSkills,
  subscriptionTier,
  voiceModeEnabled,
}: InterviewSetupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    interviewType: 'behavioral' as InterviewType,
    companyStyle: 'startup' as CompanyStyle,
    targetRole: '',
    targetCompany: '',
    difficulty: 5,
    useVoiceMode: false,
    selectedInterviewerId: null as string | null,
    generateNewInterviewer: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_type: formData.interviewType,
          company_style: formData.companyStyle,
          target_role: formData.targetRole || null,
          target_company: formData.targetCompany || null,
          difficulty: formData.difficulty,
          use_voice_mode: formData.useVoiceMode,
          interviewer_id: formData.generateNewInterviewer ? null : formData.selectedInterviewerId,
          generate_new_interviewer: formData.generateNewInterviewer,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create interview');
      }

      const { session_id } = await response.json();
      toast.success('Interview session created!');
      router.push(`/interview/${session_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Interview Type */}
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

      {/* Company Style */}
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

      {/* Target Role & Company */}
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

      {/* Difficulty */}
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

      {/* Interviewer Selection */}
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
            onClick={() => setFormData({ ...formData, generateNewInterviewer: true, selectedInterviewerId: null })}
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
                        generateNewInterviewer: false,
                        selectedInterviewerId: interviewer.id,
                      })
                    }
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors flex items-center gap-3',
                      !formData.generateNewInterviewer && formData.selectedInterviewerId === interviewer.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white overflow-hidden">
                      {interviewer.avatar_url ? (
                        <img
                          src={interviewer.avatar_url}
                          alt={interviewer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        interviewer.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{interviewer.name}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {interviewer.interview_type.replace('_', ' ')} • {interviewer.total_sessions} sessions
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Voice Mode */}
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

      {/* Submit */}
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
