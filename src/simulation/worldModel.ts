export const GRID_SIZE = 8;
export const ZONE_SIZE = 6;
export const ROBOT_COUNT = 4;
export const MAX_CARGO = 5;
export const TICK_MS = 200;
export const CLAUDE_INTERVAL_MS = 6000;
export const MINERAL_CYCLE = [0, 3, 6, 9] as const;
export const ANIMAL_CYCLE = [0, 2, 5, 8] as const;

export type ZoneStatus = "unknown" | "mine" | "avoid" | "depleted";
export type RobotState =
  | "idle"
  | "patrol"
  | "moving_to_target"
  | "collecting"
  | "returning"
  | "avoiding";
export type MissionStatus = "editing" | "running" | "completed" | "stopped";
export type LogSource = "claude" | "robot" | "system";
export type EditorMode = "minerals" | "animals";
export type ApiStatus = "idle" | "pending" | "error" | "ready";

export interface Zone {
  id: string;
  x: number;
  z: number;
  minerals: number;
  animals: number;
  status: ZoneStatus;
  claimedBy: string | null;
}

export interface Robot {
  id: string;
  x: number;
  z: number;
  state: RobotState;
  targetZone: string | null;
  cargo: number;
  maxCargo: number;
  speed: number;
}

export interface LogEntry {
  tick: number;
  source: LogSource;
  message: string;
}

export interface WorldState {
  tick: number;
  zones: Zone[];
  robots: Robot[];
  homeBase: { x: number; z: number };
  collectedTotal: number;
  avoidedZones: number;
  missionLog: LogEntry[];
  missionStatus: MissionStatus;
  elapsedMs: number;
  collisionsPrevented: number;
  lastClaudeAt: number;
  apiStatus: ApiStatus;
}

export interface ClaudeWorldSummary {
  tick: number;
  elapsed_ms: number;
  home_base: { x: number; z: number };
  collected_total: number;
  avoided_zones: number;
  robots: Array<{
    id: string;
    state: RobotState;
    cargo: number;
    maxCargo: number;
    target_zone: string | null;
    x: number;
    z: number;
  }>;
  zones: Array<{
    id: string;
    x: number;
    z: number;
    minerals: number;
    animals: number;
    status: ZoneStatus;
    claimed_by: string | null;
  }>;
  recent_log: LogEntry[];
}

const HALF_GRID = ((GRID_SIZE - 1) * ZONE_SIZE) / 2;
const BASE_START_X = -HALF_GRID;

export function zoneIdFromGrid(col: number, row: number): string {
  return `zone_${col}_${row}`;
}

export function gridToWorld(col: number, row: number): { x: number; z: number } {
  return {
    x: BASE_START_X + col * ZONE_SIZE,
    z: BASE_START_X + row * ZONE_SIZE
  };
}

export function parseZoneId(zoneId: string): { col: number; row: number } | null {
  const match = /^zone_(\d+)_(\d+)$/.exec(zoneId);
  if (!match) {
    return null;
  }

  return {
    col: Number(match[1]),
    row: Number(match[2])
  };
}

export function createInitialZones(): Zone[] {
  const zones: Zone[] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const position = gridToWorld(col, row);
      zones.push({
        id: zoneIdFromGrid(col, row),
        x: position.x,
        z: position.z,
        minerals: 0,
        animals: 0,
        status: "unknown",
        claimedBy: null
      });
    }
  }

  return zones;
}

export function createHomeBase(): { x: number; z: number } {
  return {
    x: BASE_START_X - ZONE_SIZE * 1.35,
    z: 0
  };
}

export function createRobot(index: number, homeBase = createHomeBase()): Robot {
  const spread = (index - (ROBOT_COUNT - 1) / 2) * 2.3;
  return {
    id: `sub_${index + 1}`,
    x: homeBase.x,
    z: homeBase.z + spread,
    state: "idle",
    targetZone: null,
    cargo: 0,
    maxCargo: MAX_CARGO,
    speed: 8 + index * 0.25
  };
}

export function createInitialWorld(): WorldState {
  return {
    tick: 0,
    zones: createInitialZones(),
    robots: Array.from({ length: ROBOT_COUNT }, (_, index) => createRobot(index)),
    homeBase: createHomeBase(),
    collectedTotal: 0,
    avoidedZones: 0,
    missionLog: [
      {
        tick: 0,
        source: "system",
        message: "Mission editor ready. Place nodules, mark wildlife, or load the demo scenario."
      }
    ],
    missionStatus: "editing",
    elapsedMs: 0,
    collisionsPrevented: 0,
    lastClaudeAt: -CLAUDE_INTERVAL_MS,
    apiStatus: "idle"
  };
}

function cycleValue(current: number, values: readonly number[]): number {
  const currentIndex = values.indexOf(current);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % values.length;
  return values[nextIndex];
}

function cloneWorld(world: WorldState): WorldState {
  return {
    ...world,
    zones: world.zones.map((zone) => ({ ...zone })),
    robots: world.robots.map((robot) => ({ ...robot })),
    missionLog: [...world.missionLog]
  };
}

