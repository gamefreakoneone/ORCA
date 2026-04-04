import {
  appendLog,
  checkMissionComplete,
  ClaudeWorldSummary,
  summarizeWorldForClaude,
  WorldState,
  CLAUDE_INTERVAL_MS
} from "./worldModel";
import { applyCollisionAvoidance } from "./collisionAvoidance";
import { runRobotFSM } from "./robotFSM";
import { MissionControlResult } from "../claude/schemas";

export interface PendingMissionControlRequest {
  world: WorldState;
  summary: ClaudeWorldSummary;
  apiKey: string;
}

function recomputeAvoidedZones(world: WorldState): number {
  return world.zones.filter((zone) => zone.status === "avoid").length;
}

function releaseRobotClaims(world: WorldState, robotId: string, zoneId: string | null): void {
  if (!zoneId) {
    return;
  }

  const zone = world.zones.find((candidate) => candidate.id === zoneId);
  if (zone && zone.claimedBy === robotId) {
    zone.claimedBy = null;
  }
}

export function tickWorld(world: WorldState, dtMs: number): WorldState {
  if (world.missionStatus !== "running") {
    return world;
  }

  let next = runRobotFSM(world, dtMs);
  next = applyCollisionAvoidance(next);
  next = {
    ...next,
    tick: next.tick + 1,
    elapsedMs: next.elapsedMs + dtMs,
    avoidedZones: recomputeAvoidedZones(next)
  };

  if (checkMissionComplete(next)) {
    next = appendLog(
      {
        ...next,
        missionStatus: "completed",
        apiStatus: next.apiStatus === "pending" ? "ready" : next.apiStatus
      },
      {
        tick: next.tick,
        source: "system",
        message: "Mission complete. All known mineral deposits have been cleared."
      }
    );
  }

  return next;
}

export function prepareMissionControlRequest(
  world: WorldState,
  apiKey: string
): PendingMissionControlRequest | null {
  if (world.missionStatus !== "running") {
    return null;
  }

  if (world.apiStatus === "pending") {
    return null;
  }

  if (world.elapsedMs - world.lastClaudeAt < CLAUDE_INTERVAL_MS) {
    return null;
  }

  const nextWorld = appendLog(
    {
      ...world,
      lastClaudeAt: world.elapsedMs,
      apiStatus: "pending"
    },
    {
      tick: world.tick,
      source: "system",
      message: "Mission control snapshot transmitted."
    }
  );

  return {
    world: nextWorld,
    summary: summarizeWorldForClaude(nextWorld),
    apiKey
  };
}

export function applyMissionControlResult(
  world: WorldState,
  result: MissionControlResult
): WorldState {
  let next: WorldState = {
    ...world,
    zones: world.zones.map((zone) => ({ ...zone })),
    robots: world.robots.map((robot) => ({ ...robot })),
    missionLog: [...world.missionLog],
    apiStatus: result.ok ? "ready" : "error"
  };

  if (!result.ok) {
    return appendLog(next, {
      tick: next.tick,
      source: "system",
      message: `Mission control unavailable: ${result.error}`
    });
  }

  for (const update of result.command.zone_updates) {
    const zone = next.zones.find((candidate) => candidate.id === update.zone_id);
    if (!zone) {
      continue;
    }

    zone.status = update.new_status;
    if (update.new_status === "avoid") {
      zone.claimedBy = null;
    }

    next = appendLog(next, {
      tick: next.tick,
      source: "claude",
      message: `${update.zone_id} marked ${update.new_status}: ${update.reason}`
    });
  }

  for (const assignment of result.command.assignments) {
    const robot = next.robots.find((candidate) => candidate.id === assignment.robot_id);
    if (!robot) {
      continue;
    }

    if (assignment.action === "hold") {
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} holding position. ${assignment.reason}`
      });
      continue;
    }

    if (assignment.action === "return_to_base") {
      releaseRobotClaims(next, robot.id, robot.targetZone);
      robot.targetZone = null;
      robot.state = "returning";
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} returning to base. ${assignment.reason}`
      });
      continue;
    }

    if (assignment.action === "patrol") {
      releaseRobotClaims(next, robot.id, robot.targetZone);
      robot.targetZone = null;
      robot.state = "patrol";
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} dispatched to patrol. ${assignment.reason}`
      });
      continue;
    }

    if (assignment.action === "avoid_zone") {
      if (assignment.target_zone) {
        const zone = next.zones.find((candidate) => candidate.id === assignment.target_zone);
        if (zone) {
          zone.status = "avoid";
          zone.claimedBy = null;
        }
      }
      releaseRobotClaims(next, robot.id, robot.targetZone);
      robot.targetZone = assignment.target_zone;
      robot.state = "avoiding";
      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} diverting away from ${assignment.target_zone ?? "the flagged area"}. ${assignment.reason}`
      });
      continue;
    }

    if (assignment.action === "move_to_target" && assignment.target_zone) {
      const zone = next.zones.find((candidate) => candidate.id === assignment.target_zone);
      if (!zone) {
        continue;
      }

      if (zone.animals >= 6 || zone.status === "avoid") {
        continue;
      }

      if (zone.claimedBy && zone.claimedBy !== robot.id) {
        continue;
      }

      releaseRobotClaims(next, robot.id, robot.targetZone);
      zone.claimedBy = robot.id;
      zone.status = zone.status === "depleted" ? "unknown" : "mine";
      robot.targetZone = zone.id;
      robot.state = "moving_to_target";

      next = appendLog(next, {
        tick: next.tick,
        source: "claude",
        message: `${robot.id} targeting ${zone.id}. ${assignment.reason}`
      });
    }
  }

  for (const alert of result.command.alerts) {
    next = appendLog(next, {
      tick: next.tick,
      source: "claude",
      message: alert
    });
  }

  next.avoidedZones = recomputeAvoidedZones(next);
  return next;
}
