import { EditorMode, WorldState } from "../simulation/worldModel";

interface EditorControlsProps {
  world: WorldState;
  editorMode: EditorMode;
  onSetEditorMode: (mode: EditorMode) => void;
  onLoadDemo: () => void;
  onStart: () => void;
  onReset: () => void;
}

export default function EditorControls({
  world,
  editorMode,
  onSetEditorMode,
  onLoadDemo,
  onStart,
  onReset
}: EditorControlsProps) {
  return (
    <section className="panel-section">
      <div className="section-header">
        <span>Editor Mode</span>
        <span className="section-pill">Pre-mission</span>
      </div>
      <div className="button-row">
        <button
          className={editorMode === "minerals" ? "primary" : "ghost"}
          onClick={() => onSetEditorMode("minerals")}
          type="button"
        >
          Place Minerals
        </button>
        <button
          className={editorMode === "animals" ? "primary" : "ghost"}
          onClick={() => onSetEditorMode("animals")}
          type="button"
        >
          Place Animals
        </button>
      </div>
      <p className="muted-copy">
        Click a zone in the 3D grid. Minerals cycle {`0 -> 3 -> 6 -> 9 -> 0`}. Animals cycle
        {" "}
        {`0 -> 2 -> 5 -> 8 -> 0`}.
      </p>
      <div className="button-stack">
        <button className="secondary" onClick={onLoadDemo} type="button">
          Load Demo Scenario
        </button>
        <button
          className="primary action"
          disabled={world.zones.every((zone) => zone.minerals === 0)}
          onClick={onStart}
          type="button"
        >
          Start Mission
        </button>
        <button className="ghost" onClick={onReset} type="button">
          Clear Field
        </button>
      </div>
    </section>
  );
}
