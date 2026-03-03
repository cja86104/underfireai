'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevelRef } from '@/lib/hud/audio-context';
interface HaloRingsProps { moodScore: number; }
type RingDef = [number, number, number, number, number];
const RINGS: RingDef[] = [
  [1.45, 0.008, Math.PI / 2.4, 0, 1.0],
  [1.65, 0.006, Math.PI / 3.5, Math.PI / 6, 0.7],
  [1.85, 0.005, Math.PI / 5, Math.PI / 3, 0.45],
];
export function HaloRings({ moodScore }: HaloRingsProps): React.JSX.Element {
  const audioRef = useAudioLevelRef();
  const r0 = useRef<THREE.Mesh>(null!); const r1 = useRef<THREE.Mesh>(null!); const r2 = useRef<THREE.Mesh>(null!);
  const m0 = useRef<THREE.MeshBasicMaterial>(null!); const m1 = useRef<THREE.MeshBasicMaterial>(null!); const m2 = useRef<THREE.MeshBasicMaterial>(null!);
  const meshRefs = [r0, r1, r2]; const matRefs = [m0, m1, m2];
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rms = audioRef.current.rms;
    const mood = (moodScore + 1) / 2;
    RINGS.forEach(([, , , , speed], i) => {
      const mesh = meshRefs[i].current; const mat = matRefs[i].current;
      if (!mesh || !mat) return;
      mesh.rotation.z = t * speed * (1 + mood * 0.4);
      mesh.rotation.x += Math.sin(t * 0.3 + i) * 0.0008;
      mesh.scale.setScalar(1.0 + rms * (0.12 - i * 0.025));
      mat.opacity = Math.min(0.9, 0.35 + rms * 0.4 + mood * 0.15);
      mat.color.setRGB(0.1 + mood * 0.87, 0.45 - mood * 0.01, 1.0 - mood * 0.8);
    });
  });
  return (
    <group>
      {RINGS.map(([radius, tube, rx, ry], i) => (
        <mesh key={i} ref={meshRefs[i]} rotation={[rx, ry, 0]}>
          <torusGeometry args={[radius, tube, 8, 96]} />
          <meshBasicMaterial ref={matRefs[i]} color="#1a6fff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
