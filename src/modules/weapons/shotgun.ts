import { GameState } from '../../types';

export const getShotgunStats = (level: number) => {
  const fireRates = [600, 550, 500, 450, 400];
  const damages = [10, 12, 15, 18, 22];
  const bulletCounts = [3, 4, 5, 6, 7];
  const spreads = [30, 35, 40, 45, 50]; // degrees
  return { fireRate: fireRates[level - 1], damage: damages[level - 1], bullets: bulletCounts[level - 1], spread: spreads[level - 1] };
};

export const fireShotgun = (state: GameState, dirX: number, dirY: number, damage: number, bullets: number, spreadDeg: number) => {
  const baseAngle = Math.atan2(dirY, dirX);
  const spread = spreadDeg * (Math.PI / 180);
  const startAngle = baseAngle - spread / 2;
  const angleStep = bullets > 1 ? spread / (bullets - 1) : 0;
  
  for (let i = 0; i < bullets; i++) {
    const angle = startAngle + i * angleStep;
    state.bullets.push({
      id: Math.random(),
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(angle) * 800,
      vy: Math.sin(angle) * 800,
      radius: 4,
      damage: damage,
    });
  }
};
