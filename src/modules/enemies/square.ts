import { Enemy, GameState } from '../../types';
import { resolveEnemyCollision } from '../physics';

export const updateSquareEnemy = (enemy: Enemy, state: GameState, dt: number) => {
  let targetX = state.player.x;
  let targetY = state.player.y;

  const distToPlayer = Math.hypot(state.player.x - enemy.patrolCenter!.x, state.player.y - enemy.patrolCenter!.y);
  if (distToPlayer <= enemy.patrolRadius!) {
    // Chase player, but clamp to patrol area
    targetX = state.player.x;
    targetY = state.player.y;
  } else {
    // Patrol
    targetX = enemy.patrolTarget!.x;
    targetY = enemy.patrolTarget!.y;
    if (Math.hypot(enemy.x - targetX, enemy.y - targetY) < 10) {
      // Pick new patrol target
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * enemy.patrolRadius!;
      enemy.patrolTarget = {
        x: enemy.patrolCenter!.x + Math.cos(angle) * r,
        y: enemy.patrolCenter!.y + Math.sin(angle) * r
      };
    }
  }

  let edx = targetX - enemy.x;
  let edy = targetY - enemy.y;
  let dist = Math.hypot(edx, edy);
  
  let moveX = 0;
  let moveY = 0;

  if (dist > 0) {
    let dirX = edx / dist;
    let dirY = edy / dist;

    moveX = dirX * enemy.speed * dt;
    moveY = dirY * enemy.speed * dt;
    
    enemy.x += moveX;
    enemy.y += moveY;

    // Clamp square to patrol area
    const distFromCenter = Math.hypot(enemy.x - enemy.patrolCenter!.x, enemy.y - enemy.patrolCenter!.y);
    if (distFromCenter > enemy.patrolRadius!) {
      const angle = Math.atan2(enemy.y - enemy.patrolCenter!.y, enemy.x - enemy.patrolCenter!.x);
      enemy.x = enemy.patrolCenter!.x + Math.cos(angle) * enemy.patrolRadius!;
      enemy.y = enemy.patrolCenter!.y + Math.sin(angle) * enemy.patrolRadius!;
    }

    resolveEnemyCollision(enemy, state.obstacles);
  }
};
