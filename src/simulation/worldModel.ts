export const GRID_SIZE = 8;
export const ZONE_SIZE = 6;
export const ROBOT_COUNT = 4; // 1 geologist + 3 workers
export const WORKER_COUNT = 3;
export const MAX_CARGO = 5;
export const TICK_MS = 200;
export const CLAUDE_INTERVAL_MS = 6000;

// Mineral editor cycles
export const COBALT_CYCLE = [0, 2, 4, 6] as const;
export const MANGANESE_CYCLE = [0, 3, 5, 8] as const;
export const ANIMAL_CYCLE = [0, 2, 5, 8] as const;

// Battery
export const MAX_BATTERY = 100;
export const BATTERY_DRAIN_MOVE = 0.15;
export const BATTERY_DRAIN_COLLECT = 0.3;

// Fish migration
export const FISH_MIGRATION_INTERVAL = 40;
export const FISH_MIGRATION_CHANCE = 0.3;
export const FISH_DISPERSE_NEAR_ROBOT_TICKS = 8;

export type ZoneStatus = "unknown" | "mine" | "avoid" | "depleted" | "surveyed";
export type RobotState =
  | "idle"
  | "patrol"
  | "moving_to_target"
  | "collecting"
  | "returning"
  | "avoiding"
  | "waiting"
  | "surveying"
  | "recharging";
export type MissionStatus = "editing" | "running" | "completed" | "stopped";
export type MissionPhase = "scouting" | "planning" | "mining";
export type LogSource = "claude" | "robot" | "system" | "geologist";
export type EditorMode = "cobalt" | "manganese" | "animals";
export type ApiStatus = "idle" | "pending" | "error" | "ready";
export type RobotRole = "geologist" | "worker";

export interface Zone {
  id: string;
  x: number;
  z: number;
  cobalt: number;
  manganese: number;
  animals: number;
  status: ZoneStatus;
  claimedBy: string | null;
  surveyed: boolean;
  fishPresenceTicks: number; // how many ticks fish have been near a robot here
}

export interface DeploymentOrder {
  robot_id: string;
  target_zones: string[];
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface MiningPlan {
  deployment: DeploymentOrder[];
  ignore_zones: string[];
  alerts: string[];
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
  role: RobotRole;
  battery: number;
  maxBattery: number;
  assignedPlan: string[]; // ordered list of zone IDs to visit
  planIndex: number; // current index in assignedPlan
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
  collectedCobalt: number;
  collectedManganese: number;
  collectedTotal: number;
  avoidedZones: number;
  missionLog: LogEntry[];
  missionStatus: MissionStatus;
  missionPhase: MissionPhase;
  elapsedMs: number;
  collisionsPrevented: number;
  lastClaudeAt: number;
  apiStatus: ApiStatus;
  surveyComplete: boolean;
  miningPlan: MiningPlan | null;
  fishMigrationTimer: number;
  surveyedCount: number;
}

export interface ClaudeWorldSummary {
  tick: number;
  elapsed_ms: number;
  home_base: { x: number; z: number };
  collected_cobalt: number;
  collected_manganese: number;
  collected_total: number;
  avoided_zones: number;
  mission_phase: MissionPhase;
  robots: Array<{
    id: string;
    role: RobotRole;
    state: RobotState;
    cargo: number;
    maxCargo: number;
    battery: number;
    target_zone: string | null;
    x: number;
    z: number;
  }>;
  zones: Array<{
    id: string;
    x: number;
    z: number;
    cobalt: number;
    manganese: number;
    animals: number;
    status: ZoneStatus;
    claimed_by: string | null;
    surveyed: boolean;
  }>;
  recent_log: LogEntry[];
}

const HALF_GRID = ((GRID_SIZE - 1) * ZONE_SIZE) / 2;
const BASE_START_X = -HALF_GRID;

export function totalMinerals(zone: Zone): number {
  return zone.cobalt + zone.manganese;
}

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
        cobalt: 0,
        manganese: 0,
        animals: 0,
        status: "unknown",
        claimedBy: null,
        surveyed: false,
        fishPresenceTicks: 0
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
  const isGeologist = index === 0;
  const spread = (index - (ROBOT_COUNT - 1) / 2) * 2.3;
  return {
    id: isGeologist ? "geo_1" : `sub_${index}`,
    x: homeBase.x,
    z: homeBase.z + spread,
    state: "idle",
    targetZone: null,
    cargo: 0,
    maxCargo: isGeologist ? 0 : MAX_CARGO,
    speed: isGeologist ? 12 : 8 + (index - 1) * 0.25,
    role: isGeologist ? "geologist" : "worker",
    battery: MAX_BATTERY,
    maxBattery: MAX_BATTERY,
    assignedPlan: [],
    planIndex: 0
  };
}

