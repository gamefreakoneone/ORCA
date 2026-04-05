import {
  appendLog,
  checkMissionComplete,
  summarizeWorldForClaude,
  WorldState,
  MiningPlan,
  getIdleWorkers,
  getWorkers,
  hasRemainingResources,
  totalMinerals,
  getZoneById,
  allWorkersAtBase
} from "./worldModel";
import { applyCollisionAvoidance } from "./collisionAvoidance";
import { runRobotFSM } from "./robotFSM";
import { runGeologistFSM } from "./geologistFSM";
import { runFishMigration } from "./fishMigration";
import { StrategicPlanResult, ReallocationResult } from "../claude/schemas";

function recomputeAvoidedZones(world: WorldState): number {
  return world.zones.filter((zone) => zone.status === "avoid").length;
}

export function tickWorld(world: WorldState, dtMs: number): WorldState {
  if (world.missionStatus !== "running") {
    return world;
  }

  let next: WorldState;

  if (world.missionPhase === "scouting") {
    // Only geologist moves, workers idle at base
    next = runGeologistFSM(world, dtMs);
    next = runFishMigration(next);
    next = {
      ...next,
      tick: next.tick + 1,
      elapsedMs: next.elapsedMs + dtMs
    };

    // Check if survey completed → transition to planning
    if (next.surveyComplete && next.missionPhase === "scouting") {
      next = {
        ...next,
        missionPhase: "planning"
      };
    }
  } else if (world.missionPhase === "planning") {
    // Waiting for Claude's strategic plan — just tick time
    next = runFishMigration(world);
    next = {
      ...next,
      tick: next.tick + 1,
      elapsedMs: next.elapsedMs + dtMs
    };
  } else {
    // Mining phase
    next = runRobotFSM(world, dtMs);
    next = applyCollisionAvoidance(next);
    next = runFishMigration(next);
    next = {
      ...next,
      tick: next.tick + 1,
      elapsedMs: next.elapsedMs + dtMs,
      avoidedZones: recomputeAvoidedZones(next)
    };

    if (checkMissionComplete(next)) {
      if (allWorkersAtBase(next)) {
        next = appendLog(
          {
            ...next,
            missionStatus: "completed",
            apiStatus: next.apiStatus === "pending" ? "ready" : next.apiStatus
          },
          {
            tick: next.tick,
            source: "system",
            message: "Mission complete! All mineral deposits extracted and all units docked. 🎉"
          }
        );
      } else {
        // Log "returning" once when it first happens
        const alreadyLogged = next.missionLog.some(l => l.message.includes("returning to mothership"));
        if (!alreadyLogged) {
          next = appendLog(next, {
            tick: next.tick,
            source: "system",
            message: "All mineral deposits extracted. Workers returning to mothership for docking..."
          });
        }
      }
    }
  }

  return next;
}

// Apply the strategic plan from Claude to the world state
export function applyStrategicPlan(world: WorldState, result: StrategicPlanResult): WorldState {
  let next: WorldState = {
    ...world,
    zones: world.zones.map((z) => ({ ...z })),
    robots: world.robots.map((r) => ({ ...r, assignedPlan: [...r.assignedPlan] })),
    missionLog: [...world.missionLog],
    apiStatus: result.ok ? "ready" : "error"
  };

  if (!result.ok) {
    return appendLog(next, {
      tick: next.tick,
      source: "system",
      message: `Strategic planning failed: ${result.error}`
    });
  }

  const plan: MiningPlan = {
    deployment: result.plan.deployment,
    ignore_zones: result.plan.ignore_zones,
    alerts: result.plan.alerts
  };

  next.miningPlan = plan;

  // Mark ignored zones
  for (const zoneId of plan.ignore_zones) {
    const zone = next.zones.find((z) => z.id === zoneId);
    if (zone) {
      zone.status = "avoid";
      zone.claimedBy = null;
    }
  }

  // Assign deployment plans to workers
  for (const order of plan.deployment) {
    const robot = next.robots.find((r) => r.id === order.robot_id);
    if (!robot || robot.role !== "worker") continue;

    // Filter out invalid zones from the plan
    const validZones = order.target_zones.filter((zoneId) => {
      const zone = getZoneById(next, zoneId);
      return zone && zone.status !== "avoid" && totalMinerals(zone) > 0;
    });

    robot.assignedPlan = validZones;
    robot.planIndex = 0;

    if (validZones.length > 0) {
      robot.targetZone = validZones[0];
      robot.state = "moving_to_target";

      // Claim the first zone
      const firstZone = next.zones.find((z) => z.id === validZones[0]);
      if (firstZone && !firstZone.claimedBy) {
        firstZone.claimedBy = robot.id;
        firstZone.status = "mine";
      }
    }

    next = appendLog(next, {
      tick: next.tick,
      source: "claude",
      message: `${robot.id} deployed → ${validZones.join(" → ")} [${order.priority}]: ${order.reason}`
    });
  }

  // Log alerts
  for (const alert of plan.alerts) {
    next = appendLog(next, {
      tick: next.tick,
      source: "claude",
      message: alert
    });
  }

  // Transition to mining phase
  next.missionPhase = "mining";
  next.avoidedZones = recomputeAvoidedZones(next);

  next = appendLog(next, {
    tick: next.tick,
    source: "system",
    message: "Strategic plan received. Workers deploying to assigned sectors. Mining operations commenced."
  });

  return next;
}

