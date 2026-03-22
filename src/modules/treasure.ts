import { Treasure } from '../types';

const TREASURE_TYPES = [
  { name: '银戒指', value: 50, weight: 1 },
  { name: '金圣杯', value: 150, weight: 3 },
  { name: '古代遗物', value: 300, weight: 5 },
  { name: '被诅咒的王冠', value: 500, weight: 8 },
  { name: '龙之宝玉', value: 1000, weight: 15 },
];

export const generateRandomTreasure = (): Treasure => {
  const type = TREASURE_TYPES[Math.floor(Math.random() * TREASURE_TYPES.length)];
  return {
    id: Math.random(),
    name: type.name,
    value: type.value,
    weight: type.weight,
  };
};
