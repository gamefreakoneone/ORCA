import { Zone } from "../simulation/worldModel";

interface AnimalClusterProps {
  zone: Zone;
}

export default function AnimalCluster({ zone }: AnimalClusterProps) {
  if (zone.animals === 0) {
    return null;
  }

  const count = Math.max(1, Math.ceil(zone.animals / 3));

  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          position={[
            zone.x - 0.65 + index * 0.55,
            0.55 + index * 0.12,
            zone.z + (index % 2 === 0 ? -0.55 : 0.55)
          ]}
        >
          <octahedronGeometry args={[0.38 + zone.animals * 0.015, 0]} />
          <meshStandardMaterial color="#ff7b3d" emissive="#8b2f16" emissiveIntensity={0.45} />
        </mesh>
      ))}
    </group>
  );
}
