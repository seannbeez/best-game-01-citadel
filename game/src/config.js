// Clockwork Citadel: Aether Siege — configuration and content definitions.
// All tuning lives here so balance can change without touching the engine.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// Isometric grid: 11 x 8 tiles. Tile diamond 72 x 36 px.
export const TILE_W = 72;
export const TILE_H = 36;
export const GRID_W = 11;
export const GRID_H = 8;
export const ISO_CX = 640; // screen x of tile (0,0)
export const ISO_CY = 168; // screen y of tile (0,0)

// Warm citadel palette: sandstone, brass, moss, twilight sky, gold.
export const PALETTE = {
  skyTop: '#241a4d',
  skyMid: '#5b3a72',
  skyLow: '#c97e46',
  horizon: '#f7b733',
  sandLight: '#e8c88f',
  sand: '#d9b078',
  sandDark: '#b98d55',
  cobble: '#a89a80',
  cobbleDark: '#7d7261',
  moss: '#7fae62',
  mossDark: '#557d3e',
  brass: '#d9a441',
  brassLight: '#f2c96b',
  brassDark: '#8a6420',
  iron: '#6b6f7a',
  ironDark: '#3d4048',
  wood: '#8a5a33',
  woodDark: '#5e3a1e',
  rune: '#59e6ff',
  runeGold: '#ffd76a',
  frost: '#8fe3ff',
  ember: '#ff9a3d',
  health: '#7ee081',
  danger: '#ff5d5d',
  ink: '#2a1f14',
  parchment: '#f3e2b8',
  parchmentDark: '#d9c48f',
  gold: '#ffd76a',
};

// The two enemy routes, as tile waypoints. Path A is the west gate, path B
// the north gate; B joins A at (5,1). Both end at the citadel core (9,4).
export const PATH_A = [[0, 4], [2, 4], [2, 1], [5, 1], [5, 6], [8, 6], [8, 4], [9, 4]];
export const PATH_B = [[6, 0], [6, 1], [5, 1]];
export const CORE_TILE = [9, 4];

// Build plots: tiles where towers may be raised. None sit on a path.
export const PLOTS = [
  [1, 2], [3, 3], [4, 3], [1, 6], [4, 6],
  [6, 4], [7, 2], [7, 3], [9, 2], [9, 6],
];

// Tower definitions. range in px, dmg per hit, rate in shots per second.
export const TOWERS = {
  tesla: {
    name: 'Tesla Arc Spire', short: 'Tesla', cost: 60, range: 150, dmg: 14,
    rate: 2.0, chains: 2, color: '#59e6ff', desc: 'Chain lightning. Shatters chilled foes.',
  },
  frost: {
    name: 'Frost Prism', short: 'Frost', cost: 50, range: 135, dmg: 5,
    rate: 1.2, chill: 0.45, chillTime: 2.0, color: '#8fe3ff', desc: 'Chills enemies, slows them 45%.',
  },
  ballista: {
    name: 'Clockwork Ballista', short: 'Ballista', cost: 80, range: 215, dmg: 34,
    rate: 0.7, color: '#ffb347', desc: 'Long-range piercing bolts.',
  },
  mortar: {
    name: 'Alchemical Mortar', short: 'Mortar', cost: 90, range: 175, minRange: 45,
    dmg: 46, rate: 0.45, splash: 58, color: '#ff9a3d', desc: 'Lobbed shells, big splash.',
  },
};
export const TOWER_ORDER = ['tesla', 'frost', 'ballista', 'mortar'];

// Hero spells. All are aimed with the mouse or touch; cooldowns in seconds.
export const SPELLS = {
  beam: {
    name: 'Solar Beam', key: '1', cooldown: 6, color: '#ffd76a',
    desc: 'Drag a line from the airship: searing beam, 90 damage.',
  },
  well: {
    name: 'Gravity Well', key: '2', cooldown: 12, color: '#b388ff',
    desc: 'Pulls enemies inward for 3s, 10 damage per second.',
  },
  meteor: {
    name: 'Meteor Barrage', key: '3', cooldown: 15, color: '#ff7a5c',
    desc: 'Six meteors rain down, 42 damage each in a wide ring.',
  },
};
export const SPELL_ORDER = ['beam', 'well', 'meteor'];

// Enemy kinds. speed in px/s along the path, gold on kill.
export const ENEMIES = {
  rat: { name: 'Gear Rat', hp: 30, speed: 56, gold: 4, score: 40, size: 13, color: '#c98f3d', coreDmg: 1 },
  bat: { name: 'Clockwork Bat', hp: 22, speed: 82, gold: 5, score: 50, size: 12, color: '#8a7bd8', coreDmg: 1, flying: true },
  wisp: { name: 'Rune Wisp', hp: 46, speed: 48, gold: 7, score: 70, size: 13, color: '#59e6ff', coreDmg: 1, chillResist: 0.5 },
  golem: { name: 'Brass Golem', hp: 165, speed: 26, gold: 12, score: 120, size: 20, color: '#b98d55', coreDmg: 2 },
  boss: { name: 'Voidmaw Colossus', hp: 3400, speed: 20, gold: 200, score: 2000, size: 34, color: '#7a4a9e', coreDmg: 5 },
};

// Draft relics offered after each cleared wave (waves 1-9).
export const RELICS = [
  { id: 'overclock', name: 'Overclocked Gears', icon: 'gear', desc: '+20% tower damage', apply: s => { s.towerDmgMul *= 1.2; } },
  { id: 'capacitor', name: 'Aether Capacitor', icon: 'bolt', desc: '-25% spell cooldowns', apply: s => { s.cooldownMul *= 0.75; } },
  { id: 'gilded', name: 'Gilded Gears', icon: 'coin', desc: '+30% gold from kills', apply: s => { s.goldMul *= 1.3; } },
  { id: 'reinforce', name: 'Reinforced Core', icon: 'shield', desc: '+5 max core health, heal 5', apply: s => { s.coreMax += 5; s.coreHp = Math.min(s.coreMax, s.coreHp + 5); } },
  { id: 'longsight', name: 'Longsight Lenses', icon: 'eye', desc: '+15% tower range', apply: s => { s.rangeMul *= 1.15; } },
  { id: 'twinbarrel', name: 'Twin Barrels', icon: 'arrows', desc: 'Towers fire +15% faster', apply: s => { s.rateMul *= 1.15; } },
];

export const START_GOLD = 150;
export const START_CORE_HP = 20;
export const MAX_WAVE = 10;
export const MAX_TOWER_LEVEL = 3;
export const SELL_REFUND = 0.7;
