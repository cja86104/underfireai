'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import type { PanelTurnInterviewerUtterance, PanelState } from '@/types/panel';
import { AudioLevelProvider, useAudioLevelWriter } from '@/lib/hud/audio-context';
import { useHudSessionStore } from '@/lib/hud/session-store';
import { is3DHudEnabled } from '@/lib/hud/feature-flags';
import { isWebGLAvailable } from '@/lib/hud/webgl';
import { responseAnalysisToHudTurn } from '@/types/hud';
import type { AudioLevelData, HudTurnAnalysis } from '@/types/hud';
import { InterviewHUD } from '@/components/hud/interview-hud';

/** Panel member info for UI */
interface PanelMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
  roleLabel?: string | null;
  isLead: boolean;
}

/** API response from chat endpoint */
interface ChatApiResponse {
  content?: string;
  message_id?: string;
  user_message_id?: string;
  interviewer_message_id?: string;
  analysis?: ResponseAnalysis | null;
  should_end?: boolean;
  // Panel mode fields
  panel_turns?: PanelTurnInterviewerUtterance[];
  panel_state?: PanelState;
  panel_message_ids?: string[];
}

/** Panel colors for different speakers */
const PANEL_COLORS = [
  { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-500' },
  { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-500' },
  { bg: 'bg-teal-600', text: 'text-teal-100', border: 'border-teal-500' },
  { bg: 'bg-amber-600', text: 'text-amber-100', border: 'border-amber-500' },
];

interface InterviewChatProps {
  sessionId: string;
  sessionStatus: SessionStatus;
  interviewType: InterviewType;
  targetRole: string | null;
  targetCompany: string | null;
  companyStyle: string | null;
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
  // Panel mode props
  panelMembers?: PanelMember[];
  // Session length limit
  maxUserMessages?: number;
  /** When true, renders 3D HUD layout instead of 2D chat. Set via is3DHudEnabled(). */
  isHudMode?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioWiredVoiceMode
// Inner component that must live inside <AudioLevelProvider> to call the hook.
// ─────────────────────────────────────────────────────────────────────────────
interface AudioWiredVoiceModeProps {
  sessionId: string;
  isActive: boolean;
  isLoading: boolean;
  onTranscript: (text: string) => void;
  onSpeakText: (text: string) => Promise<void>;
  lastInterviewerMessage: string | null;
  hudEnabled: boolean;
}

function AudioWiredVoiceMode({
  sessionId,
  isActive,
  isLoading,
  onTranscript,
  onSpeakText,
  lastInterviewerMessage,
  hudEnabled,
}: AudioWiredVoiceModeProps): React.JSX.Element {
  const { updateAudioLevel, resetAudioLevel } = useAudioLevelWriter();

  const handleAudioFrame = hudEnabled
    ? (data: AudioLevelData) => { updateAudioLevel(data); }
    : undefined;

  // Reset audio level when voice mode deactivates
  useEffect(() => {
    if (!isActive) resetAudioLevel();
  }, [isActive, resetAudioLevel]);

  return (
    <VoiceMode
      sessionId={sessionId}
      isActive={isActive}
      isLoading={isLoading}
      onTranscript={onTranscript}
      onSpeakText={onSpeakText}
      lastInterviewerMessage={lastInterviewerMessage}
      onAudioFrame={handleAudioFrame}
    />
  );
}

export function InterviewChat({
  sessionId,
  sessionStatus: initialStatus,
  interviewType,
  targetRole,
  targetCompany,
  companyStyle,
  interviewer,
  interviewerPersonality,
  initialMessages,
  resumeContext,
  startedAt,
  voiceEnabled: initialVoiceEnabled,
  panelMembers = [],
  maxUserMessages = 20,
  isHudMode = false,
}: InterviewChatProps): React.JSX.Element {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseStartTimeRef = useRef<number | null>(null);

  const isPanelMode = interviewType === 'panel' && panelMembers.length > 0;

  // Build panel member lookup and color assignments
  const panelMemberMap = new Map(panelMembers.map((p, idx) => [p.id, { ...p, colorIndex: idx % PANEL_COLORS.length }]));

  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initialStatus);
  const [showActions, setShowActions] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled);
  const [lastInterviewerMessage, setLastInterviewerMessage] = useState<string | null>(null);

  // Calculate user message count for session limit enforcement
  const userMessageCount = useMemo(() => {
    return messages.filter((m) => m.role === 'candidate').length;
  }, [messages]);
  // ── HUD wiring ──────────────────────────────────────────────────────────
  // addTurn is called once per answer with the analysis from the chat API.
  // Audio frame writes come from the onAudioFrame callback via AudioLevelProvider.
  const addTurn    = useHudSessionStore((s) => s.addTurn);
  const clearSession = useHudSessionStore((s) => s.clearSession);
  const hudEnabled = is3DHudEnabled() && isWebGLAvailable();

  // Clear HUD session when the component unmounts (page navigation)
  useEffect(() => { return () => { clearSession(); }; }, [clearSession]);

  // Rehydrate HUD state from stored analysis data on mount (for page refresh)
  useEffect(() => {
    if (!hudEnabled) return;
    
    // Find all candidate messages with analysis data and rebuild HUD turns
    let turnIndex = 0;
    let previousTurn: HudTurnAnalysis | undefined;
    
    for (const msg of initialMessages) {
      if (msg.role === 'candidate' && msg.analysis) {
        turnIndex++;
        const analysis = msg.analysis as ResponseAnalysis;
        const responseTime = msg.response_time_seconds ?? 30;
        
        const turn = responseAnalysisToHudTurn(
          analysis,
          msg.id,
          turnIndex,
          responseTime,
          previousTurn
        );
        
        addTurn(turn);
        previousTurn = turn;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // isSpeaking: true while TTS audio is actively playing → drives avatar animation
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // pendingEnd: true when interview should end but we're waiting for TTS to finish
  const [pendingEnd, setPendingEnd] = useState(false);
  // Track if TTS has started for the final message (to avoid ending before TTS even begins)
  const ttsStartedForEndRef = useRef(false);

  // hudReady: WebGL check deferred to client-side to avoid hydration mismatch.
  // isWebGLAvailable() reads window so it must run inside useEffect.
  const [hudReady, setHudReady] = useState(false);
  useEffect(() => {
    if (isHudMode) setHudReady(isWebGLAvailable());
  }, [isHudMode]);
  const showHud = isHudMode && hudReady;
  const messagesRemaining = maxUserMessages - userMessageCount;
  const isNearLimit = messagesRemaining <= 3 && messagesRemaining > 0;
  const isAtLimit = messagesRemaining <= 0;

  // Ref to hold the latest sendMessageWithText function (fixes stale closure)
  const sendMessageWithTextRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve());

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
      const numericSpeed = interviewer.voiceConfig?.speed ?? 1.0;
      // Map numeric speed to string for TTS API
      const speed: 'slow' | 'normal' | 'fast' =
        numericSpeed <= 0.85 ? 'slow' : numericSpeed >= 1.15 ? 'fast' : 'normal';

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceId, speed }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
        console.error('TTS API error:', response.status, errorData);
        throw new Error(errorMsg);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      setIsSpeaking(true);
      await audio.play();

      // Clean up object URL after playback and reset speaking flag
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      });
      audio.addEventListener('error', () => {
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('TTS playback error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Voice playback failed: ${msg}`);
    }
  }, [interviewer.voiceConfig]);

  const handleVoiceTranscript = useCallback((transcript: string): void => {
    setInputValue(transcript);
    // Auto-send after short delay to let state update
    // Use ref to avoid stale closure issues
    setTimeout(() => {
      void sendMessageWithTextRef.current(transcript);
    }, 100);
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
          companyStyle,
          resumeContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json() as ChatApiResponse;

      // Handle panel mode: multiple opening responses
      if (data.panel_turns && data.panel_turns.length > 0) {
        const panelMessages: InterviewMessage[] = data.panel_turns.map((turn, idx) => ({
          id: data.panel_message_ids?.[idx] ?? `panel-${Date.now()}-${idx}`,
          session_id: sessionId,
          role: 'interviewer' as const,
          content: turn.text,
          interviewer_id: turn.interviewerId,
          audio_url: null,
          response_time_seconds: null,
          analysis: null,
          created_at: new Date().toISOString(),
          _speakerName: turn.speakerName,
          _tone: turn.tone,
        } as InterviewMessage & { _speakerName?: string; _tone?: string }));
        setMessages(panelMessages);
      } else {
        const firstMessage: InterviewMessage = {
          id: data.message_id ?? `msg-${Date.now()}`,
          session_id: sessionId,
          role: 'interviewer',
          content: data.content ?? '',
          audio_url: null,
          response_time_seconds: null,
          analysis: null,
          created_at: new Date().toISOString(),
        };
        setMessages([firstMessage]);
      }
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
          companyStyle,
          resumeContext,
          messageHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json() as ChatApiResponse;

      // Update with actual message IDs and add interviewer response(s)
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempUserMessage.id
            ? { ...msg, id: data.user_message_id ?? msg.id, analysis: data.analysis ?? null }
            : msg
        );

        // Handle panel mode: multiple interviewer responses
        if (data.panel_turns && data.panel_turns.length > 0) {
          const panelMessages: InterviewMessage[] = data.panel_turns.map((turn, idx) => ({
            id: data.panel_message_ids?.[idx] ?? `panel-${Date.now()}-${idx}`,
            session_id: sessionId,
            role: 'interviewer' as const,
            content: turn.text,
            interviewer_id: turn.interviewerId,
            audio_url: null,
            response_time_seconds: null,
            analysis: null,
            created_at: new Date().toISOString(),
            // Store speaker info for rendering
            _speakerName: turn.speakerName,
            _tone: turn.tone,
          } as InterviewMessage & { _speakerName?: string; _tone?: string }));
          return [...updated, ...panelMessages];
        }

        // Single interviewer mode
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

      // ── HUD: dispatch turn analysis ────────────────────────────────────
      if (hudEnabled && data.analysis && data.user_message_id) {
        const previousTurns = useHudSessionStore.getState().turns;
        const previous = previousTurns.length > 0 ? previousTurns[previousTurns.length - 1] : undefined;
        const hudTurn = responseAnalysisToHudTurn(
          data.analysis,
          data.user_message_id,
          userMessageCount,
          responseTime ?? 0,
          previous,
        );
        addTurn(hudTurn);
      }

      // Check if interview should end
      if (data.should_end) {
        // If voice is enabled, wait for TTS to finish before ending
        if (voiceEnabled) {
          setPendingEnd(true);
        } else {
          await endInterview();
        }
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      console.error('Send message error:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      responseStartTimeRef.current = Date.now();
      // Auto-focus the input so user can type again immediately
      textareaRef.current?.focus();
    }
  };

  // Keep ref updated with latest sendMessageWithText (fixes stale closure in voice callback)
  useEffect(() => {
    sendMessageWithTextRef.current = sendMessageWithText;
  });

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
    } catch {
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
    } catch {
      toast.error('Failed to resume interview');
    }
  };

  // Handle delayed interview end - wait for TTS to finish before ending
  useEffect(() => {
    if (!pendingEnd) {
      ttsStartedForEndRef.current = false;
      return;
    }
    
    // Track when TTS starts
    if (isSpeaking) {
      ttsStartedForEndRef.current = true;
      return;
    }
    
    // Only end after TTS has started and then finished
    if (ttsStartedForEndRef.current && !isSpeaking) {
      const timeout = setTimeout(() => {
        void endInterview();
        setPendingEnd(false);
        ttsStartedForEndRef.current = false;
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    // If TTS hasn't started yet, wait a bit then check again
    // (handles case where TTS takes time to load)
    const waitTimeout = setTimeout(() => {
      // If still no TTS after 3 seconds, just end anyway
      if (pendingEnd && !ttsStartedForEndRef.current) {
        void endInterview();
        setPendingEnd(false);
      }
    }, 3000);
    return () => clearTimeout(waitTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEnd, isSpeaking]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // ── HUD render path ─────────────────────────────────────────────────────
  // Extracted message bubbles so they can be passed as a slot to InterviewHUD
  const hudMessageBubbles: React.ReactNode = (
    <>
      {messages.map((message) => {
        const extendedMsg = message as InterviewMessage & { _speakerName?: string; _tone?: string; interviewer_id?: string };
        const interviewerId = extendedMsg.interviewer_id;
        const panelMember = interviewerId ? panelMemberMap.get(interviewerId) : null;
        const colorIndex = panelMember?.colorIndex ?? 0;
        const panelColor = PANEL_COLORS[colorIndex];
        return (
          <div
            key={message.id}
            className={cn('flex gap-3', message.role === 'candidate' && 'flex-row-reverse')}
          >
            <div className={cn(
              'h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-medium',
              message.role === 'interviewer'
                ? isPanelMode && panelMember
                  ? cn(panelColor.bg, panelColor.text)
                  : 'bg-slate-700 text-slate-300'
                : 'bg-orange-500 text-white',
            )}>
              {message.role === 'interviewer' ? panelMember?.name[0] ?? interviewer.name[0] : 'Y'}
            </div>
            <div className="max-w-[85%]">
              {message.role === 'interviewer' && isPanelMode && (panelMember ?? extendedMsg._speakerName) && (
                <p className={cn('text-[10px] mb-1 font-medium', panelColor.text.replace('-100', '-400'))}>
                  {extendedMsg._speakerName ?? `${panelMember?.name ?? ''}${panelMember?.roleLabel ? ` (${panelMember.roleLabel})` : ''}`}
                </p>
              )}
              <div className={cn(
                'rounded-xl px-3 py-2 text-sm',
                message.role === 'interviewer'
                  ? isPanelMode && panelMember
                    ? cn('bg-slate-800/80 border-l-2', panelColor.border, 'text-slate-100')
                    : 'bg-slate-800 text-slate-100'
                  : 'bg-orange-500 text-white',
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.response_time_seconds && message.role === 'candidate' && (
                  <p className="mt-1 text-[10px] opacity-60">Response: {message.response_time_seconds}s</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="flex gap-3">
          <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[11px]', 'bg-slate-700 text-slate-300')}>
            {interviewer.name[0]}
          </div>
          <div className="bg-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  if (showHud) {
    const hudVoicePanel = voiceEnabled ? (
      <AudioWiredVoiceMode
        sessionId={sessionId}
        isActive={sessionStatus === 'in_progress' && !isLoading}
        isLoading={isLoading}
        onTranscript={handleVoiceTranscript}
        onSpeakText={handleSpeakText}
        lastInterviewerMessage={lastInterviewerMessage}
        hudEnabled={hudEnabled}
      />
    ) : initialVoiceEnabled ? (
      // Show activate button when voice is available but disabled
      <button
        onClick={() => setVoiceEnabled(true)}
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        <Mic className="h-4 w-4" />
        Activate Voice Mode
      </button>
    ) : null;

    const hudInputArea = (
      <div className="flex gap-2">
        {/* Voice toggle button */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={cn(
            'self-end rounded-lg px-3 py-2 transition-colors',
            voiceEnabled
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
          )}
          aria-label={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
        >
          {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAtLimit ? 'Response limit reached' : 'Type your response…'}
          disabled={isLoading || isAtLimit}
          rows={2}
          autoFocus
          className="flex-1 resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!inputValue.trim() || isLoading || isAtLimit}
          className="self-end rounded-lg bg-orange-500 px-3 py-2 text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    );

    return (
      <AudioLevelProvider>
        <InterviewHUD
          messageHistory={hudMessageBubbles}
          voicePanel={hudVoicePanel}
          inputArea={hudInputArea}
          isSpeaking={isSpeaking}
          interviewerName={interviewer.name}
          turnCount={userMessageCount}
          sessionStatus={sessionStatus}
          elapsedTime={elapsedTime}
          formatTime={formatTime}
          onEnd={endInterview}
          onPause={pauseInterview}
          onResume={resumeInterview}
        />
      </AudioLevelProvider>
    );
  }

  return (
    <AudioLevelProvider>
    <div className="flex flex-col h-full rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {isPanelMode ? (
            // Panel mode: show panel info with expandable roster
            <>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {panelMembers.slice(0, 4).map((member, idx) => (
                    <div
                      key={member.id}
                      className={cn(
                        'relative h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ring-2 ring-slate-900',
                        PANEL_COLORS[idx % PANEL_COLORS.length].bg,
                        PANEL_COLORS[idx % PANEL_COLORS.length].text
                      )}
                      title={`${member.name}${member.roleLabel ? ` (${member.roleLabel})` : ''}`}
                    >
                      {member.avatarUrl ? (
                        <Image
                          src={member.avatarUrl}
                          alt={member.name}
                          fill
                          className="object-cover rounded-full"
                          unoptimized
                        />
                      ) : (
                        <span>{member.name[0]}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D3229] dark:text-white">Panel Interview</h2>
                  <p className="text-xs text-[#6B5744] dark:text-slate-400">
                    {panelMembers.length} interviewers
                    {targetRole && ` • ${targetRole}`}
                  </p>
                </div>
              </div>
              {/* Panel member roster */}
              <div className="hidden lg:flex items-center gap-4 ml-4 pl-4 border-l border-[#3D3229]/15 dark:border-slate-700">
                {panelMembers.map((member, idx) => {
                  const color = PANEL_COLORS[idx % PANEL_COLORS.length];
                  return (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', color.bg)} />
                      <div className="text-xs">
                        <span className="text-[#6B5744] dark:text-slate-300">{member.name}</span>
                        {member.roleLabel && (
                          <span className="text-[#8B7355] dark:text-slate-500 ml-1">({member.roleLabel})</span>
                        )}
                        {member.isLead && (
                          <span className="text-amber-400 ml-1">★</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // Single interviewer mode
            <>
              <div className="relative h-10 w-10 rounded-full bg-[#3D3229]/10 dark:bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                {interviewer.avatarUrl ? (
                  <Image
                    src={interviewer.avatarUrl}
                    alt={interviewer.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-[#6B5744] dark:text-slate-300">{interviewer.name[0]}</span>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-[#3D3229] dark:text-white">{interviewer.name}</h2>
                <p className="text-xs text-[#6B5744] dark:text-slate-400 capitalize">
                  {interviewType.replace('_', ' ')} Interview
                  {targetRole && ` • ${targetRole}`}
                </p>
              </div>
            </>
          )}
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
                  : 'text-[#6B5744] dark:text-slate-400 hover:bg-[#FAF8F5] dark:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white'
              )}
              aria-label={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          )}

          {/* Timer */}
          <div className="flex items-center gap-2 rounded-lg bg-[#FAF8F5] dark:bg-slate-800 px-3 py-1.5">
            <Clock className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
            <span className="text-sm font-mono text-[#3D3229] dark:text-white">{formatTime(elapsedTime)}</span>
          </div>

          {/* Message Counter */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm',
              isAtLimit
                ? 'bg-red-500/20 text-red-400'
                : isNearLimit
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#6B5744] dark:text-slate-400'
            )}
            title={`${userMessageCount} of ${maxUserMessages} responses used`}
          >
            <span className="font-mono">{messagesRemaining}</span>
            <span className="text-xs">left</span>
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
              className="rounded-lg p-2 text-[#6B5744] dark:text-slate-400 hover:bg-[#FAF8F5] dark:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 py-1 shadow-lg z-20">
                  {sessionStatus === 'in_progress' && (
                    <>
                      <button
                        onClick={() => {
                          void pauseInterview();
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#6B5744] dark:text-slate-300 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700"
                      >
                        <Pause className="h-4 w-4" />
                        Pause Interview
                      </button>
                      <button
                        onClick={() => {
                          void endInterview();
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700"
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



      {/* Mobile Panel Roster - shows on smaller screens */}
      {isPanelMode && (
        <div className="lg:hidden px-4 py-2 border-b border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50">
          <div className="flex flex-wrap gap-3">
            {panelMembers.map((member, idx) => {
              const color = PANEL_COLORS[idx % PANEL_COLORS.length];
              return (
                <div key={member.id} className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', color.bg)} />
                  <span className="text-xs text-[#6B5744] dark:text-slate-300">{member.name}</span>
                  {member.roleLabel && (
                    <span className="text-xs text-[#8B7355] dark:text-slate-500">({member.roleLabel})</span>
                  )}
                  {member.isLead && <span className="text-xs text-amber-400">★</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => {
          // For panel mode, get speaker info
          const extendedMsg = message as InterviewMessage & { _speakerName?: string; _tone?: string; interviewer_id?: string };
          const interviewerId = extendedMsg.interviewer_id;
          const panelMember = interviewerId ? panelMemberMap.get(interviewerId) : null;
          const colorIndex = panelMember?.colorIndex ?? 0;
          const panelColor = PANEL_COLORS[colorIndex];

          return (
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
                  'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium',
                  message.role === 'interviewer'
                    ? isPanelMode && panelMember
                      ? cn(panelColor.bg, panelColor.text)
                      : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#6B5744] dark:text-slate-300'
                    : 'bg-orange-500 text-[#3D3229] dark:text-white'
                )}
              >
                {message.role === 'interviewer'
                  ? panelMember?.name[0] ?? interviewer.name[0]
                  : 'Y'}
              </div>

              {/* Message Bubble */}
              <div className="max-w-[75%]">
                {/* Speaker name for panel mode */}
                {message.role === 'interviewer' && isPanelMode && (panelMember ?? extendedMsg._speakerName) && (
                  <p className={cn('text-xs mb-1 font-medium', panelColor.text.replace('text-', 'text-').replace('-100', '-400'))}>
                    {extendedMsg._speakerName ?? `${panelMember?.name ?? ''}${panelMember?.roleLabel ? ` (${panelMember.roleLabel})` : ''}`}
                  </p>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    message.role === 'interviewer'
                      ? isPanelMode && panelMember
                        ? cn('bg-[#FAF8F5] dark:bg-slate-800/80 border-l-4', panelColor.border, 'text-[#3D3229] dark:text-slate-100 rounded-tl-sm')
                        : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#3D3229] dark:text-slate-100 rounded-tl-sm'
                      : 'bg-orange-500 text-[#3D3229] dark:text-white rounded-tr-sm'
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
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm',
              isPanelMode ? 'bg-blue-600 text-blue-100' : 'bg-[#3D3229]/10 dark:bg-slate-700 text-[#6B5744] dark:text-slate-300'
            )}>
              {isPanelMode ? '?' : interviewer.name[0]}
            </div>
            <div className="bg-[#FAF8F5] dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-[#6B5744] dark:text-slate-400">
                  {isPanelMode ? 'panel is deliberating...' : 'thinking...'}
                </span>
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
        <div className="px-4 pt-4 border-t border-[#3D3229]/10 dark:border-slate-800">
          <AudioWiredVoiceMode
            sessionId={sessionId}
            isActive={sessionStatus === 'in_progress' && !isLoading}
            isLoading={isLoading}
            onTranscript={handleVoiceTranscript}
            onSpeakText={handleSpeakText}
            lastInterviewerMessage={lastInterviewerMessage}
            hudEnabled={hudEnabled}
          />
        </div>
      )}

      {/* Input */}
      {sessionStatus === 'in_progress' && (
        <div className="p-4 border-t border-[#3D3229]/10 dark:border-slate-800">
          {/* Session limit warning */}
          {isAtLimit && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">
                You&apos;ve reached the response limit. Click the menu to end or extend the interview.
              </p>
            </div>
          )}
          {isNearLimit && !isAtLimit && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400">
                {messagesRemaining} response{messagesRemaining !== 1 ? 's' : ''} remaining in this session.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAtLimit ? 'Response limit reached' : 'Type your response...'}
              disabled={isLoading || isAtLimit}
              rows={2}
              autoFocus
              className="flex-1 resize-none rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-3 text-[#3D3229] dark:text-slate-900 dark:text-slate-100 placeholder:text-[#8B7355] dark:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!inputValue.trim() || isLoading || isAtLimit}
              className="self-end rounded-lg bg-orange-500 px-4 py-3 text-[#3D3229] dark:text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8B7355] dark:text-slate-500">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
    </AudioLevelProvider>
  );
}
