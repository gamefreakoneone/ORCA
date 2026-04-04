import { Zone } from "../simulation/worldModel";

interface MineralClusterProps {
  zone: Zone;
}

export default function MineralCluster({ zone }: MineralClusterProps) {
  if (zone.minerals === 0) {
    return null;
  }

  const count = Math.max(1, Math.ceil(zone.minerals / 3));
  const orbs = Array.from({ length: count }, (_, index) => {
    const offsetX = (index % 2 === 0 ? -0.55 : 0.6) + index * 0.07;
    const offsetZ = index === 1 ? 0.45 : index === 2 ? -0.45 : 0;
    return (
      <mesh key={index} position={[zone.x + offsetX, 0.45 + index * 0.08, zone.z + offsetZ]} castShadow>
        <sphereGeometry args={[0.45 + zone.minerals * 0.02, 14, 14]} />
        <meshStandardMaterial color="#f1bb4b" emissive="#8b6018" emissiveIntensity={0.35} />
      </mesh>
    );
  });

  return <group>{orbs}</group>;
}
