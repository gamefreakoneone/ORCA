# AquaSwarm Progress Notes

## Current Status

The project has been scaffolded as a Vite + React + TypeScript single-page app in the repo root.
The core demo loop is implemented and builds successfully with `npm run build`.

## What Has Been Built

### App foundation
- Vite configuration and TypeScript project setup
- React app entry point and global styling
- Split-screen layout with 3D viewport and right-side control panel

### Simulation layer
- **World Constants**: 8x8 grid of 6m² zones; 4 robots with max cargo of 5; 200ms simulation ticks.
- **Claude Polling**: Remote mission control is queried every 6 seconds (`6000ms`) to minimize API overhead and allow local autonomy.
- **World State**: Tracks zones (minerals, animals, status, claims), robots (position, cargo, speed), and a rolling mission log.
- **Editor Mode**: Allows cycling minerals (`0, 3, 6, 9`) and animals (`0, 2, 5, 8`) to stage different scenarios.
- **Mission Lifecycle**: Includes `editing`, `running`, `completed`, and `stopped` phases with a dedicated "Demo Scenario" loader.

### Robot behavior
- **Finite-state machine**: States include `idle`, `patrol`, `moving_to_target`, `collecting`, `returning`, and `avoiding`.
- **Target Selection**: Non-assigned robots use a scoring heuristic: `(Unknown? 5 : 0) + (Minerals * 2) - (Distance * 0.18)`.
- **Cargo Management**: Robots collect until `cargo >= 4`, then trigger a `returning` state to the home base.
- **Collision Avoidance**: A `SEPARATION_THRESHOLD` of 2.6 units triggers a mutual-repulsion push to prevent overlaps.
- **Arrival Logic**: A threshold of 0.85 units defines "arrival" at target zones.

### Claude mission control
- **Direct Anthropic Integration**: Uses `fetch` targeting `https://api.anthropic.com/v1/messages` with `anthropic-dangerous-direct-browser-access` enabled.
- **System Prompting**: Enforces rules like "Avoid zones with >= 6 animals" and "Prioritize minerals >= 7 with <= 3 animals".
- **State Synchronization**: Maps Claude's high-level `assignments` (move, return, patrol, avoid, hold) and `zone_updates` back to the local `WorldState`. Assignments from Claude override the local "Patrol" heuristic until the robot reaches its destination or is reassigned.
- **JSON Resilience**: Includes a custom extractor to find and parse JSON blocks even if Claude includes conversational filler.
- **Non-blocking Polling**: The simulation ticks independently at ~60fps while Claude requests happen asynchronously; if the API is slow, robots continue following their last assigned intent or fallback to autonomous patrolling.

### 3D presentation
- Ocean floor plane and grid
- Zone overlays for `unknown`, `mine`, `avoid`, and `depleted`
- Mineral clusters and animal markers
- Submarine meshes with state-based colors
- Home base mesh
- Target lines from robots to active destinations
- Orbit controls and basic lighting

### UI and mission visibility
- API key input field
- Pre-mission editor controls
- Live mission dashboard with robot cards and cargo bars
- Claude/system command log
- Mission summary panel for completed or stopped runs

## Demo Flow That Works Now

1. Launch the app.
2. Click `Load Demo Scenario`.
3. Click `Start Mission`.
4. Watch submarines fan out, mine, avoid flagged zones, and return to base.
5. Use the right panel to narrate robot states, mission totals, and command-log activity.

## Important Caveat

The current Claude request layer intentionally does **not** send an API key header because that matched the provided implementation spec.
That means:

- In Claude-hosted or auth-injected environments, mission-control calls may work as-is.
- In a normal standalone local browser session, direct Anthropic requests will usually fail unless auth is provided by the environment or the request layer is adjusted.
- The rest of the simulation still runs locally even when Claude calls fail.

## Verification Completed

- `npm install`
- `npm run build`

The production build succeeds.
Vite reports a large bundle warning because Three.js and related dependencies are heavy, but the build is still valid for demo use.

## Useful Project Files

- `src/App.tsx`
- `src/simulation/worldModel.ts`
- `src/simulation/robotFSM.ts`
- `src/simulation/tickEngine.ts`
- `src/claude/missionControl.ts`
- `src/components/Scene.tsx`
- `src/ui/ControlPanel.tsx`

## Suggested Next Improvements

- Add a true standalone Anthropic auth path if local browser Claude control is required
- Add a small “mission-control offline” banner when requests fail repeatedly
- Trim bundle size only if performance becomes an issue during the demo
