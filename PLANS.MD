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
- `WorldState`, `Zone`, `Robot`, and `LogEntry` types
- Grid-based world generation and home base placement
- Demo scenario loader
- Editor-mode zone toggling for minerals and animals
- Mission start, stop, reset, and completion checks

### Robot behavior
- Finite-state machine for `idle`, `patrol`, `moving_to_target`, `collecting`, `returning`, and `avoiding`
- Straight-line movement toward targets and home base
- Cargo collection and return-to-base behavior
- Claimed-zone handling to reduce duplicate assignments
- Simple repulsion-based collision avoidance

### Claude mission control
- Claude request/response schema types
- Direct browser `fetch` integration targeting `https://api.anthropic.com/v1/messages`
- System prompt and world-summary packaging
- JSON extraction and safe parsing of Claude responses
- Centralized application of assignments, zone updates, and alerts
- Non-blocking polling so the sim continues when Claude is slow or unavailable

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
