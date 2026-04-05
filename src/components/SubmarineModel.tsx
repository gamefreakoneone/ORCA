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

function BatteryBar({ battery, maxBattery, role }: { battery: number; maxBattery: number; role: string }) {
  if (role === "geologist") return null;

  const pct = battery / maxBattery;
  const barColor = pct > 0.5 ? "#44ff88" : pct > 0.2 ? "#ffdd44" : "#ff4444";
  const barWidth = 1.6;

  return (
    <group position={[0, 3.5, 0]}>
      <mesh>
        <boxGeometry args={[barWidth, 0.2, 0.1]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.6} />
      </mesh>
      <mesh position={[(pct - 1) * barWidth * 0.5, 0, 0.01]}>
        <boxGeometry args={[barWidth * pct, 0.18, 0.1]} />
        <meshBasicMaterial color={barColor} />
      </mesh>
    </group>
  );
}

/* ─── Geologist: Classic submarine shape ─── */
function GeologistModel({ robot }: { robot: Robot }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = 1.6 + Math.sin(t * 1.8 + robot.x * 0.5) * 0.18;
    // Slight roll when moving
    groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.05;
  });

  return (
    <group ref={groupRef} position={[robot.x, 1.6, robot.z]}>
      {/* Main hull — elongated capsule */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.5, 2.2, 6, 16]} />
        <meshStandardMaterial
          color="#00b8cc"
          emissive="#007a8a"
          emissiveIntensity={0.5}
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Conning tower */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
        <meshStandardMaterial
          color="#00d4e8"
          emissive="#00aacc"
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Periscope / sensor mast */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#66ffff" emissive="#33cccc" emissiveIntensity={0.6} />
      </mesh>

      {/* Sensor dome at top */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial
          color="#66ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Bow sonar dome (front) */}
      <mesh position={[1.4, 0, 0]} castShadow>
        <sphereGeometry args={[0.35, 10, 8]} />
        <meshStandardMaterial
          color="#00c8dd"
          emissive="#008899"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Propeller housing (rear) */}
      <mesh position={[-1.5, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.3, 0.4, 6]} />
        <meshStandardMaterial color="#005566" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Dive planes (fins) */}
      {[-1, 1].map((side) => (
        <mesh key={`fin-${side}`} position={[0.3, 0, side * 0.65]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.35]} />
          <meshStandardMaterial color="#009aaa" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Tail fin (vertical) */}
      <mesh position={[-1.3, 0, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.06]} />
        <meshStandardMaterial color="#009aaa" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Glow light */}
      <pointLight
        position={[1.2, 0, 0]}
        intensity={2.5}
        color="#00e5ff"
        distance={6}
      />
    </group>
  );
}

/* ─── Worker: Cube body with 4 tentacle grabbers ─── */
function WorkerModel({ robot }: { robot: Robot }) {
  const groupRef = useRef<THREE.Group>(null);
  const tentacleRefs = useRef<THREE.Group[]>([]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Hover bob
    groupRef.current.position.y = 1.5 + Math.sin(t * 2.2 + robot.x * 0.4) * 0.12;

    // Tentacle animation — sway differently when collecting vs idle
    const isCollecting = robot.state === "collecting";
    tentacleRefs.current.forEach((tentacle, i) => {
      if (!tentacle) return;
      const phase = (i / 4) * Math.PI * 2;
      const swaySpeed = isCollecting ? 4.5 : 1.5;
      const swayAmount = isCollecting ? 0.2 : 0.08;
      tentacle.rotation.x = Math.sin(t * swaySpeed + phase) * swayAmount;
      tentacle.rotation.z = Math.cos(t * swaySpeed + phase + 0.5) * swayAmount * 0.6;
    });
  });

  const baseColor = STATE_COLORS[robot.state] || "#888888";

  // Low battery visual shift
  let displayColor = baseColor;
  if (robot.battery < MAX_BATTERY * 0.2 && robot.battery > 0) {
    displayColor = "#ff6644";
  } else if (robot.battery <= 0) {
    displayColor = "#ff2222";
  }

  // Tentacle positions — 4 corners of the cube bottom
  const tentaclePositions = [
    [-0.35, -0.45, -0.35],
    [0.35, -0.45, -0.35],
    [-0.35, -0.45, 0.35],
    [0.35, -0.45, 0.35]
  ] as const;

  return (
    <group ref={groupRef} position={[robot.x, 1.5, robot.z]}>
      {/* Main cube body */}
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.9, 1.1]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Top sensor panel */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial
          color="#aaddff"
          emissive="#446688"
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Indicator light on top */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Panel lines / details on sides */}
      {[
        [0, 0, 0.56] as const,
        [0, 0, -0.56] as const,
        [0.56, 0, 0] as const,
        [-0.56, 0, 0] as const
      ].map(([px, py, pz], i) => (
        <mesh key={`panel-${i}`} position={[px, py, pz]}>
          <boxGeometry args={[pz !== 0 ? 0.7 : 0.04, 0.5, pz !== 0 ? 0.04 : 0.7]} />
          <meshStandardMaterial
            color="#224455"
            emissive="#112233"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* 4 Tentacle grabber arms */}
      {tentaclePositions.map(([tx, ty, tz], i) => (
        <group
          key={`tentacle-${i}`}
          position={[tx, ty, tz]}
          ref={(el) => {
            if (el) tentacleRefs.current[i] = el;
          }}
        >
          {/* Upper arm segment */}
          <mesh position={[0, -0.35, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.7, 6]} />
            <meshStandardMaterial
              color="#667788"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>

          {/* Joint */}
          <mesh position={[0, -0.7, 0]}>
            <sphereGeometry args={[0.08, 6, 4]} />
            <meshStandardMaterial
              color={displayColor}
              emissive={displayColor}
              emissiveIntensity={0.4}
            />
          </mesh>

          {/* Lower arm / claw */}
          <mesh position={[0, -1.0, 0]}>
            <cylinderGeometry args={[0.05, 0.03, 0.5, 6]} />
            <meshStandardMaterial
              color="#556677"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>

          {/* Grabber claw tips (two prongs) */}
          {[-0.06, 0.06].map((offset, j) => (
            <mesh key={`claw-${j}`} position={[offset, -1.3, 0]} rotation={[0, 0, offset > 0 ? -0.3 : 0.3]}>
              <boxGeometry args={[0.03, 0.18, 0.05]} />
              <meshStandardMaterial
                color={displayColor}
                emissive={displayColor}
                emissiveIntensity={0.5}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Glow light */}
      <pointLight
        position={[0, -0.5, 0]}
        intensity={0.8}
        color={displayColor}
        distance={4}
      />

      {/* Battery bar */}
      <BatteryBar battery={robot.battery} maxBattery={robot.maxBattery} role={robot.role} />
    </group>
  );
}

export default function SubmarineModel({ robot }: { robot: Robot }) {
  if (robot.role === "geologist") {
    return <GeologistModel robot={robot} />;
  }
  return <WorkerModel robot={robot} />;
}
