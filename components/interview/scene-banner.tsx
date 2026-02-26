'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { CompanyStyle, InterviewType } from '@/types/database';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SceneData {
  title: string;
  description: string;
  atmosphere: string;
  details: string[];
}

interface SceneImageData {
  base64: string;
  seed: number;
  format: string;
  width: number;
  height: number;
}

interface GenerateSceneResponse {
  scene: SceneData;
  image: SceneImageData | null;
  imageAvailable: boolean;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SceneBannerProps {
  companyStyle: CompanyStyle;
  interviewType: InterviewType;
  /** Whether to request an image from Segmind (always true; API decides based on key) */
  withImage?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SceneBanner({
  companyStyle,
  interviewType,
  withImage = true,
}: SceneBannerProps): React.JSX.Element | null {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [scene, setScene]         = useState<SceneData | null>(null);
  const [image, setImage]         = useState<SceneImageData | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchScene = useCallback(async (): Promise<void> => {
    setLoadState('loading');
    try {
      const res = await fetch('/api/interview/generate-scene', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          companyStyle,
          interviewType,
          generateImage: withImage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Scene API returned ${res.status}`);
      }

      const data = await res.json() as GenerateSceneResponse;
      setScene(data.scene);
      setImage(data.image);
      setLoadState('success');
    } catch (err) {
      console.error('SceneBanner: failed to load scene', err);
      setLoadState('error');
    }
  }, [companyStyle, interviewType, withImage]);

  // Fetch once on mount
  useEffect(() => {
    void fetchScene();
  }, [fetchScene]);

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loadState === 'idle' || loadState === 'loading') {
    return (
      <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-2 animate-pulse">
          <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
          <span className="text-xs text-slate-500">Setting the scene…</span>
        </div>
      </div>
    );
  }

  // ── Error — render nothing so it doesn't block the interview ─────────────────

  if (loadState === 'error' || !scene) {
    return null;
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  const imageSrc = image
    ? `data:image/${image.format};base64,${image.base64}`
    : null;

  return (
    <div
      className={cn(
        'border-b border-slate-800 transition-all duration-300 overflow-hidden',
        collapsed ? 'bg-slate-900/60' : 'bg-slate-900/80'
      )}
    >
      {/* ── Collapsed header (always visible) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
        aria-expanded={!collapsed}
        aria-controls="scene-content"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-300 truncate">
            {scene.title}
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 truncate italic">
            &mdash; {scene.atmosphere}
          </span>
        </div>
        <div className="flex-shrink-0 ml-2 text-slate-500">
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronUp   className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* ── Expanded content ──────────────────────────────────────────────── */}
      {!collapsed && (
        <div id="scene-content" className="px-4 pb-4">
          {imageSrc ? (
            /* Image + text side-by-side on wide screens */
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Image */}
              <div className="sm:w-56 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700 relative h-32 sm:h-auto">
                <Image
                  src={imageSrc}
                  alt={scene.title}
                  fill
                  className="object-cover"
                  unoptimized
                  priority={false}
                />
              </div>

              {/* Text */}
              <SceneText scene={scene} />
            </div>
          ) : (
            /* Text only when Segmind not configured */
            <SceneText scene={scene} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: pure text scene display ────────────────────────────────────

function SceneText({ scene }: { scene: SceneData }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="text-sm text-slate-300 leading-relaxed">
        {scene.description}
      </p>
      {scene.details.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {scene.details.map((detail) => (
            <li
              key={detail}
              className="text-xs text-slate-500 before:content-['·'] before:mr-1"
            >
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
