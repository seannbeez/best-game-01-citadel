[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/seannbeez/best-game-01-citadel/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/seannbeez/best-game-01-citadel/reward.svg)](https://make.fun/bounty/best-game-01)

# Clockwork Citadel: Aether Siege

A 2.5D isometric tactical tower-defense & active spell-slinging roguelite for the
[make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).
Hold a floating brass-and-stone citadel above golden clouds through 10 waves —
ending with the Voidmaw Colossus.

Join make.fun with my referral: https://make.fun/r/ebv85brk

## How to play

- **Build towers** — click a glowing brass ring on the island, then pick one of
  four clockwork towers: **Tesla Arc Spire** (chain lightning), **Frost Prism**
  (chills and slows), **Clockwork Ballista** (long-range piercing bolts) and
  **Alchemical Mortar** (lobbed splash shells). Click a tower to upgrade it
  (3 levels) or sell it.
- **Frost + Lightning = Shatter Shockwave** — a Tesla arc that hits a chilled
  enemy detonates a freezing shockwave around it.
- **Cast hero spells** — click a spell card (or press 1 / 2 / 3), then the
  battlefield: **Solar Beam** (drag a line from the airship), **Gravity Well**
  (pulls enemies inward), **Meteor Barrage** (six meteors rain down).
- **Draft relics** — after every cleared wave, choose one of three relic cards
  (tower damage, faster spells, more gold, stronger core, longer range,
  faster fire).
- **Win** by destroying the Voidmaw Colossus on wave 10. **Lose** if the
  citadel core's health reaches zero. Press **R** to restart instantly,
  **P** to pause, **M** to mute.

Mouse + keyboard on desktop, touch supported on mobile. No network, no
external assets — every texture, sprite and sound is generated in code.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

## Verification

- Headless play-through (Playwright + Chrome for Testing): title → build all
  four tower types → cast all three spells → relic draft → boss wave →
  victory/defeat → restart, pause/resume, mute/unmute, touch controls.
- Zero console errors, zero page errors, zero external requests.
- `main.ts` builds `dossier.json` byte-identically across two runs.
