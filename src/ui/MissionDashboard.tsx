import { WorldState } from "../simulation/worldModel";

interface MissionDashboardProps {
  world: WorldState;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function MissionDashboard({ world }: MissionDashboardProps) {
  const activeRobots = world.robots.filter((robot) => robot.state !== "idle").length;

  return (
    <section className="panel-section">
      <div className="section-header">
        <span>Mission Dashboard</span>
        <span className={`section-pill ${world.apiStatus}`}>Claude {world.apiStatus}</span>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Collected</span>
          <strong>{world.collectedTotal}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avoided</span>
          <strong>{world.avoidedZones}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Subs</span>
          <strong>{activeRobots}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Elapsed</span>
          <strong>{formatElapsed(world.elapsedMs)}</strong>
        </div>
      </div>

      <div className="robot-card-list">
        {world.robots.map((robot) => {
          const loadPercent = Math.round((robot.cargo / robot.maxCargo) * 100);
          return (
            <article className="robot-card" key={robot.id}>
              <div className="robot-card-header">
                <strong>{robot.id}</strong>
                <span className={`robot-state ${robot.state}`}>{robot.state.replaceAll("_", " ")}</span>
              </div>
              <div className="robot-meta">
                <span>Target: {robot.targetZone ?? "none"}</span>
                <span>
                  Cargo: {robot.cargo}/{robot.maxCargo}
                </span>
              </div>
              <div className="cargo-bar">
                <div className="cargo-fill" style={{ width: `${loadPercent}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
