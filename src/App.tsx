import { useEffect, useRef, useState } from "react";
import Scene from "./components/Scene";
import { requestMissionControl } from "./claude/missionControl";
import {
  EditorMode,
  TICK_MS,
  WorldState,
  createInitialWorld,
  loadDemoScenario,
  prepareWorldForMission,
  resetWorld,
  stopMission,
  toggleZoneAnimals,
  toggleZoneMinerals
} from "./simulation/worldModel";
import {
  PendingMissionControlRequest,
  applyMissionControlResult,
  prepareMissionControlRequest,
  tickWorld
} from "./simulation/tickEngine";
import ControlPanel from "./ui/ControlPanel";

export default function App() {
  const [world, setWorld] = useState<WorldState>(() => createInitialWorld());
  const [editorMode, setEditorMode] = useState<EditorMode>("minerals");
  const [apiKey, setApiKey] = useState("");
  const requestInFlight = useRef(false);
  const worldRef = useRef(world);

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    if (world.missionStatus !== "running") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const currentWorld = worldRef.current;
      const tickedWorld = tickWorld(currentWorld, TICK_MS);
      let pendingRequest: PendingMissionControlRequest | null = null;

      if (!requestInFlight.current) {
        pendingRequest = prepareMissionControlRequest(tickedWorld, apiKey);
      }

      const nextWorld = pendingRequest?.world ?? tickedWorld;
      worldRef.current = nextWorld;
      setWorld(nextWorld);

      if (pendingRequest) {
        requestInFlight.current = true;
        requestMissionControl(pendingRequest.summary, pendingRequest.apiKey)
          .then((result) => {
            setWorld((currentWorld) => {
              const resolvedWorld = applyMissionControlResult(currentWorld, result);
              worldRef.current = resolvedWorld;
              return resolvedWorld;
            });
          })
          .finally(() => {
            requestInFlight.current = false;
          });
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [apiKey, world.missionStatus]);

  const handleZoneClick = (zoneId: string) => {
    if (world.missionStatus !== "editing") {
      return;
    }

    setWorld((currentWorld) =>
      editorMode === "minerals"
        ? toggleZoneMinerals(currentWorld, zoneId)
        : toggleZoneAnimals(currentWorld, zoneId)
    );
  };

  return (
    <div className="app-shell">
      <main className="viewport-shell">
        <div className="scene-frame">
          <Scene editorMode={editorMode} onZoneClick={handleZoneClick} world={world} />
          <div className="hud-banner">
            <span>{world.missionStatus.toUpperCase()}</span>
            <span>Mode: {editorMode}</span>
            <span>Ticks: {world.tick}</span>
          </div>
        </div>
        <ControlPanel
          apiKey={apiKey}
          editorMode={editorMode}
          onApiKeyChange={setApiKey}
          onLoadDemo={() => setWorld(loadDemoScenario())}
          onReset={() => setWorld(resetWorld())}
          onSetEditorMode={setEditorMode}
          onStart={() => setWorld((currentWorld) => prepareWorldForMission(currentWorld))}
          onStop={() => setWorld((currentWorld) => stopMission(currentWorld))}
          world={world}
        />
      </main>
    </div>
  );
}
