import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EditorMode, WorldState, ZONE_SIZE, getZoneById } from "../simulation/worldModel";
import OceanFloor from "./OceanFloor";
import MineralCluster from "./MineralCluster";
import AnimalCluster from "./AnimalCluster";
import ZoneOverlay from "./ZoneOverlay";
import SubmarineModel from "./SubmarineModel";
import TargetLine from "./TargetLine";
import HomeBase from "./HomeBase";

interface SceneProps {
  world: WorldState;
  editorMode: EditorMode;
  onZoneClick: (zoneId: string) => void;
}

export default function Scene({ world, editorMode, onZoneClick }: SceneProps) {
  const interactive = world.missionStatus === "editing";

  return (
    <Canvas
      shadows
      camera={{ position: [38, 46, 38], fov: 54 }}
      style={{ background: "radial-gradient(circle at top, #0f3f50, #08151f 72%)" }}
    >
      <color attach="background" args={["#071620"]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[12, 24, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-20, 10, 0]} intensity={1.2} color="#4ed2ff" />

      <OceanFloor />

      {world.zones.map((zone) => (
        <group key={zone.id}>
          <ZoneOverlay zone={zone} interactive={interactive} onClick={onZoneClick} />
          <MineralCluster zone={zone} />
          <AnimalCluster zone={zone} />
        </group>
      ))}

      <HomeBase x={world.homeBase.x} z={world.homeBase.z} />

      {world.robots.map((robot) => {
        const targetZone = getZoneById(world, robot.targetZone);
        return (
          <group key={robot.id}>
            <SubmarineModel robot={robot} />
            {targetZone ? (
              <TargetLine
                start={[robot.x, 1.4, robot.z]}
                end={[targetZone.x, 0.3 + ZONE_SIZE * 0.015, targetZone.z]}
              />
            ) : null}
          </group>
        );
      })}

      <OrbitControls
        target={[-4, 0, 0]}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={32}
        maxDistance={110}
        enablePan
      />
    </Canvas>
  );
}
