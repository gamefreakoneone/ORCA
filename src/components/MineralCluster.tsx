import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Zone } from "../simulation/worldModel";

const COBALT_COLOR = new THREE.Color("#f5a623"); // Gold/amber for cobalt
const MANGANESE_COLOR = new THREE.Color("#4ecdc4"); // Teal for manganese

export default function MineralCluster({ zone }: { zone: Zone }) {
  const cobaltRef = useRef<THREE.Group>(null);
  const manganeseRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cobaltRef.current) {
      cobaltRef.current.rotation.y += delta * 0.3;
    }
    if (manganeseRef.current) {
      manganeseRef.current.rotation.y -= delta * 0.2;
    }
  });

  if (zone.cobalt === 0 && zone.manganese === 0) return null;

  const cobaltScale = Math.min(1, zone.cobalt / 6) * 0.7 + 0.3;
  const manganeseScale = Math.min(1, zone.manganese / 8) * 0.6 + 0.3;

  return (
    <group position={[zone.x, 0.15, zone.z]}>
      {/* Cobalt (high-value) — gold glowing spheres, offset left */}
      {zone.cobalt > 0 && (
        <group ref={cobaltRef} position={[-0.8, 0, -0.5]}>
          {Array.from({ length: Math.min(zone.cobalt, 5) }).map((_, i) => (
            <mesh
              key={`co-${i}`}
              position={[
                Math.cos((i / Math.min(zone.cobalt, 5)) * Math.PI * 2) * 0.9,
                0.2 + Math.sin(i * 1.7) * 0.15,
                Math.sin((i / Math.min(zone.cobalt, 5)) * Math.PI * 2) * 0.9
              ]}
              scale={cobaltScale}
            >
              <dodecahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial
                color={COBALT_COLOR}
                emissive={COBALT_COLOR}
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Manganese (low-value) — teal matte spheres, offset right */}
      {zone.manganese > 0 && (
        <group ref={manganeseRef} position={[0.8, 0, 0.5]}>
          {Array.from({ length: Math.min(zone.manganese, 5) }).map((_, i) => (
            <mesh
              key={`mn-${i}`}
              position={[
                Math.cos((i / Math.min(zone.manganese, 5)) * Math.PI * 2) * 0.8,
                0.15 + Math.sin(i * 2.1) * 0.1,
                Math.sin((i / Math.min(zone.manganese, 5)) * Math.PI * 2) * 0.8
              ]}
              scale={manganeseScale}
            >
              <sphereGeometry args={[0.28, 8, 6]} />
              <meshStandardMaterial
                color={MANGANESE_COLOR}
                metalness={0.3}
                roughness={0.7}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
