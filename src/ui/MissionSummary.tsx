import { WorldState } from "../simulation/worldModel";

interface MissionSummaryProps {
  world: WorldState;
}

export default function MissionSummary({ world }: MissionSummaryProps) {
  const score = world.collectedCobalt * 3 + world.collectedManganese;
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
          <span className="summary-label">Cobalt Extracted</span>
          <span className="summary-value cobalt-value">{world.collectedCobalt}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Manganese Extracted</span>
          <span className="summary-value manganese-value">{world.collectedManganese}</span>
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
