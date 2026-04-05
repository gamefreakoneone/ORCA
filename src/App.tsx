import { useEffect, useRef, useState } from "react";
import Scene from "./components/Scene";
import { requestStrategicPlan, requestReallocation } from "./claude/missionControl";
import {
  EditorMode,
  TICK_MS,
  WorldState,
  createInitialWorld,
  loadDemoScenario,
  prepareWorldForMission,
  resetWorld,
  stopMission,
  summarizeWorldForClaude,
  toggleZoneAnimals,
  toggleZoneHighYield,
  toggleZoneLowYield,
  appendLog
} from "./simulation/worldModel";
import {
  applyStrategicPlan,
  applyReallocation,
  shouldRequestStrategicPlan,
  shouldRequestReallocation,
  tickWorld
} from "./simulation/tickEngine";
import ControlPanel from "./ui/ControlPanel";

export default function App() {
  const [world, setWorld] = useState<WorldState>(() => createInitialWorld());
  const [editorMode, setEditorMode] = useState<EditorMode>("highYield");
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
      worldRef.current = tickedWorld;
      setWorld(tickedWorld);

      // Phase transitions and Claude calls
      if (!requestInFlight.current) {
        // Strategic plan request (after survey)
        if (shouldRequestStrategicPlan(tickedWorld) && apiKey.trim()) {
          requestInFlight.current = true;

          const updatedWorld = {
            ...tickedWorld,
            apiStatus: "pending" as const,
            lastClaudeAt: tickedWorld.elapsedMs
          };
          worldRef.current = updatedWorld;
          setWorld(updatedWorld);

          const summary = summarizeWorldForClaude(updatedWorld);
          requestStrategicPlan(summary, apiKey)
            .then((result) => {
              setWorld((w) => {
                const resolved = applyStrategicPlan(w, result);
                worldRef.current = resolved;
                return resolved;
              });
            })
            .finally(() => {
              requestInFlight.current = false;
            });
        }

        // Reallocation request (idle bots during mining)
        if (shouldRequestReallocation(tickedWorld) && apiKey.trim()) {
          requestInFlight.current = true;

          const updatedWorld = appendLog(
            {
              ...tickedWorld,
              apiStatus: "pending" as const,
              lastClaudeAt: tickedWorld.elapsedMs
            },
            {
              tick: tickedWorld.tick,
              source: "system",
              message: "Idle workers detected. Querying Claude for reallocation orders..."
            }
          );
          worldRef.current = updatedWorld;
          setWorld(updatedWorld);

          const summary = summarizeWorldForClaude(updatedWorld);
          requestReallocation(summary, apiKey)
            .then((result) => {
              setWorld((w) => {
                const resolved = applyReallocation(w, result);
                worldRef.current = resolved;
                return resolved;
              });
            })
            .finally(() => {
              requestInFlight.current = false;
            });
        }

        // If in planning phase but no API key, create a fallback plan
        if (shouldRequestStrategicPlan(tickedWorld) && !apiKey.trim()) {
          const fallbackWorld = appendLog(
            {
              ...tickedWorld,
              missionPhase: "mining" as const,
              miningPlan: { deployment: [], ignore_zones: [], alerts: ["No API key — workers using autonomous patrol mode."] },
              apiStatus: "error" as const
            },
            {
              tick: tickedWorld.tick,
              source: "system",
              message: "No API key provided. Workers deploying in autonomous patrol mode (no strategic plan)."
            }
          );

          // Set workers to patrol
          fallbackWorld.robots = fallbackWorld.robots.map((r) =>
            r.role === "worker" ? { ...r, state: "patrol" as const } : r
          );

          worldRef.current = fallbackWorld;
          setWorld(fallbackWorld);
        }
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

    setWorld((currentWorld) => {
      switch (editorMode) {
        case "highYield":
          return toggleZoneHighYield(currentWorld, zoneId);
        case "lowYield":
          return toggleZoneLowYield(currentWorld, zoneId);
        case "animals":
          return toggleZoneAnimals(currentWorld, zoneId);
        default:
          return currentWorld;
      }
    });
  };

  return (
    <div className="app-shell">
      <main className="viewport-shell">
        <div className="scene-frame">
          <Scene editorMode={editorMode} onZoneClick={handleZoneClick} world={world} />
          <div className="hud-banner">
            <span>{world.missionStatus.toUpperCase()}</span>
            <span>Phase: {world.missionPhase}</span>
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
