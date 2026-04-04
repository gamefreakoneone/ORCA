interface HomeBaseProps {
  x: number;
  z: number;
}

export default function HomeBase({ x, z }: HomeBaseProps) {
  return (
    <group position={[x, 0.45, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[1.2, 1.5, 1.2, 20]} />
        <meshStandardMaterial color="#d6e1e7" metalness={0.25} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.1, 0.55, 1.1]} />
        <meshStandardMaterial color="#92aab7" />
      </mesh>
    </group>
  );
}
