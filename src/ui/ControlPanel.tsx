import { EditorMode, WorldState } from "../simulation/worldModel";
import EditorControls from "./EditorControls";
import MissionDashboard from "./MissionDashboard";
import CommandLog from "./CommandLog";
import MissionSummary from "./MissionSummary";
import MiningPlanDisplay from "./MiningPlanDisplay";

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
    .find((entry) => entry.message.toLowerCase().includes("mission control") || entry.message.toLowerCase().includes("failed"));

  return (
    <aside className="control-panel">
      <header className="panel-hero">
        <p className="eyebrow">Multi-Phase Autonomous Mining Swarm</p>
        <h1>AquaSwarm</h1>
        <p className="muted-copy">
          A geologist scouts the ocean floor, Claude plans the strategy, and worker
          submarines mine cobalt &amp; manganese while dodging migratory fish schools.
        </p>
      </header>

      <section className="panel-section">
        <div className="section-header">
          <span>Mission Control Link</span>
          <span className="section-pill">Required</span>
        </div>
        <label className="input-label" htmlFor="anthropicKey">
          Anthropic API key
        </label>
        <input
          id="anthropicKey"
          className="text-input"
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder="Paste key for Claude strategic planning"
          type="password"
          value={apiKey}
        />
        <p className="muted-copy">
          Claude is called after the geologist survey to create a strategic mining plan,
          and again when workers need reallocation.
        </p>
        {world.apiStatus === "error" && latestMissionControlMessage ? (
          <div className="status-message error">
            <strong>Claude connection issue</strong>
            <p>{latestMissionControlMessage.message}</p>
          </div>
        ) : null}
        {world.apiStatus !== "error" && !apiKey.trim() ? (
          <div className="status-message info">
            <strong>API key needed</strong>
            <p>Paste an Anthropic API key to enable Claude&apos;s strategic planning. The geologist survey runs without it.</p>
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
      <MiningPlanDisplay plan={world.miningPlan} />
      <CommandLog log={world.missionLog} />
      {showSummary ? <MissionSummary world={world} /> : null}
    </aside>
  );
}
