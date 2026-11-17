// Articulated multi-part sprites. Nothing is a lone circle or square:
// towers have bases, rotating turrets, recoiling barrels and glowing cores;
// enemies have wheels, wings, pistons and rivets; all cast soft shadows.

import { PALETTE, TOWERS } from './config.js';
import { getTextures } from './textures.js';

export function drawShadow(ctx, x, y, rx, alpha) {
  const tex = getTextures().shadow;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.drawImage(tex, x - rx, y - rx * 0.45, rx * 2, rx * 0.9);
  ctx.restore();
}

// Small iso stone platform with brass trim, shared by towers and the core.
function drawPlatform(ctx, x, y, w, h, topColor) {
  ctx.fillStyle = '#5e4023';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.lineTo(x, y + h / 2 - 6);
  ctx.lineTo(x - w / 2, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7d5a35';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 6);
  ctx.lineTo(x, y + h / 2 - 6);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.lineTo(x, y - h / 2 - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 6);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.lineTo(x, y + h / 2 - 6);
  ctx.lineTo(x - w / 2, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,164,65,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 6);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.lineTo(x, y + h / 2 - 6);
  ctx.lineTo(x - w / 2, y - 6);
  ctx.closePath();
  ctx.stroke();
}

function drawGlow(ctx, x, y, r, color, alpha) {
  const tex = color === '#59e6ff' ? getTextures().glowCyan
    : color === '#8fe3ff' ? getTextures().glowFrost
    : color === '#ff9a3d' ? getTextures().glowOrange
    : color === '#b388ff' ? getTextures().glowPurple
    : getTextures().glowGold;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 0.8 : alpha;
  ctx.drawImage(tex, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// --- Towers ---

export function drawTower(ctx, tower, t) {
  const def = TOWERS[tower.type];
  const x = tower.sx, y = tower.sy;
  const aim = tower.aim || -Math.PI / 2;
  const recoil = tower.recoil || 0;
  drawShadow(ctx, x, y + 2, 26);
  drawPlatform(ctx, x, y, 46, 23, '#c8a06a');
  const topY = y - 6;
  if (tower.type === 'tesla') {
    // Stone column.
    ctx.fillStyle = '#9a8a72';
    ctx.fillRect(x - 7, topY - 26, 14, 26);
    ctx.fillStyle = '#b7a586';
    ctx.fillRect(x - 7, topY - 26, 5, 26);
    // Three stacked brass rings.
    for (let i = 0; i < 3; i++) {
      const ry = topY - 30 - i * 7;
      ctx.fillStyle = i % 2 ? PALETTE.brassLight : PALETTE.brass;
      ctx.beginPath(); ctx.ellipse(x, ry, 11 - i, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.brassDark; ctx.lineWidth = 1; ctx.stroke();
    }
    // Glowing orb, pulsing.
    const pulse = 1 + Math.sin(t * 4) * 0.12;
    drawGlow(ctx, x, topY - 52, 16 * pulse, '#59e6ff', 0.9);
    ctx.fillStyle = '#d8f7ff';
    ctx.beginPath(); ctx.arc(x, topY - 52, 5 * pulse, 0, Math.PI * 2); ctx.fill();
    // Idle sparks.
    if (Math.sin(t * 3 + tower.seed) > 0.7) {
      ctx.strokeStyle = 'rgba(180,240,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(x - 6, topY - 48);
      ctx.lineTo(x - 12, topY - 38);
      ctx.lineTo(x - 4, topY - 34);
      ctx.stroke();
    }
  } else if (tower.type === 'frost') {
    // Faceted crystal prism.
    const cy = topY - 22;
    const g = ctx.createLinearGradient(x, cy - 20, x, cy + 12);
    g.addColorStop(0, '#d8f6ff');
    g.addColorStop(0.5, '#7fd4f2');
    g.addColorStop(1, '#2f7ea8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, cy - 22);
    ctx.lineTo(x + 11, cy - 6);
    ctx.lineTo(x + 7, cy + 12);
    ctx.lineTo(x - 7, cy + 12);
    ctx.lineTo(x - 11, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, cy - 22); ctx.lineTo(x, cy + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 11, cy - 6); ctx.lineTo(x + 11, cy - 6); ctx.stroke();
    drawGlow(ctx, x, cy, 20, '#8fe3ff', 0.55 + Math.sin(t * 2.5) * 0.15);
    // Snowflake glyph on the base.
    ctx.strokeStyle = 'rgba(220,245,255,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 5, topY - 4 - Math.sin(a) * 3);
      ctx.lineTo(x + Math.cos(a) * 5, topY - 4 + Math.sin(a) * 3);
      ctx.stroke();
    }
  } else if (tower.type === 'ballista') {
    // Wooden frame and rotating head.
    ctx.save();
    ctx.translate(x, topY - 8);
    ctx.rotate(aim);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(-14, -3, 28, 2);
    // Bow arms.
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-18, -10, -8, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-18, 10, -8, 12); ctx.stroke();
    // Bolt in the cradle, shifted back by recoil.
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(2 - recoil * 6, -1.5, 16, 3);
    ctx.fillStyle = PALETTE.ironDark;
    ctx.beginPath(); ctx.moveTo(18 - recoil * 6, -3); ctx.lineTo(24 - recoil * 6, 0); ctx.lineTo(18 - recoil * 6, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Brass pivot + level rivets.
    ctx.fillStyle = PALETTE.brass;
    ctx.beginPath(); ctx.arc(x, topY - 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.brassDark; ctx.stroke();
  } else if (tower.type === 'mortar') {
    // Angled brass barrel, recoiling along its axis.
    ctx.save();
    ctx.translate(x, topY - 10);
    ctx.rotate(aim);
    const rx = -recoil * 7;
    ctx.fillStyle = PALETTE.brassDark;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(rx - 2, -6, 22, 12);
    ctx.fillStyle = PALETTE.brassLight;
    ctx.fillRect(rx + 16, -7, 5, 14);
    ctx.fillStyle = PALETTE.ironDark;
    ctx.beginPath(); ctx.arc(rx + 21, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Fuse spark.
    if (Math.sin(t * 6 + tower.seed) > 0.4) {
      drawGlow(ctx, x + 14, topY - 26, 7, '#ff9a3d', 0.8);
    }
    // Powder kegs beside the base.
    ctx.fillStyle = PALETTE.wood;
    ctx.beginPath(); ctx.arc(x - 16, topY - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 13, topY - 9, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(x - 8 + i * 8, y + 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,15,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

// --- The citadel core ---

export function drawCore(ctx, x, y, t, hp, maxHp) {
  drawShadow(ctx, x, y + 4, 44);
  drawPlatform(ctx, x, y, 78, 39, '#c8a06a');
  const topY = y - 6;
  // Stone keep: two stacked iso boxes.
  ctx.fillStyle = '#8a7a62';
  ctx.fillRect(x - 26, topY - 34, 52, 34);
  ctx.fillStyle = '#a89478';
  ctx.fillRect(x - 26, topY - 34, 52, 6);
  ctx.fillStyle = '#6d5c46';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 22 + i * 12, topY - 34, 3, 34);
  }
  // Brass dome and glowing rune core.
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath(); ctx.arc(x, topY - 34, 18, Math.PI, 0); ctx.fill();
  ctx.fillStyle = PALETTE.brassLight;
  ctx.beginPath(); ctx.arc(x, topY - 34, 18, Math.PI * 1.15, Math.PI * 1.85); ctx.fill();
  const pulse = 0.7 + Math.sin(t * 2.2) * 0.25;
  drawGlow(ctx, x, topY - 44, 22, '#59e6ff', pulse);
  ctx.fillStyle = '#eafcff';
  ctx.beginPath(); ctx.arc(x, topY - 44, 7, 0, Math.PI * 2); ctx.fill();
  // Rotating rune ring around the dome.
  ctx.save();
  ctx.translate(x, topY - 44);
  ctx.rotate(t * 0.5);
  ctx.strokeStyle = 'rgba(255,215,106,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Banner flags.
  ctx.strokeStyle = '#5e3a1e';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 24, topY - 34); ctx.lineTo(x - 24, topY - 56); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 24, topY - 34); ctx.lineTo(x + 24, topY - 56); ctx.stroke();
  ctx.fillStyle = '#c94f4f';
  ctx.beginPath(); ctx.moveTo(x - 24, topY - 56); ctx.lineTo(x - 10, topY - 52); ctx.lineTo(x - 24, topY - 48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4f7ec9';
  ctx.beginPath(); ctx.moveTo(x + 24, topY - 56); ctx.lineTo(x + 10, topY - 52); ctx.lineTo(x + 24, topY - 48); ctx.closePath(); ctx.fill();
  // Health bar.
  const w = 64;
  ctx.fillStyle = 'rgba(20,10,5,0.6)';
  ctx.fillRect(x - w / 2, y + 12, w, 8);
  ctx.fillStyle = hp / maxHp > 0.35 ? PALETTE.health : PALETTE.danger;
  ctx.fillRect(x - w / 2 + 1, y + 13, (w - 2) * (hp / maxHp), 6);
  ctx.strokeStyle = '#2a1f14';
  ctx.strokeRect(x - w / 2, y + 12, w, 8);
}

// --- Hero airship ---

export function drawAirship(ctx, x, y, t, scale) {
  const s = scale || 1;
  drawShadow(ctx, x + 26, y + 74, 34 * s, 0.5);
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.4) * 4);
  ctx.scale(s, s);
  // Envelope: brass and crimson balloon with ribs.
  const g = ctx.createLinearGradient(0, -26, 0, 6);
  g.addColorStop(0, '#e8b64f');
  g.addColorStop(0.55, '#c98a2e');
  g.addColorStop(1, '#8a5a1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -10, 46, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4a12';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 14, -10, 6, 19, 0, -0.4, 0.4);
    ctx.stroke();
  }
  // Crimson stripe.
  ctx.fillStyle = '#a83a3a';
  ctx.beginPath();
  ctx.ellipse(0, -4, 46, 7, 0, 0, Math.PI);
  ctx.fill();
  // Gondola with windows and a tiny cannon.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(-24, 8, 48, 12);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(-24, 8, 48, 4);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(-18 + i * 15, 11, 8, 6);
  }
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(20, 12, 12, 4);
  // Rear propeller, spinning.
  ctx.save();
  ctx.translate(-48, -8);
  ctx.rotate(t * 9);
  ctx.strokeStyle = 'rgba(230,200,140,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
  ctx.restore();
  // Tail fins.
  ctx.fillStyle = '#a83a3a';
  ctx.beginPath(); ctx.moveTo(40, -16); ctx.lineTo(52, -26); ctx.lineTo(52, -8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --- Enemies ---

function healthBar(ctx, x, y, w, hp, maxHp) {
  if (hp >= maxHp) return;
  ctx.fillStyle = 'rgba(20,10,5,0.65)';
  ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = hp / maxHp > 0.35 ? '#7ee081' : '#ff5d5d';
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, hp / maxHp), 3);
}

export function drawEnemy(ctx, e, t) {
  const x = e.sx, y = e.sy;
  const bob = Math.sin(t * 6 + e.seed) * 2;
  if (e.kind === 'rat') {
    const spin = t * 8 + e.seed;
    drawShadow(ctx, x, y + 2, 13);
    // Two gear wheels as legs, spinning.
    for (const dx of [-7, 7]) {
      ctx.save();
      ctx.translate(x + dx, y - 3);
      ctx.rotate(spin * (dx > 0 ? 1 : -1));
      ctx.strokeStyle = '#8a6420';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }
    // Brass body with rivets.
    const g = ctx.createLinearGradient(x, y - 16, x, y);
    g.addColorStop(0, '#e8b64f'); g.addColorStop(1, '#9a6a20');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y - 9, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6d4a12'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#5e3a1e';
    for (const dx of [-5, 0, 5]) { ctx.beginPath(); ctx.arc(x + dx, y - 12, 1.2, 0, Math.PI * 2); ctx.fill(); }
    // Tail and glowing eye.
    ctx.strokeStyle = '#c98f3d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 11, y - 7); ctx.quadraticCurveTo(x - 20, y - 2 + bob, x - 16, y + 6); ctx.stroke();
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath(); ctx.arc(x + 9, y - 11, 2, 0, Math.PI * 2); ctx.fill();
    // Chilled tint.
    if (e.chill > 0) { ctx.fillStyle = 'rgba(143,227,255,0.45)'; ctx.beginPath(); ctx.ellipse(x, y - 9, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    healthBar(ctx, x, y - 24, 24, e.hp, e.maxHp);
  } else if (e.kind === 'bat') {
    const flap = Math.sin(t * 12 + e.seed) * 0.7;
    const fy = y - 16 + bob;
    drawShadow(ctx, x, y + 2, 11, 0.6);
    // Wings, flapping.
    ctx.fillStyle = '#6a5bb8';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(x, fy);
      ctx.rotate(s * flap * 0.7);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 14, -12, s * 24, -4);
      ctx.quadraticCurveTo(s * 16, 2, s * 8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Body and ears.
    ctx.fillStyle = '#8a7bd8';
    ctx.beginPath(); ctx.ellipse(x, fy, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, fy - 8); ctx.lineTo(x - 7, fy - 15); ctx.lineTo(x - 2, fy - 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 5, fy - 8); ctx.lineTo(x + 7, fy - 15); ctx.lineTo(x + 2, fy - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(x - 3, fy - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, fy - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    if (e.chill > 0) { ctx.fillStyle = 'rgba(143,227,255,0.45)'; ctx.beginPath(); ctx.ellipse(x, fy, 8, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    healthBar(ctx, x, fy - 22, 24, e.hp, e.maxHp);
  } else if (e.kind === 'wisp') {
    const fy = y - 14 + Math.sin(t * 3 + e.seed) * 4;
    drawShadow(ctx, x, y + 2, 10, 0.45);
    // Orbiting rune ring.
    ctx.save();
    ctx.translate(x, fy);
    ctx.rotate(t * 1.6);
    ctx.strokeStyle = 'rgba(89,230,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // Glowing orb body.
    drawGlow(ctx, x, fy, 18, '#59e6ff', 0.7);
    const g = ctx.createRadialGradient(x - 3, fy - 3, 1, x, fy, 11);
    g.addColorStop(0, '#eafcff');
    g.addColorStop(0.6, '#59c8e8');
    g.addColorStop(1, '#1f6a8a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, fy, 10, 0, Math.PI * 2); ctx.fill();
    // Rune glyph.
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, fy - 5); ctx.lineTo(x, fy + 5); ctx.moveTo(x - 4, fy - 2); ctx.lineTo(x + 4, fy - 2); ctx.stroke();
    if (e.chill > 0) { ctx.fillStyle = 'rgba(143,227,255,0.4)'; ctx.beginPath(); ctx.arc(x, fy, 10, 0, Math.PI * 2); ctx.fill(); }
    healthBar(ctx, x, fy - 22, 24, e.hp, e.maxHp);
  } else if (e.kind === 'golem') {
    const stomp = Math.sin(t * 4 + e.seed) * 2;
    drawShadow(ctx, x, y + 2, 20);
    // Piston legs, stomping alternately.
    ctx.fillStyle = '#6b5a44';
    ctx.fillRect(x - 11, y - 12 + Math.max(0, stomp), 7, 12 - Math.max(0, stomp));
    ctx.fillRect(x + 4, y - 12 + Math.max(0, -stomp), 7, 12 - Math.max(0, -stomp));
    // Torso with rivets and glowing core.
    const g = ctx.createLinearGradient(x, y - 34, x, y - 8);
    g.addColorStop(0, '#d9b078'); g.addColorStop(1, '#8a6420');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 34, 32, 24);
    ctx.strokeStyle = '#5e3a1e'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 16, y - 34, 32, 24);
    ctx.fillStyle = '#5e3a1e';
    for (const [rx, ry] of [[-12, -30], [12, -30], [-12, -14], [12, -14]]) {
      ctx.beginPath(); ctx.arc(x + rx, y + ry, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    drawGlow(ctx, x, y - 22, 12, '#ff9a3d', 0.8);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(x, y - 22, 5, 0, Math.PI * 2); ctx.fill();
    // Piston arms.
    ctx.fillStyle = '#7d6a4e';
    ctx.fillRect(x - 24, y - 30, 8, 20);
    ctx.fillRect(x + 16, y - 30, 8, 20);
    ctx.fillStyle = '#4d4436';
    ctx.beginPath(); ctx.arc(x - 20, y - 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 20, y - 8, 5, 0, Math.PI * 2); ctx.fill();
    // Head with visor.
    ctx.fillStyle = '#a8895e';
    ctx.fillRect(x - 9, y - 44, 18, 11);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(x - 6, y - 41, 12, 3);
    // Shoulder gears.
    ctx.fillStyle = PALETTE.brass;
    ctx.beginPath(); ctx.arc(x - 16, y - 34, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 16, y - 34, 5, 0, Math.PI * 2); ctx.fill();
    if (e.chill > 0) { ctx.fillStyle = 'rgba(143,227,255,0.35)'; ctx.fillRect(x - 16, y - 34, 32, 24); }
    healthBar(ctx, x, y - 52, 36, e.hp, e.maxHp);
  } else if (e.kind === 'boss') {
    const rot = t * 0.7;
    drawShadow(ctx, x, y + 3, 34);
    // Three rotating gear rings around the body.
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(x, y - 26);
      ctx.rotate(rot * (i % 2 ? -1 : 1) + i);
      ctx.strokeStyle = i === 1 ? '#b388ff' : '#d9a441';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.ellipse(0, 0, 30 + i * 4, 13 + i * 2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Massive body: dark iron plates, brass trim, void core.
    const g = ctx.createLinearGradient(x, y - 62, x, y);
    g.addColorStop(0, '#5a3a6e'); g.addColorStop(0.6, '#3a2547'); g.addColorStop(1, '#241631');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 8);
    ctx.lineTo(x - 30, y - 40);
    ctx.lineTo(x - 16, y - 58);
    ctx.lineTo(x + 16, y - 58);
    ctx.lineTo(x + 30, y - 40);
    ctx.lineTo(x + 26, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 2; ctx.stroke();
    // Void core, swirling.
    drawGlow(ctx, x, y - 34, 22, '#b388ff', 0.9);
    ctx.fillStyle = '#1a0b26';
    ctx.beginPath(); ctx.arc(x, y - 34, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e6ccff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 34, 8 + Math.sin(t * 5) * 2, 0, Math.PI * 2); ctx.stroke();
    // Claw arms.
    ctx.fillStyle = '#4a3560';
    ctx.fillRect(x - 40, y - 44, 12, 26);
    ctx.fillRect(x + 28, y - 44, 12, 26);
    ctx.fillStyle = '#d9d9e8';
    ctx.beginPath(); ctx.moveTo(x - 40, y - 18); ctx.lineTo(x - 34, y - 8); ctx.lineTo(x - 28, y - 18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 28, y - 18); ctx.lineTo(x + 34, y - 8); ctx.lineTo(x + 40, y - 18); ctx.closePath(); ctx.fill();
    // Crown spikes and eyes.
    ctx.fillStyle = '#d9a441';
    for (const dx of [-18, -6, 6, 18]) {
      ctx.beginPath(); ctx.moveTo(x + dx - 4, y - 58); ctx.lineTo(x + dx, y - 70); ctx.lineTo(x + dx + 4, y - 58); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath(); ctx.arc(x - 9, y - 48, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 9, y - 48, 2.5, 0, Math.PI * 2); ctx.fill();
    if (e.chill > 0) { ctx.fillStyle = 'rgba(143,227,255,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 34, 30, 28, 0, 0, Math.PI * 2); ctx.fill(); }
    healthBar(ctx, x, y - 80, 64, e.hp, e.maxHp);
  }
}

// --- Projectiles ---

export function drawProjectile(ctx, p, t) {
  if (p.kind === 'bolt') {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.sx - Math.cos(p.angle) * 14, p.sy - Math.sin(p.angle) * 14);
    ctx.lineTo(p.sx, p.sy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,80,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.sx - Math.cos(p.angle) * 26, p.sy - Math.sin(p.angle) * 26);
    ctx.lineTo(p.sx - Math.cos(p.angle) * 14, p.sy - Math.sin(p.angle) * 14);
    ctx.stroke();
  } else if (p.kind === 'shell') {
    drawShadow(ctx, p.sx, p.groundY, 8, 0.6);
    ctx.fillStyle = '#3d4048';
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 3, 0, Math.PI * 2); ctx.fill();
    drawGlow(ctx, p.sx, p.sy, 12, '#ff9a3d', 0.6);
  } else if (p.kind === 'arc') {
    // Jagged lightning polyline, drawn from stored points.
    ctx.strokeStyle = 'rgba(180,240,255,0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.points[0].x, p.points[0].y);
    for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (p.kind === 'meteor') {
    drawGlow(ctx, p.sx, p.sy, 18, '#ff9a3d', 0.8);
    ctx.fillStyle = '#ff7a5c';
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,80,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx - p.vx * 0.08, p.sy - p.vy * 0.08);
    ctx.stroke();
  }
}
