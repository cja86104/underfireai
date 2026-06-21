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
  // ID-based TTS handoff. The server looks the message up and synthesises
  // its persisted content — passing raw text would re-introduce the
  // arbitrary-text vulnerability that the /api/tts route now refuses.
  onSpeakInterviewerMessage: (messageId: string) => Promise<void>;
  ttsQueue: string[];
  hudEnabled: boolean;
}

function AudioWiredVoiceMode({
  sessionId,
  isActive,
  isLoading,
  onTranscript,
  onSpeakInterviewerMessage,
  ttsQueue,
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
      onSpeakInterviewerMessage={onSpeakInterviewerMessage}
      ttsQueue={ttsQueue}
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
  // Track the DB id of the most-recent interviewer message so the voice-mode
  // child can hand that id (not the raw text) to /api/tts. The server uses
  // it to load the persisted content and verify session/role ownership —
  // see app/api/tts/route.ts.
  // TTS queue: ordered list of DB message IDs to speak sequentially.
  // Panel turns push multiple IDs at once; single-interviewer pushes one.
  // VoiceMode drains the queue in order, waiting for each to finish.
  const [ttsQueue, setTtsQueue] = useState<string[]>([]);

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

  // Rehydrate HUD state from stored analysis data on mount (page-refresh path).
  //
  // Boot guard: this rebuild must happen exactly once per component lifetime.
  // Re-running it would push duplicate turns into the HUD store. The guard
  // is set BEFORE any work so even if React renders the effect twice in
  // StrictMode dev, only the first run does anything.
  const hudRehydratedRef = useRef(false);
  useEffect(() => {
    if (hudRehydratedRef.current) return;
    if (!hudEnabled) return;
    hudRehydratedRef.current = true;

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
  }, [hudEnabled, initialMessages, addTurn]);

  // isSpeaking: true while TTS audio is actively playing → drives avatar animation
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // pendingEnd: true when interview should end but we're waiting for TTS to finish
  const [pendingEnd, setPendingEnd] = useState(false);
  // Track if TTS has started for the final message (to avoid ending before TTS even begins)
  const ttsStartedForEndRef = useRef(false);

  // isEnding: true while the /end request is in flight. Prevents double-click
  // during the ~2s AI feedback generation, and during the 1.5s pre-redirect
  // success window. Distinct from pendingEnd (which waits for TTS) and isLoading
  // (which is for message-send).
  const [isEnding, setIsEnding] = useState(false);

  // ── Mobile TTS unlock (Section C of mobile-fixes work) ───────────────────
  // iOS Safari and mobile Chrome block audio.play() that is not initiated
  // inside a synchronous user-gesture handler. The interviewer's TTS arrives
  // via an async fetch, so by the time we try to play() the blob URL the
  // gesture context is gone and the call rejects with NotAllowedError —
  // silently, in the previous implementation. Fix:
  //   1. Render a single persistent <audio> element with playsInline that is
  //      .play()'d once during a user gesture (the explicit "Enable voice"
  //      banner or any opportunistic gesture that calls unlockAudio).
  //   2. Reuse that element for every TTS clip — iOS keeps the element
  //      unlocked for the rest of the session once it has been play()'d
  //      inside a gesture.
  //   3. Surface NotAllowedError to the user with a visible banner instead
  //      of swallowing it.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  // TEMPORARY mobile TTS diagnostic (toasts vanish too fast on a phone). Holds
  // the last interviewer-audio playback outcome so a wedged player is visible.
  const [ttsDebug, setTtsDebug] = useState<string | null>(null);

  // Mobile detection (UA + viewport). Independent of the existing showHud
  // mobile check because that one is HUD-specific and lives in its own
  // effect with debounced resize handling — the unlock banner needs a
  // separate read so we don't show the banner on desktop where Chrome's
  // page-level autoplay rules already permit playback.
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMobileDevice(
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    );
  }, []);

  // Tiny 1-frame silent WAV used to prime the persistent <audio> element.
  // Inline data URI so there is no network round-trip — must complete
  // inside the user-gesture window for iOS to grant the unlock.
  const SILENT_WAV =
    'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';

  // Prime audio playback. MUST be invoked from a synchronous click/touch
  // handler — calling this from inside a setTimeout, microtask, or after
  // an await will not satisfy iOS Safari's gesture requirement and the
  // unlock will silently fail.
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    const el = audioRef.current;
    if (!el) return false;
    if (audioUnlocked) return true;
    try {
      el.src = SILENT_WAV;
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      setAudioUnlocked(true);
      return true;
    } catch (err) {
      // Unlock attempt itself failed — likely no audio output device or a
      // policy we cannot bypass. Leave audioUnlocked false so the banner
      // stays visible; the user can try again.
      console.warn('[TTS] Audio unlock failed:', err);
      return false;
    }
  }, [audioUnlocked]);

  // ── Mobile: silent first-gesture audio unlock ───────────────────────────────
  // Replaces the removed orange enable-voice banner. Mobile browsers (iOS
  // Safari, Android Chrome) reject audio.play() unless it is initiated inside
  // a user-gesture handler, so genuinely zero-interaction autoplay is not
  // possible on those platforms. Instead of a dedicated enable button, we arm
  // a one-shot listener that unlocks the persistent <audio> element on the
  // very first pointer/touch/click/key the user makes anywhere on the page —
  // an interaction that always happens before they answer — so interviewer
  // voice is active from the start with no visible enable step. If a later TTS
  // clip re-locks (audioUnlocked flips back to false at the play() catch
  // site), this effect re-runs and re-arms the listener.
  useEffect(() => {
    if (!isMobileDevice || !voiceEnabled || audioUnlocked) return;
    if (typeof document === 'undefined') return;

    const gestureEvents: string[] = ['pointerdown', 'touchend', 'click', 'keydown'];
    const handleFirstGesture: EventListener = () => {
      gestureEvents.forEach((evt) => document.removeEventListener(evt, handleFirstGesture));
      void unlockAudio();
    };
    gestureEvents.forEach((evt) =>
      document.addEventListener(evt, handleFirstGesture, { passive: true }),
    );

    return () => {
      gestureEvents.forEach((evt) => document.removeEventListener(evt, handleFirstGesture));
    };
  }, [isMobileDevice, voiceEnabled, audioUnlocked, unlockAudio]);

  // showHud is resolved in a single effect so the mobile check and WebGL check
  // are never evaluated in separate render cycles. Two separate effects caused a
  // race where hudReady briefly became true before isMobile was set, making the
  // broken 3-column HUD flash on mobile and causing the glitchy STAR ring.
  const [showHud, setShowHud] = useState(false);
  useEffect(() => {
    const evaluate = () => {
      const mobile = window.innerWidth < 768;
      const webgl  = isHudMode ? isWebGLAvailable() : false;
      setShowHud(isHudMode && webgl && !mobile);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, [isHudMode]);
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

  // Start interview if no messages (only on initial mount).
  //
  // Guard uses `initialMessages` prop, NOT `messages` state.
  // `initialMessages` is set once at mount from the server-side DB fetch
  // and is never mutated — it reflects what the DB actually contained when
  // the page loaded. Using `messages` state here was fragile: setMessages([])
  // or any concurrent-render edge case could reset it to 0 and trigger a
  // false restart even when the session already has a conversation history.
  //
  // Boot guard pattern — replaces the previous `}, [])` + suppression:
  //   • `startInterviewRef` keeps a fresh pointer to startInterview without
  //     pulling it into the deps array. startInterview is an inline async
  //     function that captures ~10 closure values (interviewer, panel cfg,
  //     resumeContext, etc.) and is not wrapped in useCallback; including
  //     it directly would re-fire the effect on every render — fatal here,
  //     because that would POST `__START_INTERVIEW__` to the chat API
  //     repeatedly and create duplicate opening messages.
  //   • `interviewBootRef` is set BEFORE the conditional fire so subsequent
  //     `sessionStatus` flips (pause → in_progress, etc.) cannot retrigger
  //     startInterview even though sessionStatus is now a real dep. This
  //     preserves the original `}, [])` behaviour exactly: fires at most
  //     once across the component lifetime, on the first render's values.
  const startInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    startInterviewRef.current = startInterview;
  });
  const interviewBootRef = useRef(false);
  useEffect(() => {
    if (interviewBootRef.current) return;
    interviewBootRef.current = true;
    if (initialMessages.length === 0 && sessionStatus === 'in_progress') {
      void startInterviewRef.current();
    }
  }, [initialMessages, sessionStatus]);

  // Track response time. Separate from TTS queue — we still need the
  // response start time regardless of whether voice is enabled.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'interviewer' && !isLoading) {
      responseStartTimeRef.current = Date.now();
    }
  }, [messages, isLoading]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Hand the persisted message id to /api/tts. The server fetches the
  // message content, verifies that the parent session belongs to this user,
  // confirms the message role is `interviewer`, and derives the voice +
  // speed from the interviewer's stored voice_config. Voice and speed are
  // intentionally NOT sent from the client — that closed the audit's
  // "arbitrary text burns TTS credit" finding.
  //
  // Playback path selection:
  //   - MediaSource available (Chrome, Edge, Firefox, Safari macOS, iOS 17+
  //     via ManagedMediaSource): stream response.body into a SourceBuffer
  //     so the first audio bytes start playing ~500 ms–1 s after the
  //     request, instead of waiting 4-8 s for the entire mp3 to download.
  //   - Fallback (iOS Safari < 17, any browser without MediaSource('audio/
  //     mpeg') support): identical to pre-streaming behavior — buffer the
  //     full response with blob(), play from an object URL. No regression
  //     for that segment.
  //
  // Both paths resolve the returned Promise ONLY on the audio element's
  // 'ended' event. This preserves the panel-mode sequential queue
  // contract in voice-mode.tsx (drainQueue awaits this function, so
  // resolving earlier would overlap consecutive panel speakers).
  const handleSpeakInterviewerMessage = useCallback(async (messageId: string): Promise<void> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
        console.error('TTS API error:', response.status, errorData);
        throw new Error(errorMsg);
      }

      // Resolve which constructor to use, if any. iOS 17+ Safari exposes
      // ManagedMediaSource in place of MediaSource; both share the slice
      // of the API we touch (addSourceBuffer, endOfStream, isTypeSupported).
      const MediaSourceCtor: typeof MediaSource | undefined = (() => {
        if (typeof window === 'undefined') return undefined;
        if (typeof window.MediaSource !== 'undefined') return window.MediaSource;
        const w = window as Window & { ManagedMediaSource?: typeof MediaSource };
        return w.ManagedMediaSource;
      })();

      // iOS Safari's (Managed)MediaSource streaming path hangs "loading" forever
      // for a detached <audio> element, so on mobile we skip streaming and use
      // the reliable blob fallback below (the persistent, gesture-unlocked
      // audioRef). Slightly slower first-audio on mobile, but it actually plays.
      const preferBlobAudio =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (typeof window !== 'undefined' && window.innerWidth < 768));

      const canStream =
        !preferBlobAudio &&
        MediaSourceCtor !== undefined &&
        typeof MediaSourceCtor.isTypeSupported === 'function' &&
        MediaSourceCtor.isTypeSupported('audio/mpeg') &&
        response.body !== null;

      if (canStream && MediaSourceCtor !== undefined && response.body !== null) {
        // ── STREAMING PATH ──────────────────────────────────────────────
        const responseBody: ReadableStream<Uint8Array> = response.body;
        const mediaSource = new MediaSourceCtor();
        const audioUrl = URL.createObjectURL(mediaSource);
        const audio = new Audio(audioUrl);
        // Hint to ManagedMediaSource (iOS) that the element should keep
        // buffering even if briefly backgrounded. Harmless on other
        // browsers — the property is a standard HTMLMediaElement setter.
        audio.preload = 'auto';

        let urlRevoked = false;
        const revokeOnce = (): void => {
          if (urlRevoked) return;
          urlRevoked = true;
          URL.revokeObjectURL(audioUrl);
        };

        await new Promise<void>((resolve) => {
          const finish = (): void => {
            setIsSpeaking(false);
            revokeOnce();
            resolve();
          };

          // 'ended' resolves the outer Promise — the panel queue depends
          // on this firing only at true end of playback.
          audio.addEventListener('ended', finish);
          audio.addEventListener('error', () => {
            console.warn('[TTS] audio element errored during streaming playback');
            finish();
          });

          mediaSource.addEventListener('sourceopen', () => {
            let sourceBuffer: SourceBuffer;
            try {
              sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            } catch (sbErr) {
              console.error('[TTS] addSourceBuffer failed:', sbErr);
              finish();
              return;
            }

            const reader = responseBody.getReader();
            const pendingChunks: Uint8Array[] = [];
            let streamDone = false;
            let endOfStreamCalled = false;
            let playStarted = false;

            const tryEndOfStream = (): void => {
              if (endOfStreamCalled) return;
              if (!streamDone) return;
              if (pendingChunks.length > 0) return;
              if (sourceBuffer.updating) return;
              endOfStreamCalled = true;
              try {
                mediaSource.endOfStream();
              } catch (eosErr) {
                // Spec: endOfStream on a closed source throws. Playback
                // completion is governed by the 'ended' listener, so we
                // can safely log and move on.
                console.warn('[TTS] endOfStream warn:', eosErr);
              }
            };

            const pump = (): void => {
              if (sourceBuffer.updating) return;
              if (pendingChunks.length === 0) {
                tryEndOfStream();
                return;
              }
              const chunk = pendingChunks.shift();
              if (!chunk) return;
              try {
                // Uint8Array implements ArrayBufferView, which is a
                // BufferSource. The cast keeps strict-mode TS 5.7+ happy
                // where Uint8Array narrows to Uint8Array<ArrayBufferLike>
                // and doesn't auto-widen to BufferSource at call sites.
                sourceBuffer.appendBuffer(chunk as BufferSource);
              } catch (appendErr) {
                console.error('[TTS] appendBuffer failed:', appendErr);
                finish();
              }
            };

            sourceBuffer.addEventListener('updateend', () => {
              if (!playStarted) {
                playStarted = true;
                setIsSpeaking(true);
                audio.play().catch((playError: unknown) => {
                  if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
                    console.warn('[TTS] Autoplay blocked by browser — user gesture required.');
                  } else {
                    console.error('[TTS] play() error:', playError);
                  }
                  finish();
                });
              }
              pump();
            });

            // Reader loop — push chunks into the queue and let pump drain
            // them in the updateend handler. Self-invoking async IIFE so
            // we don't shadow the outer Promise's resolve.
            (async (): Promise<void> => {
              try {
                for (;;) {
                  const { value, done } = await reader.read();
                  if (done) {
                    streamDone = true;
                    pump();
                    return;
                  }
                  if (value && value.byteLength > 0) {
                    pendingChunks.push(value);
                    pump();
                  }
                }
              } catch (readErr) {
                console.error('[TTS] stream read error:', readErr);
                streamDone = true;
                try {
                  mediaSource.endOfStream('network');
                } catch {
                  // ignore — source may already be closed
                }
                finish();
              }
            })();
          });
        });
        return;
      }

      // ── FALLBACK PATH (iOS Safari < 17, any browser without
      //    MediaSource('audio/mpeg') support) ───────────────────────────
      // Byte-for-byte equivalent to the pre-streaming behavior so users
      // on this path get exactly what they had before — no regression.
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const blobKb = (audioBlob.size / 1024).toFixed(1);

      // Reuse the persistent, gesture-unlocked <audio> element rendered at
      // the bottom of this component. Fresh `new Audio()` instances per call
      // get blocked by iOS Safari outside a user-gesture context — even
      // though the parent page has been interacted with — because each new
      // element is unlocked independently. Reusing one element that was
      // previously play()'d during a gesture sidesteps that.
      const audio = audioRef.current;
      if (!audio) {
        // Element not mounted yet — extremely unlikely (rendered at top of
        // returned JSX) but a safety net so the queue keeps draining.
        console.warn('[TTS] audioRef missing — skipping clip', messageId);
        URL.revokeObjectURL(audioUrl);
        return;
      }

      // Await full playback completion — not just play() start.
      // audio.play() resolves when playback BEGINS, not when it ENDS.
      // The TTS queue drain awaits this function, so resolving on start
      // would fire the next speaker immediately over the first one.
      await new Promise<void>((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const finishPlayback = (reason: string): void => {
          if (settled) return;
          settled = true;
          if (timeoutId !== null) clearTimeout(timeoutId);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Surface the outcome on mobile so a wedged player is diagnosable.
          // Cleared on a clean 'ended'.
          setTtsDebug(
            reason === 'ended'
              ? null
              : `TTS ${reason} | ${blobKb} KB | readyState=${audio.readyState} paused=${audio.paused} t=${audio.currentTime.toFixed(1)}s dur=${Number.isFinite(audio.duration) ? audio.duration.toFixed(1) : '?'}`,
          );
          resolve();
        };
        const onEnded = (): void => finishPlayback('ended');
        const onError = (): void =>
          finishPlayback(`element error (code ${audio.error?.code ?? '?'})`);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        audio.src = audioUrl;
        setIsSpeaking(true);

        // iOS can leave the element wedged after a mic recording (audio session
        // still in record mode) or muted by the silent switch, so neither
        // 'ended' nor 'error' fires. Time out so the TTS queue never hangs and
        // the diagnostic captures the element state.
        timeoutId = setTimeout(() => {
          finishPlayback("timeout: no 'ended' in 15s (audio wedged or muted)");
        }, 15000);

        audio.play().catch((playError: unknown) => {
          if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
            console.warn('[TTS] Autoplay blocked - gesture required.');
            setAudioUnlocked(false);
            finishPlayback('autoplay blocked (NotAllowedError) - tap screen, silent switch off');
          } else {
            console.error('[TTS] play() error:', playError);
            finishPlayback(`play() error: ${playError instanceof Error ? playError.message : 'unknown'}`);
          }
        });
      });
    } catch (error) {
      console.error('TTS playback error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Voice playback failed: ${msg}`);
    }
  }, []);

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
        // Enqueue all panel opening IDs for sequential TTS playback.
        // Each ID is a persisted DB row; VoiceMode speaks them in order.
        if (voiceEnabled) {
          const ids = (data.panel_message_ids ?? []).filter(Boolean);
          if (ids.length > 0) setTtsQueue(ids);
        }
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
        // Single interviewer opening — enqueue the one message ID.
        if (voiceEnabled && data.message_id) {
          setTtsQueue([data.message_id]);
        }
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

      // ── TTS queue: enqueue this turn's speaker IDs in order ───────────
      // Panel: push all panel_message_ids so VoiceMode speaks each speaker
      // in sequence. Single: push the one interviewer_message_id.
      // Replacing the queue (not appending) cancels any stale prior run.
      if (voiceEnabled) {
        if (data.panel_turns && data.panel_turns.length > 0) {
          const ids = (data.panel_message_ids ?? []).filter(Boolean);
          if (ids.length > 0) setTtsQueue(ids);
        } else if (data.interviewer_message_id) {
          setTtsQueue([data.interviewer_message_id]);
        }
      }

      // ── HUD: dispatch turn analysis ────────────────────────────────────
      // Use user_message_id when available (persisted DB row). Fall back to the
      // temp client-side ID so the HUD still updates even if the DB write failed.
      // This decouples metric display from persistence — a silent save failure
      // previously caused all gauges to stay dark for the rest of the session.
      const hudTurnId = data.user_message_id ?? tempUserMessage.id;
      if (hudEnabled && data.analysis) {
        const previousTurns = useHudSessionStore.getState().turns;
        const previous = previousTurns.length > 0 ? previousTurns[previousTurns.length - 1] : undefined;
        const hudTurn = responseAnalysisToHudTurn(
          data.analysis,
          hudTurnId,
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
    setIsEnding(true);
    try {
      const response = await fetch(`/api/interview/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elapsed_seconds: elapsedTime }),
      });

      // 409 = "this session is already in a completed state". Happens when a
      // duplicate request races (e.g., user double-clicked, or returned to a
      // session that was ended in another tab). The session is genuinely
      // ended — surface that as success and route to results, not as error.
      if (response.status === 409) {
        setSessionStatus('completed');
        router.push(`/interview/${sessionId}/results`);
        router.refresh();
        return;
      }

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
      setIsEnding(false);
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
    // Fire-and-forget audio unlock. MUST be called before the await below —
    // once we await the fetch, iOS's user-gesture window has closed and a
    // later .play() call will be rejected. unlockAudio internally calls
    // audio.play() synchronously which counts as gesture-initiated.
    void unlockAudio();
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

  // Stable ref to the latest endInterview closure.
  //
  // endInterview is an inline async function that captures `elapsedTime` —
  // a state value updated every second by the timer effect. If we listed
  // endInterview directly in the watching effect's deps, that effect would
  // tear down and re-arm its 3-second TTS fallback timeout on every tick,
  // and the fallback would never actually fire. The function-ref pattern
  // lets the watcher call the latest version without participating in deps.
  //
  // The sync useEffect intentionally has no deps array so it runs after
  // every render — cheapest possible way to keep the ref pointing at the
  // freshest closure. (Triggers no re-renders itself; it only writes a ref.)
  const endInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    endInterviewRef.current = endInterview;
  });

  // Handle delayed interview end — wait for TTS to finish before ending.
  // Deps `[pendingEnd, isSpeaking]` are now honest: every value this effect
  // reads is either a listed state value, a ref (exempt), or a useState
  // setter (exempt — React guarantees stable identity). The previous code
  // suppressed react-hooks/exhaustive-deps; this rewrite removes the need.
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
        void endInterviewRef.current();
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
        void endInterviewRef.current();
        setPendingEnd(false);
      }
    }, 3000);
    return () => clearTimeout(waitTimeout);
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
        onSpeakInterviewerMessage={handleSpeakInterviewerMessage}
        ttsQueue={ttsQueue}
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
          maxLength={4000}
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
        <audio
          ref={audioRef}
          playsInline
          webkit-playsinline="true"
          preload="auto"
          style={{ display: 'none' }}
        />
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
      {/* Persistent <audio> element for TTS playback. Reused for every clip
          so that one user-gesture .play() (via unlockAudio) keeps it
          unlocked for the rest of the session on iOS Safari. playsInline
          + webkit-playsinline are required for iOS to honour autoplay on
          the same element. */}
      {/* webkit-playsinline is an iOS-only legacy attribute that iOS
          Safari still honours for the silent-switch / inline behaviour.
          React types accept it as-is (kebab-case passes through). */}
      <audio
        ref={audioRef}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* Mobile interviewer-voice plays from the start: audio is unlocked
          silently on the user's first gesture (see the first-gesture unlock
          effect above), so the old "Tap to enable interviewer voice" banner
          has been removed. */}

      {/* TEMPORARY mobile TTS diagnostic — remove once interviewer voice plays
          reliably on iPhone. */}
      {isMobileDevice && ttsDebug && (
        <div className="px-3 py-2 bg-amber-500/15 border-b border-amber-500/30">
          <p className="text-[11px] text-amber-200 break-words">
            <span className="font-semibold">TTS debug:</span> {ttsDebug}
          </p>
        </div>
      )}

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
              onClick={() => {
                // Opportunistic unlock — toggling voice ON is a clean gesture
                // moment to prime iOS audio. No-op if already unlocked.
                if (!voiceEnabled) {
                  void unlockAudio();
                }
                setVoiceEnabled(!voiceEnabled);
              }}
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
                        disabled={isEnding}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#3D3229]/8 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" data-lenis-prevent>
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
            'px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 border-t',
            sessionStatus === 'paused' && 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            sessionStatus === 'completed' && 'bg-green-500/10 border-green-500/30 text-green-400',
            sessionStatus === 'abandoned' && 'bg-red-500/10 border-red-500/30 text-red-400'
          )}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {sessionStatus === 'paused' && 'Interview is paused.'}
              {sessionStatus === 'completed' && 'Interview completed. Generating feedback...'}
              {sessionStatus === 'abandoned' && 'Interview was abandoned.'}
            </span>
          </div>
          {sessionStatus === 'paused' && (
            <button
              type="button"
              onClick={() => {
                // Prime audio inside the gesture before the resume fetch.
                // resumeInterview already calls unlockAudio() too, but doing
                // it here as well guarantees the audio.play() lands in the
                // same synchronous tick as the click on every browser.
                void unlockAudio();
                void resumeInterview();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] min-w-[120px] justify-center shadow-sm"
              aria-label="Resume interview"
            >
              <Play className="h-4 w-4" />
              Resume Interview
            </button>
          )}
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
            onSpeakInterviewerMessage={handleSpeakInterviewerMessage}
            ttsQueue={ttsQueue}
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
              className="flex-1 resize-none rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-3 text-[#3D3229] dark:text-slate-100 placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
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

      {isEnding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-wait"
          role="status"
          aria-live="polite"
          aria-label="Ending interview"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-10 py-8 shadow-2xl">
            <Loader2 className="h-12 w-12 animate-spin text-fire-500" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Ending interview</h2>
              <p className="mt-1 text-sm text-slate-400">Generating your feedback…</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </AudioLevelProvider>
  );
}
