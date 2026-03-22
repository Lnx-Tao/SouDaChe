import { GameState, QuestType } from '../../types';
import { updateQuestProgress } from '../quest';

export const getLaserStats = (level: number) => {
  const fireRates = [800, 750, 700, 650, 600];
  const damages = [30, 40, 50, 60, 70];
  const widths = [2, 4, 6, 8, 10];
  const bounces = [0, 0, 1, 2, 3];
  return { fireRate: fireRates[level - 1], damage: damages[level - 1], width: widths[level - 1], bounces: bounces[level - 1] };
};

export const fireLaser = (state: GameState, dirX: number, dirY: number, damage: number, width: number, bounces: number) => {
  let currentX = state.player.x;
  let currentY = state.player.y;
  let currentDirX = dirX;
  let currentDirY = dirY;
  let remainingBounces = bounces;
  const segments = [];
  
  // Raycast logic
  for (let b = 0; b <= bounces; b++) {
    let closestHitDist = 2000; // max laser length per bounce
    let hitNormal = null;
    let hitPoint = { x: currentX + currentDirX * closestHitDist, y: currentY + currentDirY * closestHitDist };
    
    // Check obstacles
    for (const obs of state.obstacles) {
      // Simple ray vs AABB intersection
      const t1 = (obs.x - currentX) / currentDirX;
      const t2 = (obs.x + obs.width - currentX) / currentDirX;
      const t3 = (obs.y - currentY) / currentDirY;
      const t4 = (obs.y + obs.height - currentY) / currentDirY;
      
      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
      
      if (tmax >= 0 && tmin <= tmax && tmin < closestHitDist && tmin > 0.01) {
        closestHitDist = tmin;
        hitPoint = { x: currentX + currentDirX * tmin, y: currentY + currentDirY * tmin };
        
        // Determine normal
        if (Math.abs(tmin - t1) < 0.001) hitNormal = { x: -1, y: 0 };
        else if (Math.abs(tmin - t2) < 0.001) hitNormal = { x: 1, y: 0 };
        else if (Math.abs(tmin - t3) < 0.001) hitNormal = { x: 0, y: -1 };
        else if (Math.abs(tmin - t4) < 0.001) hitNormal = { x: 0, y: 1 };
      }
    }
    
    segments.push({ x1: currentX, y1: currentY, x2: hitPoint.x, y2: hitPoint.y });
    
    // Damage enemies along this segment
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      // Distance from point to line segment
      const l2 = Math.pow(hitPoint.x - currentX, 2) + Math.pow(hitPoint.y - currentY, 2);
      let t = 0;
      if (l2 !== 0) {
        t = Math.max(0, Math.min(1, ((e.x - currentX) * (hitPoint.x - currentX) + (e.y - currentY) * (hitPoint.y - currentY)) / l2));
      }
      const projX = currentX + t * (hitPoint.x - currentX);
      const projY = currentY + t * (hitPoint.y - currentY);
      const distToLine = Math.hypot(e.x - projX, e.y - projY);
      
      if (distToLine < e.radius + width * 2) {
        e.hp -= damage;
        if (e.hp <= 0) {
          updateQuestProgress(state, `kill_${e.type}` as QuestType);
          state.enemies.splice(i, 1);
          // 40% chance to drop coin if killed
          if (Math.random() > 0.6) {
            state.coins.push({
              id: Math.random(),
              x: e.x,
              y: e.y,
              radius: 8,
              value: 10,
            });
          }
        }
      }
    }
    
    if (hitNormal && remainingBounces > 0) {
      // Reflect direction: r = d - 2(d.n)n
      const dot = currentDirX * hitNormal.x + currentDirY * hitNormal.y;
      currentDirX = currentDirX - 2 * dot * hitNormal.x;
      currentDirY = currentDirY - 2 * dot * hitNormal.y;
      currentX = hitPoint.x;
      currentY = hitPoint.y;
      remainingBounces--;
    } else {
      break; // Stop if no bounce or no more bounces
    }
  }
  
  state.lasers.push({
    id: Math.random(),
    segments,
    width: width * 2,
    timer: 0.2, // 200ms fade out
  });
};
