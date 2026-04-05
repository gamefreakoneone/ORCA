import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Zone } from "../simulation/worldModel";

const HIGH_YIELD_COLOR = new THREE.Color("#f5a623"); // Gold/amber for high yield
const LOW_YIELD_COLOR = new THREE.Color("#4ecdc4"); // Teal for low yield

export default function MineralCluster({ zone }: { zone: Zone }) {
  const highYieldRef = useRef<THREE.Group>(null);
  const lowYieldRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (highYieldRef.current) {
      highYieldRef.current.rotation.y += delta * 0.3;
    }
    if (lowYieldRef.current) {
      lowYieldRef.current.rotation.y -= delta * 0.2;
    }
  });

  if (zone.highYield === 0 && zone.lowYield === 0) return null;

  const highYieldScale = Math.min(1, zone.highYield / 6) * 0.7 + 0.3;
  const lowYieldScale = Math.min(1, zone.lowYield / 8) * 0.6 + 0.3;

  return (
    <group position={[zone.x, 0.15, zone.z]}>
      {/* High Yield (gold glowing dodecahedrons, offset left) */}
      {zone.highYield > 0 && (
        <group ref={highYieldRef} position={[-0.8, 0, -0.5]}>
          {Array.from({ length: Math.min(zone.highYield, 5) }).map((_, i) => (
            <mesh
              key={`hy-${i}`}
              position={[
                Math.cos((i / Math.min(zone.highYield, 5)) * Math.PI * 2) * 0.9,
                0.2 + Math.sin(i * 1.7) * 0.15,
                Math.sin((i / Math.min(zone.highYield, 5)) * Math.PI * 2) * 0.9
              ]}
              scale={highYieldScale}
            >
              <dodecahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial
                color={HIGH_YIELD_COLOR}
                emissive={HIGH_YIELD_COLOR}
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Low Yield (teal matte spheres, offset right) */}
      {zone.lowYield > 0 && (
        <group ref={lowYieldRef} position={[0.8, 0, 0.5]}>
          {Array.from({ length: Math.min(zone.lowYield, 5) }).map((_, i) => (
            <mesh
              key={`ly-${i}`}
              position={[
                Math.cos((i / Math.min(zone.lowYield, 5)) * Math.PI * 2) * 0.8,
                0.15 + Math.sin(i * 2.1) * 0.1,
                Math.sin((i / Math.min(zone.lowYield, 5)) * Math.PI * 2) * 0.8
              ]}
              scale={lowYieldScale}
            >
              <sphereGeometry args={[0.28, 8, 6]} />
              <meshStandardMaterial
                color={LOW_YIELD_COLOR}
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
