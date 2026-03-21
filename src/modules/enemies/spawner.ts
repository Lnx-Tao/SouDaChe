import { MAP_WIDTH, MAP_HEIGHT, Enemy, GameState } from '../../types';

export const spawnInitialEnemies = (obstacles: any[]): Enemy[] => {
  const enemies: Enemy[] = [];
  for (let i = 0; i < 225; i++) {
    let ex = Math.random() * MAP_WIDTH;
    let ey = Math.random() * MAP_HEIGHT;
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      ex = Math.random() * MAP_WIDTH;
      ey = Math.random() * MAP_HEIGHT;
      valid = Math.hypot(ex - MAP_WIDTH / 2, ey - MAP_HEIGHT / 2) >= 800;
      if (valid) {
        for (const obs of obstacles) {
          if (ex > obs.x - 20 && ex < obs.x + obs.width + 20 && ey > obs.y - 20 && ey < obs.y + obs.height + 20) {
            valid = false;
            break;
          }
        }
      }
      attempts++;
    }
    if (valid) {
      const isSquare = Math.random() > 0.5;
      enemies.push({
        id: Math.random(),
        type: isSquare ? 'square' : 'circle',
        x: ex,
        y: ey,
        radius: 14,
        speed: isSquare ? 60 + Math.random() * 40 : 80 + Math.random() * 60,
        hp: isSquare ? 80 : 50,
        maxHp: isSquare ? 80 : 50,
        patrolCenter: isSquare ? { x: ex, y: ey } : undefined,
        patrolRadius: isSquare ? 400 : undefined,
        patrolTarget: isSquare ? { x: ex, y: ey } : undefined,
        stuckTimer: 0,
      });
    }
  }
  return enemies;
};

export const spawnTriangleEnemy = (state: GameState, dt: number) => {
  state.enemySpawnTimer -= dt;
  if (state.enemySpawnTimer <= 0) {
    const timeElapsed = (Date.now() - state.gameStartTime) / 1000;
    state.enemySpawnTimer = Math.max(0.5, 2.0 - timeElapsed / 120); // spawn faster over time
    const hpMultiplier = 1 + timeElapsed / 60; // HP increases by 100% every 60 seconds
    
    // Spawn more enemies at once as time goes on
    const spawnCount = Math.floor(1 + timeElapsed / 60);
    
    for (let i = 0; i < spawnCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 800 + Math.random() * 800; // spawn 800-1600 units away from player
      const ex = Math.max(14, Math.min(MAP_WIDTH - 14, state.player.x + Math.cos(angle) * dist));
      const ey = Math.max(14, Math.min(MAP_HEIGHT - 14, state.player.y + Math.sin(angle) * dist));
      
      let validSpawn = true;
      for (const obs of state.obstacles) {
        if (ex > obs.x - 20 && ex < obs.x + obs.width + 20 && ey > obs.y - 20 && ey < obs.y + obs.height + 20) {
          validSpawn = false;
          break;
        }
      }

      if (validSpawn) {
        state.enemies.push({
          id: Math.random(),
          type: 'triangle',
          x: ex,
          y: ey,
          radius: 14,
          speed: 120 + Math.random() * 60, // slightly faster
          hp: 40 * hpMultiplier,
          maxHp: 40 * hpMultiplier,
          stuckTimer: 0,
        });
      }
    }
  }
};
