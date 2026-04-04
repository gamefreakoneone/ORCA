import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Robot, MAX_BATTERY } from "../simulation/worldModel";

const STATE_COLORS: Record<string, string> = {
  idle: "#888888",
  patrol: "#44aaff",
  moving_to_target: "#44ff88",
  collecting: "#ffaa00",
  returning: "#ff6644",
  avoiding: "#ff4444",
  waiting: "#ffdd44",
  surveying: "#00e5ff",
  recharging: "#aa44ff"
};

const GEOLOGIST_COLOR = "#00e5ff";

function BatteryBar({ battery, maxBattery, role }: { battery: number; maxBattery: number; role: string }) {
  if (role === "geologist") return null;

  const pct = battery / maxBattery;
  const barColor = pct > 0.5 ? "#44ff88" : pct > 0.2 ? "#ffdd44" : "#ff4444";
  const barWidth = 1.6;

  return (
    <group position={[0, 3.2, 0]}>
      {/* Background bar */}
      <mesh>
        <boxGeometry args={[barWidth, 0.2, 0.1]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.6} />
      </mesh>
      {/* Fill bar */}
      <mesh position={[(pct - 1) * barWidth * 0.5, 0, 0.01]}>
        <boxGeometry args={[barWidth * pct, 0.18, 0.1]} />
        <meshBasicMaterial color={barColor} />
      </mesh>
    </group>
  );
}

export default function SubmarineModel({ robot }: { robot: Robot }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Hover bob
    groupRef.current.position.y = 1.5 + Math.sin(t * 2 + robot.x * 0.5) * 0.15;
  });

  const isGeologist = robot.role === "geologist";
  const baseColor = isGeologist ? GEOLOGIST_COLOR : (STATE_COLORS[robot.state] || "#888888");

  // Low battery visual — shift to orange/red
  let displayColor = baseColor;
  if (!isGeologist && robot.battery < MAX_BATTERY * 0.2 && robot.battery > 0) {
    displayColor = "#ff6644";
  } else if (!isGeologist && robot.battery <= 0) {
    displayColor = "#ff2222";
  }

  return (
    <group ref={groupRef} position={[robot.x, 1.5, robot.z]}>
      {/* Main body */}
      <mesh castShadow>
        <capsuleGeometry args={[isGeologist ? 0.45 : 0.55, isGeologist ? 1.8 : 1.5, 4, 12]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isGeologist ? 0.5 : 0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Conning tower / sensor dome */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[isGeologist ? 0.35 : 0.3, 8, 6]} />
        <meshStandardMaterial
          color={isGeologist ? "#66ffff" : "#aaddff"}
          emissive={isGeologist ? "#00aacc" : "#446688"}
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Role indicator light */}
      <pointLight
        position={[0, 0.8, 0]}
        intensity={isGeologist ? 2.0 : 0.8}
        color={isGeologist ? "#00e5ff" : displayColor}
        distance={4}
      />

      {/* Battery bar (workers only) */}
      <BatteryBar battery={robot.battery} maxBattery={robot.maxBattery} role={robot.role} />
    </group>
  );
}
