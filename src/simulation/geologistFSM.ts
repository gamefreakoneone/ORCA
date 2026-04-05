import {
  clampToField,
  distance2D,
  GRID_SIZE,
  gridToWorld,
  Robot,
  WorldState,
  ZONE_SIZE,
  appendLog
} from "./worldModel";

const ARRIVAL_THRESHOLD = 0.85;

// Generate a spiral sweep order from center outward
function generateSpiralOrder(gridSize: number): Array<{ col: number; row: number }> {
  const center = Math.floor(gridSize / 2);
  const visited = new Set<string>();
  const order: Array<{ col: number; row: number }> = [];
  
  // Directions: right, down, left, up
  const dx = [1, 0, -1, 0];
  const dz = [0, 1, 0, -1];
  
  let col = center;
  let row = center;
  let dir = 0;
  let stepsInDir = 1;
  let stepsTaken = 0;
  let turnsAtThisLength = 0;

  const total = gridSize * gridSize;

  while (order.length < total) {
    if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      const key = `${col},${row}`;
      if (!visited.has(key)) {
        visited.add(key);
        order.push({ col, row });
      }
    }

    col += dx[dir];
    row += dz[dir];
    stepsTaken += 1;

    if (stepsTaken >= stepsInDir) {
      stepsTaken = 0;
      dir = (dir + 1) % 4;
      turnsAtThisLength += 1;
      if (turnsAtThisLength >= 2) {
        turnsAtThisLength = 0;
        stepsInDir += 1;
      }
    }
  }

  return order;
}

const SPIRAL_ORDER = generateSpiralOrder(GRID_SIZE);

function moveTowards(robot: Robot, targetX: number, targetZ: number, dtMs: number): Robot {
  const dx = targetX - robot.x;
  const dz = targetZ - robot.z;
  const dist = Math.hypot(dx, dz);

  if (dist === 0) return robot;

  const maxStep = (robot.speed * dtMs) / 1000;
  const ratio = Math.min(1, maxStep / dist);

  return {
    ...robot,
    x: clampToField(robot.x + dx * ratio),
    z: clampToField(robot.z + dz * ratio)
  };
}

export function runGeologistFSM(world: WorldState, dtMs: number): WorldState {
  const geologist = world.robots.find((r) => r.role === "geologist");
  if (!geologist) return world;
  if (world.surveyComplete) return world;

  let next = {
    ...world,
    zones: world.zones.map((z) => ({ ...z })),
    robots: world.robots.map((r) => (r.role === "geologist" ? { ...r } : r)),
    missionLog: [...world.missionLog]
  };

  let geo = next.robots.find((r) => r.role === "geologist")!;

  if (geo.state === "idle") {
    // Start surveying — find next unsurveyed zone in spiral order
    const nextTarget = SPIRAL_ORDER.find((cell) => {
      const zone = next.zones.find(
        (z) => z.id === `zone_${cell.col}_${cell.row}`
      );
      return zone && !zone.surveyed;
    });

    if (!nextTarget) {
      // All zones surveyed, return to base
      geo.state = "returning";
      geo.targetZone = null;
      next = appendLog(next, {
        tick: next.tick,
        source: "geologist",
        message: "Survey complete! All zones scanned. Returning to mothership with full geological report."
      });
    } else {
      const zoneId = `zone_${nextTarget.col}_${nextTarget.row}`;
      geo.state = "surveying";
      geo.targetZone = zoneId;
    }
  }

  if (geo.state === "surveying") {
    const targetZone = next.zones.find((z) => z.id === geo.targetZone);
    if (!targetZone) {
      geo.state = "idle";
      return next;
    }

    const moved = moveTowards(geo, targetZone.x, targetZone.z, dtMs);
    const arrived = distance2D(moved.x, moved.z, targetZone.x, targetZone.z) <= ARRIVAL_THRESHOLD;

    if (!arrived) {
      geo.x = moved.x;
      geo.z = moved.z;
      return next;
    }

    // Arrived at zone — survey it
    geo.x = moved.x;
    geo.z = moved.z;
    targetZone.surveyed = true;
    targetZone.status = "surveyed";
    next.surveyedCount += 1;

    const hasHighYield = targetZone.highYield > 0;
    const hasLowYield = targetZone.lowYield > 0;
    const hasAnimals = targetZone.animals > 0;
    const parts: string[] = [];
    if (hasHighYield) parts.push(`HY:${targetZone.highYield}`);
    if (hasLowYield) parts.push(`LY:${targetZone.lowYield}`);
    if (hasAnimals) parts.push(`🐟:${targetZone.animals}`);
    const detail = parts.length > 0 ? parts.join(" ") : "empty";

    // Only log interesting zones to reduce noise
    if (hasHighYield || hasLowYield || hasAnimals) {
      next = appendLog(next, {
        tick: next.tick,
        source: "geologist",
        message: `Scanned ${targetZone.id} — ${detail}`
      });
    }

    // Move to next zone
    geo.state = "idle";
    geo.targetZone = null;
  }

  if (geo.state === "returning") {
    const moved = moveTowards(geo, next.homeBase.x, next.homeBase.z, dtMs);
    const arrived =
      distance2D(moved.x, moved.z, next.homeBase.x, next.homeBase.z) <=
      ARRIVAL_THRESHOLD + ZONE_SIZE * 0.15;

    geo.x = moved.x;
    geo.z = moved.z;

    if (arrived) {
      geo.state = "idle";
      next.surveyComplete = true;
      next = appendLog(next, {
        tick: next.tick,
        source: "system",
        message: "Geologist docked. Full survey data transmitted to mothership. Initiating strategic planning..."
      });
    }
  }

  return next;
}
