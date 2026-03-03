'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevelRef } from '@/lib/hud/audio-context';

const COLOR_COOL = new THREE.Color('#1a6fff');
const COLOR_WARM = new THREE.Color('#f97316');
const COLOR_MID  = new THREE.Color('#00ccff');

interface AvatarHeadProps {
  moodScore: number;
  isSpeaking?: boolean;
}

export function AvatarHead({ moodScore, isSpeaking = false }: AvatarHeadProps): React.JSX.Element {
  const audioRef    = useAudioLevelRef();
  const headRef     = useRef<THREE.Mesh>(null!);
  const coreRef     = useRef<THREE.Mesh>(null!);
  const headMatRef  = useRef<THREE.MeshStandardMaterial>(null!);
  const coreMatRef  = useRef<THREE.MeshStandardMaterial>(null!);
  const tgtColor    = useRef(new THREE.Color());
  const smoothScale = useRef(1.0);

  useFrame((state) => {
    const t     = state.clock.elapsedTime;
    const audio = audioRef.current;

    // Idle bob and slow Y rotation
    if (headRef.current) {
      headRef.current.position.y = Math.sin(t * 0.8) * 0.06;
      headRef.current.rotation.y = t * 0.18;
      headRef.current.rotation.x = Math.sin(t * 0.4) * 0.04;
    }

    // Audio-reactive scale (smooth lerp prevents jarring jumps)
    const audioBoost = audio.isActive ? audio.rms * 0.15 : 0;
    const speakBoost = isSpeaking ? Math.sin(t * 6) * 0.03 + 0.03 : 0;
    smoothScale.current = THREE.MathUtils.lerp(
      smoothScale.current, 1.0 + audioBoost + speakBoost, 0.12
    );
    if (headRef.current) headRef.current.scale.setScalar(smoothScale.current);

    // Core glow pulse
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1.0 + Math.sin(t * 2.5) * 0.08 + audio.rms * 0.3);
    }

    // Mood-driven emissive: -1=blue, 0=cyan, +1=orange-500 (#f97316)
    const n = (moodScore + 1) / 2;
    if (n < 0.5) {
      tgtColor.current.lerpColors(COLOR_COOL, COLOR_MID, n * 2);
    } else {
      tgtColor.current.lerpColors(COLOR_MID, COLOR_WARM, (n - 0.5) * 2);
    }
    const bright = 1.0 + audio.rms * 0.5;
    if (headMatRef.current) headMatRef.current.emissive.copy(tgtColor.current).multiplyScalar(bright);
    if (coreMatRef.current) coreMatRef.current.emissive.copy(tgtColor.current).multiplyScalar(bright * 1.5);
  });

  return (
    <group>
      {/* Head: geodesic wireframe — IcosahedronGeometry detail=4 = 320 faces */}
      <mesh ref={headRef}>
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial
          ref={headMatRef}
          color="#050d1f"
          emissive={COLOR_COOL}
          emissiveIntensity={0.8}
          wireframe={true}
          transparent={true}
          opacity={0.85}
        />
      </mesh>

      {/* Core: bright inner emissive sphere */}
      <mesh ref={coreRef} scale={0.28}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color="#ffffff"
          emissive={COLOR_COOL}
          emissiveIntensity={2.0}
          transparent={true}
          opacity={0.9}
        />
      </mesh>

      {/* Outer shell: faint haze layer rendered from the inside */}
      <mesh scale={1.08}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color="#0a1530"
          transparent={true}
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
