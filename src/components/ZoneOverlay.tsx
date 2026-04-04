import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Zone, ZONE_SIZE, totalMinerals } from "../simulation/worldModel";

const STATUS_COLORS: Record<string, string> = {
  unknown: "#334455",
  mine: "#22aa44",
  avoid: "#cc2222",
  depleted: "#444444",
  surveyed: "#2266aa"
};

export default function ZoneOverlay({
  zone,
  interactive,
  onClick
}: {
  zone: Zone;
  interactive: boolean;
  onClick: (zoneId: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const t = clock.getElapsedTime();

    // Fog-of-war for unsurveyed zones
    if (!zone.surveyed && zone.status === "unknown") {
      mat.opacity = 0.35 + Math.sin(t * 0.8 + zone.x * 0.3) * 0.05;
      mat.color.set("#1a2a3a");
      return;
    }

    // Surveyed pulse
    if (zone.status === "surveyed" && totalMinerals(zone) === 0 && zone.animals === 0) {
      mat.opacity = 0.12;
      mat.color.set("#2266aa");
      return;
    }

    // Fish-blocked warning pulse
    if (zone.animals > 0 && zone.animals < 6 && zone.status !== "avoid") {
      mat.opacity = 0.2 + Math.sin(t * 3) * 0.08;
      mat.color.set("#ddaa22");
      return;
    }

    const baseColor = STATUS_COLORS[zone.status] || STATUS_COLORS.unknown;
    mat.color.set(baseColor);

    if (zone.status === "mine") {
      mat.opacity = 0.25 + Math.sin(t * 2.5) * 0.08;
    } else if (zone.status === "avoid") {
      mat.opacity = 0.3 + Math.sin(t * 3.5) * 0.1;
    } else {
      mat.opacity = 0.15;
    }
  });

  const baseOpacity = zone.surveyed ? 0.15 : 0.35;
  const baseColor = !zone.surveyed ? "#1a2a3a" : (STATUS_COLORS[zone.status] || STATUS_COLORS.unknown);

  return (
    <mesh
      ref={meshRef}
      position={[zone.x, 0.02, zone.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onClick(zone.id);
      }}
    >
      <planeGeometry args={[ZONE_SIZE * 0.92, ZONE_SIZE * 0.92]} />
      <meshStandardMaterial
        color={baseColor}
        transparent
        opacity={baseOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
