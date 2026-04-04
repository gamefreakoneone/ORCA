import { ZoneStatus } from "../simulation/worldModel";

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
