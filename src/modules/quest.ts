import { GameState, Quest, QuestType, WeaponType } from '../types';
import { generateRandomTreasure } from './treasure';

export const generateQuest = (level: number): Quest => {
  const types: QuestType[] = ['kill_square', 'kill_circle', 'kill_triangle', 'open_chest'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let target = 5;
  if (type === 'open_chest') {
    target = 1 + Math.floor(level * 0.5) + Math.floor(Math.random() * 2);
  } else {
    target = 5 + level * 2 + Math.floor(Math.random() * 5);
  }

  return {
    type,
    target,
    current: 0,
    level,
  };
};

export const updateQuestProgress = (state: GameState, type: QuestType, amount: number = 1) => {
  if (!state.quest) return;
  if (state.quest.type === type) {
    state.quest.current += amount;
    if (state.quest.current >= state.quest.target) {
      completeQuest(state);
    }
  }
};

const completeQuest = (state: GameState) => {
  if (!state.quest) return;
  
  // Spawn reward near player
  const rewardType = Math.random() > 0.5 ? 'weapon' : 'treasure';
  
  // Offset to spawn near player
  const angle = Math.random() * Math.PI * 2;
  const dist = 50 + Math.random() * 50;
  const spawnX = state.player.x + Math.cos(angle) * dist;
  const spawnY = state.player.y + Math.sin(angle) * dist;

  if (rewardType === 'weapon') {
    const weaponTypes: WeaponType[] = ['pistol', 'shotgun', 'laser'];
    const wType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    // Higher level quest = higher chance for better weapon level
    let wLevel = 1;
    if (state.quest.level > 2 && Math.random() > 0.5) wLevel = 2;
    if (state.quest.level > 5 && Math.random() > 0.7) wLevel = 3;
    
    state.droppedWeapons.push({
      id: Math.random(),
      x: spawnX,
      y: spawnY,
      type: wType,
      level: wLevel
    });
  } else {
    // Treasure
    const treasure = generateRandomTreasure();
    // Boost treasure value based on quest level
    treasure.value = Math.floor(treasure.value * (1 + state.quest.level * 0.2));
    
    state.droppedTreasures.push({
      ...treasure,
      x: spawnX,
      y: spawnY
    });
  }

  // Generate next quest
  state.quest = generateQuest(state.quest.level + 1);
};
