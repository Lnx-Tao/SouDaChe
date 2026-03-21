export const MAP_WIDTH = 12000;
export const MAP_HEIGHT = 12000;

export type EnemyType = 'circle' | 'square' | 'triangle';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  patrolCenter?: { x: number; y: number };
  patrolRadius?: number;
  patrolTarget?: { x: number; y: number };
  stuckTimer?: number;
  avoidDir?: { x: number; y: number };
}

export type GameState = {
  player: { x: number; y: number; radius: number; speed: number; hp: number; maxHp: number };
  keys: Record<string, boolean>;
  enemies: Enemy[];
  bullets: any[];
  coins: any[];
  obstacles: { x: number; y: number; width: number; height: number }[];
  extraction: { x: number; y: number; width: number; height: number };
  extractionTimer: number;
  lastFireTime: number;
  lastFireDir: { x: number; y: number };
  isFiring: boolean;
  coinsCollected: number;
  status: 'playing' | 'won' | 'lost';
  camera: { x: number; y: number };
  enemySpawnTimer: number;
  gameStartTime: number;
};
