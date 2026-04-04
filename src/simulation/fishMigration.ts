import {
  GRID_SIZE,
  FISH_MIGRATION_INTERVAL,
  FISH_MIGRATION_CHANCE,
  FISH_DISPERSE_NEAR_ROBOT_TICKS,
  WorldState,
  parseZoneId,
  zoneIdFromGrid,
  distance2D,
  appendLog
} from "./worldModel";

function getAdjacentZoneIds(zoneId: string): string[] {
  const parsed = parseZoneId(zoneId);
  if (!parsed) return [];

  const { col, row } = parsed;
  const neighbors: string[] = [];

  if (col > 0) neighbors.push(zoneIdFromGrid(col - 1, row));
  if (col < GRID_SIZE - 1) neighbors.push(zoneIdFromGrid(col + 1, row));
  if (row > 0) neighbors.push(zoneIdFromGrid(col, row - 1));
  if (row < GRID_SIZE - 1) neighbors.push(zoneIdFromGrid(col, row + 1));

  return neighbors;
}

export function runFishMigration(world: WorldState): WorldState {
  let next = {
    ...world,
    zones: world.zones.map((z) => ({ ...z })),
    fishMigrationTimer: world.fishMigrationTimer + 1,
    missionLog: [...world.missionLog]
  };

  // Fish disperse near robots
  for (const zone of next.zones) {
    if (zone.animals <= 0) {
      zone.fishPresenceTicks = 0;
      continue;
    }

    // Check if any robot is in this zone
    const robotInZone = next.robots.some(
      (r) => r.role === "worker" && distance2D(r.x, r.z, zone.x, zone.z) < 3.5
    );

    if (robotInZone) {
      zone.fishPresenceTicks += 1;
      if (zone.fishPresenceTicks >= FISH_DISPERSE_NEAR_ROBOT_TICKS) {
        const dispersed = zone.animals;
        zone.animals = 0;
        zone.fishPresenceTicks = 0;
        if (dispersed > 0) {
          next = appendLog(next, {
            tick: next.tick,
            source: "system",
            message: `🐟 Fish school in ${zone.id} dispersed — scared off by nearby submarine.`
          });
        }
      }
    } else {
      zone.fishPresenceTicks = 0;
    }
  }

  // Periodic migration
  if (next.fishMigrationTimer < FISH_MIGRATION_INTERVAL) {
    return next;
  }

  next.fishMigrationTimer = 0;

  for (const zone of next.zones) {
    if (zone.animals <= 0) continue;

    if (Math.random() > FISH_MIGRATION_CHANCE) continue;

    const neighbors = getAdjacentZoneIds(zone.id);
    if (neighbors.length === 0) continue;

    const targetId = neighbors[Math.floor(Math.random() * neighbors.length)];
    const targetZone = next.zones.find((z) => z.id === targetId);
    if (!targetZone) continue;

    // Move some fish
    const migrating = Math.max(1, Math.floor(zone.animals / 2));
    zone.animals -= migrating;
    targetZone.animals += migrating;

    next = appendLog(next, {
      tick: next.tick,
      source: "system",
      message: `🐟 ${migrating} fish migrated from ${zone.id} → ${targetZone.id}`
    });
  }

  return next;
}
