import { Line } from "@react-three/drei";

interface TargetLineProps {
  start: [number, number, number];
  end: [number, number, number];
}

export default function TargetLine({ start, end }: TargetLineProps) {
  return <Line points={[start, end]} color="#c7f3ff" lineWidth={1.4} transparent opacity={0.8} />;
}
