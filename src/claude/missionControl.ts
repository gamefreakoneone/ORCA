import { MissionControlResponse, MissionControlResult } from "./schemas";
import { ClaudeWorldSummary } from "../simulation/worldModel";

const SYSTEM_PROMPT = `You are the mission control AI for an underwater mining swarm. You coordinate 3-5 autonomous submarines collecting polymetallic nodules from the ocean floor while protecting marine life.

You receive a world state summary every few seconds. You return JSON commands to coordinate the swarm.

RULES:
1. NEVER send a robot to a zone with animals >= 6. Mark those zones as "avoid".
2. If a zone has minerals >= 7 and animals <= 3, it is high-value. Assign 2-3 robots to nearby zones to assist.
3. If a robot's cargo >= 4 (of max 5), order it to return to base.
4. Never assign two robots to the same zone (check claimedBy).
5. Prioritize zones with highest mineral density first.
6. If no good targets remain, set robots to patrol unexplored ("unknown") zones.
7. Keep robots spread out — avoid clustering unless assisting a rich area.

Return ONLY a JSON object with this exact schema:
{
  "assignments": [
    {
      "robot_id": "sub_1",
      "action": "move_to_target" | "return_to_base" | "patrol" | "avoid_zone" | "hold",
      "target_zone": "zone_3_4" | null,
      "reason": "short explanation"
    }
  ],
  "zone_updates": [
    {
      "zone_id": "zone_5_2",
      "new_status": "avoid" | "mine",
      "reason": "short explanation"
    }
  ],
  "alerts": [
    "Free text alert for the mission log, e.g. 'Rich deposit found in sector 3-4, dispatching reinforcements'"
  ]
}`;

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (!isEscaped && char === "\"") {
        inString = false;
      }
      isEscaped = !isEscaped && char === "\\";
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function isMissionControlResponse(value: unknown): value is MissionControlResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.assignments) && Array.isArray(candidate.zone_updates) && Array.isArray(candidate.alerts);
}

export async function requestMissionControl(
  worldSummary: ClaudeWorldSummary,
  apiKey: string
): Promise<MissionControlResult> {
  const trimmedApiKey = apiKey.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };

  if (trimmedApiKey) {
    headers["x-api-key"] = trimmedApiKey;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: JSON.stringify(worldSummary)
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const authHint =
        response.status === 401 || response.status === 403
          ? " Add a valid Anthropic API key in the sidebar for local browser demos."
          : "";
      return {
        ok: false,
        error: `Mission control request failed with ${response.status}.${authHint}`,
        rawText: errorText
      };
    }

    const data = (await response.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text ?? "")
      .join("\n");

    const jsonText = extractFirstJsonObject(text);
    if (!jsonText) {
      return {
        ok: false,
        error: "Mission control did not return a JSON object.",
        rawText: text
      };
    }

    const parsed = JSON.parse(jsonText) as unknown;
    if (!isMissionControlResponse(parsed)) {
      return {
        ok: false,
        error: "Mission control returned JSON with the wrong shape.",
        rawText: jsonText
      };
    }

    return {
      ok: true,
      command: parsed,
      rawText: jsonText
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown mission-control error."
    };
  }
}
