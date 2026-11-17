// Clockwork Citadel: Aether Siege — all drawing: the living diorama world,
// the RPG/strategy HUD, and the title / draft / end screens.

import {
  CANVAS_W, CANVAS_H, TOWERS, TOWER_ORDER, SPELLS, SPELL_ORDER, RELICS,
  PLOTS, MAX_WAVE,
} from './config.js';
import { clamp, tileToScreen, dist } from './util.js';
import { getTextures, buildSkyLayer, buildIslandLayer, drawGear, drawWaterfall } from './textures.js';
import { drawTower, drawCore, drawAirship, drawEnemy, drawProjectile, drawShadow } from './sprites.js';
import { PLOT_SCREENS, CORE_SCREEN, towerRange, towerCost } from './game.js';

let skyLayer = null;
let islandLayer = null;

function layers() {
  if (!skyLayer) skyLayer = buildSkyLayer();
  if (!islandLayer) islandLayer = buildIslandLayer();
  return { skyLayer, islandLayer };
}

// Clouds drift across the valley, below and around the island.
const CLOUDS = [
  { x: 120, y: 560, s: 1.2, v: 6, tex: 0 },
  { x: 480, y: 620, s: 1.6, v: 4, tex: 1 },
  { x: 900, y: 590, s: 1.1, v: 7, tex: 2 },
  { x: 1080, y: 650, s: 1.5, v: 5, tex: 0 },
  { x: 300, y: 120, s: 0.8, v: 9, tex: 2 },
  { x: 1000, y: 90, s: 0.7, v: 8, tex: 1 },
];

