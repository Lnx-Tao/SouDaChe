import { GameState } from '../../types';

export const getPistolStats = (level: number) => {
  const fireRates = [250, 200, 150, 120, 100];
  const damages = [20, 25, 30, 35, 40];
  return { fireRate: fireRates[level - 1], damage: damages[level - 1] };
};

export const firePistol = (state: GameState, dirX: number, dirY: number, damage: number) => {
  state.bullets.push({
    id: Math.random(),
    x: state.player.x,
    y: state.player.y,
    vx: dirX * 800,
    vy: dirY * 800,
    radius: 6,
    damage: damage,
  });
};
