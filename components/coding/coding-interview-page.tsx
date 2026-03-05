'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Code2,
  Clock,
  Send,
  Loader2,
  MoreVertical,
  Square,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { CodingChallengeUI } from './coding-challenge';
import type { CodingChallenge, ProgrammingLanguage, CodeEvaluation } from '@/types/coding';
import type { InterviewMessage, SessionStatus } from '@/types/database';

interface ChatResponse {
  content?: string;
  user_message_id?: string;
  interviewer_message_id?: string;
  should_end?: boolean;
}

interface CodingInterviewPageProps {
  sessionId: string;
  sessionStatus: SessionStatus;
  challenge: CodingChallenge;
  initialLanguage?: ProgrammingLanguage;
  interviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  initialMessages: InterviewMessage[];
  startedAt: string;
}

type ViewMode = 'code' | 'chat' | 'split';

export function CodingInterviewPage({
  sessionId,
  sessionStatus: initialStatus,
  challenge,
  initialLanguage,
  interviewer,
  initialMessages,
  startedAt,
}: CodingInterviewPageProps): React.JSX.Element {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initialStatus);
  const [showActions, setShowActions] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Calculate elapsed time
  useEffect(() => {
    if (sessionStatus !== 'in_progress') return;

    const startTime = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, sessionStatus]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start interview with coding intro
  useEffect(() => {
    if (messages.length === 0 && sessionStatus === 'in_progress') {
      startCodingInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startCodingInterview = (): void => {
    setIsLoading(true);
    try {
      // Create intro message from interviewer
      const introMessage: InterviewMessage = {
        id: `intro-${Date.now()}`,
        session_id: sessionId,
        role: 'interviewer',
        content: `Hi! I'm ${interviewer.name}, and I'll be your interviewer today for this coding challenge.\n\nI've given you the problem "${challenge.title}" to solve. Take your time to understand the problem, and feel free to ask me any clarifying questions before you start coding.\n\nWhen you're ready, you can start writing your solution. Don't hesitate to think out loud - I'd love to hear your thought process!`,
        audio_url: null,
        response_time_seconds: null,
        analysis: null,
        created_at: new Date().toISOString(),
      };
      setMessages([introMessage]);
    } catch (error) {
      toast.error('Failed to start interview');
      console.error('Start interview error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading || sessionStatus !== 'in_progress') return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message optimistically
    const tempUserMessage: InterviewMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'candidate',
      content: userMessage,
      audio_url: null,
      response_time_seconds: null,
      analysis: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch(`/api/interview/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          interviewer: {
            id: interviewer.id,
            name: interviewer.name,
            avatarUrl: interviewer.avatarUrl,
            backstory: `Senior engineer conducting a coding interview for the "${challenge.title}" challenge.`,
            personalityBase: null,
            currentMood: null,
            voiceConfig: null,
          },
          interviewerPersonality: null,
          interviewType: 'technical',
          targetRole: null,
          targetCompany: null,
          companyStyle: null,
          resumeContext: null,
          messageHistory: messages.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json() as ChatResponse;

      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempUserMessage.id
            ? { ...msg, id: data.user_message_id ?? msg.id }
            : msg
        );
        return [
          ...updated,
          {
            id: data.interviewer_message_id ?? `msg-${Date.now()}`,
            session_id: sessionId,
            role: 'interviewer' as const,
            content: data.content ?? '',
            audio_url: null,
            response_time_seconds: null,
            analysis: null,
            created_at: new Date().toISOString(),
          },
        ];
      });

      if (data.should_end) {
        await endInterview();
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Send message error:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = useCallback((_code: string, language: ProgrammingLanguage) => {
    // Add a message indicating code was submitted
    const submitMessage: InterviewMessage = {
      id: `code-submit-${Date.now()}`,
      session_id: sessionId,
      role: 'interviewer',
      content: `Great job submitting your solution! I've reviewed your ${language} code.\n\nLet's discuss your approach. Can you walk me through your solution and explain your thought process?`,
      audio_url: null,
      response_time_seconds: null,
      analysis: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, submitMessage]);

    // Switch to chat view to discuss the solution
    if (viewMode === 'code') {
      setViewMode('split');
    }
  }, [sessionId, viewMode]);

  const handleCodeComplete = useCallback((evaluation: CodeEvaluation) => {
    // Add evaluation summary to chat
    const evalMessage: InterviewMessage = {
      id: `eval-${Date.now()}`,
      session_id: sessionId,
      role: 'interviewer',
      content: `**Code Review Summary:**\n\n- Correctness: ${evaluation.correctness}/100\n- Efficiency: ${evaluation.efficiency}/100\n- Code Quality: ${evaluation.codeQuality}/100\n- Problem Solving: ${evaluation.problemSolving}/100\n\n${evaluation.feedback}\n\n**Suggestions:**\n${evaluation.suggestions.map((s) => `- ${s}`).join('\n')}`,
      audio_url: null,
      response_time_seconds: null,
      analysis: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, evalMessage]);
  }, [sessionId]);

  const endInterview = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/interview/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elapsed_seconds: elapsedTime }),
      });

      if (!response.ok) {
        throw new Error('Failed to end interview');
      }

      setSessionStatus('completed');
      toast.success('Interview completed! Generating your feedback...');

      setTimeout(() => {
        router.push(`/interview/${sessionId}/results`);
        router.refresh();
      }, 1500);
    } catch (error) {
      toast.error('Failed to end interview');
      console.error('End interview error:', error);
    }
  };

  const pauseInterview = async (): Promise<void> => {
    try {
      await fetch(`/api/interview/${sessionId}/pause`, { method: 'POST' });
      setSessionStatus('paused');
      toast.info('Interview paused');
    } catch {
      toast.error('Failed to pause interview');
    }
  };

  const resumeInterview = async (): Promise<void> => {
    try {
      await fetch(`/api/interview/${sessionId}/resume`, { method: 'POST' });
      setSessionStatus('in_progress');
      toast.success('Interview resumed');
    } catch {
      toast.error('Failed to resume interview');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-[#3D3229] dark:text-white">{challenge.title}</h2>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              challenge.difficulty <= 3 && 'bg-green-500/20 text-green-400',
              challenge.difficulty > 3 && challenge.difficulty <= 6 && 'bg-yellow-500/20 text-yellow-400',
              challenge.difficulty > 6 && 'bg-red-500/20 text-red-400'
            )}
          >
            {challenge.difficulty <= 3 ? 'Easy' : challenge.difficulty <= 6 ? 'Medium' : 'Hard'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-[#3D3229]/15 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === 'code' ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-white' : 'text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white'
              )}
            >
              <Code2 className="h-4 w-4" />
              Code
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === 'split' ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-white' : 'text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white'
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('chat')}
              className={cn(
                'px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                viewMode === 'chat' ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#3D3229] dark:text-white' : 'text-[#6B5744] dark:text-slate-400 hover:text-[#3D3229] dark:hover:text-white'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 rounded-lg bg-[#FAF8F5] dark:bg-slate-800 px-3 py-1.5">
            <Clock className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
            <span className="text-sm font-mono text-[#3D3229] dark:text-white">{formatTime(elapsedTime)}</span>
          </div>

          {/* Status Badge */}
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              sessionStatus === 'in_progress' && 'bg-green-500/20 text-green-400',
              sessionStatus === 'completed' && 'bg-blue-500/20 text-blue-400',
              sessionStatus === 'paused' && 'bg-yellow-500/20 text-yellow-400'
            )}
          >
            {sessionStatus.replace('_', ' ')}
          </span>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="rounded-lg p-2 text-[#6B5744] dark:text-slate-400 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 py-1 shadow-lg z-20">
                  {sessionStatus === 'in_progress' && (
                    <>
                      <button
                        onClick={() => { void pauseInterview(); setShowActions(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#6B5744] dark:text-slate-300 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700"
                      >
                        <Pause className="h-4 w-4" />
                        Pause Interview
                      </button>
                      <button
                        onClick={() => { void endInterview(); setShowActions(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700"
                      >
                        <Square className="h-4 w-4" />
                        End Interview
                      </button>
                    </>
                  )}
                  {sessionStatus === 'paused' && (
                    <button
                      onClick={() => { void resumeInterview(); setShowActions(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#6B5744] dark:text-slate-300 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700"
                    >
                      <Play className="h-4 w-4" />
                      Resume Interview
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Panel */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={cn('flex-1 p-4 overflow-auto', viewMode === 'split' && 'lg:w-2/3')} data-lenis-prevent>
            <CodingChallengeUI
              sessionId={sessionId}
              challenge={challenge}
              initialLanguage={initialLanguage}
              onSubmit={handleCodeSubmit}
              onComplete={handleCodeComplete}
              disabled={sessionStatus !== 'in_progress'}
            />
          </div>
        )}

        {/* Chat Panel */}
        {(viewMode === 'chat' || viewMode === 'split') && (
          <div
            className={cn(
              'flex flex-col border-l border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50',
              viewMode === 'split' ? 'lg:w-1/3' : 'flex-1'
            )}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" data-lenis-prevent>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'candidate' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm',
                      message.role === 'interviewer'
                        ? 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#6B5744] dark:text-slate-300'
                        : 'bg-orange-500 text-[#3D3229] dark:text-white'
                    )}
                  >
                    {message.role === 'interviewer' ? interviewer.name[0] : 'Y'}
                  </div>

                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      message.role === 'interviewer'
                        ? 'bg-[#FAF8F5] dark:bg-slate-800 text-[#3D3229] dark:text-slate-100 rounded-tl-sm'
                        : 'bg-orange-500 text-[#3D3229] dark:text-white rounded-tr-sm'
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-sm text-[#6B5744] dark:text-slate-300">
                    {interviewer.name[0]}
                  </div>
                  <div className="bg-[#FAF8F5] dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {sessionStatus === 'in_progress' && (
              <div className="p-3 border-t border-[#3D3229]/10 dark:border-slate-800">
                <div className="flex gap-2">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or discuss your approach..."
                    disabled={isLoading}
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-3 py-2 text-sm text-[#3D3229] dark:text-slate-100 placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    className="self-end rounded-lg bg-orange-500 px-3 py-2 text-[#3D3229] dark:text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
