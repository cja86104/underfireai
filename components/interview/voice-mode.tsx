'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Square,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import type { AudioLevelData } from '@/types/hud';

// Number of frequency bars in the visualization.
// Must match the frequencies array length in AudioLevelData (types/hud.ts).
const BAR_COUNT = 20;

interface VoiceModeProps {
  sessionId: string;
  isActive: boolean;
  isLoading: boolean;
  onTranscript: (transcript: string) => void;
  /**
   * Called with the persisted DB id of an interviewer message when it should
   * be synthesised. The id-based contract (not text) lets /api/tts load the
   * message server-side, verify session ownership + interviewer role, and
   * use the stored content — closing the "arbitrary text burns TTS
   * credit" finding from the audit.
   */
  onSpeakInterviewerMessage: (messageId: string) => Promise<void>;
  /**
   * Ordered list of DB message IDs to speak sequentially.
   * Replacing the array cancels any in-progress playback run and starts fresh.
   * Panel turns push multiple IDs at once; single-interviewer pushes one.
   */
  ttsQueue: string[];
  /**
   * Optional: called every animation frame while the microphone is active.
   * Receives the current FFT snapshot (rms, peak, 20 frequency bands).
   * Used by the 3D HUD AudioLevelContext to drive avatar animations without
   * triggering React re-renders.
   *
   * Read via ref internally so callback changes never restart the audio loop.
   */
  onAudioFrame?: (data: AudioLevelData) => void;
}

type RecordingState = 'idle' | 'listening' | 'processing';
type PlaybackState = 'idle' | 'loading' | 'playing';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ── Mobile capture helpers (record-and-transcribe path) ─────────────────────
// iOS Safari's webkitSpeechRecognition never opens the real microphone, so on
// mobile we capture the answer with MediaRecorder and POST it to the
// /transcribe endpoint (OpenAI Whisper). Desktop keeps using SpeechRecognition.

/** Max single-answer recording length. Caps clip size so the upload stays well
 *  under Vercel's serverless body limit and keeps Whisper fast. */
const MAX_RECORD_MS = 60000;

/** Pick a MediaRecorder mimeType the current browser supports (iOS Safari ->
 *  audio/mp4, Chromium -> audio/webm). '' lets MediaRecorder choose its own. */
