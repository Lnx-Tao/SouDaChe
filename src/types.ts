export const MAP_WIDTH = 12000;
export const MAP_HEIGHT = 12000;

export type EnemyType = 'circle' | 'square' | 'triangle';
export type WeaponType = 'pistol' | 'shotgun' | 'laser';
export type QuestType = 'kill_square' | 'kill_circle' | 'kill_triangle' | 'open_chest';

export interface Quest {
  type: QuestType;
  target: number;
  current: number;
  level: number;
}

export interface Weapon {
  type: WeaponType;
  level: number;
}

export interface Chest {
  id: number;
  x: number;
  y: number;
  radius: number;
  opened: boolean;
  weaponDrop?: Weapon;
}

export interface DroppedWeapon {
  id: number;
  type: WeaponType;
  level: number;
  x: number;
  y: number;
}

export interface Treasure {
  id: number;
  name: string;
  value: number;
  weight: number;
}

export interface DroppedTreasure extends Treasure {
  x: number;
  y: number;
}

export interface Inventory {
  treasures: Treasure[];
  maxWeight: number;
  currentWeight: number;
}

export interface LaserRender {
  id: number;
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  width: number;
  timer: number;
}

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
  player: { x: number; y: number; radius: number; speed: number; hp: number; maxHp: number; weapon: Weapon };
  keys: Record<string, boolean>;
  enemies: Enemy[];
  bullets: any[];
  coins: any[];
  chests: Chest[];
  droppedWeapons: DroppedWeapon[];
  droppedTreasures: DroppedTreasure[];
  inventory: Inventory;
  lasers: LaserRender[];
  activeChestId: number | null;
  activeWeaponDropId: number | null;
  activeTreasureDropId: number | null;
  obstacles: { x: number; y: number; width: number; height: number }[];
  extraction: { x: number; y: number; width: number; height: number };
  extractionTimer: number;
  lastFireTime: number;
  lastFireDir: { x: number; y: number };
  isFiring: boolean;
  coinsCollected: number;
  status: 'menu' | 'playing' | 'won' | 'lost';
  camera: { x: number; y: number };
  enemySpawnTimer: number;
  gameStartTime: number;
  quest: Quest | null;
};
