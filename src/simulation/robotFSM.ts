import {
  clampToField,
  distance2D,
  getZoneById,
  Robot,
  RobotState,
  WorldState,
  ZONE_SIZE
} from "./worldModel";

const ARRIVAL_THRESHOLD = 0.85;
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
    z: clampToField(robot.z + dz * ratio)
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

function findPatrolTarget(world: WorldState, robot: Robot): string | null {
  const reserved = new Set(
    world.robots
      .filter((candidate) => candidate.id !== robot.id)
      .map((candidate) => candidate.targetZone)
      .filter(Boolean) as string[]
  );

  let bestId: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const zone of world.zones) {
    if (zone.animals >= 6 || zone.status === "avoid" || zone.claimedBy || zone.status === "depleted") {
      continue;
    }

    if (reserved.has(zone.id)) {
      continue;
    }

    const distancePenalty = distance2D(robot.x, robot.z, zone.x, zone.z);
    const unknownBonus = zone.status === "unknown" ? 5 : 0;
    const mineralBonus = zone.minerals * 2;
    const score = unknownBonus + mineralBonus - distancePenalty * 0.18;

    if (score > bestScore) {
      bestScore = score;
      bestId = zone.id;
    }
  }

  return bestId;
}

function updateIdleRobot(_world: WorldState, robot: Robot): Robot {
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

  return {
    ...robot,
    state: "patrol"
  };
}

function updatePatrolRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  let targetZone = getZoneById(world, robot.targetZone);

  if (!targetZone || targetZone.status === "avoid" || targetZone.claimedBy) {
    const nextTargetId = findPatrolTarget(world, robot);
    if (!nextTargetId) {
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

  if (targetZone.minerals > 0 && !targetZone.claimedBy) {
    targetZone.claimedBy = robot.id;
    targetZone.status = "mine";
    return {
      ...movedRobot,
      state: "collecting"
    };
  }

  if (targetZone.minerals === 0) {
    targetZone.status = "depleted";
  }

  return {
    ...movedRobot,
    targetZone: null,
    state: "idle"
  };
}

function updateMovingRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
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

  if (robot.cargo >= RETURN_CARGO_THRESHOLD) {
    clearClaim(world, targetZone.id, robot.id);
    return {
      ...robot,
      state: "returning",
      targetZone: null
    };
  }

  if (targetZone.minerals <= 0) {
    targetZone.claimedBy = null;
    targetZone.status = "depleted";
    return {
      ...robot,
      targetZone: null,
      state: "idle"
    };
  }

  targetZone.claimedBy = robot.id;
  targetZone.status = "mine";
  targetZone.minerals -= 1;
  const cargo = Math.min(robot.maxCargo, robot.cargo + 1);
  world.collectedTotal += 1;

  if (targetZone.minerals === 0) {
    targetZone.claimedBy = null;
    targetZone.status = "depleted";
    return {
      ...robot,
      cargo,
      targetZone: null,
      state: cargo >= RETURN_CARGO_THRESHOLD ? "returning" : "idle"
    };
  }

  if (cargo >= RETURN_CARGO_THRESHOLD) {
    targetZone.claimedBy = null;
    return {
      ...robot,
      cargo,
      targetZone: null,
      state: "returning"
    };
  }

  return {
    ...robot,
    cargo
  };
}

function updateReturningRobot(world: WorldState, robot: Robot, dtMs: number): Robot {
  const movedRobot = moveTowards(robot, world.homeBase.x, world.homeBase.z, dtMs);
  const arrived =
    distance2D(movedRobot.x, movedRobot.z, world.homeBase.x, world.homeBase.z) <= ARRIVAL_THRESHOLD + ZONE_SIZE * 0.15;

  if (!arrived) {
    return movedRobot;
  }

  return {
    ...movedRobot,
    cargo: 0,
    state: "idle",
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

function updateRobot(
  world: WorldState,
  robot: Robot,
  dtMs: number
): Robot {
  const handlerMap: Record<RobotState, (worldArg: WorldState, robotArg: Robot, dtArg: number) => Robot> = {
    idle: (worldArg, robotArg) => updateIdleRobot(worldArg, robotArg),
    patrol: updatePatrolRobot,
    moving_to_target: updateMovingRobot,
    collecting: (worldArg, robotArg) => updateCollectingRobot(worldArg, robotArg),
    returning: updateReturningRobot,
    avoiding: updateAvoidingRobot
  };

  return handlerMap[robot.state](world, robot, dtMs);
}

export function runRobotFSM(world: WorldState, dtMs: number): WorldState {
  const next = {
    ...world,
    zones: world.zones.map((zone) => ({ ...zone })),
    robots: world.robots.map((robot) => ({ ...robot }))
  };

  next.robots = next.robots.map((robot) => updateRobot(next, robot, dtMs));

  next.zones = next.zones.map((zone) => {
    if (zone.minerals === 0 && zone.status === "mine") {
      return {
        ...zone,
        status: "depleted",
        claimedBy: null
      };
    }

    return zone;
  });

  return next;
}
