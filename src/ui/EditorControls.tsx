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
  const totalCobalt = world.zones.reduce((sum, z) => sum + z.cobalt, 0);
  const totalManganese = world.zones.reduce((sum, z) => sum + z.manganese, 0);
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
          className={editorMode === "cobalt" ? "active cobalt-btn" : "cobalt-btn"}
          onClick={() => onSetEditorMode("cobalt")}
          type="button"
        >
          ⬡ Cobalt
        </button>
        <button
          className={editorMode === "manganese" ? "active manganese-btn" : "manganese-btn"}
          onClick={() => onSetEditorMode("manganese")}
          type="button"
        >
          ● Manganese
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
        <span className="stat-cobalt">Co: {totalCobalt}</span>
        <span className="stat-manganese">Mn: {totalManganese}</span>
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
