// Small shared helpers: seeded random, clamping, isometric projection.

import { TILE_W, TILE_H, ISO_CX, ISO_CY } from './config.js';

// Deterministic RNG (mulberry32) so staged scenes and textures are stable.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable per-tile hash in [0,1) from tile coordinates, for decor variety.
export function tileHash(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

// Tile coordinates -> screen coordinates (centre of the tile diamond).
export function tileToScreen(tx, ty) {
  return {
    x: ISO_CX + (tx - ty) * (TILE_W / 2),
    y: ISO_CY + (tx + ty) * (TILE_H / 2),
  };
}

// Screen coordinates -> nearest tile (may be outside the grid).
export function screenToTile(sx, sy) {
  const dx = sx - ISO_CX;
  const dy = sy - ISO_CY;
  const tx = Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
  const ty = Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
  return { tx, ty };
}

// Waypoint list (tile coords) -> screen waypoints.
export function pathToScreen(path) {
  return path.map(([tx, ty]) => tileToScreen(tx, ty));
}
