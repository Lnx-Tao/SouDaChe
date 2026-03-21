import { MAP_WIDTH, MAP_HEIGHT, GameState } from '../types';
import { spawnInitialEnemies } from './enemies/spawner';

export const createInitialState = (): GameState => {
  let extX = 0;
  let extY = 0;
  let validExt = false;
  while (!validExt) {
    extX = Math.random() * (MAP_WIDTH - 400);
    extY = Math.random() * (MAP_HEIGHT - 400);
    const distToPlayer = Math.hypot((extX + 200) - MAP_WIDTH / 2, (extY + 200) - MAP_HEIGHT / 2);
    if (distToPlayer > 4500) {
      validExt = true;
    }
  }
  const extraction = { x: extX, y: extY, width: 400, height: 400 };

  const obstacles = [];
  for (let i = 0; i < 900; i++) {
    const isHorizontal = Math.random() > 0.5;
    const width = isHorizontal ? 300 + Math.random() * 500 : 80 + Math.random() * 40;
    const height = isHorizontal ? 80 + Math.random() * 40 : 300 + Math.random() * 500;
    const x = Math.random() * (MAP_WIDTH - width);
    const y = Math.random() * (MAP_HEIGHT - height);

    const cx = x + width / 2;
    const cy = y + height / 2;
    const distToPlayer = Math.hypot(cx - MAP_WIDTH / 2, cy - MAP_HEIGHT / 2);
    const distToExt = Math.hypot(cx - (extraction.x + extraction.width / 2), cy - (extraction.y + extraction.height / 2));

    if (distToPlayer > 600 && distToExt > 800) {
      obstacles.push({ x, y, width, height });
    }
  }

  const enemies = spawnInitialEnemies(obstacles);

  return {
    player: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, radius: 16, speed: 250, hp: 100, maxHp: 100 },
    keys: { w: false, a: false, s: false, d: false },
    enemies,
    bullets: [],
    coins: [],
    obstacles,
    extraction,
    extractionTimer: 0,
    lastFireTime: 0,
    lastFireDir: { x: 1, y: 0 },
    isFiring: false,
    coinsCollected: 0,
    status: 'playing',
    camera: { x: 0, y: 0 },
    enemySpawnTimer: 0,
    gameStartTime: Date.now(),
  };
};
