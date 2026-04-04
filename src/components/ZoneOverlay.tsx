import { ThreeEvent } from "@react-three/fiber";
import { Zone, ZONE_SIZE } from "../simulation/worldModel";

interface ZoneOverlayProps {
  zone: Zone;
  interactive: boolean;
  onClick: (zoneId: string) => void;
}

function getOverlayColor(zone: Zone): string {
  if (zone.status === "avoid") {
    return "#ff5a45";
  }

  if (zone.status === "mine") {
    return "#4adf83";
  }

  if (zone.status === "depleted") {
    return "#5b6776";
  }

  return "#9bb8c4";
}

function getOverlayOpacity(zone: Zone): number {
  if (zone.status === "avoid") {
    return 0.3;
  }

  if (zone.status === "mine") {
    return 0.18;
  }

  if (zone.status === "depleted") {
    return 0.16;
  }

  return 0.08;
}

export default function ZoneOverlay({ zone, interactive, onClick }: ZoneOverlayProps) {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (interactive) {
      onClick(zone.id);
    }
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[zone.x, 0.04, zone.z]}
      onClick={handleClick}
      receiveShadow
    >
      <planeGeometry args={[ZONE_SIZE * 0.92, ZONE_SIZE * 0.92]} />
      <meshStandardMaterial color={getOverlayColor(zone)} transparent opacity={getOverlayOpacity(zone)} />
    </mesh>
  );
}
