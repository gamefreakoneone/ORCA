import { WorldState } from "../simulation/worldModel";

interface MissionSummaryProps {
  world: WorldState;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function MissionSummary({ world }: MissionSummaryProps) {
  return (
    <section className="panel-section">
      <div className="section-header">
        <span>Mission Summary</span>
        <span className="section-pill">{world.missionStatus}</span>
      </div>
      <div className="summary-grid">
        <div className="summary-metric">
          <span>Total Collected</span>
          <strong>{world.collectedTotal}</strong>
        </div>
        <div className="summary-metric">
          <span>Animal Zones Avoided</span>
          <strong>{world.avoidedZones}</strong>
        </div>
        <div className="summary-metric">
          <span>Collisions Prevented</span>
          <strong>{world.collisionsPrevented}</strong>
        </div>
        <div className="summary-metric">
          <span>Time Elapsed</span>
          <strong>{formatElapsed(world.elapsedMs)}</strong>
        </div>
      </div>
    </section>
  );
}