export function appendLog(world: WorldState, entry: LogEntry): WorldState {
  const nextLog = [...world.missionLog, entry].slice(-80);
  return {
    ...world,
    missionLog: nextLog
  };
}

export function toggleZoneMinerals(world: WorldState, zoneId: string): WorldState {
  const next = cloneWorld(world);
  next.zones = next.zones.map((zone) => {
    if (zone.id !== zoneId) {
      return zone;
    }

    const minerals = cycleValue(zone.minerals, MINERAL_CYCLE);
    return {
      ...zone,
      minerals,
      status: zone.status === "depleted" ? "unknown" : zone.status,
      claimedBy: null
    };
  });

  return next;
}

export function toggleZoneAnimals(world: WorldState, zoneId: string): WorldState {
  const next = cloneWorld(world);
  next.zones = next.zones.map((zone) => {
    if (zone.id !== zoneId) {
      return zone;
    }

    return {
      ...zone,
      animals: cycleValue(zone.animals, ANIMAL_CYCLE),
      status: zone.status === "depleted" ? "unknown" : zone.status
    };
  });

  return next;
}

export function loadDemoScenario(): WorldState {
  const baseWorld = createInitialWorld();
  const next = cloneWorld(baseWorld);
  const mineralZones = new Map<string, number>([
    [zoneIdFromGrid(4, 3), 9],
    [zoneIdFromGrid(4, 4), 9],
    [zoneIdFromGrid(5, 3), 8],
    [zoneIdFromGrid(5, 4), 7],
    [zoneIdFromGrid(2, 1), 6],
    [zoneIdFromGrid(1, 5), 3],
    [zoneIdFromGrid(6, 6), 6],
    [zoneIdFromGrid(2, 6), 3]
  ]);
  const animalZones = new Map<string, number>([
    [zoneIdFromGrid(6, 3), 8],
    [zoneIdFromGrid(6, 4), 8],
    [zoneIdFromGrid(5, 2), 5]
  ]);

  next.zones = next.zones.map((zone) => ({
    ...zone,
    minerals: mineralZones.get(zone.id) ?? 0,
    animals: animalZones.get(zone.id) ?? 0,
    status: "unknown",
    claimedBy: null
  }));

  return appendLog(
    {
      ...next,
      missionLog: []
    },
    {
      tick: 0,
      source: "system",
      message:
        "Demo scenario loaded: rich deposit online, wildlife conflict staged, and fallback nodules scattered across the field."
    }
  );
}

export function prepareWorldForMission(world: WorldState): WorldState {
  const next = cloneWorld(world);
  next.tick = 0;
  next.elapsedMs = 0;
  next.collectedTotal = 0;
  next.collisionsPrevented = 0;
  next.lastClaudeAt = -CLAUDE_INTERVAL_MS;
  next.apiStatus = "idle";
  next.avoidedZones = 0;
  next.missionStatus = "running";
  next.robots = Array.from({ length: ROBOT_COUNT }, (_, index) => createRobot(index, next.homeBase));
  next.zones = next.zones.map((zone) => ({
    ...zone,
    claimedBy: null,
    status: "unknown"
  }));
  next.missionLog = [
    {
      tick: 0,
      source: "system",
      message: "Mission started. Swarm autonomy engaged and awaiting mission-control guidance."
    }
  ];
  return next;
}

export function stopMission(world: WorldState): WorldState {
  return appendLog(
    {
      ...cloneWorld(world),
      missionStatus: "stopped",
      apiStatus: world.apiStatus === "pending" ? "ready" : world.apiStatus
    },
    {
      tick: world.tick,
      source: "system",
      message: "Mission stopped by operator."
    }
  );
}

export function resetWorld(): WorldState {
  return createInitialWorld();
}

export function checkMissionComplete(world: WorldState): boolean {
  return world.zones.every((zone) => zone.minerals === 0);
}

export function summarizeWorldForClaude(world: WorldState): ClaudeWorldSummary {
  return {
    tick: world.tick,
    elapsed_ms: world.elapsedMs,
    home_base: world.homeBase,
    collected_total: world.collectedTotal,
    avoided_zones: world.avoidedZones,
    robots: world.robots.map((robot) => ({
      id: robot.id,
      state: robot.state,
      cargo: robot.cargo,
      maxCargo: robot.maxCargo,
      target_zone: robot.targetZone,
      x: Number(robot.x.toFixed(2)),
      z: Number(robot.z.toFixed(2))
    })),
    zones: world.zones.map((zone) => ({
      id: zone.id,
      x: zone.x,
      z: zone.z,
      minerals: zone.minerals,
      animals: zone.animals,
      status: zone.status,
      claimed_by: zone.claimedBy
    })),
    recent_log: world.missionLog.slice(-8)
  };
}

export function getZoneById(world: WorldState, zoneId: string | null): Zone | undefined {
  if (!zoneId) {
    return undefined;
  }

  return world.zones.find((zone) => zone.id === zoneId);
}

export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

export function clampToField(value: number): number {
  const min = BASE_START_X - ZONE_SIZE * 1.75;
  const max = HALF_GRID + ZONE_SIZE * 1.25;
  return Math.min(max, Math.max(min, value));
}
