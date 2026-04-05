# ORCA v2: Multi-Phase Autonomous Mining Swarm

**ORCA** (Oceanic Resource Collection & Analysis) is a high-fidelity, browser-based simulation for ecology-aware underwater mining. It features a sophisticated three-phase mission architecture, AI-driven strategic planning via Claude 3.5 Sonnet, and a fleet of specialized 3D autonomous robots.

> [!IMPORTANT]
> This project requires an **Anthropic API Key** to enable Clause's strategic planning phase. Without a key, the robots will default to a basic autonomous patrol mode.

---

## 🌊 The Three-Phase Mission

### Phase 1: Scouting
A dedicated **Geologist submarine** (Cyan, streamlined hull) performs an autonomous spiral sweep of the 8×8 grid. It scans every zone to identify High Yield ore, Low Yield ore, and migratory fish schools. Worker bots remain idle at the mothership during this phase.

### Phase 2: Strategic Planning
Once the survey is complete, the mothership transmits the geological report to **Claude 3.5 Sonnet**. Claude analyzes the resource distribution and wildlife density to create a targeted mining plan. Each worker bot receives a unique, optimized itinerary designed to maximize score and minimize battery consumption.

### Phase 3: Mining Operations
Three **Worker mining bots** (Cube-shaped, 4-tentacle grabbers) deploy based on Claude's orders. They prioritize High Yield ore (3x value) and autonomously navigate back to the mothership for a full recharge when their batteries are depleted. Dynamic fish migration can block zones in real-time, requiring Claude to issue reallocation orders for displaced workers.

---

## ✨ Features

- **Advanced 3D Visuals**: Built with `@react-three/fiber`, featuring custom models for Geologist subs and tentacled Worker bots with real-time animations.
- **Dynamic Ecosystem**: Fish schools migrate randomly across the grid. Small schools (blue) are safe, but large schools (red) block robot entry to protect the local environment.
- **AI-Powered Orchestration**: Leverages Claude's reasoning to handle complex multi-agent deployment and real-time task reallocation.
- **Resource Management**: Real-time tracking of High Yield (Gold) and Low Yield (Teal) minerals, battery levels, and mission scoring.
- **Interactive Editor**: Custom scenario editor to place minerals and wildlife before launching the mission.
- **Abyss Aesthetic**: A premium midnight-to-deep-blue UI with metallic mist accents and responsive glassmorphism panels.

---

## 🛠️ Technical Stack

- **Core**: React 19, TypeScript 5, Vite 7
- **3D Engine**: Three.js, React Three Fiber, React Three Drei
- **AI**: Anthropic Claude 3.5 Sonnet API
- **State Management**: Reactive World Model with custom FSM logic

---

## 📂 Project Structure

```text
src/
  claude/
    missionControl.ts      # Claude API integration & Strategic prompts
    schemas.ts             # Response type definitions
  components/
    Scene.tsx              # Main 3D canvas and lights
    SubmarineModel.tsx     # High-fidelity Geologist & Worker 3D models
    MineralCluster.tsx     # 3D High/Low Yield ore visuals
    ZoneOverlay.tsx        # UI-to-3D world overlays (Fog of War, Alerts)
  simulation/
    worldModel.ts          # Central state, constants, and types
    tickEngine.ts          # Phase transitions and global simulation loop
    geologistFSM.ts        # Geologist scouting & spiral sweep logic
    robotFSM.ts            # Worker FSM with battery & mining logic
    fishMigration.ts       # Fish movement and robot-scaring behavior
  ui/
    ControlPanel.tsx       # Main navigation and API setup
    MissionDashboard.tsx   # Fleet status, phase tracking, and live totals
    MiningPlanDisplay.tsx  # Claude's active deployment plan
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```

### 3. Running the Demo
1. Open the local Vite URL (default: `http://localhost:5173`).
2. Paste your **Anthropic API Key** in the Mission Control Link section.
3. Click **Load Demo Scenario** to stage resource deposits and wildlife.
4. Click **Start Mission** to launch Phase 1.

---

## ✅ Verified Build Status

- `npm run build` — TypeScript compiles cleanly, Vite builds successfully.
- **Bundle**: ~1.1MB (Three.js dependencies optimized for performance).
- **Environment**: Desktop Chrome/Safari recommended for 3D performance.

---

*ORCA: Protecting the deep while powering the future.*
