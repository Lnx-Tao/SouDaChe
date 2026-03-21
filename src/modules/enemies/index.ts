import { GameState } from '../../types';
import { updateCircleEnemy } from './circle';
import { updateSquareEnemy } from './square';
import { updateTriangleEnemy } from './triangle';
import { spawnTriangleEnemy } from './spawner';

export const updateEnemies = (state: GameState, dt: number, syncHUD: () => void) => {
  spawnTriangleEnemy(state, dt);

  state.enemies.forEach((enemy) => {
    if (enemy.type === 'circle') {
      updateCircleEnemy(enemy, state, dt);
    } else if (enemy.type === 'square') {
      updateSquareEnemy(enemy, state, dt);
    } else if (enemy.type === 'triangle') {
      updateTriangleEnemy(enemy, state, dt);
    }

    if (Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y) < state.player.radius + enemy.radius) {
      state.player.hp -= 25 * dt; // 25 damage per second
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.status = 'lost';
        syncHUD();
      }
    }
  });
};