// Apply reallocation orders from Claude to idle bots
export function applyReallocation(world: WorldState, result: ReallocationResult): WorldState {
  let next: WorldState = {
    ...world,
    zones: world.zones.map((z) => ({ ...z })),
    robots: world.robots.map((r) => ({ ...r, assignedPlan: [...r.assignedPlan] })),
    missionLog: [...world.missionLog],
    apiStatus: result.ok ? "ready" : "error"
  };

  if (!result.ok) {
    return appendLog(next, {
      tick: next.tick,
      source: "system",
      message: `Reallocation failed: ${result.error}`
    });
  }

  for (const order of result.reallocation.orders) {
    const robot = next.robots.find((r) => r.id === order.robot_id);
    if (!robot || robot.role !== "worker") continue;

    if (order.action === "move_to_target" && order.target_zone) {
      const zone = next.zones.find((z) => z.id === order.target_zone);
      if (!zone || zone.status === "avoid" || zone.animals >= 6) continue;
      if (zone.claimedBy && zone.claimedBy !== robot.id) continue;

      robot.targetZone = zone.id;
      robot.state = "moving_to_target";
      robot.assignedPlan = [zone.id];
      robot.planIndex = 0;

      if (!zone.claimedBy) {
        zone.claimedBy = robot.id;
        zone.status = "mine";
      }

      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} reallocated → ${zone.id}: ${order.reason}`
      });
    } else if (order.action === "return_to_base") {
      robot.targetZone = null;
      robot.state = "returning";
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} recalled to base: ${order.reason}`
      });
    } else if (order.action === "patrol") {
      robot.targetZone = null;
      robot.state = "patrol";
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} sent on patrol: ${order.reason}`
      });
    } else if (order.action === "hold") {
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} holding position: ${order.reason}`
      });
    }
  }

  for (const alert of result.reallocation.alerts) {
    next = appendLog(next, {
      tick: next.tick,
      source: "claude",
      message: alert
    });
  }

  return next;
}

// Check if we should request a reallocation from Claude
export function shouldRequestReallocation(world: WorldState): boolean {
  if (world.missionPhase !== "mining") return false;
  if (world.missionStatus !== "running") return false;
  if (world.apiStatus === "pending") return false;
  if (!hasRemainingResources(world)) return false;

  const idleWorkers = getIdleWorkers(world);
  if (idleWorkers.length === 0) return false;

  // Check if there are workers with no assigned plan or empty plan
  const workersNeedingOrders = idleWorkers.filter(
    (w) => w.assignedPlan.length === 0 || w.planIndex >= w.assignedPlan.length
  );

  if (workersNeedingOrders.length === 0) return false;

  // Throttle: at least 5 seconds between reallocation calls
  const timeSinceLastClaude = world.elapsedMs - world.lastClaudeAt;
  if (timeSinceLastClaude < 5000) return false;

  return true;
}

// Check if we need the initial strategic plan
export function shouldRequestStrategicPlan(world: WorldState): boolean {
  return (
    world.missionPhase === "planning" &&
    world.missionStatus === "running" &&
    world.apiStatus !== "pending" &&
    world.surveyComplete &&
    world.miningPlan === null
  );
}
