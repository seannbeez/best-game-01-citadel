// Clockwork Citadel: Aether Siege — game state, waves, towers, enemies,
// spells, particles, economy, drafts and win/lose. Pure logic, no DOM.

import {
  CANVAS_W, CANVAS_H, TOWERS, TOWER_ORDER, SPELLS, ENEMIES, RELICS,
  PATH_A, PATH_B, PLOTS, CORE_TILE, START_GOLD, START_CORE_HP, MAX_WAVE,
  MAX_TOWER_LEVEL, SELL_REFUND,
} from './config.js';
import { makeRng, clamp, dist, tileToScreen, pathToScreen } from './util.js';
import { sfx } from './audio.js';

// Path B (north gate) joins path A at its junction (5,1) and then follows
// path A the rest of the way to the core — a branch, not a dead end.
const PATH_A_SCREEN = pathToScreen(PATH_A);
export const SCREEN_PATHS = [PATH_A_SCREEN, pathToScreen(PATH_B).concat(PATH_A_SCREEN.slice(4))];
export const PLOT_SCREENS = PLOTS.map(([tx, ty]) => ({ tx, ty, ...tileToScreen(tx, ty) }));
export const CORE_SCREEN = tileToScreen(CORE_TILE[0], CORE_TILE[1]);

export function newGame() {
  return {
    mode: 'title',
    time: 0,
    gold: START_GOLD,
    score: 0,
    combo: 0,
    comboTimer: 0,
    coreHp: START_CORE_HP,
    coreMax: START_CORE_HP,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | clear
    spawnQueue: [],
    spawnTimer: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floats: [],
    wells: [],
    beams: [],
    meteors: [],
    draftOptions: [],
    relics: [],
    towerDmgMul: 1,
    cooldownMul: 1,
    goldMul: 1,
    rangeMul: 1,
    rateMul: 1,
    spellCooldowns: { beam: 0, well: 0, meteor: 0 },
    selectedPlot: null,
    selectedTower: null,
    pendingSpell: null,
    beamDrag: null,
    kills: 0,
    leaked: 0,
    earnedGold: 0,
    spellsCast: 0,
    towersBuilt: 0,
    airshipAngle: 0,
    shake: 0,
    nextWaveTimer: 0,
    muted: false,
    stats: null,
    shotFx: null,
    seed: 1234,
  };
}

export function startGame(s) {
  const fresh = newGame();
  fresh.mode = 'playing';
  fresh.muted = s.muted;
  Object.assign(s, fresh);
  sfx.horn();
  startWave(s, 1);
}

function waveComposition(n) {
  const q = [];
  const add = (kind, count, path) => { for (let i = 0; i < count; i++) q.push({ kind, path }); };
  if (n === MAX_WAVE) {
    add('golem', 4, 0); add('wisp', 4, 1); add('bat', 6, 0);
    q.push({ kind: 'boss', path: 0 });
    return q;
  }
  add('rat', 5 + n, 0);
  if (n >= 2) add('bat', 2 + n, 1);
  if (n >= 3) add('wisp', 1 + n, 0);
  if (n >= 4) add('golem', Math.floor(n / 2), 1);
  // Interleave the two gates with a seeded shuffle (boss stays last).
  const rng = makeRng(n * 100 + 7);
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}

export function startWave(s, n) {
  s.wave = n;
  s.spawnQueue = waveComposition(n);
  s.spawnTimer = 0.6;
  s.waveState = 'spawning';
  s.nextWaveTimer = 0;
  s.floats.push({ x: CANVAS_W / 2, y: 300, text: 'WAVE ' + n + (n === MAX_WAVE ? ' — VOIDMAW AWAKENS' : ''), life: 2.2, maxLife: 2.2, color: '#ffd76a', size: 30 });
  if (n > 1) sfx.horn();
}

function spawnEnemy(s, kind, pathIdx) {
  const def = ENEMIES[kind];
  const wps = SCREEN_PATHS[pathIdx];
  const hpScale = kind === 'boss' ? 1 : 1 + 0.28 * (s.wave - 1);
  const e = {
    kind, def,
    hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * (1 + 0.03 * (s.wave - 1)),
    sx: wps[0].x, sy: wps[0].y,
    wps, wp: 1,
    chill: 0, chillTime: 0,
    seed: Math.random() * 10,
    gold: def.gold, score: def.score,
    flying: !!def.flying,
    dead: false,
  };
  s.enemies.push(e);
}

