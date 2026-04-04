import { ZoneStatus } from "../simulation/worldModel";

// --- Legacy mission control (kept for compatibility) ---

export type MissionControlAction =
  | "move_to_target"
  | "return_to_base"
  | "patrol"
  | "avoid_zone"
  | "hold";

export interface MissionAssignment {
  robot_id: string;
  action: MissionControlAction;
  target_zone: string | null;
  reason: string;
}

export interface ZoneUpdate {
  zone_id: string;
  new_status: Extract<ZoneStatus, "avoid" | "mine">;
  reason: string;
}

export interface MissionControlResponse {
  assignments: MissionAssignment[];
  zone_updates: ZoneUpdate[];
  alerts: string[];
}

export interface MissionControlSuccess {
  ok: true;
  command: MissionControlResponse;
  rawText: string;
}

export interface MissionControlFailure {
  ok: false;
  error: string;
  rawText?: string;
}

export type MissionControlResult = MissionControlSuccess | MissionControlFailure;

// --- Strategic planner (v2) ---

export interface DeploymentOrder {
  robot_id: string;
  target_zones: string[];
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface StrategicPlanResponse {
  deployment: DeploymentOrder[];
  ignore_zones: string[];
  alerts: string[];
}

export interface StrategicPlanSuccess {
  ok: true;
  plan: StrategicPlanResponse;
  rawText: string;
}

export interface StrategicPlanFailure {
  ok: false;
  error: string;
  rawText?: string;
}

export type StrategicPlanResult = StrategicPlanSuccess | StrategicPlanFailure;

// --- Reallocation (v2 re-query) ---

export interface ReallocationOrder {
  robot_id: string;
  action: "move_to_target" | "return_to_base" | "patrol" | "hold";
  target_zone: string | null;
  reason: string;
}

export interface ReallocationResponse {
  orders: ReallocationOrder[];
  alerts: string[];
}

export interface ReallocationSuccess {
  ok: true;
  reallocation: ReallocationResponse;
  rawText: string;
}

export interface ReallocationFailure {
  ok: false;
  error: string;
  rawText?: string;
}

export type ReallocationResult = ReallocationSuccess | ReallocationFailure;
