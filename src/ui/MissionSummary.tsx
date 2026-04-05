import { WorldState } from "../simulation/worldModel";

interface MissionSummaryProps {
  world: WorldState;
}

export default function MissionSummary({ world }: MissionSummaryProps) {
  const score = world.collectedHighYield * 3 + world.collectedLowYield;
  const elapsed = (world.elapsedMs / 1000).toFixed(1);

  return (
    <section className="panel-section summary-section">
      <div className="section-header">
        <span>Mission Summary</span>
        <span className={`section-pill ${world.missionStatus === "completed" ? "pill-success" : "pill-stopped"}`}>
          {world.missionStatus === "completed" ? "✔ Complete" : "■ Stopped"}
        </span>
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">High Yield Extracted</span>
          <span className="summary-value high-yield-value">{world.collectedHighYield}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Low Yield Extracted</span>
          <span className="summary-value low-yield-value">{world.collectedLowYield}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Score</span>
          <span className="summary-value score-value">{score}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Zones Avoided</span>
          <span className="summary-value">{world.avoidedZones}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Collisions Prevented</span>
          <span className="summary-value">{world.collisionsPrevented}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Elapsed Time</span>
          <span className="summary-value">{elapsed}s</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Ticks</span>
          <span className="summary-value">{world.tick}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Zones Surveyed</span>
          <span className="summary-value">{world.surveyedCount}</span>
        </div>
      </div>
    </section>
  );
}