export function towerCost(type, level) {
  return Math.round(TOWERS[type].cost * (level === 1 ? 1 : 0.8 * level));
}

export function buildTower(s, type, plot) {
  const cost = TOWERS[type].cost;
  if (s.gold < cost) return false;
  if (s.towers.some(t => t.tx === plot.tx && t.ty === plot.ty)) return false;
  s.gold -= cost;
  s.towers.push({
    type, tx: plot.tx, ty: plot.ty, sx: plot.x, sy: plot.y,
    level: 1, cooldown: 0, aim: -Math.PI / 2, recoil: 0, seed: Math.random() * 10,
  });
  s.towersBuilt++;
  burst(s, plot.x, plot.y - 10, 14, '#ffd76a', 90);
  sfx.build();
  return true;
}

export function upgradeTower(s, tower) {
  if (tower.level >= MAX_TOWER_LEVEL) return false;
  const cost = towerCost(tower.type, tower.level + 1);
  if (s.gold < cost) return false;
  s.gold -= cost;
  tower.level++;
  burst(s, tower.sx, tower.sy - 20, 18, '#59e6ff', 110);
  sfx.build();
  return true;
}

export function sellTower(s, tower) {
  const refund = Math.round(TOWERS[tower.type].cost * SELL_REFUND);
  s.gold += refund;
  s.towers = s.towers.filter(t => t !== tower);
  s.selectedTower = null;
  sfx.coin();
  return refund;
}

function towerStats(s, tower) {
  const def = TOWERS[tower.type];
  const lvl = tower.level - 1;
  return {
    range: def.range * s.rangeMul * (1 + 0.08 * lvl),
    dmg: def.dmg * s.towerDmgMul * (1 + 0.45 * lvl),
    rate: def.rate * s.rateMul,
  };
}

export function towerRange(s, tower) { return towerStats(s, tower).range; }

// --- Damage, death, combos ---

export function damageEnemy(s, e, dmg, source) {
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(s, e, source);
}

function killEnemy(s, e, source) {
  e.dead = true;
  s.kills++;
  const gold = Math.round(e.gold * s.goldMul);
  s.gold += gold;
  s.earnedGold += gold;
  s.combo++;
  s.comboTimer = 3;
  const mult = 1 + Math.min(s.combo, 20) * 0.1;
  s.score += Math.round(e.score * mult);
  s.floats.push({ x: e.sx, y: e.sy - 24, text: '+' + gold + 'g', life: 1, maxLife: 1, color: '#ffd76a', size: 13 });
  burst(s, e.sx, e.sy - 10, e.kind === 'boss' ? 60 : 12, e.def.color, e.kind === 'boss' ? 220 : 90);
  if (e.kind === 'boss') {
    s.shake = 14;
    sfx.boom();
    s.score += 2000 + s.coreHp * 50;
    winGame(s);
  } else {
    sfx.coin();
  }
}

function leakEnemy(s, e) {
  e.dead = true;
  s.leaked++;
  s.coreHp -= e.def.coreDmg;
  s.combo = 0;
  s.shake = 8;
  sfx.leak();
  s.floats.push({ x: CORE_SCREEN.x, y: CORE_SCREEN.y - 60, text: '-' + e.def.coreDmg + ' CORE', life: 1.4, maxLife: 1.4, color: '#ff5d5d', size: 16 });
  if (s.coreHp <= 0) {
    s.coreHp = 0;
    loseGame(s);
  }
}

function winGame(s) {
  s.mode = 'victory';
  s.stats = { score: s.score, wave: s.wave, kills: s.kills, leaked: s.leaked, gold: s.earnedGold, spells: s.spellsCast, towers: s.towersBuilt };
  sfx.victory();
}

function loseGame(s) {
  s.mode = 'defeat';
  s.stats = { score: s.score, wave: s.wave, kills: s.kills, leaked: s.leaked, gold: s.earnedGold, spells: s.spellsCast, towers: s.towersBuilt };
  sfx.defeat();
}

// --- Spells ---