function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mpeg'];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/** Map a recorded blob's mimeType to a filename extension Whisper recognises. */
function extForMime(mime: string): string {
  const base = (mime || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a') return 'mp4';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  if (base === 'audio/ogg') return 'ogg';
  return 'webm';
}

export function VoiceMode({
  sessionId,
  isActive,
  isLoading,
  onTranscript,
  onSpeakInterviewerMessage,
  ttsQueue,
  onAudioFrame,
}: VoiceModeProps): React.JSX.Element {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // REAL frequency data: array of 20 values (0-1), each representing a frequency band
  const [frequencyBars, setFrequencyBars] = useState<number[]>(() =>
    Array<number>(BAR_COUNT).fill(0)
  );

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  // Re-entry guard: prevents the start-during-onstart race where a fast
  // double-click both pass the React state guard before onstart fires.
  // Refs update synchronously, so the second invocation bails immediately.
  const startingRef = useRef(false);
  // Stable ref for onAudioFrame: loop never restarts on parent re-render.
  const onAudioFrameRef = useRef<((data: AudioLevelData) => void) | undefined>(onAudioFrame);
  useEffect(() => { onAudioFrameRef.current = onAudioFrame; }, [onAudioFrame]);

  // Transcript refs mirror state so the recognition event handlers
  // (which close over the FIRST render's state values via the useCallback-
  // memoised builder) can read the LATEST transcript when onend fires.
  // Required for the mobile single-shot auto-submit path below.
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // Stable ref to the parent's onTranscript handler. The mobile onend
  // auto-submit path needs to invoke it from inside the recognition
  // closure without rebuilding the recognition instance on every parent
  // re-render.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // True when recognition should auto-submit on the next onend event.
  // Set by the mobile startRecording path; cleared by manual stop / cancel
  // so we never double-submit.
  const autoSubmitOnEndRef = useRef(false);

  // ── Mobile record-and-transcribe refs (iOS Safari path) ───────────────────
  // On mobile we record with MediaRecorder and upload to /transcribe. These
  // hold the in-flight recorder, captured chunks, the auto-stop timer, and a
  // cancel flag. Desktop never touches them.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimeoutRef = useRef<number | null>(null);
  const mobileCancelledRef = useRef(false);

  // Check browser support - derived constant, not state
  const isSupported = typeof window !== 'undefined' &&
    (typeof window.SpeechRecognition !== 'undefined' ||
     typeof window.webkitSpeechRecognition !== 'undefined');

  // Mobile detection. Drives three behaviours:
  //   1. continuous=false (iOS Safari + mobile Chrome are unreliable in
  //      continuous mode; single-shot is the documented contract).
  //   2. Skip getUserMedia/AudioContext setup — holding the mic stream
  //      open in a MediaStreamSource wedges the SpeechRecognition engine
  //      on iOS, causing the 'audio-capture' error the user was seeing.
  //   3. Hide the FFT bar visualiser, which has nothing to render without
  //      an analyser anyway.
  // Initialised in a useEffect so SSR/hydration doesn't see window.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(ua) || window.innerWidth < 768);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Recognition factory
  // Builds a fully-wired SpeechRecognition instance. Used on mount and again
  // on the recovery path inside ensureRecognitionStarted when the engine
  // refuses to release a wedged state.
  // ───────────────────────────────────────────────────────────────────────────
  const buildRecognition = useCallback((): SpeechRecognition => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    // Mobile browsers (iOS Safari especially) are unreliable in continuous
    // mode — they fire 'audio-capture' or 'network' errors almost
    // immediately. Single-shot mode is the documented contract on mobile;
    // we rebuild and re-arm if the user keeps talking via the onend path.
    recognition.continuous = !isMobile;
    recognition.interimResults = !isMobile;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecordingState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      interimTranscriptRef.current = interim;
      setInterimTranscript(interim);
      if (final) {
        finalTranscriptRef.current += final;
        setFinalTranscript((prev) => prev + final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is the engine telling us the user hasn't spoken yet.
      // Chrome will fire onend right after; that handler syncs React state.
      // Returning early here preserves the original "keep listening" intent.
      if (event.error === 'no-speech') {
        return;
      }

      // 'aborted' is fired when we deliberately .abort() (recovery path,
      // unmount, cancelRecording). Silent — we caused it.
      if (event.error === 'aborted') {
        return;
      }

      // For all other errors we force-stop the engine so React state and
      // engine state stay in sync. Without this, a wedged engine throws
      // InvalidStateError on the next start() call.
      try {
        recognition.abort();
      } catch {
        // Engine already idle or in a state where abort is a no-op.
      }

      // Disarm auto-submit so the error-path onend doesn't try to send
      // a half-captured transcript.
      autoSubmitOnEndRef.current = false;

      // Map the SpeechRecognition error codes to actionable messages
      // instead of the previous generic "try again" string. The audit
      // logs for the mobile mic bug show 'audio-capture' (mic contention),
      // 'network' (offline), and 'service-not-allowed' (HTTP/permissions)
      // as the real culprits — each needs a different remediation.
      let msg: string;
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          // Mobile-only remediation. On iOS Safari, webkitSpeechRecognition
          // runs on the same engine as system Dictation: when Dictation is
          // off (or Low Power Mode is on) it throws not-allowed / service-
          // not-allowed even though the browser's mic permission is granted,
          // so the old "allow mic in browser settings" copy misdiagnosed it.
          // getUserMedia priming is deliberately NOT used here: iOS speech
          // recognition does not consume that permission, and awaiting it
          // would move start() out of the user-gesture window. The desktop
          // string below is intentionally left unchanged.
          if (isMobile) {
            const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);
            msg = isIOS
              ? 'iPhone blocked voice input. Enable Dictation in Settings \u2192 General \u2192 Keyboard, turn off Low Power Mode, then reload \u2014 or just type your answer below.'
              : 'Your phone blocked voice input. Allow microphone access for this site, then reload \u2014 or just type your answer below.';
          } else {
            msg = 'Microphone access denied. Please allow microphone access in your browser settings, then reload.';
          }
          break;
        case 'audio-capture':
          msg = 'Could not access the microphone. Close any other app using it (calls, Zoom, etc.) and try again.';
          break;
        case 'network':
          msg = 'Speech recognition needs an internet connection. Please check your network and try again.';
          break;
        case 'language-not-supported':
          msg = 'Speech recognition does not support the current language on this device.';
          break;
        default:
          msg = `Speech recognition error (${event.error}). Please try again.`;
      }
      toast.error(msg);
      setRecordingState('idle');
    };

    recognition.onend = () => {
      // Mobile single-shot path: the engine auto-stopped after the
      // utterance pause. Submit whatever final transcript we captured
      // and reset. autoSubmitOnEndRef is set by the mobile startRecording
      // path and cleared by manual stop/cancel/error so we never
      // double-submit.
      if (autoSubmitOnEndRef.current) {
        autoSubmitOnEndRef.current = false;
        const transcript = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
        finalTranscriptRef.current = '';
        interimTranscriptRef.current = '';
        setFinalTranscript('');
        setInterimTranscript('');
        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      }

      // Only reset to idle if we're currently listening.
      // This prevents race conditions with manual stop and with the
      // recovery path's deliberate abort+rebuild sequence.
      setRecordingState((current) =>
        current === 'listening' ? 'idle' : current
      );
    };

    return recognition;
  }, [isMobile]);

  // ───────────────────────────────────────────────────────────────────────────
  // Defensive start: catches InvalidStateError and recovers by recreating
  // the recognition instance. Chrome can leave the same instance in a wedged
  // state where start() throws indefinitely; recreating is more reliable
  // than waiting on settle timing.
  // ───────────────────────────────────────────────────────────────────────────
  const ensureRecognitionStarted = useCallback((): void => {
    let rec = recognitionRef.current;
    if (!rec) {
      rec = buildRecognition();
      recognitionRef.current = rec;
    }

    try {
      rec.start();
      return;
    } catch (err) {
      if (!(err instanceof DOMException) || err.name !== 'InvalidStateError') {
        throw err;
      }
      // Engine wedged. Fall through to recovery.
    }

    // Force-stop the wedged instance, then recreate from scratch.
    try {
      rec.abort();
    } catch {
      // ignore — already stopped
    }
    rec = buildRecognition();
    recognitionRef.current = rec;
    rec.start();
  }, [buildRecognition]);

  // ───────────────────────────────────────────────────────────────────────────
  // Audio analyser setup using a caller-supplied MediaStream.
  // Acquiring the stream is the caller's responsibility so permission errors
  // surface in a single place before recognition starts.
  // ───────────────────────────────────────────────────────────────────────────
  const setupAnalyser = useCallback((stream: MediaStream): void => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    // FFT size determines frequency resolution.
    // 256 gives us 128 frequency bins (frequencyBinCount = fftSize / 2)
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    // Frequency data buffer - reused each frame for performance
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevels = (): void => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Map 128 frequency bins to 20 bars.
      // Each bar represents a range of frequencies.
      // Lower indices = lower frequencies, higher indices = higher frequencies.
      const binsPerBar = Math.floor(dataArray.length / BAR_COUNT);

      const newBars = Array.from({ length: BAR_COUNT }, (_, barIndex) => {
        const startBin = barIndex * binsPerBar;
        const endBin = startBin + binsPerBar;

        let sum = 0;
        for (let i = startBin; i < endBin && i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / binsPerBar;

        return average / 255;
      });

      setFrequencyBars(newBars);

      // If the 3D HUD is listening, fire the audio frame callback.
      // Compute rms and peak from the normalized bar values and dispatch
      // to the AudioLevelContext ref — zero React re-renders.
      if (onAudioFrameRef.current) {
        const rms = Math.sqrt(newBars.reduce((sum, v) => sum + v * v, 0) / newBars.length);
        const peak = Math.max(...newBars);
        onAudioFrameRef.current({
          rms: Math.min(1, rms),
          peak: Math.min(1, peak),
          frequencies: newBars,
          isActive: true,
        });
      }

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setFrequencyBars(Array<number>(BAR_COUNT).fill(0));
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Initialize speech recognition on mount.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;

    recognitionRef.current = buildRecognition();

    return () => {
      // Abandon any in-flight mobile recording so its onstop handler does not
      // upload/transcribe after unmount.
      mobileCancelledRef.current = true;
      if (recordTimeoutRef.current !== null) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isSupported, buildRecognition]);

  // Release the mobile mic stream + clear the auto-stop timer.
  const stopMobileStream = useCallback((): void => {
    if (recordTimeoutRef.current !== null) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  // MediaRecorder.onstop handler: build the recorded blob, upload it to the
  // transcribe endpoint, and feed the returned text into the normal submit
  // flow (onTranscript). Cancelled recordings short-circuit without uploading.
  const finalizeMobileRecording = useCallback(async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    const recordedMime = recorder?.mimeType ?? '';
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    stopMobileStream();

    if (mobileCancelledRef.current) {
      mobileCancelledRef.current = false;
      setRecordingState('idle');
      return;
    }

    const blob = new Blob(chunks, { type: recordedMime || 'audio/webm' });
    if (blob.size === 0) {
      setRecordingState('idle');
      toast.error('No audio was captured. Please try again or type your answer below.');
      return;
    }

    setRecordingState('processing');
    try {
      const form = new FormData();
      form.append('audio', blob, `answer.${extForMime(blob.type)}`);

      const response = await fetch(`/api/interview/${sessionId}/transcribe`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errBody?.message ?? `Transcription failed (${response.status})`);
      }

      const okBody = (await response.json().catch(() => null)) as { transcript?: string } | null;
      const transcript = (okBody?.transcript ?? '').trim();
      if (transcript) {
        onTranscriptRef.current(transcript);
      } else {
        toast.error('Could not catch that. Please try again or type your answer below.');
      }
    } catch (err) {
      console.error('[STT] transcription upload failed:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Transcription failed. You can type your answer below.',
      );
    } finally {
      setRecordingState('idle');
    }
  }, [sessionId, stopMobileStream]);

  // ───────────────────────────────────────────────────────────────────────────
  // Start recording: acquire stream first, wire analyser, then start engine.
  // The startingRef lock prevents the rapid-double-click race that produces
  // InvalidStateError before the engine's onstart event fires.
  // ───────────────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async (): Promise<void> => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      setFinalTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';

      // ─── Mobile path ─────────────────────────────────────────────
      // Record the answer with the real microphone. getUserMedia is what makes
      // iOS Safari prompt for and open the mic (webkitSpeechRecognition never
      // did); we transcribe server-side on stop (see finalizeMobileRecording).
      if (isMobile) {
        if (
          typeof MediaRecorder === 'undefined' ||
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
          toast.error('Voice recording is not supported on this browser. You can type your answer below.');
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          const isPermission =
            err instanceof DOMException &&
            (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
          toast.error(
            isPermission
              ? 'Microphone access was denied. Allow the microphone for this site, then try again, or type your answer below.'
              : 'Could not start the microphone. You can type your answer below.',
          );
          return;
        }

        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        mobileCancelledRef.current = false;

        let recorder: MediaRecorder;
        try {
          const preferred = pickRecorderMimeType();
          recorder = preferred
            ? new MediaRecorder(stream, { mimeType: preferred })
            : new MediaRecorder(stream);
        } catch (err) {
          console.error('Failed to create MediaRecorder (mobile):', err);
          stopMobileStream();
          toast.error('Voice recording is not supported on this browser. You can type your answer below.');
          return;
        }
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          void finalizeMobileRecording();
        };

        try {
          recorder.start();
        } catch (err) {
          console.error('Failed to start recording (mobile):', err);
          stopMobileStream();
          toast.error('Could not start recording. Please try again or type your answer below.');
          return;
        }
        setRecordingState('listening');

        // Safety cap: auto-stop (and submit) at MAX_RECORD_MS so a forgotten
        // recording cannot exceed the upload size limit.
        if (recordTimeoutRef.current !== null) {
          clearTimeout(recordTimeoutRef.current);
        }
        recordTimeoutRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            toast('Reached the 60-second limit - sending your answer.');
            mediaRecorderRef.current.stop();
          }
        }, MAX_RECORD_MS);
        return;
      }

      // ─── Desktop path ────────────────────────────────────────────
      // 1. Acquire mic stream first. Permission errors surface here as a
      //    single clean message before the recognition engine is touched.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Microphone access denied or unavailable:', err);
        const isPermissionError =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        toast.error(
          isPermissionError
            ? 'Microphone access denied. Please allow microphone access.'
            : 'Could not access microphone. Please check your device.'
        );
        return;
      }

      mediaStreamRef.current = stream;

      // 2. Wire the analyser to our owned stream.
      try {
        setupAnalyser(stream);
      } catch (err) {
        console.error('Failed to set up audio analyser:', err);
        stopAudioLevelMonitoring();
        toast.error('Failed to set up audio visualization');
        return;
      }

      // 3. Start the recognition engine with InvalidStateError recovery.
      try {
        ensureRecognitionStarted();
      } catch (err) {
        console.error('Failed to start recording:', err);
        toast.error('Failed to start recording. Please reload the page.');
        stopAudioLevelMonitoring();
      }
    } finally {
      startingRef.current = false;
    }
  }, [isMobile, ensureRecognitionStarted, setupAnalyser, stopAudioLevelMonitoring, finalizeMobileRecording, stopMobileStream]);

  const stopRecording = useCallback(() => {
    // Mobile: stop the MediaRecorder; its onstop handler uploads + transcribes.
    if (isMobile) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          setRecordingState('idle');
        }
      } else {
        setRecordingState('idle');
      }
      return;
    }

    if (!recognitionRef.current) return;

    // Disarm the mobile auto-submit path. We are submitting synchronously
    // below, so onend must NOT also fire a submission. (Bug guard: without
    // this, mobile single-shot would submit twice when the user tapped Done.)
    autoSubmitOnEndRef.current = false;

    try {
      recognitionRef.current.stop();
    } catch {
      // Engine may already be idle if onend raced us; safe to swallow.
    }
    stopAudioLevelMonitoring();
    setRecordingState('processing');

    // Submit the final transcript. Read from refs so we always get the
    // latest values regardless of pending state batches.
    const transcript = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
    if (transcript) {
      onTranscript(transcript);
    }

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setRecordingState('idle');
  }, [onTranscript, stopAudioLevelMonitoring, isMobile]);

  const cancelRecording = useCallback(() => {
    // Mobile: discard the recording. Mark cancelled so finalize skips upload.
    if (isMobile) {
      mobileCancelledRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          stopMobileStream();
          mobileCancelledRef.current = false;
          setRecordingState('idle');
        }
      } else {
        stopMobileStream();
        mobileCancelledRef.current = false;
        setRecordingState('idle');
      }
      return;
    }

    if (!recognitionRef.current) return;

    // User explicitly cancelled — never auto-submit on the resulting onend.
    autoSubmitOnEndRef.current = false;

    try {
      recognitionRef.current.abort();
    } catch {
      // ignore
    }
    stopAudioLevelMonitoring();
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setRecordingState('idle');
  }, [stopAudioLevelMonitoring, isMobile, stopMobileStream]);

  // runId: incremented each time a new ttsQueue arrives.
  // The draining loop checks its captured runId against the ref on every
  // iteration — if they diverge, a newer queue replaced this one and the
  // loop exits without speaking the remaining items.
  const ttsRunIdRef = useRef(0);

  // Sequential TTS queue drain.
  // Speaks each ID in order, waiting for the previous clip to finish before
  // starting the next. Replacing ttsQueue (via setTtsQueue in the parent)
  // cancels the current run via the runId guard.
  useEffect(() => {
    if (!ttsQueue.length || isMuted || !isActive) return;

    const runId = ++ttsRunIdRef.current;

    const drainQueue = async (): Promise<void> => {
      for (const messageId of ttsQueue) {
        // Bail if a newer queue has arrived or component conditions changed.
        if (runId !== ttsRunIdRef.current || isMuted || !isActive) break;

        setPlaybackState('loading');
        try {
          await onSpeakInterviewerMessage(messageId);
        } catch {
          // Individual turn failure — log handled upstream, continue to next.
        }
      }
      // Only clear state if this run wasn't superseded.
      if (runId === ttsRunIdRef.current) {
        setPlaybackState('idle');
        isSpeakingRef.current = false;
      }
    };

    isSpeakingRef.current = true;
    void drainQueue();
  }, [ttsQueue, isMuted, isActive, onSpeakInterviewerMessage]);

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Voice mode not supported</p>
            <p className="text-xs text-amber-400/70">
              Your browser doesn&apos;t support speech recognition. Try Chrome or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'rounded-full p-1.5',
              recordingState === 'listening'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
            )}
          >
            {recordingState === 'listening' ? (
              <Mic className="h-4 w-4 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-medium text-slate-300">Voice Mode</span>
          {recordingState === 'listening' && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
              Recording
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            isMuted
              ? 'bg-white/5 text-slate-500'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          )}
          aria-label={isMuted ? 'Unmute interviewer' : 'Mute interviewer'}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* REAL Audio Level Visualization - frequency bars from actual FFT data.
          Hidden on mobile because the analyser is intentionally not wired
          there (see startRecording mobile branch — avoids mic contention
          with SpeechRecognition on iOS Safari / Android Chrome). */}
      {!isMobile && recordingState === 'listening' && (
        <div className="mb-3">
          <div className="flex items-center gap-0.5 h-6">
            {frequencyBars.map((level, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-all duration-75',
                  level > 0.1 ? 'bg-amber-500' : 'bg-white/10'
                )}
                style={{
                  // Height driven by REAL frequency data
                  // Min 20%, max 100%, scaled by actual frequency bin value
                  height: `${Math.max(20, Math.min(100, level * 100))}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transcript Display */}
      {(finalTranscript || interimTranscript) && (
        <div className="mb-3 p-2 rounded-md bg-white/5 border border-white/10">
          <p className="text-xs text-slate-300">
            {finalTranscript}
            {interimTranscript && (
              <span className="text-slate-500">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {recordingState === 'idle' ? (
          <button
            type="button"
            onClick={() => { void startRecording(); }}
            disabled={isLoading || !isActive}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              'bg-amber-600 text-white hover:bg-amber-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Mic className="h-4 w-4" />
            Start Speaking
          </button>
        ) : recordingState === 'listening' ? (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <Square className="h-3.5 w-3.5" />
              Done
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-white/10 text-slate-300 hover:bg-white/15 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {/* Playback Status */}
      {playbackState !== 'idle' && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          {playbackState === 'loading' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading audio...
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5 animate-pulse text-amber-400" />
              Interviewer speaking...
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      {recordingState === 'idle' && !finalTranscript && (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Click to start speaking. Your response will be transcribed automatically.
        </p>
      )}
    </div>
  );
}
