import {
  StrategicPlanResponse,
  StrategicPlanResult,
  ReallocationResponse,
  ReallocationResult
} from "./schemas";
import {
  ClaudeWorldSummary,
  WORKER_COUNT
} from "../simulation/worldModel";

const STRATEGIC_PLANNER_PROMPT = `You are the strategic mining planner for an underwater swarm operation.

A geologist robot has completed a survey of the entire ocean floor grid. You will receive the full survey data showing:
- Each zone's HIGH_YIELD ore count (high-value, worth 3x points) and LOW_YIELD ore count (low-value, worth 1x points)
- Current fish/wildlife presence in each zone
- Zone coordinates (x, z)

You have ${WORKER_COUNT} worker robots to deploy. Each worker has a battery (100%) that drains during movement and collection. Workers only return to base when battery is FULLY EXHAUSTED (0%).

Create an optimal mining plan. Each submarine gets its OWN individual plan — an ordered list of zones to visit.

RULES:
1. Prioritize zones with HIGH_YIELD ore — they are 3x more valuable than LOW_YIELD ore.
2. NEVER send workers to zones with animals >= 6 (add those to ignore_zones).
3. Send multiple workers to adjacent high-value zones to create efficient mining clusters.
4. Ignore zones with fewer than 2 total minerals (not worth the battery cost).
5. Plan efficient route orders — each robot's target_zones should form a geographically logical path to minimize battery waste on travel.
6. Fish can migrate — note zones near current fish as risky but don't avoid entirely if valuable.
7. Workers drain to 0% battery then MUST return — plan routes so they don't strand far from base. Put nearer zones later in the route so the return trip is shorter.
8. Each zone can contain BOTH high_yield AND low_yield ore AND fish simultaneously.
9. Coordinate the robots — don't send two workers to the same zone. Spread them across different high-value areas.

Return ONLY a JSON object with this schema:
{
  "deployment": [
    {
      "robot_id": "sub_1",
      "target_zones": ["zone_4_3", "zone_4_4", "zone_5_3"],
      "priority": "high",
      "reason": "Rich high-yield deposit cluster in sectors 4-3 through 5-3"
    }
  ],
  "ignore_zones": ["zone_6_3"],
  "alerts": ["Strategic note: main high-yield vein in eastern sectors"]
}`;

const REALLOCATION_PROMPT = `You are the mission control AI for an underwater mining swarm.

Some worker robots have become IDLE (finished their assigned zones or just recharged). There are still minerals remaining on the grid. You need to issue NEW orders to the idle robots.

Current situation:
- Some robots may be actively mining (do NOT reassign them)
- Some robots may be recharging at base (they will need orders when ready)
- Fish may have migrated since the original plan

Issue orders ONLY for idle/available robots. Consider:
1. Send idle workers to zones with remaining high_yield ore first (3x value)
2. Don't conflict with robots already mining a zone
3. If a zone has animals >= 6, mark it as avoid
4. Plan efficient routes from the robot's current position

Return ONLY a JSON object:
{
  "orders": [
    {
      "robot_id": "sub_1",
      "action": "move_to_target",
      "target_zone": "zone_2_6",
      "reason": "Remaining low-yield deposit, closest to current position"
    }
  ],
  "alerts": ["Redirecting sub_1 to mop up remaining deposits"]
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

function isStrategicPlanResponse(value: unknown): value is StrategicPlanResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.deployment) && Array.isArray(candidate.ignore_zones) && Array.isArray(candidate.alerts);
}

function isReallocationResponse(value: unknown): value is ReallocationResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.orders) && Array.isArray(candidate.alerts);
}

async function callClaude(systemPrompt: string, userContent: string, apiKey: string): Promise<{ text: string } | { error: string }> {
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
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userContent
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
          ? " Add a valid Anthropic API key in the sidebar."
          : "";
      return { error: `Request failed with ${response.status}.${authHint} ${errorText.slice(0, 200)}` };
    }

    const data = (await response.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text ?? "")
      .join("\n");

    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error." };
  }
}

export async function requestStrategicPlan(
  worldSummary: ClaudeWorldSummary,
  apiKey: string
): Promise<StrategicPlanResult> {
  const result = await callClaude(
    STRATEGIC_PLANNER_PROMPT,
    JSON.stringify(worldSummary),
    apiKey
  );

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const jsonText = extractFirstJsonObject(result.text);
  if (!jsonText) {
    return { ok: false, error: "Claude did not return a JSON object.", rawText: result.text };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isStrategicPlanResponse(parsed)) {
      return { ok: false, error: "Claude returned JSON with wrong shape.", rawText: jsonText };
    }
    return { ok: true, plan: parsed, rawText: jsonText };
  } catch {
    return { ok: false, error: "Failed to parse JSON response.", rawText: jsonText };
  }
}

export async function requestReallocation(
  worldSummary: ClaudeWorldSummary,
  apiKey: string
): Promise<ReallocationResult> {
  const result = await callClaude(
    REALLOCATION_PROMPT,
    JSON.stringify(worldSummary),
    apiKey
  );

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const jsonText = extractFirstJsonObject(result.text);
  if (!jsonText) {
    return { ok: false, error: "Claude did not return a JSON object.", rawText: result.text };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isReallocationResponse(parsed)) {
      return { ok: false, error: "Claude returned JSON with wrong shape.", rawText: jsonText };
    }
    return { ok: true, reallocation: parsed, rawText: jsonText };
  } catch {
    return { ok: false, error: "Failed to parse JSON response.", rawText: jsonText };
  }
}