export function castSpell(s, kind, x, y, dir) {
  if (s.spellCooldowns[kind] > 0 || s.mode !== 'playing') return false;
  const def = SPELLS[kind];
  s.spellCooldowns[kind] = def.cooldown * s.cooldownMul;
  s.spellsCast++;
  if (kind === 'beam') {
    const ox = s.airshipX, oy = s.airshipY;
    const ang = dir != null ? dir : Math.atan2(y - oy, x - ox);
    const len = 520;
    const x2 = ox + Math.cos(ang) * len, y2 = oy + Math.sin(ang) * len;
    s.beams.push({ x1: ox, y1: oy, x2, y2, life: 0.35, maxLife: 0.35 });
    // Damage enemies near the beam segment.
    for (const e of s.enemies) {
      const d = pointSegDist(e.sx, e.sy, ox, oy, x2, y2);
      if (d < 26) damageEnemy(s, e, 90, 'beam');
    }
    s.shake = 4;
    sfx.beam();
  } else if (kind === 'well') {
    s.wells.push({ x, y, r: 130, life: 3, maxLife: 3 });
    sfx.well();
  } else if (kind === 'meteor') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const r = 30 + (i % 3) * 35;
      s.meteors.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.6, delay: 0.15 + i * 0.18 });
    }
    sfx.meteor();
  }
  return true;
}

function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}

// --- Particles ---

export function burst(s, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (0.3 + Math.random() * 0.7) * speed;
    s.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
      life: 0.5 + Math.random() * 0.5, maxLife: 1,
      size: 2 + Math.random() * 3.5, color, gravity: 160,
    });
  }
}

// --- Draft ---

export function openDraft(s) {
  const pool = [...RELICS];
  const rng = makeRng(s.wave * 991 + 13);
  const picks = [];
  while (picks.length < 3 && pool.length) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  s.draftOptions = picks;
  s.mode = 'draft';
  sfx.draft();
}

export function applyRelic(s, relic) {
  relic.apply(s);
  s.relics.push(relic.id);
  s.mode = 'playing';
  s.draftOptions = [];
  s.nextWaveTimer = 2.5;
  sfx.draft();
}

// --- Update ---

export function update(s, dt) {
  s.time += dt;
  // Airship patrols an ellipse around the island, always.
  s.airshipAngle += dt * 0.12;
  s.airshipX = 640 + Math.cos(s.airshipAngle) * 420;
  s.airshipY = 150 + Math.sin(s.airshipAngle) * 55;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 30);
  // Particles and floating texts always animate (title diorama too).
  updateParticles(s, dt);
  if (s.mode !== 'playing') return;
  // Staged-scene effect, timed to land as a screenshot is taken.
  if (s.shotFx && s.time >= s.shotFx.at) {
    const fx = s.shotFx;
    s.shotFx = null;
    if (castSpell(s, fx.kind, fx.x, fx.y)) {
      s.spellCooldowns[fx.kind] = 0;
      if (fx.hold && s.beams.length) {
        const b = s.beams[s.beams.length - 1];
        b.life = fx.hold; b.maxLife = fx.hold;
      }
    }
  }
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }
  for (const k of Object.keys(s.spellCooldowns)) {
    if (s.spellCooldowns[k] > 0) s.spellCooldowns[k] -= dt;
  }
  if (s.nextWaveTimer > 0) {
    s.nextWaveTimer -= dt;
    if (s.nextWaveTimer <= 0) startWave(s, s.wave + 1);
    return;
  }
  if (s.waveState === 'spawning') {
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      const next = s.spawnQueue.shift();
      if (next) {
        spawnEnemy(s, next.kind, next.path);
        s.spawnTimer = 0.85;
      } else {
        s.waveState = 'fighting';
      }
    }
  }
  updateEnemies(s, dt);
  updateTowers(s, dt);
  updateProjectiles(s, dt);
  updateWells(s, dt);
  updateMeteors(s, dt);
  updateBeams(s, dt);
  // Wave clear check.
  if (s.waveState === 'fighting' && s.enemies.length === 0 && s.spawnQueue.length === 0) {
    const bonus = 100 * s.wave;
    s.score += bonus;
    s.gold += 20 + s.wave * 5;
    if (s.wave >= MAX_WAVE) { winGame(s); return; }
    s.waveState = 'clear';
    openDraft(s);
  }
}

