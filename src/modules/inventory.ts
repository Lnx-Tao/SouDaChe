import { Inventory, Treasure } from '../types';

export const createInventory = (maxWeight: number): Inventory => ({
  treasures: [],
  maxWeight,
  currentWeight: 0,
});

export const canAddTreasure = (inventory: Inventory, treasure: Treasure): boolean => {
  return inventory.currentWeight + treasure.weight <= inventory.maxWeight;
};

export const addTreasure = (inventory: Inventory, treasure: Treasure): boolean => {
  if (canAddTreasure(inventory, treasure)) {
    inventory.treasures.push(treasure);
    inventory.currentWeight += treasure.weight;
    return true;
  }
  return false;
};

export const removeTreasure = (inventory: Inventory, treasureId: number): Treasure | null => {
  const index = inventory.treasures.findIndex(t => t.id === treasureId);
  if (index !== -1) {
    const treasure = inventory.treasures[index];
    inventory.treasures.splice(index, 1);
    inventory.currentWeight -= treasure.weight;
    return treasure;
  }
  return null;
};
