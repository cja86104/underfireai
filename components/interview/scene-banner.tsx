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

interface GenerateSceneResponse {
  scene: SceneData;
  imageUrl: string;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SceneBannerProps {
  companyStyle: CompanyStyle;
  interviewType: InterviewType;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SceneBanner({
  companyStyle,
  interviewType,
}: SceneBannerProps): React.JSX.Element | null {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [scene, setScene]         = useState<SceneData | null>(null);
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchScene = useCallback(async (): Promise<void> => {
    setLoadState('loading');
    try {
      const res = await fetch('/api/interview/generate-scene', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyStyle, interviewType }),
      });

      if (!res.ok) throw new Error(`Scene API returned ${res.status}`);

      const data = await res.json() as GenerateSceneResponse;
      setScene(data.scene);
      setImageUrl(data.imageUrl ?? null);
      setLoadState('success');
    } catch (err) {
      console.error('SceneBanner: failed to load scene', err);
      setLoadState('error');
    }
  }, [companyStyle, interviewType]);

  useEffect(() => {
    void fetchScene();
  }, [fetchScene]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadState === 'idle' || loadState === 'loading') {
    return (
      <div className="border-b border-[#3D3229]/10 dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-2 animate-pulse">
          <Loader2 className="h-4 w-4 text-[#8B7355] dark:text-slate-500 animate-spin" />
          <span className="text-xs text-[#8B7355] dark:text-slate-500">Setting the scene…</span>
        </div>
      </div>
    );
  }

  // ── Error — render nothing so it doesn't block the interview ─────────────

  if (loadState === 'error' || !scene) return null;

  // ── Success ───────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'border-b border-[#3D3229]/10 dark:border-slate-800 transition-all duration-300 overflow-hidden',
        collapsed ? 'bg-[#FAF8F5]/80 dark:bg-slate-900/60' : ''
      )}
    >
      {/* ── Collapsed header (always visible) ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#3D3229]/5 dark:hover:bg-slate-800/40 transition-colors"
        aria-expanded={!collapsed}
        aria-controls="scene-content"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
          <span className="text-xs font-medium text-[#3D3229] dark:text-slate-300 truncate">
            {scene.title}
          </span>
          <span className="hidden sm:inline text-xs text-[#8B7355] dark:text-slate-500 truncate italic">
            &mdash; {scene.atmosphere}
          </span>
        </div>
        <div className="flex-shrink-0 ml-2 text-[#8B7355] dark:text-slate-500">
          {collapsed
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronUp   className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* ── Expanded content ─────────────────────────────────────────────────── */}
      {!collapsed && (
        <div id="scene-content">
          {imageUrl ? (
            /*
             * Full-width scene image with description overlaid at the bottom.
             * The chat messages area sits below this banner and scrolls over it
             * as the user engages with the interview.
             */
            <div className="relative w-full h-44 sm:h-56">
              <Image
                src={imageUrl}
                alt={scene.title}
                fill
                className="object-cover"
                unoptimized
                priority={false}
              />
              {/* Dark gradient overlay so text is readable over any image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

              {/* Scene text pinned to the bottom of the image */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
                <p className="text-xs text-white/90 leading-relaxed line-clamp-2">
                  {scene.description}
                </p>
                {scene.details.length > 0 && (
                  <ul className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {scene.details.slice(0, 4).map((detail) => (
                      <li
                        key={detail}
                        className="text-[11px] text-white/60 before:content-['·'] before:mr-1"
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            /* Text-only fallback if image URL is missing */
            <div className="px-4 pb-4">
              <SceneText scene={scene} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: text-only scene display ────────────────────────────────────

function SceneText({ scene }: { scene: SceneData }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="text-sm text-[#3D3229] dark:text-slate-300 leading-relaxed">
        {scene.description}
      </p>
      {scene.details.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {scene.details.map((detail) => (
            <li
              key={detail}
              className="text-xs text-[#8B7355] dark:text-slate-500 before:content-['·'] before:mr-1"
            >
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
