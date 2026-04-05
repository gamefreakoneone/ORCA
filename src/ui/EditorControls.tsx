import { EditorMode, WorldState, totalMinerals, GRID_SIZE } from "../simulation/worldModel";

interface EditorControlsProps {
  world: WorldState;
  editorMode: EditorMode;
  onLoadDemo: () => void;
  onStart: () => void;
  onReset: () => void;
  onSetEditorMode: (mode: EditorMode) => void;
}

export default function EditorControls({
  world,
  editorMode,
  onLoadDemo,
  onStart,
  onReset,
  onSetEditorMode
}: EditorControlsProps) {
  const totalHighYield = world.zones.reduce((sum, z) => sum + z.highYield, 0);
  const totalLowYield = world.zones.reduce((sum, z) => sum + z.lowYield, 0);
  const totalFish = world.zones.reduce((sum, z) => sum + z.animals, 0);
  const nonEmptyZones = world.zones.filter((z) => totalMinerals(z) > 0 || z.animals > 0).length;

  return (
    <section className="panel-section">
      <div className="section-header">
        <span>Scenario Editor</span>
        <span className="section-pill">{GRID_SIZE}×{GRID_SIZE}</span>
      </div>

      <div className="editor-toggle-group">
        <button
          className={editorMode === "highYield" ? "active high-yield-btn" : "high-yield-btn"}
          onClick={() => onSetEditorMode("highYield")}
          type="button"
        >
          ⬡ High Yield
        </button>
        <button
          className={editorMode === "lowYield" ? "active low-yield-btn" : "low-yield-btn"}
          onClick={() => onSetEditorMode("lowYield")}
          type="button"
        >
          ● Low Yield
        </button>
        <button
          className={editorMode === "animals" ? "active" : ""}
          onClick={() => onSetEditorMode("animals")}
          type="button"
        >
          🐟 Wildlife
        </button>
      </div>

      <div className="editor-stats">
        <span className="stat-high-yield">HY: {totalHighYield}</span>
        <span className="stat-low-yield">LY: {totalLowYield}</span>
        <span className="stat-fish">🐟: {totalFish}</span>
        <span className="stat-zones">{nonEmptyZones} zones</span>
      </div>

      <div className="button-group">
        <button onClick={onLoadDemo} type="button">Load Demo Scenario</button>
        <button className="primary" disabled={nonEmptyZones === 0} onClick={onStart} type="button">
          Start Mission
        </button>
        <button onClick={onReset} type="button">Reset Field</button>
      </div>
    </section>
  );
}
