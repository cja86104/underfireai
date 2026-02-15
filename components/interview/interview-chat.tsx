'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Send,
  Loader2,
  Clock,
  Pause,
  Play,
  Square,
  MoreVertical,
  AlertCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { VoiceMode } from './voice-mode';
import type {
  InterviewMessage,
  SessionStatus,
  InterviewType,
  PersonalityBase,
  InterviewerMood,
  VoiceConfig,
  CommunicationStyle,
  QuestionPatterns,
  ResponseAnalysis,
} from '@/types/database';

/** API response from chat endpoint */
interface ChatApiResponse {
  content: string;
  message_id?: string;
  user_message_id?: string;
  interviewer_message_id?: string;
  analysis?: ResponseAnalysis | null;
  should_end?: boolean;
}

interface InterviewChatProps {
  sessionId: string;
  sessionStatus: SessionStatus;
  interviewType: InterviewType;
  targetRole: string | null;
  targetCompany: string | null;
  difficulty: number;
  interviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    backstory: string | null;
    personalityBase: PersonalityBase | null;
    currentMood: InterviewerMood | null;
    voiceConfig: VoiceConfig | null;
  };
  interviewerPersonality: {
    communicationStyle: CommunicationStyle | null;
    questionPatterns: QuestionPatterns | null;
    redFlags: string[] | null;
    greenFlags: string[] | null;
    petPeeves: string[] | null;
    favoriteTopics: string[] | null;
  } | null;
  initialMessages: InterviewMessage[];
  resumeContext: string | null;
  startedAt: string;
  voiceEnabled: boolean;
}

