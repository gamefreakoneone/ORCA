import { GRID_SIZE, ZONE_SIZE } from "../simulation/worldModel";

export default function OceanFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[GRID_SIZE * ZONE_SIZE + ZONE_SIZE * 4, GRID_SIZE * ZONE_SIZE + ZONE_SIZE * 4]} />
        <meshStandardMaterial color="#123943" roughness={0.95} metalness={0.08} />
      </mesh>
      <gridHelper
        args={[GRID_SIZE * ZONE_SIZE, GRID_SIZE, "#4cb4b5", "#1f4b56"]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}