function updateParticles(s, dt) {
  for (const p of s.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 0) * dt;
  }
  s.particles = s.particles.filter(p => p.life > 0);
  for (const f of s.floats) { f.life -= dt; f.y -= 26 * dt; }
  s.floats = s.floats.filter(f => f.life > 0);
}

function updateEnemies(s, dt) {
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (e.chillTime > 0) {
      e.chillTime -= dt;
      if (e.chillTime <= 0) e.chill = 0;
    }
    const slow = e.chill > 0 ? 1 - e.chill : 1;
    const target = e.wps[e.wp];
    if (!target) { leakEnemy(s, e); continue; }
    const d = dist(e.sx, e.sy, target.x, target.y);
    const step = e.speed * slow * dt;
    if (d <= step) {
      e.sx = target.x; e.sy = target.y;
      e.wp++;
      if (e.wp >= e.wps.length) leakEnemy(s, e);
    } else {
      e.sx += (target.x - e.sx) / d * step;
      e.sy += (target.y - e.sy) / d * step;
    }
  }
  s.enemies = s.enemies.filter(e => !e.dead);
}

function nearestEnemy(s, x, y, range, skip) {
  let best = null, bestD = range;
  for (const e of s.enemies) {
    if (e.dead || e === skip) continue;
    const d = dist(x, y, e.sx, e.sy);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function updateTowers(s, dt) {
  for (const t of s.towers) {
    t.cooldown -= dt;
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4);
    const st = towerStats(s, t);
    const target = nearestEnemy(s, t.sx, t.sy, st.range);
    if (target) {
      t.aim = Math.atan2(target.sy - (t.sy - 14), target.sx - t.sx);
      if (t.cooldown <= 0) {
        t.cooldown = 1 / st.rate;
        t.recoil = 1;
        fireTower(s, t, target, st);
      }
    }
  }
}

function fireTower(s, t, target, st) {
  const def = TOWERS[t.type];
  if (t.type === 'tesla') {
    // Chain lightning: target plus up to 2 neighbours.
    const hit = [target];
    let from = target;
    for (let c = 0; c < def.chains; c++) {
      const nxt = nearestEnemy(s, from.sx, from.sy, 75, from);
      if (!nxt || hit.includes(nxt)) break;
      hit.push(nxt);
      from = nxt;
    }
    const pts = [{ x: t.sx, y: t.sy - 52 }];
    for (const e of hit) pts.push({ x: e.sx, y: e.sy - 10 });
    s.projectiles.push({ kind: 'arc', points: jagged(pts), life: 0.14, maxLife: 0.14 });
    for (const e of hit) {
      let dmg = st.dmg;
      if (e.chill > 0) {
        // Frost + Lightning = Shatter Shockwave.
        dmg *= 1.5;
        for (const o of s.enemies) {
          if (!o.dead && o !== e && dist(o.sx, o.sy, e.sx, e.sy) < 60) damageEnemy(s, o, 30, 'shatter');
        }
        burst(s, e.sx, e.sy - 10, 10, '#8fe3ff', 120);
        sfx.shatter();
      }
      damageEnemy(s, e, dmg, 'tesla');
    }
    sfx.zap();
  } else if (t.type === 'frost') {
    const chill = def.chill * (target.def.chillResist || 1);
    target.chill = chill;
    target.chillTime = def.chillTime;
    damageEnemy(s, target, st.dmg, 'frost');
    s.projectiles.push({ kind: 'arc', points: jagged([{ x: t.sx, y: t.sy - 22 }, { x: target.sx, y: target.sy - 10 }]), life: 0.12, maxLife: 0.12, frost: true });
    burst(s, target.sx, target.sy - 8, 5, '#8fe3ff', 50);
    sfx.frost();
  } else if (t.type === 'ballista') {
    s.projectiles.push({
      kind: 'bolt', sx: t.sx, sy: t.sy - 14, target,
      angle: t.aim, speed: 520, dmg: st.dmg,
    });
    sfx.shoot();
  } else if (t.type === 'mortar') {
    const d = dist(t.sx, t.sy, target.sx, target.sy);
    if (d < def.minRange) return;
    s.projectiles.push({
      kind: 'shell', sx: t.sx, sy: t.sy - 16, tx: target.sx, ty: target.sy,
      groundY: target.sy, t: 0, dur: clamp(d / 320, 0.35, 0.8),
      dmg: st.dmg, splash: def.splash, startX: t.sx, startY: t.sy - 16,
    });
    sfx.shoot();
  }
}

function jagged(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const segs = 3;
    for (let j = 1; j <= segs; j++) {
      const f = j / segs;
      out.push({
        x: a.x + (b.x - a.x) * f + (j < segs ? (Math.random() - 0.5) * 14 : 0),
        y: a.y + (b.y - a.y) * f + (j < segs ? (Math.random() - 0.5) * 14 : 0),
      });
    }
  }
  return out;
}

