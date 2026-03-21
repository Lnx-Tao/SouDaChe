import { Enemy, GameState } from '../../types';
import { resolveEnemyCollision } from '../physics';

export const updateCircleEnemy = (enemy: Enemy, state: GameState, dt: number) => {
  const targetX = state.player.x;
  const targetY = state.player.y;
  
  let edx = targetX - enemy.x;
  let edy = targetY - enemy.y;
  let dist = Math.hypot(edx, edy);
  
  let moveX = 0;
  let moveY = 0;

  if (dist > 0) {
    let dirX = edx / dist;
    let dirY = edy / dist;

    if (enemy.avoidDir && enemy.stuckTimer! > 0) {
      dirX = enemy.avoidDir.x;
      dirY = enemy.avoidDir.y;
      enemy.stuckTimer! -= dt;
    } else {
      enemy.avoidDir = undefined;
    }

    moveX = dirX * enemy.speed * dt;
    moveY = dirY * enemy.speed * dt;
    
    const prevX = enemy.x;
    const prevY = enemy.y;
    
    enemy.x += moveX;
    enemy.y += moveY;

    const collided = resolveEnemyCollision(enemy, state.obstacles);

    // Check if stuck (moved very little despite trying to move)
    const actualMoveDist = Math.hypot(enemy.x - prevX, enemy.y - prevY);
    const intendedMoveDist = Math.hypot(moveX, moveY);
    if (collided && actualMoveDist < intendedMoveDist * 0.5 && (!enemy.stuckTimer || enemy.stuckTimer <= 0)) {
      // Stuck, pick a perpendicular or random direction to avoid
      enemy.stuckTimer = 0.5 + Math.random() * 0.5; // 0.5 to 1.0 seconds
      const angleOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * 0.5);
      const currentAngle = Math.atan2(edy, edx);
      const newAngle = currentAngle + angleOffset;
      enemy.avoidDir = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
    }
  }
};
