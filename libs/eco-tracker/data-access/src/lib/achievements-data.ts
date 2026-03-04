import type { Achievement } from './models';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1',  key: 'first-tree',       title: 'First Sprout',       description: 'Planted your very first tree',              icon: '🌱', threshold: 1,   unlockedAt: undefined },
  { id: 'a2',  key: '5-trees',          title: 'Seedling Garden',    description: 'Planted 5 trees',                           icon: '🌿', threshold: 5,   unlockedAt: undefined },
  { id: 'a3',  key: '10-trees',         title: 'Grove Keeper',       description: 'Planted 10 trees',                          icon: '🌳', threshold: 10,  unlockedAt: undefined },
  { id: 'a4',  key: '25-trees',         title: 'Forest Builder',     description: 'Planted 25 trees',                          icon: '🌲', threshold: 25,  unlockedAt: undefined },
  { id: 'a5',  key: '50-trees',         title: 'Woodland Champion',  description: 'Planted 50 trees',                          icon: '🏕️', threshold: 50,  unlockedAt: undefined },
  { id: 'a6',  key: '100-trees',        title: 'Forest Legend',      description: 'Planted 100 trees',                         icon: '🌏', threshold: 100, unlockedAt: undefined },
  { id: 'a7',  key: 'geo-first',        title: 'Pinned to Earth',    description: 'Added geo-tag to your first tree',          icon: '📍', threshold: 1,   unlockedAt: undefined },
  { id: 'a8',  key: '100kg-offset',     title: 'Carbon Sponge',      description: 'Trees have offset 100 kg CO₂',             icon: '💚', threshold: 100, unlockedAt: undefined },
  { id: 'a9',  key: '500kg-offset',     title: 'Climate Guardian',   description: 'Trees have offset 500 kg CO₂',             icon: '🛡️', threshold: 500, unlockedAt: undefined },
  { id: 'a10', key: '1000kg-offset',    title: 'Carbon Hero',        description: 'Trees have offset 1,000 kg CO₂',           icon: '🦸', threshold: 1000, unlockedAt: undefined },
  { id: 'a11', key: 'first-activity',   title: 'Footprint Aware',    description: 'Logged your first carbon activity',         icon: '👣', threshold: 1,   unlockedAt: undefined },
  { id: 'a12', key: '7-day-streak',     title: 'Week Warrior',       description: 'Logged activities 7 days in a row',         icon: '🔥', threshold: 7,   unlockedAt: undefined },
  { id: 'a13', key: '30-day-streak',    title: 'Monthly Master',     description: 'Logged activities 30 days in a row',        icon: '⭐', threshold: 30,  unlockedAt: undefined },
  { id: 'a14', key: 'first-goal',       title: 'Goal Setter',        description: 'Set your first monthly goal',               icon: '🎯', threshold: 1,   unlockedAt: undefined },
  { id: 'a15', key: 'goal-achieved',    title: 'Goal Crusher',       description: 'Achieved a monthly emission goal',          icon: '🏆', threshold: 1,   unlockedAt: undefined },
  { id: 'a16', key: 'net-positive',     title: 'Net Positive',       description: 'Your trees offset more than your emissions', icon: '🌍', threshold: 1,   unlockedAt: undefined },
  { id: 'a17', key: 'all-species',      title: 'Botanist',           description: 'Planted 5 different tree species',          icon: '🔬', threshold: 5,   unlockedAt: undefined },
  { id: 'a18', key: 'history-keeper',   title: 'History Keeper',     description: 'Logged 10 tree care events',                icon: '📔', threshold: 10,  unlockedAt: undefined },
];
