'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevelRef } from '@/lib/hud/audio-context';

const N = 64;
const R0 = 1.28;

export function AudioWaveRing(): React.JSX.Element {
  const audioRef = useAudioLevelRef();
  const ptsRef   = useRef<THREE.Points>(null!);

  const { positions, geometry } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const geometry  = new THREE.BufferGeometry();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      positions[i*3]   = Math.cos(a) * R0;
      positions[i*3+1] = 0;
      positions[i*3+2] = Math.sin(a) * R0;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { positions, geometry };
  }, []);

  useFrame((state) => {
    if (!ptsRef.current) return;
    const t     = state.clock.elapsedTime;
    const freqs = audioRef.current.frequencies;
    const attr  = ptsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const a      = (i / N) * Math.PI * 2;
      const freq   = freqs[Math.floor((i / N) * freqs.length)] ?? 0;
      const radius = R0 + Math.sin(t * 1.2 + a * 3) * 0.04 + freq * 0.35;
      positions[i*3]   = Math.cos(a) * radius;
      positions[i*3+2] = Math.sin(a) * radius;
    }
    attr.needsUpdate = true;
    ptsRef.current.rotation.y = t * 0.12;
  });

  return (
    <points ref={ptsRef} geometry={geometry}>
      <pointsMaterial color="#00ccff" size={0.025} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}
