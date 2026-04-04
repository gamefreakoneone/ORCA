import { clampToField, distance2D, WorldState } from "./worldModel";

const SEPARATION_THRESHOLD = 2.6;

export function applyCollisionAvoidance(world: WorldState): WorldState {
  const next = {
    ...world,
    robots: world.robots.map((robot) => ({ ...robot }))
  };

  let prevented = 0;

  for (let i = 0; i < next.robots.length; i += 1) {
    for (let j = i + 1; j < next.robots.length; j += 1) {
      const a = next.robots[i];
      const b = next.robots[j];
      const distance = distance2D(a.x, a.z, b.x, b.z);

      if (distance >= SEPARATION_THRESHOLD) {
        continue;
      }

      const push = (SEPARATION_THRESHOLD - distance) / 2;
      const dx = distance === 0 ? 1 : (a.x - b.x) / distance;
      const dz = distance === 0 ? 0 : (a.z - b.z) / distance;

      a.x = clampToField(a.x + dx * push);
      a.z = clampToField(a.z + dz * push);
      b.x = clampToField(b.x - dx * push);
      b.z = clampToField(b.z - dz * push);
      prevented += 1;
    }
  }

  if (prevented === 0) {
    return next;
  }

  return {
    ...next,
    collisionsPrevented: next.collisionsPrevented + prevented
  };
}
