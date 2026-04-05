import {
  clampToField,
  distance2D,
  getZoneById,
  Robot,
  RobotState,
  WorldState,
  ZONE_SIZE,
  BATTERY_DRAIN_MOVE,
  BATTERY_DRAIN_COLLECT,
  MAX_BATTERY,
  totalMinerals,
  hasRemainingResources,
  ARRIVAL_THRESHOLD,
  DOCKING_THRESHOLD
} from "./worldModel";

const RETURN_CARGO_THRESHOLD = 4;

function moveTowards(robot: Robot, targetX: number, targetZ: number, dtMs: number): Robot {
  const dx = targetX - robot.x;
  const dz = targetZ - robot.z;
  const distance = Math.hypot(dx, dz);

  if (distance === 0) {
    return robot;
  }

  const maxStep = (robot.speed * dtMs) / 1000;
  const ratio = Math.min(1, maxStep / distance);

  return {
    ...robot,
    x: clampToField(robot.x + dx * ratio),
    z: clampToField(robot.z + dz * ratio),
    battery: Math.max(0, robot.battery - BATTERY_DRAIN_MOVE)
  };
}

function clearClaim(world: WorldState, zoneId: string | null, robotId: string): void {
  if (!zoneId) {
    return;
  }

  const zone = world.zones.find((candidate) => candidate.id === zoneId);
  if (zone && zone.claimedBy === robotId) {
    zone.claimedBy = null;
  }
}

function zoneBlockedByFish(world: WorldState, zoneId: string | null, robotId: string): boolean {
  if (!zoneId) return false;
  const zone = getZoneById(world, zoneId);
  if (!zone) return false;
  if (zone.animals <= 0) return false;
  if (zone.claimedBy === robotId) return false;

  if (zone.animals >= 6) return true;

  const targetingRobots = world.robots.filter(
    (r) => r.role === "worker" && r.targetZone === zoneId
  );
  
  if (targetingRobots.length <= 1) return false;

  const winner = targetingRobots.sort((a, b) => a.id.localeCompare(b.id))[0];
  return winner.id !== robotId;
}

function getNextPlanTarget(world: WorldState, robot: Robot): string | null {
  // Follow the per-sub plan from Claude
  for (let i = robot.planIndex; i < robot.assignedPlan.length; i++) {
    const zoneId = robot.assignedPlan[i];
    const zone = getZoneById(world, zoneId);
    if (!zone) continue;
    if (zone.status === "avoid") continue;
    if (totalMinerals(zone) <= 0 && zone.status === "depleted") continue;
    if (zone.claimedBy && zone.claimedBy !== robot.id) continue;
    return zoneId;
  }
  return null;
}

function findPatrolTarget(world: WorldState, robot: Robot): string | null {
  // First, try the assigned plan
  const planTarget = getNextPlanTarget(world, robot);
  if (planTarget) return planTarget;

  // Fallback: score-based patrol for unplanned zones
  const reserved = new Set(
    world.robots
      .filter((candidate) => candidate.id !== robot.id)
      .map((candidate) => candidate.targetZone)
      .filter(Boolean) as string[]
  );

  let bestId: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const zone of world.zones) {
    if (!zone.surveyed) continue;
    if (zone.animals >= 6 || zone.status === "avoid" || zone.claimedBy || zone.status === "depleted") {
      continue;
    }

    if (totalMinerals(zone) <= 0) continue;

    if (reserved.has(zone.id)) {
      continue;
    }

    const distancePenalty = distance2D(robot.x, robot.z, zone.x, zone.z);
    const highYieldBonus = zone.highYield * 6;
    const lowYieldBonus = zone.lowYield * 2;
    const score = highYieldBonus + lowYieldBonus - distancePenalty * 0.18;

    if (score > bestScore) {
      bestScore = score;
      bestId = zone.id;
    }
  }

  return bestId;
}

