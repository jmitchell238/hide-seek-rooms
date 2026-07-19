'use strict';

// Hide & Seek Rooms — Keep CACHE in sw.js in sync: 'hide-seek-rooms-' + GAME_VERSION
const GAME_VERSION = '1.0.000';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Hide & Seek Rooms';

const W = 390;
const H = 700;
const SAVE_KEY = 'hide-seek-rooms-save-v1';

/** Modes: toy count + free vs challenge */
const MODES = {
  free:  { id: 'free',  name: 'Free Play',  tagline: '3 toys · cozy', toys: 3, rooms: 0 },
  cozy:  { id: 'cozy',  name: 'Cozy Seek',  tagline: '3 toys · 4 rooms', toys: 3, rooms: 4 },
  seek:  { id: 'seek',  name: 'Seeker',    tagline: '4 toys · 6 rooms', toys: 4, rooms: 6 },
  pro:   { id: 'pro',   name: 'Super Seek', tagline: '5 toys · 8 rooms', toys: 5, rooms: 8 },
};
const MODE_ORDER = ['free', 'cozy', 'seek', 'pro'];

/** Soft idle hint delay (seconds) before sparkle trail */
const HINT_AFTER = 7;

const PRAISE = ['Found it!', 'Yay!', 'Nice!', 'There!', 'Wow!', 'Yes!', 'Great!', 'Peek!'];

/**
 * Toy catalog — canvas-drawn, big hit targets
 * @type {{ id: string, label: string, color: string, color2: string }[]}
 */
const TOYS = [
  { id: 'star',    label: 'Star',    color: '#FFD54F', color2: '#FF8F00' },
  { id: 'ball',    label: 'Ball',    color: '#EF5350', color2: '#FFFFFF' },
  { id: 'teddy',   label: 'Teddy',   color: '#A1887F', color2: '#6D4C41' },
  { id: 'duck',    label: 'Duck',    color: '#FFEE58', color2: '#FF8A65' },
  { id: 'cookie',  label: 'Cookie',  color: '#D7A86E', color2: '#8D6E63' },
  { id: 'car',     label: 'Car',     color: '#42A5F5', color2: '#1565C0' },
  { id: 'balloon', label: 'Balloon', color: '#EC407A', color2: '#AD1457' },
  { id: 'book',    label: 'Book',    color: '#66BB6A', color2: '#2E7D32' },
  { id: 'apple',   label: 'Apple',   color: '#E53935', color2: '#43A047' },
  { id: 'bone',    label: 'Bone',    color: '#FFF8E1', color2: '#BDBDBD' },
  { id: 'fish',    label: 'Fish',    color: '#29B6F6', color2: '#0277BD' },
  { id: 'sock',    label: 'Sock',    color: '#AB47BC', color2: '#6A1B9A' },
];

/**
 * Room defs — furniture drawn in game.js; hide spots are relative 0–1 in play area
 * play area: x 20–370, y 90–580
 */
const ROOMS = [
  {
    id: 'bedroom',
    name: 'Bedroom',
    accent: '#7E57C2',
    wall: '#E1BEE7',
    floor: '#D7CCC8',
    spots: [
      { x: 0.18, y: 0.38, cover: 0.35 }, // under bed
      { x: 0.72, y: 0.28, cover: 0.25 }, // nightstand
      { x: 0.82, y: 0.55, cover: 0.4 },  // wardrobe
      { x: 0.35, y: 0.62, cover: 0.3 },  // rug
      { x: 0.55, y: 0.42, cover: 0.2 },  // pillow edge
      { x: 0.22, y: 0.72, cover: 0.25 }, // floor corner
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    accent: '#FF8A65',
    wall: '#FFE0B2',
    floor: '#BCAAA4',
    spots: [
      { x: 0.2, y: 0.45, cover: 0.35 },
      { x: 0.5, y: 0.5, cover: 0.25 },
      { x: 0.78, y: 0.35, cover: 0.4 },
      { x: 0.35, y: 0.7, cover: 0.3 },
      { x: 0.65, y: 0.65, cover: 0.35 },
      { x: 0.15, y: 0.28, cover: 0.2 },
    ],
  },
  {
    id: 'living',
    name: 'Living Room',
    accent: '#5C6BC0',
    wall: '#C5CAE9',
    floor: '#A1887F',
    spots: [
      { x: 0.25, y: 0.55, cover: 0.4 },
      { x: 0.7, y: 0.48, cover: 0.35 },
      { x: 0.5, y: 0.35, cover: 0.2 },
      { x: 0.85, y: 0.7, cover: 0.3 },
      { x: 0.15, y: 0.72, cover: 0.25 },
      { x: 0.55, y: 0.68, cover: 0.35 },
    ],
  },
  {
    id: 'playground',
    name: 'Playground',
    accent: '#26A69A',
    wall: '#B2EBF2',
    floor: '#81C784',
    spots: [
      { x: 0.22, y: 0.6, cover: 0.35 },
      { x: 0.55, y: 0.4, cover: 0.25 },
      { x: 0.78, y: 0.55, cover: 0.4 },
      { x: 0.4, y: 0.72, cover: 0.3 },
      { x: 0.15, y: 0.35, cover: 0.25 },
      { x: 0.68, y: 0.72, cover: 0.3 },
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    accent: '#4FC3F7',
    wall: '#B3E5FC',
    floor: '#90CAF9',
    spots: [
      { x: 0.25, y: 0.5, cover: 0.35 },
      { x: 0.7, y: 0.4, cover: 0.3 },
      { x: 0.5, y: 0.65, cover: 0.35 },
      { x: 0.8, y: 0.7, cover: 0.25 },
      { x: 0.18, y: 0.72, cover: 0.3 },
      { x: 0.55, y: 0.35, cover: 0.2 },
    ],
  },
  {
    id: 'garden',
    name: 'Garden',
    accent: '#66BB6A',
    wall: '#C8E6C9',
    floor: '#A5D6A7',
    spots: [
      { x: 0.2, y: 0.55, cover: 0.4 },
      { x: 0.5, y: 0.45, cover: 0.3 },
      { x: 0.78, y: 0.5, cover: 0.35 },
      { x: 0.35, y: 0.7, cover: 0.3 },
      { x: 0.65, y: 0.7, cover: 0.35 },
      { x: 0.45, y: 0.3, cover: 0.25 },
    ],
  },
];
