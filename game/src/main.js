// Clockwork Citadel: Aether Siege — boot, main loop, staged screenshots.

import { CANVAS_W, CANVAS_H } from './config.js';
import { newGame, update, setupShot } from './game.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { setMuted } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const state = newGame();
window.__game = state;
attachInput(state, canvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  setupShot(state, shot);
}

// Staged scenes expose readiness so a screenshot script can wait for it.
let frames = 0;
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  frames++;
  if (state.mode !== 'paused') update(state, dt);
  render(state, ctx);
  if (shot && frames > 45 && !window.__shotReady) window.__shotReady = true;
  requestAnimationFrame(frame);
}

setMuted(false);
requestAnimationFrame(frame);