export function render(s, ctx) {
  const { skyLayer: sky, islandLayer: island } = layers();
  const tex = getTextures();
  ctx.save();
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }
  ctx.drawImage(sky, 0, 0);
  // Giant brass gears turning beneath the island.
  drawGear(ctx, 430, 520, 74, 12, s.time * 0.25, 'dark');
  drawGear(ctx, 640, 560, 96, 14, -s.time * 0.18, 'light');
  drawGear(ctx, 860, 520, 66, 10, s.time * 0.3, 'dark');
  ctx.drawImage(island, 0, 0);
  // Waterfalls off the west and south edges.
  const w1 = tileToScreen(0, 4);
  const w2 = tileToScreen(8, 6);
  drawWaterfall(ctx, w1.x - 30, w1.y + 8, 120, s.time, 16);
  drawWaterfall(ctx, w2.x + 6, w2.y + 10, 150, s.time + 2, 20);
  // Drifting clouds.
  for (const c of CLOUDS) {
    const x = ((c.x + s.time * c.v) % (CANVAS_W + 260)) - 130;
    const img = [tex.cloud1, tex.cloud2, tex.cloud3][c.tex];
    ctx.drawImage(img, x, c.y, 220 * c.s, 90 * c.s);
  }
  // Hero airship on patrol.
  drawAirship(ctx, s.airshipX, s.airshipY, s.time, 1);
  // Entities in depth order (screen y).
  const items = [];
  for (const t of s.towers) items.push({ y: t.sy, kind: 'tower', t });
  for (const e of s.enemies) items.push({ y: e.sy, kind: 'enemy', e });
  items.push({ y: CORE_SCREEN.y, kind: 'core' });
  items.sort((a, b) => a.y - b.y);
  // Range ring for the selection, under the entities.
  drawSelectionRing(s, ctx);
  for (const it of items) {
    if (it.kind === 'tower') drawTower(ctx, it.t, s.time);
    else if (it.kind === 'enemy') drawEnemy(ctx, it.e, s.time);
    else drawCore(ctx, CORE_SCREEN.x, CORE_SCREEN.y, s.time, s.coreHp, s.coreMax);
  }
  // Projectiles, wells, beams, meteors, particles, floating texts.
  for (const p of s.projectiles) drawProjectile(ctx, p, s.time);
  for (const w of s.wells) drawWell(ctx, w, s.time);
  for (const b of s.beams) drawBeam(ctx, b);
  for (const p of s.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of s.floats) {
    ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
    ctx.font = 'bold ' + (f.size || 14) + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(20,10,5,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // Screens and HUD on top (no shake).
  if (s.mode === 'title') drawTitle(s, ctx);
  else {
    drawHud(s, ctx);
    if (s.mode === 'draft') drawDraft(s, ctx);
    else if (s.mode === 'paused') drawPause(s, ctx);
    else if (s.mode === 'victory' || s.mode === 'defeat') drawEnd(s, ctx);
  }
  // Pending-spell aim line.
  if (s.pendingSpell === 'beam' && s.beamDrag) {
    ctx.strokeStyle = 'rgba(255,215,106,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(s.airshipX, s.airshipY);
    const ang = Math.atan2(s.beamDrag.y - s.airshipY, s.beamDrag.x - s.airshipX);
    ctx.lineTo(s.airshipX + Math.cos(ang) * 520, s.airshipY + Math.sin(ang) * 520);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSelectionRing(s, ctx) {
  const target = s.selectedTower || (s.selectedPlot ? { sx: s.selectedPlot.x, sy: s.selectedPlot.y, type: null } : null);
  if (!target) return;
  const range = s.selectedTower ? towerRange(s, s.selectedTower) : 150;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,106,0.75)';
  ctx.fillStyle = 'rgba(255,215,106,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(target.sx, target.sy, range, range * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Hover highlight on the selected plot.
  if (s.selectedPlot && !s.selectedTower) {
    ctx.save();
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(s.selectedPlot.x, s.selectedPlot.y, 24, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWell(ctx, w, t) {
  const pulse = 1 + Math.sin(t * 6) * 0.06;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#7a4fd0';
  ctx.beginPath();
  ctx.ellipse(w.x, w.y, w.r * pulse, w.r * 0.5 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c2ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.ellipse(w.x, w.y, w.r * 0.8 * pulse, w.r * 0.4 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.rotate(t * 2);
  ctx.strokeStyle = 'rgba(230,210,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w.x, w.y, 18, 0, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}

function drawBeam(ctx, b) {
  const a = clamp(b.life / b.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#fff3b0';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.restore();
}

// --- HUD ---

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = 'rgba(28,18,10,' + (alpha == null ? 0.72 : alpha) + ')';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(217,164,65,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function goldIcon(ctx, x, y, r) {
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#8a6420';
  ctx.font = 'bold ' + Math.round(r * 1.1) + 'px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('G', x, y + 1);
}

function heartIcon(ctx, x, y, s) {
  ctx.fillStyle = '#ff5d5d';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.7);
  ctx.bezierCurveTo(x - s, y, x - s * 0.6, y - s, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.6, y - s, x + s, y, x, y + s * 0.7);
  ctx.fill();
}

export function hudLayout(s) {
  // One source of truth for HUD hit rects, shared by render and input.
  const spells = SPELL_ORDER.map((k, i) => ({ kind: k, x: 24 + i * 168, y: 652, w: 158, h: 56 }));
  const buildBtns = TOWER_ORDER.map((k, i) => ({ type: k, x: 560 + i * 128, y: 652, w: 118, h: 56 }));
  return {
    spells,
    buildBtns,
    upgradeBtn: { x: 560, y: 652, w: 150, h: 56 },
    sellBtn: { x: 720, y: 652, w: 110, h: 56 },
    startBtn: { x: CANVAS_W / 2 - 160, y: 470, w: 320, h: 64 },
    restartBtn: { x: CANVAS_W / 2 - 140, y: 560, w: 280, h: 56 },
    muteBtn: { x: 1196, y: 10, w: 34, h: 34 },
    pauseBtn: { x: 1156, y: 10, w: 34, h: 34 },
    nextWaveBtn: { x: CANVAS_W / 2 - 110, y: 600, w: 220, h: 44 },
    draftCards: [0, 1, 2].map(i => ({ x: CANVAS_W / 2 - 360 + i * 250, y: 210, w: 230, h: 300 })),
  };
}

function drawHud(s, ctx) {
  const L = hudLayout(s);
  // Top bar.
  panel(ctx, 0, 0, CANVAS_W, 56, 0.78);
  goldIcon(ctx, 34, 28, 12);
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(String(s.gold), 52, 29);
  heartIcon(ctx, 128, 28, 10);
  ctx.fillStyle = '#ff8a8a';
  ctx.fillText(s.coreHp + '/' + s.coreMax, 146, 29);
  // Wave timeline.
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WAVE ' + Math.max(1, s.wave) + ' / ' + MAX_WAVE, 640, 20);
  for (let i = 0; i < MAX_WAVE; i++) {
    const x = 640 - 110 + i * 24;
    ctx.fillStyle = i < s.wave - 1 ? '#7ee081' : i === s.wave - 1 ? '#ffd76a' : 'rgba(243,226,184,0.35)';
    ctx.beginPath(); ctx.arc(x, 42, i === MAX_WAVE - 1 ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    if (i === MAX_WAVE - 1) {
      ctx.fillStyle = '#2a1f14';
      ctx.font = 'bold 8px Georgia, serif';
      ctx.fillText('B', x, 42.5);
    }
  }
  // Score and combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('SCORE ' + s.score.toLocaleString('en-US'), 1130, 20);
  if (s.combo > 1) {
    ctx.fillStyle = '#ff9a3d';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('COMBO x' + s.combo, 1130, 42);
  }
  // Mute / pause buttons.
  smallBtn(ctx, L.muteBtn, s.muted ? 'M✕' : 'M♪');
  smallBtn(ctx, L.pauseBtn, s.mode === 'paused' ? '▶' : 'II');
  // Bottom bar.
  panel(ctx, 0, 644, CANVAS_W, 76, 0.78);
  // Spell cards.
  for (const r of L.spells) {
    const def = SPELLS[r.kind];
    const cd = Math.max(0, s.spellCooldowns[r.kind]);
    const ready = cd <= 0;
    ctx.fillStyle = s.pendingSpell === r.kind ? 'rgba(255,215,106,0.3)' : 'rgba(60,40,20,0.85)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = ready ? def.color : 'rgba(150,130,100,0.6)';
    ctx.lineWidth = s.pendingSpell === r.kind ? 3 : 1.5;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    drawSpellIcon(ctx, r.kind, r.x + 24, r.y + 28, 13);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = ready ? '#f3e2b8' : '#a89880';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(def.name, r.x + 44, r.y + 18);
    ctx.font = '12px Verdana, sans-serif';
    ctx.fillStyle = ready ? def.color : '#a89880';
    ctx.fillText(ready ? 'READY  [' + def.key + ']' : Math.ceil(cd) + 's', r.x + 44, r.y + 40);
    if (!ready) {
      const frac = cd / (def.cooldown * s.cooldownMul);
      ctx.fillStyle = 'rgba(10,5,2,0.55)';
      ctx.fillRect(r.x, r.y, r.w * clamp(frac, 0, 1), r.h);
    }
  }
  // Build / upgrade panel.
  if (s.selectedTower) {
    const t = s.selectedTower;
    const def = TOWERS[t.type];
    const st = towerRange(s, t);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f3e2b8';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(def.name + '  Lv' + t.level, 560, 664);
    ctx.font = '12px Verdana, sans-serif';
    ctx.fillStyle = '#cbb98f';
    ctx.fillText('Dmg ' + Math.round(def.dmg * s.towerDmgMul * (1 + 0.45 * (t.level - 1))) + '  •  Range ' + Math.round(st), 560, 684);
    if (t.level < 3) {
      const cost = towerCost(t.type, t.level + 1);
      actionBtn(ctx, L.upgradeBtn, 'UPGRADE  ' + cost + 'g', s.gold >= cost);
    } else {
      ctx.fillStyle = '#7ee081';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText('MAX LEVEL', 570, 682);
    }
    actionBtn(ctx, L.sellBtn, 'SELL', true);
  } else if (s.selectedPlot) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f3e2b8';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText('BUILD TOWER', 560, 660);
    for (const b of L.buildBtns) {
      const def = TOWERS[b.type];
      const afford = s.gold >= def.cost;
      ctx.fillStyle = afford ? 'rgba(60,40,20,0.85)' : 'rgba(40,28,16,0.85)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = afford ? def.color : 'rgba(150,130,100,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.textAlign = 'center';
      ctx.fillStyle = afford ? '#f3e2b8' : '#8a7a62';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.fillText(def.short, b.x + b.w / 2, b.y + 20);
      ctx.font = '12px Verdana, sans-serif';
      ctx.fillStyle = afford ? '#ffd76a' : '#8a7a62';
      ctx.fillText(def.cost + 'g', b.x + b.w / 2, b.y + 40);
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbb98f';
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText('Click a brass ring to build a tower.  Click a spell, then the battlefield to cast it.', 560, 680);
  }
  // Wave countdown / next wave button.
  if (s.nextWaveTimer > 0) {
    actionBtn(ctx, L.nextWaveBtn, 'NEXT WAVE IN ' + Math.ceil(s.nextWaveTimer) + 's', true);
  }
}

function smallBtn(ctx, r, label) {
  ctx.fillStyle = 'rgba(60,40,20,0.9)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(217,164,65,0.7)';
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

function actionBtn(ctx, r, label, enabled) {
  ctx.fillStyle = enabled ? 'rgba(120,84,30,0.95)' : 'rgba(50,38,22,0.9)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = enabled ? '#ffd76a' : 'rgba(150,130,100,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.fillStyle = enabled ? '#ffe9a8' : '#8a7a62';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
}

export function drawSpellIcon(ctx, kind, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'beam') {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.lineTo(r, -r * 0.7); ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(r * 0.7, -r * 0.6, 4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'well') {
    ctx.strokeStyle = '#d9c2ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#b388ff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'meteor') {
    ctx.fillStyle = '#ff7a5c';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(-2, -2, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,80,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.lineTo(-r, r); ctx.stroke();
  }
  ctx.restore();
}

// --- Screens ---

function gildedFrame(ctx, x, y, w, h) {
  ctx.strokeStyle = 'rgba(217,164,65,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(242,201,107,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6420'; ctx.stroke();
  }
}

function drawTitle(s, ctx) {
  ctx.fillStyle = 'rgba(16,10,32,0.42)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  gildedFrame(ctx, 300, 96, 680, 440);
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  ctx.fillRect(306, 102, 668, 428);
  // Ornate logo.
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = '#d9c48f';
  ctx.fillText('—  A  MAKE.FUN  EXPEDITION  —', 640, 150);
  const grad = ctx.createLinearGradient(0, 180, 0, 250);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(0.5, '#d9a441');
  grad.addColorStop(1, '#9a6a20');
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText('CLOCKWORK', 640, 208);
  ctx.fillText('CITADEL', 640, 266);
  ctx.shadowBlur = 0;
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#59e6ff';
  ctx.fillText('Aether Siege', 640, 312);
  ctx.font = '15px Verdana, sans-serif';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText('Raise clockwork towers, sling hero spells, and hold the', 640, 352);
  ctx.fillText('floating citadel through 10 waves — ending with the Voidmaw.', 640, 374);
  // START button, gently pulsing.
  const L = hudLayout(s);
  const pulse = 1 + Math.sin(s.time * 3) * 0.03;
  ctx.save();
  ctx.translate(640, 502);
  ctx.scale(pulse, pulse);
  const bg = ctx.createLinearGradient(-160, -32, 160, 32);
  bg.addColorStop(0, '#8a6420');
  bg.addColorStop(0.5, '#d9a441');
  bg.addColorStop(1, '#8a6420');
  ctx.fillStyle = bg;
  ctx.fillRect(-160, -32, 320, 64);
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-160, -32, 320, 64);
  ctx.fillStyle = '#2a1f14';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('START EXPEDITION', 0, 1);
  ctx.restore();
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillStyle = '#cbb98f';
  ctx.fillText('Mouse: build towers & aim spells  •  1 / 2 / 3: spells  •  P: pause  •  M: mute  •  R: restart', 640, 566);
  ctx.fillText('Touch supported: tap a brass ring to build, tap a spell then the field to cast.', 640, 588);
  // Keep the button rect in sync with the pulse (input uses hudLayout).
  void L;
}

function drawRelicIcon(ctx, icon, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (icon === 'gear') {
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.rect(Math.cos(a) * r * 0.7 - 4, Math.sin(a) * r * 0.7 - 4, 8, 8);
    }
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1f14';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (icon === 'bolt') {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(4, -r); ctx.lineTo(-10, 2); ctx.lineTo(-1, 2); ctx.lineTo(-5, r); ctx.lineTo(10, -2); ctx.lineTo(1, -2);
    ctx.closePath(); ctx.fill();
  } else if (icon === 'coin') {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8a6420';
    ctx.font = 'bold ' + Math.round(r) + 'px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('G', 0, 1);
  } else if (icon === 'shield') {
    ctx.fillStyle = '#7ee081';
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, -r * 0.5); ctx.lineTo(r * 0.8, r * 0.2);
    ctx.quadraticCurveTo(r * 0.8, r * 0.8, 0, r);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.8, -r * 0.8, r * 0.2);
    ctx.lineTo(-r * 0.8, -r * 0.5);
    ctx.closePath(); ctx.fill();
  } else if (icon === 'eye') {
    ctx.strokeStyle = '#59e6ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#59e6ff';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e2a3a';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
  } else if (icon === 'arrows') {
    ctx.strokeStyle = '#ff9a3d';
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * r * 0.2, -r * 0.6); ctx.lineTo(s * r * 0.2, r * 0.6); ctx.stroke();
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath(); ctx.moveTo(s * r * 0.2 - 5, r * 0.35); ctx.lineTo(s * r * 0.2 + 5, r * 0.35); ctx.lineTo(s * r * 0.2, r * 0.7); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function drawDraft(s, ctx) {
  ctx.fillStyle = 'rgba(16,10,32,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('WAVE ' + s.wave + ' CLEARED', 640, 150);
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText('The citadel holds. Choose a relic to carry into the next wave.', 640, 182);
  const L = hudLayout(s);
  s.draftOptions.forEach((relic, i) => {
    const r = L.draftCards[i];
    ctx.fillStyle = 'rgba(32,22,12,0.95)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.strokeStyle = 'rgba(242,201,107,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
    drawRelicIcon(ctx, relic.icon, r.x + r.w / 2, r.y + 70, 34);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(relic.name, r.x + r.w / 2, r.y + 140);
    ctx.fillStyle = '#f3e2b8';
    ctx.font = '15px Verdana, sans-serif';
    // Wrap the description to two lines.
    const words = relic.desc.split(' ');
    let line = '', ly = r.y + 180;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 22) {
        ctx.fillText(line.trim(), r.x + r.w / 2, ly);
        ly += 22; line = w;
      } else line += ' ' + w;
    }
    ctx.fillText(line.trim(), r.x + r.w / 2, ly);
    ctx.fillStyle = '#8a7a62';
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('click to choose', r.x + r.w / 2, r.y + 262);
  });
}

function drawPause(s, ctx) {
  ctx.fillStyle = 'rgba(16,10,32,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText('PAUSED', 640, 330);
  ctx.font = '16px Verdana, sans-serif';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText('Press P or click the pause button to resume.  R restarts the expedition.', 640, 372);
}

function drawEnd(s, ctx) {
  ctx.fillStyle = 'rgba(16,10,32,0.68)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  gildedFrame(ctx, 340, 110, 600, 470);
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(346, 116, 588, 458);
  const victory = s.mode === 'victory';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = victory ? '#ffd76a' : '#ff8a8a';
  ctx.fillText(victory ? 'THE CITADEL STANDS!' : 'THE CITADEL FALLS', 640, 170);
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText(
    victory ? 'The Voidmaw is shattered. The aether is yours.' : 'The Voidmaw broke through on wave ' + s.wave + '.',
    640, 208,
  );
  const st = s.stats || { score: 0, wave: 0, kills: 0, leaked: 0, gold: 0, spells: 0, towers: 0 };
  const rows = [
    ['FINAL SCORE', st.score.toLocaleString('en-US')],
    ['WAVES HELD', st.wave + ' / ' + MAX_WAVE],
    ['ENEMIES FELLED', String(st.kills)],
    ['LEAKED', String(st.leaked)],
    ['GOLD EARNED', String(st.gold)],
    ['SPELLS CAST', String(st.spells)],
    ['TOWERS RAISED', String(st.towers)],
  ];
  ctx.font = '16px Verdana, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 258 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbb98f';
    ctx.fillText(label, 420, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(value, 860, y);
  });
  const L = hudLayout(s);
  actionBtn(ctx, L.restartBtn, 'PLAY AGAIN  (R)', true);
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillStyle = '#cbb98f';
  ctx.textAlign = 'center';
  ctx.fillText('Press R or click the button to start a new expedition.', 640, 636);
}
