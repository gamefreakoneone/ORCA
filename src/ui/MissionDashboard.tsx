import { WorldState, GRID_SIZE, MAX_BATTERY } from "../simulation/worldModel";

interface MissionDashboardProps {
  world: WorldState;
}

const PHASE_LABELS: Record<string, string> = {
  scouting: "🔍 Scouting",
  planning: "🧠 Strategic Planning",
  mining: "⛏️ Mining Operations"
};

const STATE_LABELS: Record<string, string> = {
  idle: "Idle",
  patrol: "Patrolling",
  moving_to_target: "En Route",
  collecting: "Mining",
  returning: "Returning",
  avoiding: "Evading",
  waiting: "Fish Block",
  surveying: "Surveying",
  recharging: "Recharging"
};

export default function MissionDashboard({ world }: MissionDashboardProps) {
  if (world.missionStatus === "editing") return null;

  const surveyPct = Math.round((world.surveyedCount / (GRID_SIZE * GRID_SIZE)) * 100);

  return (
    <section className="panel-section">
      <div className="section-header">
        <span>Mission Dashboard</span>
        <span className="section-pill phase-pill">{PHASE_LABELS[world.missionPhase] || world.missionPhase}</span>
      </div>

      {/* Phase-specific status */}
      {world.missionPhase === "scouting" && (
        <div className="phase-progress">
          <div className="progress-bar">
            <div className="progress-fill survey-fill" style={{ width: `${surveyPct}%` }} />
          </div>
          <span className="progress-label">Survey: {surveyPct}% ({world.surveyedCount}/{GRID_SIZE * GRID_SIZE} zones)</span>
        </div>
      )}

      {world.missionPhase === "planning" && (
        <div className="planning-indicator">
          <div className="spinner" />
          <span>Claude is analyzing survey data...</span>
        </div>
      )}

      {/* Mission totals */}
      <div className="mission-totals">
        <div className="total-item high-yield-total">
          <span className="total-label">High Yield</span>
          <span className="total-value">{world.collectedHighYield}</span>
        </div>
        <div className="total-item low-yield-total">
          <span className="total-label">Low Yield</span>
          <span className="total-value">{world.collectedLowYield}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Score</span>
          <span className="total-value">{world.collectedHighYield * 3 + world.collectedLowYield}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Avoided</span>
          <span className="total-value">{world.avoidedZones}</span>
        </div>
      </div>

      {/* Robot cards */}
      <div className="robot-cards">
        {world.robots.map((robot) => {
          const batteryPct = Math.round((robot.battery / MAX_BATTERY) * 100);
          const batteryClass = batteryPct > 50 ? "battery-high" : batteryPct > 20 ? "battery-mid" : "battery-low";
          const isGeologist = robot.role === "geologist";

          return (
            <div key={robot.id} className={`robot-card ${isGeologist ? "geologist-card" : "worker-card"}`}>
              <div className="robot-card-header">
                <span className="robot-name">{robot.id}</span>
                <span className={`role-badge ${isGeologist ? "badge-geo" : "badge-worker"}`}>
                  {isGeologist ? "GEO" : "WKR"}
                </span>
              </div>
              <div className="robot-state">{STATE_LABELS[robot.state] || robot.state}</div>
              {!isGeologist && (
                <>
                  <div className="battery-section">
                    <div className="battery-bar-container">
                      <div className={`battery-bar-fill ${batteryClass}`} style={{ width: `${batteryPct}%` }} />
                    </div>
                    <span className="battery-label">{batteryPct}%</span>
                  </div>
                  <div className="cargo-section">
                    <span>Cargo: {robot.cargo}/{robot.maxCargo}</span>
                  </div>
                </>
              )}
              {robot.targetZone && (
                <div className="robot-target">→ {robot.targetZone}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