function updateIdleRobot(world: WorldState, robot: Robot): Robot {
  // Battery exhausted — must return to base
  if (robot.battery <= 0 && robot.state !== "recharging") {
    return {
      ...robot,
      state: "returning",
      targetZone: null
    };
  }

  // Recharging
  if (robot.state === "recharging") {
    return { ...robot, state: "idle" };
  }

  if (robot.cargo >= RETURN_CARGO_THRESHOLD) {
    return {
      ...robot,
      state: "returning",
      targetZone: null
    };
  }

  if (robot.targetZone) {
    return {
      ...robot,
      state: "moving_to_target"
    };
  }

  // Try to find a target from the plan or via scoring
  const target = findPatrolTarget(world, robot);
  if (target) {
    return {
      ...robot,
      state: "moving_to_target",
      targetZone: target
    };
  }

  if (world.missionPhase === "mining") {
    const atBase = distance2D(robot.x, robot.z, world.homeBase.x, world.homeBase.z) <= DOCKING_THRESHOLD;
    if (!atBase) {
      return {
        ...robot,
        state: "returning",
        targetZone: null
      };
    }
  }

  return {
    ...robot,
    state: "patrol"
  };
}

function updatePatrolRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  if (robot.battery <= 0) {
    return { ...robot, state: "returning", targetZone: null };
  }

  let targetZone = getZoneById(world, robot.targetZone);

  if (!targetZone || targetZone.status === "avoid" || targetZone.claimedBy) {
    const nextTargetId = findPatrolTarget(world, robot);
    if (!nextTargetId) {
      if (world.missionPhase === "mining") {
        const atBase = distance2D(robot.x, robot.z, world.homeBase.x, world.homeBase.z) <= DOCKING_THRESHOLD;
        if (!atBase) {
          return {
            ...robot,
            targetZone: null,
            state: "returning"
          };
        }
      }

      return {
        ...robot,
        targetZone: null,
        state: "idle"
      };
    }

    targetZone = getZoneById(world, nextTargetId);
    robot = {
      ...robot,
      targetZone: nextTargetId
    };
  }

  if (!targetZone) {
    return robot;
  }

  // Fish blocking — can't enter
  if (zoneBlockedByFish(world, targetZone.id, robot.id)) {
    return {
      ...robot,
      state: "waiting"
    };
  }

  const movedRobot = moveTowards(robot, targetZone.x, targetZone.z, dtMs);
  const arrived = distance2D(movedRobot.x, movedRobot.z, targetZone.x, targetZone.z) <= ARRIVAL_THRESHOLD;

  if (!arrived) {
    return movedRobot;
  }

  if (targetZone.animals >= 6) {
    targetZone.status = "avoid";
    return {
      ...movedRobot,
      state: "avoiding"
    };
  }

  if (targetZone.animals > 0) {
    return {
      ...movedRobot,
      state: "waiting"
    };
  }

  if (totalMinerals(targetZone) > 0 && !targetZone.claimedBy) {
    targetZone.claimedBy = robot.id;
    targetZone.status = "mine";
    return {
      ...movedRobot,
      state: "collecting"
    };
  }

  if (totalMinerals(targetZone) === 0) {
    targetZone.status = "depleted";
  }

  return {
    ...movedRobot,
    targetZone: null,
    state: "idle"
  };
}

function updateMovingRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  if (robot.battery <= 0) {
    clearClaim(world, robot.targetZone, robot.id);
    return { ...robot, state: "returning", targetZone: null };
  }

  const targetZone = getZoneById(world, robot.targetZone);
  if (!targetZone) {
    return {
      ...robot,
      targetZone: null,
      state: "idle"
    };
  }

  if (targetZone.animals >= 6 || targetZone.status === "avoid") {
    clearClaim(world, robot.targetZone, robot.id);
    targetZone.status = "avoid";
    return {
      ...robot,
      state: "avoiding"
    };
  }

  // Fish blocking — wait outside
  if (zoneBlockedByFish(world, targetZone.id, robot.id)) {
    return {
      ...robot,
      state: "waiting"
    };
  }

  if (targetZone.claimedBy && targetZone.claimedBy !== robot.id) {
    return {
      ...robot,
      targetZone: null,
      state: "idle"
    };
  }

  const movedRobot = moveTowards(robot, targetZone.x, targetZone.z, dtMs);
  const arrived = distance2D(movedRobot.x, movedRobot.z, targetZone.x, targetZone.z) <= ARRIVAL_THRESHOLD;

  if (!arrived) {
    return movedRobot;
  }

  if (targetZone.animals > 0) {
    return {
      ...movedRobot,
      state: "waiting"
    };
  }

  targetZone.claimedBy = robot.id;
  targetZone.status = "mine";
  return {
    ...movedRobot,
    state: "collecting"
  };
}

