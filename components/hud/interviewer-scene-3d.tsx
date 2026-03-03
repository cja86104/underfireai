'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AvatarHead } from './avatar-head';
import { HaloRings } from './halo-rings';
import { AudioWaveRing } from './audio-wave-ring';

interface InterviewerScene3DProps {
  moodScore: number;
  isSpeaking?: boolean;
}

function SceneLights(): React.JSX.Element {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 4, 2]}  intensity={0.6} color='#3b82f6' />
      <pointLight position={[0, -4, 2]} intensity={0.3} color='#1e40af' />
      <pointLight position={[3, 0, 1]}  intensity={0.2} color='#f97316' />
    </>
  );
}
export function InterviewerScene3D({
  moodScore,
  isSpeaking = false,
}: InterviewerScene3DProps): React.JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <SceneLights />
      <Suspense fallback={null}>
        <AvatarHead moodScore={moodScore} isSpeaking={isSpeaking} />
        <HaloRings  moodScore={moodScore} />
        <AudioWaveRing />
      </Suspense>
    </Canvas>
  );
}