export function createInitialWorld(): WorldState {
  return {
    tick: 0,
    zones: createInitialZones(),
    robots: Array.from({ length: ROBOT_COUNT }, (_, index) => createRobot(index)),
    homeBase: createHomeBase(),
    collectedCobalt: 0,
    collectedManganese: 0,
    collectedTotal: 0,
    avoidedZones: 0,
    missionLog: [
      {
        tick: 0,
        source: "system",
        message: "Mission editor ready. Place cobalt, manganese, mark wildlife, or load the demo scenario."
      }
    ],
    missionStatus: "editing",
    missionPhase: "scouting",
    elapsedMs: 0,
    collisionsPrevented: 0,
    lastClaudeAt: -CLAUDE_INTERVAL_MS,
    apiStatus: "idle",
    surveyComplete: false,
    miningPlan: null,
    fishMigrationTimer: 0,
    surveyedCount: 0
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
    robots: world.robots.map((robot) => ({ ...robot, assignedPlan: [...robot.assignedPlan] })),
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

export function toggleZoneCobalt(world: WorldState, zoneId: string): WorldState {
  const next = cloneWorld(world);
  next.zones = next.zones.map((zone) => {
    if (zone.id !== zoneId) {
      return zone;
    }

    const cobalt = cycleValue(zone.cobalt, COBALT_CYCLE);
    return {
      ...zone,
      cobalt,
      status: zone.status === "depleted" ? "unknown" : zone.status,
      claimedBy: null
    };
  });

  return next;
}

export function toggleZoneManganese(world: WorldState, zoneId: string): WorldState {
  const next = cloneWorld(world);
  next.zones = next.zones.map((zone) => {
    if (zone.id !== zoneId) {
      return zone;
    }

    const manganese = cycleValue(zone.manganese, MANGANESE_CYCLE);
    return {
      ...zone,
      manganese,
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

  // Cobalt deposits (high-value)
  const cobaltZones = new Map<string, number>([
    [zoneIdFromGrid(4, 3), 6],
    [zoneIdFromGrid(4, 4), 4],
    [zoneIdFromGrid(5, 3), 4],
    [zoneIdFromGrid(5, 4), 2],
    [zoneIdFromGrid(2, 1), 2]
  ]);

  // Manganese deposits (low-value)
  const manganeseZones = new Map<string, number>([
    [zoneIdFromGrid(4, 3), 3],
    [zoneIdFromGrid(5, 3), 5],
    [zoneIdFromGrid(1, 5), 8],
    [zoneIdFromGrid(6, 6), 5],
    [zoneIdFromGrid(2, 6), 3],
    [zoneIdFromGrid(3, 1), 5],
    [zoneIdFromGrid(7, 2), 3]
  ]);

  // Fish / wildlife
  const animalZones = new Map<string, number>([
    [zoneIdFromGrid(6, 3), 8],
    [zoneIdFromGrid(6, 4), 5],
    [zoneIdFromGrid(5, 2), 2],
    [zoneIdFromGrid(3, 5), 5]
  ]);

  next.zones = next.zones.map((zone) => ({
    ...zone,
    cobalt: cobaltZones.get(zone.id) ?? 0,
    manganese: manganeseZones.get(zone.id) ?? 0,
    animals: animalZones.get(zone.id) ?? 0,
    status: "unknown",
    claimedBy: null,
    surveyed: false
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
        "Demo scenario loaded: cobalt & manganese deposits staged, wildlife zones active, multi-phase mission ready."
    }
  );
}

export function prepareWorldForMission(world: WorldState): WorldState {
  const next = cloneWorld(world);
  next.tick = 0;
  next.elapsedMs = 0;
  next.collectedCobalt = 0;
  next.collectedManganese = 0;
  next.collectedTotal = 0;
  next.collisionsPrevented = 0;
  next.lastClaudeAt = -CLAUDE_INTERVAL_MS;
  next.apiStatus = "idle";
  next.avoidedZones = 0;
  next.missionStatus = "running";
  next.missionPhase = "scouting";
  next.surveyComplete = false;
  next.miningPlan = null;
  next.fishMigrationTimer = 0;
  next.surveyedCount = 0;
  next.robots = Array.from({ length: ROBOT_COUNT }, (_, index) => createRobot(index, next.homeBase));
  next.zones = next.zones.map((zone) => ({
    ...zone,
    claimedBy: null,
    status: "unknown",
    surveyed: false,
    fishPresenceTicks: 0
  }));
  next.missionLog = [
    {
      tick: 0,
      source: "system",
      message: "Mission started. Geologist deploying for ocean floor survey. Workers standing by at mothership."
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
  if (world.missionPhase !== "mining") return false;
  return world.zones.every((zone) => zone.cobalt === 0 && zone.manganese === 0);
}

export function summarizeWorldForClaude(world: WorldState): ClaudeWorldSummary {
  return {
    tick: world.tick,
    elapsed_ms: world.elapsedMs,
    home_base: world.homeBase,
    collected_cobalt: world.collectedCobalt,
    collected_manganese: world.collectedManganese,
    collected_total: world.collectedTotal,
    avoided_zones: world.avoidedZones,
    mission_phase: world.missionPhase,
    robots: world.robots.map((robot) => ({
      id: robot.id,
      role: robot.role,
      state: robot.state,
      cargo: robot.cargo,
      maxCargo: robot.maxCargo,
      battery: Math.round(robot.battery),
      target_zone: robot.targetZone,
      x: Number(robot.x.toFixed(2)),
      z: Number(robot.z.toFixed(2))
    })),
    zones: world.zones
      .filter((zone) => zone.surveyed)
      .map((zone) => ({
        id: zone.id,
        x: zone.x,
        z: zone.z,
        cobalt: zone.cobalt,
        manganese: zone.manganese,
        animals: zone.animals,
        status: zone.status,
        claimed_by: zone.claimedBy,
        surveyed: zone.surveyed
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

export function getWorkers(world: WorldState): Robot[] {
  return world.robots.filter((r) => r.role === "worker");
}

export function getGeologist(world: WorldState): Robot | undefined {
  return world.robots.find((r) => r.role === "geologist");
}

export function getIdleWorkers(world: WorldState): Robot[] {
  return getWorkers(world).filter(
    (r) => r.state === "idle" && r.battery > 0
  );
}

export function hasRemainingResources(world: WorldState): boolean {
  return world.zones.some((z) => z.surveyed && (z.cobalt > 0 || z.manganese > 0) && z.status !== "avoid");
}
