# ORCA

ORCA is a browser-based hackathon demo for ecology-aware underwater mining with an autonomous robot swarm.

The app simulates 3D submarines collecting polymetallic nodules across a grid-based ocean floor while avoiding wildlife-heavy zones. A local robot FSM handles moment-to-moment autonomy, and Claude can act as mission control by issuing higher-level assignments, patrol orders, and avoidance updates.

## Current Features

- React + Vite + TypeScript single-page app
- Three.js scene via `@react-three/fiber` and `@react-three/drei`
- Grid-based world model with editable mineral and animal placement
- Four autonomous submarines with finite-state-machine behavior
- Simple collision avoidance and claimed target handling
- Demo scenario loader for a judge-friendly mission flow
- Live mission dashboard with robot status and cargo tracking
- Command log showing mission-control and system messages
- Mission summary for completed or stopped runs

## Project Structure

```text
src/
  App.tsx
  claude/
    missionControl.ts
    schemas.ts
  components/
    Scene.tsx
    OceanFloor.tsx
    SubmarineModel.tsx
    MineralCluster.tsx
    AnimalCluster.tsx
    ZoneOverlay.tsx
    TargetLine.tsx
    HomeBase.tsx
  simulation/
    worldModel.ts
    robotFSM.ts
    collisionAvoidance.ts
    tickEngine.ts
  styles/
    global.css
  ui/
    ControlPanel.tsx
    EditorControls.tsx
    MissionDashboard.tsx
    CommandLog.tsx
    MissionSummary.tsx
```

## Getting Started

### Install

```powershell
npm install
```

### Run the app

```powershell
npm run dev
```

Then open the local Vite URL, usually:

```text
http://localhost:5173
```

### Production build

```powershell
npm run build
```

### Preview the production build

```powershell
npm run preview
```

## How To Demo

The fastest demo flow is:

1. Open the app.
2. Click `Load Demo Scenario`.
3. Paste an Anthropic API key into the sidebar if you want live Claude mission-control calls in a normal local browser session.
4. Click `Start Mission`.
5. Watch the submarines fan out, mine resources, avoid animal-heavy zones, and return to base as cargo fills.
6. Use the right sidebar to narrate:
   - robot states
   - cargo progress
   - collected totals
   - avoided zones
   - command log activity

## Controls

### Pre-mission editor

- `Place Minerals`: click zones to cycle minerals `0 -> 3 -> 6 -> 9 -> 0`
- `Place Animals`: click zones to cycle animals `0 -> 2 -> 5 -> 8 -> 0`
- `Load Demo Scenario`: loads a prebuilt rich deposit plus wildlife conflict setup
- `Start Mission`: launches the simulation
- `Clear Field`: resets the editor

### Camera

- Orbit and pan with the mouse
- Zoom out to see the full grid more easily

## Claude Mission Control Notes

Claude polling is non-blocking. If the request fails, the robot swarm keeps running locally.

The current implementation supports a local API key input and sends it as `x-api-key` when provided. This means:

- Local browser demos can use a valid Anthropic API key
- If no key is provided, the simulation still runs, but Claude mission-control calls will likely fail
- Hosted environments that already handle auth may also work without manual key entry

## Verified So Far

- `npm install`
- `npm run build`

The production build succeeds.

## Known Caveats

- The JS bundle is large because of Three.js-related dependencies, though it still builds and runs fine for demo purposes.
- Claude behavior depends on valid Anthropic access from the browser environment.
- This is intentionally a demo-first implementation, not a production simulation stack.

## Related Notes

- See `PLANS.MD` for the implementation summary and progress notes.
