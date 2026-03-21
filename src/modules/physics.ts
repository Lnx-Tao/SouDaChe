export const resolveCollision = (entity: any, obs: any) => {
  const closestX = Math.max(obs.x, Math.min(entity.x, obs.x + obs.width));
  const closestY = Math.max(obs.y, Math.min(entity.y, obs.y + obs.height));
  const dx = entity.x - closestX;
  const dy = entity.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq < entity.radius * entity.radius) {
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      entity.y = obs.y - entity.radius;
    } else {
      const overlap = entity.radius - dist;
      entity.x += (dx / dist) * overlap;
      entity.y += (dy / dist) * overlap;
    }
  }
};

export const resolveEnemyCollision = (enemy: any, obstacles: any[]) => {
  let collided = false;
  obstacles.forEach(obs => {
    const closestX = Math.max(obs.x, Math.min(enemy.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(enemy.y, obs.y + obs.height));
    const dx = enemy.x - closestX;
    const dy = enemy.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < enemy.radius * enemy.radius) {
      collided = true;
      const d = Math.sqrt(distSq);
      if (d === 0) {
        enemy.y = obs.y - enemy.radius;
      } else {
        const overlap = enemy.radius - d;
        enemy.x += (dx / d) * overlap;
        enemy.y += (dy / d) * overlap;
      }
    }
  });
  return collided;
};

export const lineIntersectsRect = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number) => {
  let tmin = 0.0;
  let tmax = 1.0;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.abs(dx) < 0.000001) {
    if (x1 < rx || x1 > rx + rw) return false;
  } else {
    const tx1 = (rx - x1) / dx;
    const tx2 = (rx + rw - x1) / dx;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
  }

  if (Math.abs(dy) < 0.000001) {
    if (y1 < ry || y1 > ry + rh) return false;
  } else {
    const ty1 = (ry - y1) / dy;
    const ty2 = (ry + rh - y1) / dy;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
  }

  return tmin <= tmax;
};