export function InterviewChat({
  sessionId,
  sessionStatus: initialStatus,
  interviewType,
  targetRole,
  targetCompany,
  difficulty: _difficulty,
  interviewer,
  interviewerPersonality,
  initialMessages,
  resumeContext,
  startedAt,
  voiceEnabled: initialVoiceEnabled,
}: InterviewChatProps): React.JSX.Element {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseStartTimeRef = useRef<number | null>(null);

  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initialStatus);
  const [showActions, setShowActions] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled);
  const [lastInterviewerMessage, setLastInterviewerMessage] = useState<string | null>(null);

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

  // Start interview if no messages (only on initial mount)
  useEffect(() => {
    if (messages.length === 0 && sessionStatus === 'in_progress') {
      void startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track response time and last interviewer message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'interviewer' && !isLoading) {
      responseStartTimeRef.current = Date.now();
      setLastInterviewerMessage(lastMessage.content);
    }
  }, [messages, isLoading]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeakText = useCallback(async (text: string): Promise<void> => {
    try {
      const voiceId = interviewer.voiceConfig?.voice_id ?? 'katie';
      const speed = interviewer.voiceConfig?.speed ?? 1.0;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceId, speed }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      await audio.play();

      // Clean up object URL after playback
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
    } catch (error) {
      console.error('TTS playback error:', error);
    }
  }, [interviewer.voiceConfig]);

  const handleVoiceTranscript = useCallback((transcript: string): void => {
    setInputValue(transcript);
    // Auto-send after short delay to let state update
    setTimeout(() => {
      void sendMessageWithText(transcript);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startInterview = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/interview/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '__START_INTERVIEW__',
          interviewer,
          interviewerPersonality,
          interviewType,
          targetRole,
          targetCompany,
          resumeContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json() as ChatApiResponse;

      const firstMessage: InterviewMessage = {
        id: data.message_id ?? `msg-${Date.now()}`,
        session_id: sessionId,
        role: 'interviewer',
        content: data.content,
        audio_url: null,
        response_time_seconds: null,
        analysis: null,
        created_at: new Date().toISOString(),
      };
      setMessages([firstMessage]);
    } catch (error) {
      toast.error('Failed to start interview. Please try again.');
      console.error('Start interview error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageWithText = async (text: string): Promise<void> => {
    if (!text.trim() || isLoading || sessionStatus !== 'in_progress') return;

    const userMessage = text.trim();
    setInputValue('');
    setIsLoading(true);

    // Calculate response time
    const responseTime = responseStartTimeRef.current
      ? Math.floor((Date.now() - responseStartTimeRef.current) / 1000)
      : null;

    // Optimistically add user message
    const tempUserMessage: InterviewMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'candidate',
      content: userMessage,
      audio_url: null,
      response_time_seconds: responseTime,
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
          responseTime,
          interviewer,
          interviewerPersonality,
          interviewType,
          targetRole,
          targetCompany,
          resumeContext,
          messageHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json() as ChatApiResponse;

      // Update with actual message IDs and add interviewer response
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempUserMessage.id
            ? { ...msg, id: data.user_message_id ?? msg.id, analysis: data.analysis ?? null }
            : msg
        );
        return [
          ...updated,
          {
            id: data.interviewer_message_id ?? `msg-${Date.now()}`,
            session_id: sessionId,
            role: 'interviewer' as const,
            content: data.content,
            audio_url: null,
            response_time_seconds: null,
            analysis: null,
            created_at: new Date().toISOString(),
          },
        ];
      });

      // Check if interview should end
      if (data.should_end) {
        await endInterview();
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      console.error('Send message error:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      responseStartTimeRef.current = Date.now();
    }
  };

  const sendMessage = async (): Promise<void> => {
    await sendMessageWithText(inputValue);
  };

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

      // Redirect to results after a brief delay
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
      await fetch(`/api/interview/${sessionId}/pause`, {
        method: 'POST',
      });
      setSessionStatus('paused');
      toast.info('Interview paused');
    } catch (_error) {
      toast.error('Failed to pause interview');
    }
  };

  const resumeInterview = async (): Promise<void> => {
    try {
      await fetch(`/api/interview/${sessionId}/resume`, {
        method: 'POST',
      });
      setSessionStatus('in_progress');
      toast.success('Interview resumed');
    } catch (_error) {
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
    <div className="flex flex-col h-full rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
            {interviewer.avatarUrl ? (
              <Image
                src={interviewer.avatarUrl}
                alt={interviewer.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-slate-300">{interviewer.name[0]}</span>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white">{interviewer.name}</h2>
            <p className="text-xs text-slate-400 capitalize">
              {interviewType.replace('_', ' ')} Interview
              {targetRole && ` • ${targetRole}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Voice Toggle */}
          {initialVoiceEnabled && (
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                'rounded-lg p-2 transition-colors',
                voiceEnabled
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
              aria-label={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          )}

          {/* Timer */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-mono text-white">{formatTime(elapsedTime)}</span>
          </div>

          {/* Status Badge */}
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              sessionStatus === 'in_progress' && 'status-in-progress',
              sessionStatus === 'completed' && 'status-completed',
              sessionStatus === 'paused' && 'status-paused',
              sessionStatus === 'abandoned' && 'status-abandoned'
            )}
          >
            {sessionStatus.replace('_', ' ')}
          </span>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg z-20">
                  {sessionStatus === 'in_progress' && (
                    <>
                      <button
                        onClick={() => {
                          void pauseInterview();
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <Pause className="h-4 w-4" />
                        Pause Interview
                      </button>
                      <button
                        onClick={() => {
                          void endInterview();
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                      >
                        <Square className="h-4 w-4" />
                        End Interview
                      </button>
                    </>
                  )}
                  {sessionStatus === 'paused' && (
                    <button
                      onClick={() => {
                        void resumeInterview();
                        setShowActions(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'candidate' && 'flex-row-reverse'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm',
                message.role === 'interviewer'
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-orange-500 text-white'
              )}
            >
              {message.role === 'interviewer' ? interviewer.name[0] : 'You'}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3',
                message.role === 'interviewer'
                  ? 'bg-slate-800 text-slate-100 rounded-tl-sm'
                  : 'bg-orange-500 text-white rounded-tr-sm'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.response_time_seconds && message.role === 'candidate' && (
                <p className="mt-1 text-xs opacity-70">
                  Response time: {message.response_time_seconds}s
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-slate-300">
              {interviewer.name[0]}
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-slate-400">thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Paused/Completed Banner */}
      {sessionStatus !== 'in_progress' && (
        <div
          className={cn(
            'px-4 py-3 flex items-center justify-center gap-2 border-t',
            sessionStatus === 'paused' && 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            sessionStatus === 'completed' && 'bg-green-500/10 border-green-500/30 text-green-400',
            sessionStatus === 'abandoned' && 'bg-red-500/10 border-red-500/30 text-red-400'
          )}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {sessionStatus === 'paused' && 'Interview is paused. Click Resume to continue.'}
            {sessionStatus === 'completed' && 'Interview completed. Generating feedback...'}
            {sessionStatus === 'abandoned' && 'Interview was abandoned.'}
          </span>
        </div>
      )}

      {/* Voice Mode Panel */}
      {sessionStatus === 'in_progress' && voiceEnabled && (
        <div className="px-4 pt-4 border-t border-slate-800">
          <VoiceMode
            sessionId={sessionId}
            isActive={sessionStatus === 'in_progress' && !isLoading}
            isLoading={isLoading}
            voiceConfig={interviewer.voiceConfig}
            onTranscript={handleVoiceTranscript}
            onSpeakText={handleSpeakText}
            lastInterviewerMessage={lastInterviewerMessage}
          />
        </div>
      )}

      {/* Input */}
      {sessionStatus === 'in_progress' && (
        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              disabled={isLoading}
              rows={2}
              className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="self-end rounded-lg bg-orange-500 px-4 py-3 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
