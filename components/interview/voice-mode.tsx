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
import type { VoiceConfig } from '@/types/database';

// Number of frequency bars in the visualization
const BAR_COUNT = 20;

interface VoiceModeProps {
  sessionId: string;
  isActive: boolean;
  isLoading: boolean;
  voiceConfig: VoiceConfig | null;
  onTranscript: (transcript: string) => void;
  onSpeakText: (text: string) => Promise<void>;
  lastInterviewerMessage: string | null;
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

export function VoiceMode({
  sessionId,
  isActive,
  isLoading,
  voiceConfig,
  onTranscript,
  onSpeakText,
  lastInterviewerMessage,
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

  // Check browser support - derived constant, not state
  const isSupported = typeof window !== 'undefined' && 
    (typeof window.SpeechRecognition !== 'undefined' || 
     typeof window.webkitSpeechRecognition !== 'undefined');

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
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

      setInterimTranscript(interim);
      if (final) {
        setFinalTranscript((prev) => prev + final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        // Silently handle no-speech - user just hasn't spoken yet
      } else if (event.error !== 'aborted') {
        toast.error('Speech recognition error. Please try again.');
      }
      setRecordingState('idle');
    };

    recognition.onend = () => {
      // Only reset to idle if we're currently listening
      // This prevents race conditions with manual stop
      setRecordingState((current) => 
        current === 'listening' ? 'idle' : current
      );
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
    };
  }, [isSupported]);

  // REAL audio level visualization using frequency bins from Web Audio API
  const startAudioLevelMonitoring = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      // FFT size determines frequency resolution
      // 256 gives us 128 frequency bins (frequencyBinCount = fftSize / 2)
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8; // Smooth out rapid changes

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Frequency data buffer - reused each frame for performance
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevels = (): void => {
        if (!analyserRef.current) return;
        
        // Get REAL frequency data from the FFT
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Map 128 frequency bins to 20 bars
        // Each bar represents a range of frequencies
        // Lower indices = lower frequencies, higher indices = higher frequencies
        const binsPerBar = Math.floor(dataArray.length / BAR_COUNT);
        
        const newBars = Array.from({ length: BAR_COUNT }, (_, barIndex) => {
          const startBin = barIndex * binsPerBar;
          const endBin = startBin + binsPerBar;
          
          // Average the frequency bins for this bar
          let sum = 0;
          for (let i = startBin; i < endBin && i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / binsPerBar;
          
          // Normalize to 0-1 range
          return average / 255;
        });
        
        setFrequencyBars(newBars);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (err) {
      console.error('Failed to start audio monitoring:', err);
      toast.error('Could not access microphone for audio visualization');
    }
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
    setFrequencyBars(Array(BAR_COUNT).fill(0));
  }, []);

  const startRecording = useCallback(async () => {
    if (!recognitionRef.current) return;

    setFinalTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
      await startAudioLevelMonitoring();
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Failed to start recording');
    }
  }, [startAudioLevelMonitoring]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    stopAudioLevelMonitoring();
    setRecordingState('processing');

    // Submit the final transcript
    const transcript = finalTranscript + interimTranscript;
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }

    setFinalTranscript('');
    setInterimTranscript('');
    setRecordingState('idle');
  }, [finalTranscript, interimTranscript, onTranscript, stopAudioLevelMonitoring]);

  const cancelRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.abort();
    stopAudioLevelMonitoring();
    setFinalTranscript('');
    setInterimTranscript('');
    setRecordingState('idle');
  }, [stopAudioLevelMonitoring]);

  // Auto-play interviewer messages
  useEffect(() => {
    if (!lastInterviewerMessage || !voiceConfig?.tts_enabled || isMuted || !isActive) {
      return;
    }

    // Guard against duplicate calls
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;

    const speak = async (): Promise<void> => {
      setPlaybackState('loading');
      try {
        await onSpeakText(lastInterviewerMessage);
      } finally {
        setPlaybackState('idle');
        isSpeakingRef.current = false;
      }
    };

    void speak();
  }, [lastInterviewerMessage, voiceConfig?.tts_enabled, isMuted, isActive, onSpeakText]);

  // Suppress unused sessionId warning - reserved for future session-specific features
  void sessionId;

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Voice mode not supported</p>
            <p className="text-sm text-amber-600">
              Your browser doesn&apos;t support speech recognition. Try Chrome or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'rounded-full p-2',
              recordingState === 'listening'
                ? 'bg-red-100 text-red-600'
                : 'bg-fire-100 text-fire-600'
            )}
          >
            {recordingState === 'listening' ? (
              <Mic className="h-5 w-5 animate-pulse" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </div>
          <span className="font-medium text-charcoal-900">Voice Mode</span>
          {recordingState === 'listening' && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Recording
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            'rounded-lg p-2 transition-colors',
            isMuted
              ? 'bg-stone-100 text-charcoal-400'
              : 'bg-fire-100 text-fire-600 hover:bg-fire-200'
          )}
          aria-label={isMuted ? 'Unmute interviewer' : 'Mute interviewer'}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* REAL Audio Level Visualization - frequency bars from actual FFT data */}
      {recordingState === 'listening' && (
        <div className="mb-4">
          <div className="flex items-center gap-1 h-8">
            {frequencyBars.map((level, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key -- Index is appropriate for frequency bar positions
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-all duration-75',
                  level > 0.1 ? 'bg-fire-500' : 'bg-stone-200'
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
        <div className="mb-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
          <p className="text-sm text-charcoal-700">
            {finalTranscript}
            {interimTranscript && (
              <span className="text-charcoal-400">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {recordingState === 'idle' ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isLoading || !isActive}
            className={cn(
              'flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all',
              'bg-fire-500 text-white shadow-glow-fire hover:bg-fire-600',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            <Mic className="h-5 w-5" />
            Start Speaking
          </button>
        ) : recordingState === 'listening' ? (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <Square className="h-5 w-5" />
              Done
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium bg-stone-100 text-charcoal-600 hover:bg-stone-200 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
              Cancel
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-charcoal-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {/* Playback Status */}
      {playbackState !== 'idle' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-charcoal-500">
          {playbackState === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading audio...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 animate-pulse text-fire-500" />
              Interviewer speaking...
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      {recordingState === 'idle' && !finalTranscript && (
        <p className="mt-4 text-center text-xs text-charcoal-400">
          Click to start speaking. Your response will be transcribed automatically.
        </p>
      )}
    </div>
  );
}
