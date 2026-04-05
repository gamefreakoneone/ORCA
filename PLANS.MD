# ORCA v2 — Progress Notes

## Current Status

Multi-phase autonomous mining simulation with geologist scouting, Claude strategic planning, worker bots with battery mechanics, and dynamic fish migration. Built as Vite + React + TypeScript.

## What Has Been Built

### v2 Architecture: Multi-Phase Mission

**Phase 1 — SCOUTING**: A geologist robot autonomously surveys the entire 8×8 grid using a spiral-from-center sweep. It scans each zone for High Yield ore (high-value), Low Yield ore (low-value), and fish. Workers remain idle at the mothership. No Claude calls during this phase.

**Phase 2 — STRATEGIC PLANNING**: Once the survey is complete, the mothership transmits the full geological report to Claude. Claude creates a targeted mining plan — each worker submarine gets its own ordered list of zones to visit, with priority assignments and ignored zones. This is a single, token-efficient API call.

**Phase 3 — MINING OPERATIONS**: Workers deploy according to Claude's plan. They mine High Yield ore first (3x value), then Low Yield ore. Battery drains during movement and collection. When exhausted (0%), bots return to base for a full recharge. Fish schools migrate randomly between grids and block new robot entry. When workers become idle with remaining resources, Claude is re-queried for lightweight reallocation orders. **Once all minerals are extracted, all workers return to the mothership for final docking.**

### World Model (worldModel.ts)
- **Dual Minerals**: High Yield Ore (high-value, 3x score) and Low Yield Ore (low-value, 1x score)
- **Each zone** can hold High Yield ore + Low Yield ore + fish simultaneously
- **Robot Roles**: Geologist (1 scout, cyan, faster) and Workers (3 miners)
- **Battery System**: 100% capacity, drains on move (0.15/tick) and collect (0.3/tick), exhaustion triggers forced return, full recharge at base
- **Survey Tracking**: Each zone has `surveyed` flag; world tracks `surveyedCount`
- **Mission Phases**: `scouting` → `planning` → `mining`
- **Per-Sub Plans**: Each worker carries an `assignedPlan` (ordered zone list) and `planIndex`

### 3D Robot Models (SubmarineModel.tsx)
- **Geologist — Classic Submarine**: Elongated capsule hull, conning tower, periscope/sensor mast with dome, bow sonar dome, propeller housing, dive planes (horizontal fins), vertical tail fin, cyan point light. Subtle roll animation while moving.
- **Workers — Mining Cube Bots**: Box-shaped body with top sensor panel, indicator light, side panel details, and **4 tentacle grabber arms** at the bottom corners. Each arm has an upper segment, joint sphere, lower segment, and two-prong claw tips. Tentacles animate with gentle sway when idle and **faster sway when collecting**. Color shifts to orange/red on low battery. Floating 3D battery bar above.

### Geologist FSM (geologistFSM.ts)
- Spiral sweep from center of grid outward
- Marks zones as `surveyed` on arrival
- Logs interesting findings (HY = High Yield, LY = Low Yield, fish)
- Returns to mothership when all 64 zones scanned
- Triggers `surveyComplete` flag on docking

### Worker FSM (robotFSM.ts)
- Follows assigned plan from Claude (ordered zone list)
- Falls back to score-based patrol when plan is exhausted
- Scoring: `(highYield * 6) + (lowYield * 2) - (distance * 0.18)`
- Battery drain per tick during movement and collection
- Forced return on exhaustion (battery = 0), instant full recharge
- Fish blocking: `waiting` state when target zone has fish
- High Yield ore prioritized over Low Yield during collection
- Plan index advances when a zone is depleted
- **Autonomous return to mothership** when no mineral targets remain in the surveyed field

### Fish Migration (fishMigration.ts)
- Schools randomly migrate to adjacent zones every 40 ticks
- 30% chance per school per migration cycle
- Fish disperse after 8 ticks near a robot (robots scare them)
- Workers already mining continue when fish arrive, but no new bots can enter
- Fish color: **blue** when < 6 animals (safe), **red** when ≥ 6 (dangerous/blocked zone)

