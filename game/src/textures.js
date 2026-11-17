// Procedural textures and the pre-rendered static island.
// Nothing here is a flat vector: every tile is a grainy diamond texture,
// the island hangs over a twilight valley with brass gears turning below.

import { CANVAS_W, CANVAS_H, TILE_W, TILE_H, GRID_W, GRID_H, PALETTE, PATH_A, PATH_B, PLOTS, CORE_TILE } from './config.js';
import { makeRng, tileHash, tileToScreen } from './util.js';

const PATH_SET = new Set([...PATH_A, ...PATH_B].map(([x, y]) => x + ',' + y));
const PLOT_SET = new Set(PLOTS.map(([x, y]) => x + ',' + y));

export function isPathTile(tx, ty) { return PATH_SET.has(tx + ',' + ty); }
export function isPlotTile(tx, ty) { return PLOT_SET.has(tx + ',' + ty); }
export function isCoreTile(tx, ty) { return tx === CORE_TILE[0] && ty === CORE_TILE[1]; }

function diamondPath(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

// One diamond tile texture: base colour, stone grain, cracks, moss flecks.
function makeDiamondTexture(kind, seed) {
  const rng = makeRng(seed);
  const pad = 6;
  const c = document.createElement('canvas');
  c.width = TILE_W + pad * 2;
  c.height = TILE_H + pad * 2;
  const ctx = c.getContext('2d');
  const cx = c.width / 2, cy = c.height / 2;
  diamondPath(ctx, cx, cy, TILE_W, TILE_H);
  const g = ctx.createLinearGradient(cx - TILE_W / 2, cy - TILE_H / 2, cx + TILE_W / 2, cy + TILE_H / 2);
  if (kind === 'cobble') { g.addColorStop(0, '#b3a58c'); g.addColorStop(1, '#8a7d68'); }
  else if (kind === 'moss') { g.addColorStop(0, '#93bd6d'); g.addColorStop(1, '#6d9450'); }
  else if (kind === 'plaza') { g.addColorStop(0, '#e6c07a'); g.addColorStop(1, '#c49a52'); }
  else { g.addColorStop(0, PALETTE.sandLight); g.addColorStop(1, PALETTE.sand); }
  ctx.fillStyle = g;
  ctx.fill();
  // Cobble joints or stone grain.
  ctx.save();
  diamondPath(ctx, cx, cy, TILE_W, TILE_H);
  ctx.clip();
  if (kind === 'cobble') {
    ctx.strokeStyle = 'rgba(70,58,40,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const y = cy - TILE_H / 2 + (i + 1) * (TILE_H / 5);
      ctx.beginPath(); ctx.moveTo(cx - TILE_W / 2 + 4, y); ctx.lineTo(cx + TILE_W / 2 - 4, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx, cy - TILE_H / 2); ctx.lineTo(cx, cy + TILE_H / 2); ctx.stroke();
  }
  // Speckle grain.
  for (let i = 0; i < 46; i++) {
    const x = cx - TILE_W / 2 + rng() * TILE_W;
    const y = cy - TILE_H / 2 + rng() * TILE_H;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(90,60,25,0.16)' : 'rgba(255,240,200,0.16)';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // A hairline crack or two.
  ctx.strokeStyle = 'rgba(80,55,25,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    let x = cx - TILE_W / 4 + rng() * TILE_W / 2, y = cy - TILE_H / 4 + rng() * TILE_H / 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) { x += (rng() - 0.5) * 14; y += rng() * 6; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  if (kind === 'moss') {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(70,110,50,0.5)';
      ctx.beginPath();
      ctx.arc(cx - TILE_W / 2 + rng() * TILE_W, cy - TILE_H / 2 + rng() * TILE_H, 2 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Top light, bottom shade, crisp edge.
  const hi = ctx.createLinearGradient(0, cy - TILE_H / 2, 0, cy + TILE_H / 2);
  hi.addColorStop(0, 'rgba(255,245,210,0.20)'); hi.addColorStop(0.5, 'rgba(255,245,210,0)');
  hi.addColorStop(1, 'rgba(60,35,10,0.20)');
  ctx.fillStyle = hi; ctx.fill();
  diamondPath(ctx, cx, cy, TILE_W, TILE_H);
  ctx.strokeStyle = 'rgba(60,35,10,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  return c;
}

// Soft radial glow sprite (spells, cores, rune light).
export function makeGlowSprite(color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color + 'aa');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

// Soft elliptical shadow sprite, drawn squashed under entities.
export function makeShadowSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(20,10,5,0.42)');
  g.addColorStop(1, 'rgba(20,10,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

// A drifting cloud puff.
export function makeCloudSprite(seed) {
  const rng = makeRng(seed);
  const c = document.createElement('canvas');
  c.width = 220; c.height = 90;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = 30 + rng() * 160, y = 30 + rng() * 30, r = 18 + rng() * 22;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,235,205,0.85)');
    g.addColorStop(0.7, 'rgba(240,200,160,0.35)');
    g.addColorStop(1, 'rgba(240,200,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

// Brass gear, drawn fresh each frame so it can rotate.
export function drawGear(ctx, x, y, r, teeth, angle, tone) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = tone === 'dark' ? PALETTE.brassDark : PALETTE.brass;
  ctx.strokeStyle = 'rgba(60,35,10,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const inner = r * 0.62;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2 / teeth) * 0.28;
    const a2 = a0 + (Math.PI * 2 / teeth) * 0.5;
    const a3 = a0 + (Math.PI * 2 / teeth) * 0.78;
    ctx.lineTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
    ctx.lineTo(Math.cos(a3) * inner, Math.sin(a3) * inner);
  }
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Hub, spokes and rivets.
  ctx.fillStyle = PALETTE.brassLight;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,55,15,0.6)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34);
    ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.ironDark;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Animated waterfall streaks off an island edge.
export function drawWaterfall(ctx, x, yTop, len, t, width) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 5; i++) {
    const off = ((t * 60 + i * 23) % (len + 30)) - 15;
    const w = width * (0.5 + (i % 3) * 0.25);
    const g = ctx.createLinearGradient(x - w / 2, yTop, x + w / 2, yTop);
    g.addColorStop(0, 'rgba(160,220,255,0)');
    g.addColorStop(0.5, 'rgba(190,235,255,0.75)');
    g.addColorStop(1, 'rgba(160,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, yTop + off * 0.4, w, len * 0.55);
  }
  ctx.restore();
}

const TEX = {};
export function getTextures() {
  if (!TEX.sand) {
    TEX.sand = makeDiamondTexture('sand', 11);
    TEX.cobble = makeDiamondTexture('cobble', 23);
    TEX.moss = makeDiamondTexture('moss', 37);
    TEX.plaza = makeDiamondTexture('plaza', 51);
    TEX.glowGold = makeGlowSprite('#ffd76a');
    TEX.glowCyan = makeGlowSprite('#59e6ff');
    TEX.glowFrost = makeGlowSprite('#8fe3ff');
    TEX.glowPurple = makeGlowSprite('#b388ff');
    TEX.glowOrange = makeGlowSprite('#ff9a3d');
    TEX.shadow = makeShadowSprite();
    TEX.cloud1 = makeCloudSprite(101);
    TEX.cloud2 = makeCloudSprite(202);
    TEX.cloud3 = makeCloudSprite(303);
  }
  return TEX;
}

// Static sky: twilight gradient, sun glow, far valley ridges.
export function buildSkyLayer() {
  const c = document.createElement('canvas');
  c.width = CANVAS_W; c.height = CANVAS_H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.45, PALETTE.skyMid);
  g.addColorStop(0.72, PALETTE.skyLow);
  g.addColorStop(1, '#8a4a52');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Low sun glow, upper left.
  const sun = ctx.createRadialGradient(210, 150, 10, 210, 150, 260);
  sun.addColorStop(0, 'rgba(255,214,120,0.75)');
  sun.addColorStop(0.4, 'rgba(255,180,90,0.25)');
  sun.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Distant ridges.
  const rng = makeRng(77);
  for (let layer = 0; layer < 2; layer++) {
    const base = 470 + layer * 45;
    ctx.fillStyle = layer === 0 ? 'rgba(70,45,95,0.55)' : 'rgba(52,32,72,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H);
    ctx.lineTo(0, base);
    for (let x = 0; x <= CANVAS_W; x += 80) {
      ctx.lineTo(x, base - 20 - rng() * 55);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

// Static island: skirts, textured tiles, rune conduits, trees, rocks, plots.
export function buildIslandLayer() {
  const c = document.createElement('canvas');
  c.width = CANVAS_W; c.height = CANVAS_H;
  const ctx = c.getContext('2d');
  const tex = getTextures();
  const tiles = [];
  for (let ty = 0; ty < GRID_H; ty++) {
    for (let tx = 0; tx < GRID_W; tx++) tiles.push([tx, ty]);
  }
  tiles.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  // Rock skirts under edge tiles.
  for (const [tx, ty] of tiles) {
    if (tx !== 0 && ty !== 0 && tx !== GRID_W - 1 && ty !== GRID_H - 1) continue;
    const p = tileToScreen(tx, ty);
    const depth = 40;
    ctx.fillStyle = '#6d4a2c';
    ctx.beginPath();
    ctx.moveTo(p.x - TILE_W / 2, p.y);
    ctx.lineTo(p.x, p.y + TILE_H / 2);
    ctx.lineTo(p.x + TILE_W / 2, p.y);
    ctx.lineTo(p.x + TILE_W / 2, p.y + depth);
    ctx.lineTo(p.x, p.y + TILE_H / 2 + depth);
    ctx.lineTo(p.x - TILE_W / 2, p.y + depth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(p.x - TILE_W / 2, p.y + depth * 0.45, TILE_W, 3);
    ctx.fillRect(p.x - TILE_W / 2 + 8, p.y + depth * 0.75, TILE_W - 16, 2);
  }
  // Tile tops.
  for (const [tx, ty] of tiles) {
    const p = tileToScreen(tx, ty);
    let t;
    if (isCoreTile(tx, ty)) t = tex.plaza;
    else if (isPathTile(tx, ty)) t = tex.cobble;
    else if (tileHash(tx, ty) < 0.3) t = tex.moss;
    else t = tex.sand;
    ctx.drawImage(t, p.x - TILE_W / 2 - 6, p.y - TILE_H / 2 - 6);
    // Engraved brass ring on empty build plots.
    if (isPlotTile(tx, ty)) {
      ctx.strokeStyle = 'rgba(217,164,65,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 20, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(138,100,32,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 15, 7.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Glowing rune conduit along path edges.
    if (isPathTile(tx, ty)) {
      ctx.fillStyle = 'rgba(89,230,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Trees and rocks on free tiles (deterministic by tile hash).
  for (const [tx, ty] of tiles) {
    if (isPathTile(tx, ty) || isPlotTile(tx, ty) || isCoreTile(tx, ty)) continue;
    const h = tileHash(tx, ty);
    if (h < 0.22) {
      const p = tileToScreen(tx, ty);
      drawTree(ctx, p.x + (h * 40 - 20), p.y - 4, 0.8 + h);
    } else if (h > 0.9) {
      const p = tileToScreen(tx, ty);
      drawRock(ctx, p.x + 14, p.y + 2, 7 + h * 4);
    }
  }
  return c;
}

function drawTree(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(20,10,5,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x - 2 * s, y - 12 * s, 4 * s, 12 * s);
  const blobs = [[0, -18, 9], [-7, -12, 7], [7, -12, 7]];
  for (const [dx, dy, r] of blobs) {
    const g = ctx.createRadialGradient(x + dx * s - 2, y + dy * s - 2, 1, x + dx * s, y + dy * s, r * s);
    g.addColorStop(0, '#8fc46a');
    g.addColorStop(1, '#4d7a36');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRock(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(20,10,5,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8d8578';
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r * 0.4, y - r);
  ctx.lineTo(x + r * 0.6, y - r * 0.8);
  ctx.lineTo(x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,0.25)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r);
  ctx.lineTo(x + r * 0.6, y - r * 0.8);
  ctx.lineTo(x + r * 0.1, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}