function updateProjectiles(s, dt) {
  for (const p of s.projectiles) {
    if (p.kind === 'arc') { p.life -= dt; continue; }
    if (p.kind === 'bolt') {
      if (!p.target || p.target.dead) { p.done = true; continue; }
      const tx = p.target.sx, ty = p.target.sy - 10;
      const d = dist(p.sx, p.sy, tx, ty);
      const step = p.speed * dt;
      if (d <= step) {
        damageEnemy(s, p.target, p.dmg, 'ballista');
        burst(s, tx, ty, 4, '#ffb347', 60);
        p.done = true;
      } else {
        p.sx += (tx - p.sx) / d * step;
        p.sy += (ty - p.sy) / d * step;
        p.angle = Math.atan2(ty - p.sy, tx - p.sx);
      }
    } else if (p.kind === 'shell') {
      p.t += dt;
      const f = Math.min(1, p.t / p.dur);
      p.sx = p.startX + (p.tx - p.startX) * f;
      const arcH = 70;
      p.sy = p.startY + (p.ty - p.startY) * f - Math.sin(f * Math.PI) * arcH;
      p.groundY = p.startY + (p.ty - p.startY) * f;
      if (f >= 1) {
        for (const e of s.enemies) {
          if (!e.dead && dist(e.sx, e.sy, p.tx, p.ty) < p.splash) damageEnemy(s, e, p.dmg, 'mortar');
        }
        burst(s, p.tx, p.ty - 6, 20, '#ff9a3d', 160);
        s.shake = Math.max(s.shake, 3);
        sfx.boom();
        p.done = true;
      }
    } else if (p.kind === 'meteor') {
      p.sx += p.vx * dt;
      p.sy += p.vy * dt;
      if (p.sy >= p.groundY) {
        for (const e of s.enemies) {
          if (!e.dead && dist(e.sx, e.sy, p.sx, p.groundY) < 70) damageEnemy(s, e, 42, 'meteor');
        }
        burst(s, p.sx, p.groundY - 6, 22, '#ff7a5c', 180);
        s.shake = Math.max(s.shake, 4);
        sfx.boom();
        p.done = true;
      }
    }
  }
  s.projectiles = s.projectiles.filter(p => !p.done && (p.kind !== 'arc' || p.life > 0));
}

function updateWells(s, dt) {
  for (const w of s.wells) {
    w.life -= dt;
    for (const e of s.enemies) {
      if (e.dead) continue;
      const d = dist(e.sx, e.sy, w.x, w.y);
      if (d < w.r && d > 4) {
        const pull = 90 * dt;
        e.sx += (w.x - e.sx) / d * pull;
        e.sy += (w.y - e.sy) / d * pull;
        e.hp -= 10 * dt;
        if (e.hp <= 0) killEnemy(s, e, 'well');
      }
    }
    if (Math.random() < 0.5) {
      s.particles.push({ x: w.x + (Math.random() - 0.5) * w.r * 1.6, y: w.y + (Math.random() - 0.5) * w.r, vx: 0, vy: -20, life: 0.5, maxLife: 0.5, size: 2.5, color: '#b388ff', gravity: 0 });
    }
  }
  s.wells = s.wells.filter(w => w.life > 0);
}

function updateMeteors(s, dt) {
  for (const m of s.meteors) {
    m.delay -= dt;
    if (m.delay <= 0 && !m.fired) {
      m.fired = true;
      s.projectiles.push({ kind: 'meteor', sx: m.x + 120, sy: m.y - 260, vx: -260, vy: 560, groundY: m.y });
    }
  }
  s.meteors = s.meteors.filter(m => !m.fired);
}