function updateCollectingRobot(world: WorldState, robot: Robot): Robot {
  const targetZone = getZoneById(world, robot.targetZone);
  if (!targetZone) {
    return {
      ...robot,
      targetZone: null,
      state: "idle"
    };
  }

  if (targetZone.animals >= 6 || targetZone.status === "avoid") {
    clearClaim(world, targetZone.id, robot.id);
    return {
      ...robot,
      state: "avoiding"
    };
  }

  // Battery exhausted while collecting — drop everything and return
  const newBattery = Math.max(0, robot.battery - BATTERY_DRAIN_COLLECT);
  if (newBattery <= 0) {
    clearClaim(world, targetZone.id, robot.id);
    return {
      ...robot,
      battery: 0,
      state: "returning",
      targetZone: null
    };
  }

  if (robot.cargo >= RETURN_CARGO_THRESHOLD) {
    clearClaim(world, targetZone.id, robot.id);
    return {
      ...robot,
      battery: newBattery,
      state: "returning",
      targetZone: null
    };
  }

  if (totalMinerals(targetZone) <= 0) {
    targetZone.claimedBy = null;
    targetZone.status = "depleted";

    // Advance plan index if this was a planned zone
    let planIndex = robot.planIndex;
    if (robot.assignedPlan[planIndex] === targetZone.id) {
      planIndex += 1;
    }

    return {
      ...robot,
      battery: newBattery,
      targetZone: null,
      state: "idle",
      planIndex
    };
  }

  targetZone.claimedBy = robot.id;
  targetZone.status = "mine";

  // Collect: prioritize high yield ore first
  let collectedHigh = 0;
  let collectedLow = 0;
  if (targetZone.highYield > 0) {
    targetZone.highYield -= 1;
    collectedHigh = 1;
  } else if (targetZone.lowYield > 0) {
    targetZone.lowYield -= 1;
    collectedLow = 1;
  }

  world.collectedHighYield += collectedHigh;
  world.collectedLowYield += collectedLow;
  world.collectedTotal += collectedHigh + collectedLow;

  const cargo = Math.min(robot.maxCargo, robot.cargo + 1);

  if (totalMinerals(targetZone) === 0) {
    targetZone.claimedBy = null;
    targetZone.status = "depleted";

    let planIndex = robot.planIndex;
    if (robot.assignedPlan[planIndex] === targetZone.id) {
      planIndex += 1;
    }

    return {
      ...robot,
      cargo,
      battery: newBattery,
      targetZone: null,
      state: cargo >= RETURN_CARGO_THRESHOLD ? "returning" : "idle",
      planIndex
    };
  }

  if (cargo >= RETURN_CARGO_THRESHOLD) {
    targetZone.claimedBy = null;
    return {
      ...robot,
      cargo,
      battery: newBattery,
      targetZone: null,
      state: "returning"
    };
  }

  return {
    ...robot,
    cargo,
    battery: newBattery
  };
}

function updateReturningRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  // Don't drain battery on return trip if already exhausted
  const movedRobot = robot.battery <= 0
    ? (() => {
        const dx = world.homeBase.x - robot.x;
        const dz = world.homeBase.z - robot.z;
        const dist = Math.hypot(dx, dz);
        if (dist === 0) return robot;
        const maxStep = (robot.speed * 0.5 * dtMs) / 1000; // slower crawl back
        const ratio = Math.min(1, maxStep / dist);
        return {
          ...robot,
          x: clampToField(robot.x + dx * ratio),
          z: clampToField(robot.z + dz * ratio)
        };
      })()
    : moveTowards(robot, world.homeBase.x, world.homeBase.z, dtMs);

  const arrived = distance2D(movedRobot.x, movedRobot.z, world.homeBase.x, world.homeBase.z) <= DOCKING_THRESHOLD;

  if (!arrived) {
    return movedRobot;
  }

  // Arrived at base — unload cargo
  const wasExhausted = movedRobot.battery <= 0;
  return {
    ...movedRobot,
    cargo: 0,
    battery: wasExhausted ? MAX_BATTERY : movedRobot.battery,
    state: wasExhausted ? "recharging" : "idle",
    targetZone: null
  };
}

function updateAvoidingRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  const targetZone = getZoneById(world, robot.targetZone);
  const avoidX = targetZone ? robot.x + (robot.x - targetZone.x || 1) : world.homeBase.x;
  const avoidZ = targetZone ? robot.z + (robot.z - targetZone.z || 0.5) : world.homeBase.z;
  const movedRobot = moveTowards(robot, avoidX, avoidZ, dtMs);

  return {
    ...movedRobot,
    targetZone: null,
    state: "idle"
  };
}

function updateWaitingRobot(world: WorldState, robot: Robot): Robot {
  if (robot.battery <= 0) {
    return { ...robot, state: "returning", targetZone: null };
  }

  if (robot.targetZone) {
    const zone = getZoneById(world, robot.targetZone);
    if (!zone) return robot;

    const arrived = distance2D(robot.x, robot.z, zone.x, zone.z) <= ARRIVAL_THRESHOLD;

    if (arrived) {
      if (zone.animals <= 0) {
        return { ...robot, state: "moving_to_target" };
      }
      if (zone.animals >= 6) {
        return { ...robot, state: "avoiding" };
      }
      
      const nextBattery = Math.max(0, robot.battery - BATTERY_DRAIN_MOVE);
      if (nextBattery <= 0) {
        return { ...robot, battery: 0, state: "returning", targetZone: null };
      }
      return { ...robot, battery: nextBattery };
    } else {
      if (!zoneBlockedByFish(world, robot.targetZone, robot.id)) {
        return { ...robot, state: "moving_to_target" };
      }
    }
  }

  return robot;
}

function updateRechargingRobot(_world: WorldState, robot: Robot): Robot {
  // Instant recharge — battery was set to MAX on arrival
  return {
    ...robot,
    state: "idle"
  };
}

function updateRobot(
  world: WorldState,
  robot: Robot,
  dtMs: number
): Robot {
  // Only update workers in mining phase
  if (robot.role !== "worker") return robot;
  if (world.missionPhase !== "mining") return robot;

  const handlerMap: Record<RobotState, (worldArg: WorldState, robotArg: Robot, dtArg: number) => Robot> = {
    idle: (worldArg, robotArg) => updateIdleRobot(worldArg, robotArg),
    patrol: updatePatrolRobot,
    moving_to_target: updateMovingRobot,
    collecting: (worldArg, robotArg) => updateCollectingRobot(worldArg, robotArg),
    returning: updateReturningRobot,
    avoiding: updateAvoidingRobot,
    waiting: (worldArg, robotArg) => updateWaitingRobot(worldArg, robotArg),
    surveying: (_w, r) => r, // workers don't survey
    recharging: (worldArg, robotArg) => updateRechargingRobot(worldArg, robotArg)
  };

  return handlerMap[robot.state](world, robot, dtMs);
}

export function runRobotFSM(world: WorldState, dtMs: number): WorldState {
  const next = {
    ...world,
    zones: world.zones.map((zone) => ({ ...zone })),
    robots: world.robots.map((robot) => ({ ...robot, assignedPlan: [...robot.assignedPlan] }))
  };

  next.robots = next.robots.map((robot) => updateRobot(next, robot, dtMs));

  next.zones = next.zones.map((zone) => {
    if (totalMinerals(zone) === 0 && zone.status === "mine") {
      return {
        ...zone,
        status: "depleted" as const,
        claimedBy: null
      };
    }

    return zone;
  });

  return next;
}
