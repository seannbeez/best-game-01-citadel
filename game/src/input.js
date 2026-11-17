// Pointer, keyboard and touch input. One handler for mouse and touch
// (pointer events), plus hotkeys. Hit-testing uses the HUD layout from
// render.js so buttons and canvas art can never disagree.

import { SPELLS, SPELL_ORDER, TOWERS, TOWER_ORDER } from './config.js';
import { hudLayout } from './render.js';
import { PLOT_SCREENS } from './game.js';
import {
  startGame, buildTower, upgradeTower, sellTower, castSpell, applyRelic, startWave,
} from './game.js';
import { ensureAudio, setMuted, isMuted, sfx } from './audio.js';

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function nearestPlot(x, y) {
  let best = null, bestD = 30;
  for (const p of PLOT_SCREENS) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function nearestTower(s, x, y) {
  let best = null, bestD = 34;
  for (const t of s.towers) {
    const d = Math.hypot(x - t.sx, y - (t.sy - 12));
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

export function attachInput(s, canvas) {
  const L = hudLayout(s);
  let mouse = { x: 0, y: 0 };

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  function togglePause() {
    if (s.mode === 'playing') { s.mode = 'paused'; sfx.click(); }
    else if (s.mode === 'paused') { s.mode = 'playing'; sfx.click(); }
  }

  function toggleMute() {
    setMuted(!isMuted());
    s.muted = isMuted();
    if (!isMuted()) { ensureAudio(); sfx.click(); }
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    const p = canvasPos(e);
    mouse = p;
    // Title screen.
    if (s.mode === 'title') {
      if (inRect(p.x, p.y, L.startBtn)) startGame(s);
      return;
    }
    // End screens.
    if (s.mode === 'victory' || s.mode === 'defeat') {
      if (inRect(p.x, p.y, L.restartBtn)) startGame(s);
      return;
    }
    // Draft: pick a relic card.
    if (s.mode === 'draft') {
      for (let i = 0; i < s.draftOptions.length; i++) {
        if (inRect(p.x, p.y, L.draftCards[i])) { applyRelic(s, s.draftOptions[i]); return; }
      }
      return;
    }
    if (s.mode === 'paused') {
      if (inRect(p.x, p.y, L.pauseBtn)) togglePause();
      return;
    }
    if (s.mode !== 'playing') return;
    // HUD buttons first.
    if (inRect(p.x, p.y, L.muteBtn)) { toggleMute(); return; }
    if (inRect(p.x, p.y, L.pauseBtn)) { togglePause(); return; }
    if (s.nextWaveTimer > 0 && inRect(p.x, p.y, L.nextWaveBtn)) {
      s.nextWaveTimer = 0;
      startWave(s, s.wave + 1);
      return;
    }
    for (const r of L.spells) {
      if (inRect(p.x, p.y, r)) {
        s.pendingSpell = s.pendingSpell === r.kind ? null : r.kind;
        s.beamDrag = null;
        sfx.click();
        return;
      }
    }
    // Tower panel.
    if (s.selectedTower) {
      if (s.selectedTower.level < 3 && inRect(p.x, p.y, L.upgradeBtn)) { upgradeTower(s, s.selectedTower); return; }
      if (inRect(p.x, p.y, L.sellBtn)) { sellTower(s, s.selectedTower); return; }
    } else if (s.selectedPlot) {
      for (const b of L.buildBtns) {
        if (inRect(p.x, p.y, b)) {
          if (buildTower(s, b.type, s.selectedPlot)) { s.selectedPlot = null; }
          else sfx.hit();
          return;
        }
      }
    }
    // A pending spell wants a battlefield target.
    if (s.pendingSpell) {
      if (s.pendingSpell === 'beam') {
        s.beamDrag = { x: p.x, y: p.y };
        return;
      }
      if (castSpell(s, s.pendingSpell, p.x, p.y)) s.pendingSpell = null;
      return;
    }
    // Field: select a tower, a plot, or clear the selection.
    const tower = nearestTower(s, p.x, p.y);
    if (tower) {
      s.selectedTower = tower;
      s.selectedPlot = null;
      sfx.click();
      return;
    }
    const plot = nearestPlot(p.x, p.y);
    if (plot) {
      if (s.towers.some(t => t.tx === plot.tx && t.ty === plot.ty)) {
        s.selectedTower = s.towers.find(t => t.tx === plot.tx && t.ty === plot.ty);
        s.selectedPlot = null;
      } else {
        s.selectedPlot = plot;
        s.selectedTower = null;
      }
      sfx.click();
      return;
    }
    s.selectedTower = null;
    s.selectedPlot = null;
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = canvasPos(e);
    mouse = p;
    if (s.pendingSpell === 'beam' && s.beamDrag) s.beamDrag = { x: p.x, y: p.y };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (s.pendingSpell === 'beam' && s.beamDrag) {
      const p = canvasPos(e);
      const dir = Math.atan2(p.y - s.airshipY, p.x - s.airshipX);
      if (castSpell(s, 'beam', p.x, p.y, dir)) s.pendingSpell = null;
      s.beamDrag = null;
    }
  });

  canvas.addEventListener('pointercancel', () => { s.beamDrag = null; });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm') { toggleMute(); return; }
    if (k === 'p' || k === 'escape') {
      if (k === 'escape') { s.pendingSpell = null; s.selectedTower = null; s.selectedPlot = null; }
      else togglePause();
      return;
    }
    if (k === 'r') {
      if (s.mode === 'playing' || s.mode === 'paused' || s.mode === 'victory' || s.mode === 'defeat') {
        ensureAudio();
        startGame(s);
      }
      return;
    }
    if (s.mode === 'playing') {
      const idx = ['1', '2', '3'].indexOf(k);
      if (idx >= 0) {
        const kind = SPELL_ORDER[idx];
        s.pendingSpell = s.pendingSpell === kind ? null : kind;
        s.beamDrag = null;
        ensureAudio();
        sfx.click();
      }
      if (k === 'enter' && s.nextWaveTimer > 0) {
        s.nextWaveTimer = 0;
        startWave(s, s.wave + 1);
      }
    }
    if (s.mode === 'title' && (k === 'enter' || k === ' ')) {
      ensureAudio();
      startGame(s);
    }
    if ((s.mode === 'victory' || s.mode === 'defeat') && k === 'enter') {
      ensureAudio();
      startGame(s);
    }
  });

  return { getMouse: () => mouse };
}
