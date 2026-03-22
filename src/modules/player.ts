import { GameState, MAP_WIDTH, MAP_HEIGHT, Weapon } from '../types';
import { resolveCollision, lineIntersectsRect } from './physics';
import { getPistolStats, firePistol } from './weapons/pistol';
import { getShotgunStats, fireShotgun } from './weapons/shotgun';
import { getLaserStats, fireLaser } from './weapons/laser';

export const getWeaponStats = (weapon: Weapon) => {
  const { type, level } = weapon;
  if (type === 'pistol') {
    return getPistolStats(level);
  } else if (type === 'shotgun') {
    return getShotgunStats(level);
  } else if (type === 'laser') {
    return getLaserStats(level);
  }
  return getPistolStats(1);
};

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
    const now = Date.now();
    const weaponStats = getWeaponStats(state.player.weapon);
    
    if (now - state.lastFireTime >= weaponStats.fireRate) {
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

      const dirX = state.lastFireDir.x;
      const dirY = state.lastFireDir.y;

      if (state.player.weapon.type === 'pistol') {
        firePistol(state, dirX, dirY, weaponStats.damage);
      } else if (state.player.weapon.type === 'shotgun') {
        const stats = weaponStats as ReturnType<typeof getShotgunStats>;
        fireShotgun(state, dirX, dirY, stats.damage, stats.bullets, stats.spread);
      } else if (state.player.weapon.type === 'laser') {
        const stats = weaponStats as ReturnType<typeof getLaserStats>;
        fireLaser(state, dirX, dirY, stats.damage, stats.width, stats.bounces);
      }

      state.lastFireTime = now;
    }
  }
};
