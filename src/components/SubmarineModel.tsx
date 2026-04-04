import { Robot } from "../simulation/worldModel";

interface SubmarineModelProps {
  robot: Robot;
}

function getRobotColor(state: Robot["state"]): string {
  if (state === "collecting") {
    return "#58df8e";
  }

  if (state === "returning") {
    return "#ffd449";
  }

  if (state === "avoiding") {
    return "#ff5d5d";
  }

  return "#52a6ff";
}

export default function SubmarineModel({ robot }: SubmarineModelProps) {
  return (
    <group position={[robot.x, 0.9, robot.z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.45, 2.1, 6, 10]} />
        <meshStandardMaterial color={getRobotColor(robot.state)} metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[1.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.42, 0.85, 18]} />
        <meshStandardMaterial color={getRobotColor(robot.state)} metalness={0.2} roughness={0.45} />
      </mesh>
      <mesh position={[-1.1, 0.15, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#d7f4ff" emissive="#7ed1ff" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}
