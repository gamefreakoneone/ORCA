import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Zone } from "../simulation/worldModel";

export default function AnimalCluster({ zone }: { zone: Zone }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle bob/sway animation
    groupRef.current.position.y = 1.2 + Math.sin(t * 1.5 + zone.x) * 0.25;
    groupRef.current.rotation.y = Math.sin(t * 0.8 + zone.z) * 0.3;
  });

  if (zone.animals === 0) return null;

  const count = Math.min(zone.animals, 6);
  const color = zone.animals >= 6 ? "#ff4444" : "#44aaff";

  return (
    <group ref={groupRef} position={[zone.x, 1.2, zone.z]}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const radius = 1.0 + (i % 2) * 0.4;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(i * 1.3) * 0.3,
              Math.sin(angle) * radius
            ]}
          >
            <coneGeometry args={[0.2, 0.6, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}
