import { GameState, MAP_WIDTH, MAP_HEIGHT } from '../types';
import { resolveCollision, lineIntersectsRect } from './physics';

export const updatePlayer = (state: GameState, dt: number, canvasWidth: number, canvasHeight: number) => {
  let dx = 0;
  let dy = 0;
  if (state.keys.w) dy -= 1;
  if (state.keys.s) dy += 1;
  if (state.keys.a) dx -= 1;
  if (state.keys.d) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    state.player.x += (dx / len) * state.player.speed * dt;
    state.player.y += (dy / len) * state.player.speed * dt;
  }

  // Clamp player to map
  state.player.x = Math.max(state.player.radius, Math.min(MAP_WIDTH - state.player.radius, state.player.x));
  state.player.y = Math.max(state.player.radius, Math.min(MAP_HEIGHT - state.player.radius, state.player.y));

  state.obstacles.forEach(obs => resolveCollision(state.player, obs));

  // Firing logic
  if (state.isFiring) {
    const now = performance.now();
    if (now - state.lastFireTime >= 250) {
      let nearestEnemy = null;
      let minDst = Infinity;
      for (const e of state.enemies) {
        // Only target enemies within the current screen view
        if (e.x < state.camera.x || e.x > state.camera.x + canvasWidth || 
            e.y < state.camera.y || e.y > state.camera.y + canvasHeight) {
          continue;
        }
        
        const dst = Math.hypot(e.x - state.player.x, e.y - state.player.y);
        if (dst < minDst) {
          let hasLOS = true;
          for (const obs of state.obstacles) {
            if (lineIntersectsRect(state.player.x, state.player.y, e.x, e.y, obs.x, obs.y, obs.width, obs.height)) {
              hasLOS = false;
              break;
            }
          }
          if (hasLOS) {
            minDst = dst;
            nearestEnemy = e;
          }
        }
      }

      if (nearestEnemy) {
        const edx = nearestEnemy.x - state.player.x;
        const edy = nearestEnemy.y - state.player.y;
        const dist = Math.hypot(edx, edy);
        state.lastFireDir = { x: edx / dist, y: edy / dist };
      }

      const vx = state.lastFireDir.x * 800; // bullet speed
      const vy = state.lastFireDir.y * 800;

      state.bullets.push({
        id: Math.random(),
        x: state.player.x,
        y: state.player.y,
        vx,
        vy,
        radius: 6,
        damage: 25,
      });
      state.lastFireTime = now;
    }
  }
};
