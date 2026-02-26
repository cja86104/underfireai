'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface InterviewerActionsProps {
  interviewerId: string;
  interviewerName: string;
  isCustom: boolean;
}

export function InterviewerActions({
  interviewerId,
  interviewerName,
  isCustom,
}: InterviewerActionsProps): React.JSX.Element {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (!isCustom) {
      toast.error('Cannot delete system interviewers');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${interviewerName}"? This cannot be undone.`
    );

    if (!confirmed) {
      setIsOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/interviewer/${interviewerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success(`Deleted "${interviewerName}"`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete interviewer');
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  const handleStartInterview = (): void => {
    router.push(`/interview/new?interviewer=${interviewerId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
        disabled={isDeleting}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg z-20">
            <button
              type="button"
              onClick={handleStartInterview}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Start Interview
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors',
                  isDeleting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Interviewer'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
