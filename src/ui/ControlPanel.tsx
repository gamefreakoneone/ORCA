import { EditorMode, WorldState } from "../simulation/worldModel";
import EditorControls from "./EditorControls";
import MissionDashboard from "./MissionDashboard";
import CommandLog from "./CommandLog";
import MissionSummary from "./MissionSummary";

interface ControlPanelProps {
  world: WorldState;
  editorMode: EditorMode;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onLoadDemo: () => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSetEditorMode: (mode: EditorMode) => void;
}

export default function ControlPanel({
  world,
  editorMode,
  apiKey,
  onApiKeyChange,
  onLoadDemo,
  onStart,
  onStop,
  onReset,
  onSetEditorMode
}: ControlPanelProps) {
  const showSummary = world.missionStatus === "completed" || world.missionStatus === "stopped";
  const latestMissionControlMessage = [...world.missionLog]
    .reverse()
    .find((entry) => entry.message.toLowerCase().includes("mission control"));

  return (
    <aside className="control-panel">
      <header className="panel-hero">
        <p className="eyebrow">Ecology-aware mining swarm</p>
        <h1>AquaSwarm</h1>
        <p className="muted-copy">
          Autonomous underwater robots collect nodules, dodge wildlife, and surface Claude&apos;s
          strategic calls in real time.
        </p>
      </header>

      <section className="panel-section">
        <div className="section-header">
          <span>Mission Control Link</span>
          <span className="section-pill">Optional</span>
        </div>
        <label className="input-label" htmlFor="anthropicKey">
          Anthropic API key
        </label>
        <input
          id="anthropicKey"
          className="text-input"
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder="Paste key for local browser demos"
          type="password"
          value={apiKey}
        />
        <p className="muted-copy">
          Local autonomy keeps running even if mission-control requests fail or stay pending.
        </p>
        {world.apiStatus === "error" && latestMissionControlMessage ? (
          <div className="status-message error">
            <strong>Claude connection issue</strong>
            <p>{latestMissionControlMessage.message}</p>
          </div>
        ) : null}
        {world.apiStatus !== "error" && !apiKey.trim() ? (
          <div className="status-message info">
            <strong>Local demo note</strong>
            <p>Paste an Anthropic API key here if you want Claude mission-control calls to work in a normal browser session.</p>
          </div>
        ) : null}
        {world.missionStatus === "running" ? (
          <button className="danger" onClick={onStop} type="button">
            Stop Mission
          </button>
        ) : null}
      </section>

      {world.missionStatus === "editing" ? (
        <EditorControls
          world={world}
          editorMode={editorMode}
          onLoadDemo={onLoadDemo}
          onReset={onReset}
          onSetEditorMode={onSetEditorMode}
          onStart={onStart}
        />
      ) : null}

      <MissionDashboard world={world} />
      <CommandLog log={world.missionLog} />
      {showSummary ? <MissionSummary world={world} /> : null}
    </aside>
  );
}