### Claude Strategic Planner (missionControl.ts)
- **`requestStrategicPlan()`**: Called once after survey. Claude receives full survey grid and returns deployment orders per worker.
- **`requestReallocation()`**: Called when idle workers exist and resources remain. Lightweight re-query with current grid status.
- Token-efficient: 1 strategic call + N small reallocation calls vs. old model (polling every 6s)
- Fallback: if no API key provided, workers deploy in autonomous patrol mode

### 3D Presentation
- **High Yield Ore**: Gold/amber glowing dodecahedrons with rotation
- **Low Yield Ore**: Teal matte spheres with rotation
- **Geologist sub**: Classic submarine shape — elongated hull, conning tower, sonar dome, fins
- **Worker bots**: Cube body with 4 animated tentacle grabbers — sway faster when mining
- **Battery bars**: Floating 3D bars above each worker bot
- **Fish**: Swimming bob/sway animation, red when dangerous (≥6), blue when safe
- **Zone overlays**: Fog-of-war (unsurveyed), surveyed pulse, fish-blocked warning, mine/avoid/depleted
- Grid, ocean floor, home base, target lines

### UI & Mission Visibility
- **Phase display**: Current phase shown in HUD banner and dashboard
- **Survey progress bar**: Fills during scouting phase
- **Claude spinner**: Shows during strategic planning phase
- **Mineral breakdown**: High Yield + Low Yield collected, score = (HY×3 + LY)
- **Robot cards**: Role badges (GEO/WKR), battery bars, state, target
- **Mining plan display**: Shows Claude's deployment per worker, priorities, ignored zones, alerts
- **Editor**: Three toggle modes (High Yield, Low Yield, Wildlife)
- **Mission log**: Color-coded entries (system=gold, claude=teal, geologist=cyan)
- **Mission summary**: Full breakdown on completion/stop

## Demo Flow

1. Launch the app
2. Paste Anthropic API key
3. Click `Load Demo Scenario` (sets up mixed High/Low Yield deposits with fish)
4. Click `Start Mission`
5. **Watch Phase 1**: Geologist submarine spirals out from center, scanning zones, fog lifts
6. **Watch Phase 2**: Claude analyzes survey (spinner), plan appears in sidebar
7. **Watch Phase 3**: Worker cube bots deploy to assigned sectors, tentacles animate while mining
8. Fish migrate randomly, occasionally blocking zones
9. Workers exhaust battery → return to base → recharge → get reallocated by Claude
10. **Return Phase**: Once last crystal is mined, system logs return status
11. **Mission Complete**: Simulation ends only after all workers dock at mothership

## Useful Project Files

- `src/App.tsx` — Phase orchestration, Claude call triggers
- `src/simulation/worldModel.ts` — Types, constants, world state
- `src/simulation/geologistFSM.ts` — Geologist spiral sweep
- `src/simulation/robotFSM.ts` — Worker FSM with battery
- `src/simulation/fishMigration.ts` — Fish migration system
- `src/simulation/tickEngine.ts` — Phase-aware tick loop
- `src/simulation/collisionAvoidance.ts` — Robot collision avoidance
- `src/claude/missionControl.ts` — Claude API integration
- `src/claude/schemas.ts` — Response type definitions
- `src/components/Scene.tsx` — 3D scene layout
- `src/components/SubmarineModel.tsx` — Geologist submarine + worker cube bot models
- `src/components/MineralCluster.tsx` — High/Low Yield ore visuals
- `src/components/AnimalCluster.tsx` — Fish clusters
- `src/components/ZoneOverlay.tsx` — Zone status overlays
- `src/ui/ControlPanel.tsx` — Main sidebar
- `src/ui/MissionDashboard.tsx` — Robot cards, stats
- `src/ui/MiningPlanDisplay.tsx` — Claude's plan display
- `src/ui/EditorControls.tsx` — Scenario editor
- `src/ui/MissionSummary.tsx` — End-of-mission stats
- `src/ui/CommandLog.tsx` — Mission log

## Verification

- `npm run build` — ✅ TypeScript compiles cleanly, Vite builds successfully
- Browser tested — all 3 phases work, models render correctly, labels updated
- Bundle: ~1.1MB (Three.js heavy, acceptable for demo)