function updateBeams(s, dt) {
  for (const b of s.beams) b.life -= dt;
  s.beams = s.beams.filter(b => b.life > 0);
}

// --- Staged scenes for screenshots (?shot=...) ---

export function setupShot(s, name) {
  if (name === 'title') {
    s.mode = 'title';
    return;
  }
  startGame(s);
  s.floats = [];
  if (name === 'battle') {
    // A lived-in mid-game: towers built, wave 4 in full swing, spells ready.
    const picks = [PLOT_SCREENS[1], PLOT_SCREENS[4], PLOT_SCREENS[6], PLOT_SCREENS[8]];
    const types = ['tesla', 'mortar', 'frost', 'ballista'];
    picks.forEach((p, i) => { s.gold = 999; buildTower(s, types[i], p); });
    s.towers[0].level = 2;
    s.gold = 240;
    s.wave = 3;
    s.waveState = 'fighting';
    s.spawnQueue = [];
    const rng = makeRng(42);
    const kinds = ['rat', 'rat', 'bat', 'wisp', 'golem', 'rat', 'bat', 'rat', 'wisp', 'bat', 'rat', 'golem'];
    kinds.forEach((k, i) => {
      const wps = SCREEN_PATHS[i % 2];
      // Early on the path, so nothing leaks before the screenshot.
      // (Path B has only 3 waypoints: clamp so wp+1 stays in range.)
      const wp = 1 + Math.floor(rng() * Math.min(2, wps.length - 2));
      const e = {
        kind: k, def: ENEMIES[k],
        hp: Math.round(ENEMIES[k].hp * 2.2), maxHp: Math.round(ENEMIES[k].hp * 2.2),
        speed: ENEMIES[k].speed, sx: wps[wp].x + (rng() - 0.5) * 60, sy: wps[wp].y + (rng() - 0.5) * 30,
        wps, wp: wp + 1, chill: i === 3 ? 0.45 : 0, chillTime: 1.5,
        seed: rng() * 10, gold: ENEMIES[k].gold, score: ENEMIES[k].score,
        flying: !!ENEMIES[k].flying, dead: false,
      };
      s.enemies.push(e);
    });
    s.score = 2840;
    s.combo = 7;
    s.comboTimer = 3;
    // Solar beam timed to burn across the island as the screenshot is
    // taken (see update); held bright so it reads at a glance.
    s.shotFx = { at: 1.9, kind: 'beam', x: 700, y: 300, hold: 1.5 };
  } else if (name === 'draft') {
    s.wave = 5;
    s.waveState = 'clear';
    s.score = 5310;
    s.gold = 310;
    openDraft(s);
  } else if (name === 'boss') {
    const picks = [PLOT_SCREENS[0], PLOT_SCREENS[2], PLOT_SCREENS[5], PLOT_SCREENS[7], PLOT_SCREENS[9]];
    const types = ['tesla', 'ballista', 'mortar', 'frost', 'tesla'];
    picks.forEach((p, i) => { s.gold = 999; buildTower(s, types[i], p); });
    s.towers.forEach(t => { t.level = 3; });
    s.gold = 420;
    s.wave = 10;
    s.waveState = 'fighting';
    s.spawnQueue = [];
    spawnEnemy(s, 'boss', 0);
    const boss = s.enemies[0];
    boss.sx = 640; boss.sy = 330; boss.wp = 5;
    spawnEnemy(s, 'golem', 1);
    spawnEnemy(s, 'wisp', 0);
    s.score = 12740;
    s.combo = 12;
    s.comboTimer = 3;
    // Meteor barrage timed to land as the screenshot is taken (see update).
    s.shotFx = { at: 1.2, kind: 'meteor', x: 640, y: 330 };
  } else if (name === 'end') {
    s.wave = 10;
    s.score = 18950;
    s.kills = 164;
    s.earnedGold = 940;
    s.spellsCast = 23;
    s.towersBuilt = 8;
    s.stats = { score: s.score, wave: 10, kills: s.kills, leaked: 2, gold: s.earnedGold, spells: s.spellsCast, towers: s.towersBuilt };
    s.mode = 'victory';
  }
}
