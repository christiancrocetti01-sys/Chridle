import { AnimatedSprite, Application, Container, Graphics, Sprite, TextureStyle } from 'pixi.js';
import { GHOUL, HERO, breathFrame, type PixelSprite } from '../data/sprites';
import type { CombatEvent } from '../core/combat';
import { formatNum } from '../core/format';
import { heroStats } from '../core/stats';
import { Effects } from './effects';
import { TICK_RATE } from '../core/loop';
import type { GameState } from '../core/state';
import { createInkFilter, type InkStyle } from './dither';
import { glowTexture, spriteTexture } from './pixels';
import { pixelPerfectSize } from './scale';

export const VIEW_W = 320;
export const VIEW_H = 180;
const GROUND_Y = 150;

export interface Scene {
  /** Aggiorna la scena: `alpha` è la frazione tra due tick di logica. */
  draw(state: GameState, alpha: number, events: CombatEvent[]): void;
  setStyle(style: InkStyle): void;
  app: Application;
}

const HERO_X = 96;
const ENEMY_X = 224;
const GOLD = 0xffd36b;

function silhouette(sprite: PixelSprite): PixelSprite {
  const palette = Object.fromEntries(Object.keys(sprite.palette).map((k) => [k, '#ffffff']));
  return { palette, rows: sprite.rows };
}

/** Sprite animato + sagoma bianca sovrapposta per il lampo quando viene colpito. */
function makeActor(sprite: PixelSprite, split: number, speed: number) {
  const root = new Container();
  const body = new AnimatedSprite([spriteTexture(sprite), spriteTexture(breathFrame(sprite, split))]);
  const flash = new AnimatedSprite([spriteTexture(silhouette(sprite)), spriteTexture(silhouette(breathFrame(sprite, split)))]);
  for (const s of [body, flash]) {
    s.anchor.set(0.5, 1);
    s.animationSpeed = speed;
    s.play();
  }
  flash.alpha = 0;
  root.addChild(body, flash);
  return { root, flash };
}

export async function createScene(host: HTMLElement): Promise<Scene> {
  TextureStyle.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    width: VIEW_W,
    height: VIEW_H,
    resolution: 1,
    antialias: false,
    roundPixels: true,
    background: '#05060d',
  });
  host.appendChild(app.canvas);

  const fit = () => {
    const { cssWidth, cssHeight } = pixelPerfectSize(
      host.clientWidth, host.clientHeight, window.devicePixelRatio || 1, VIEW_W, VIEW_H,
    );
    app.canvas.style.width = `${cssWidth}px`;
    app.canvas.style.height = `${cssHeight}px`;
  };
  new ResizeObserver(fit).observe(host);
  fit();

  const world = new Container();
  world.sortableChildren = true;
  const ink = createInkFilter();
  world.filters = [ink.filter];
  // il filtro deve coprire tutta la scena, non solo i bordi degli sprite
  world.filterArea = app.screen;
  app.stage.addChild(world);
  world.addChild(drawBackdrop());

  const stars = makeStars(40);
  stars.forEach((s) => world.addChild(s.sprite));

  const eclipseGlow = new Sprite(glowTexture(40, 'rgba(232,193,90,0.55)'));
  eclipseGlow.anchor.set(0.5);
  eclipseGlow.position.set(250, 42);
  eclipseGlow.blendMode = 'add';
  world.addChild(eclipseGlow);
  world.addChild(drawEclipse(250, 42));
  world.addChild(drawGround());

  const hero = makeActor(HERO, 13, 1 / 30);
  hero.root.scale.set(2); // segnaposto ingranditi: gli asset veri avranno la loro risoluzione
  hero.root.position.set(HERO_X, GROUND_Y);

  const heroGlow = new Sprite(glowTexture(40, 'rgba(255,233,168,0.35)'));
  heroGlow.anchor.set(0.5);
  heroGlow.position.set(HERO_X, GROUND_Y - 20);
  heroGlow.blendMode = 'add';

  const enemy = makeActor(GHOUL, 9, 1 / 24);
  enemy.root.position.set(ENEMY_X, GROUND_Y);

  // orbita della luce: guidata dalla logica (tick) e interpolata a 60 fps
  const orb = new Sprite(glowTexture(6, 'rgba(255,246,214,1)'));
  orb.anchor.set(0.5);
  orb.blendMode = 'add';

  const bars = new Graphics();
  const effects = new Effects();
  effects.layer.zIndex = 5;
  bars.zIndex = 4;
  world.addChild(heroGlow, hero.root, enemy.root, orb, bars, effects.layer);

  let last = performance.now();
  let shake = 0;
  let heroLunge = 0;
  let enemyLunge = 0;
  let enemySpawnT = 1;
  let hadEnemy = false;
  let enemyScale = 2;

  const onEvent = (e: CombatEvent, state: GameState) => {
    const enemyTop = GROUND_Y - GHOUL.rows.length * enemyScale;
    switch (e.type) {
      case 'hit':
        if (e.target === 'enemy') {
          heroLunge = 1;
          enemy.flash.alpha = 1;
          effects.burst(ENEMY_X - 8, GROUND_Y - 14 * (enemyScale / 2), e.crit ? 14 : 5, e.crit ? GOLD : 0xffffff, e.crit ? 90 : 50);
          effects.text(ENEMY_X + (Math.random() - 0.5) * 16, enemyTop - 12, formatNum(e.amount) + (e.crit ? '!' : ''), e.crit ? GOLD : 0xffffff, e.crit ? 3 : 2);
          if (e.crit) shake = Math.max(shake, 2);
        } else {
          enemyLunge = 1;
          hero.flash.alpha = 0.8;
          effects.text(HERO_X, GROUND_Y - 58, formatNum(e.amount), 0x9aa4b8, 1, 0.6);
          if (state.enemy?.boss) shake = Math.max(shake, 1.5);
        }
        break;
      case 'kill':
        effects.shatter(GHOUL, ENEMY_X, GROUND_Y, enemyScale, true);
        effects.text(ENEMY_X, enemyTop - 20, '+' + formatNum(e.gold), GOLD, 2, 1.1);
        shake = Math.max(shake, e.boss ? 5 : 1);
        break;
      case 'levelup':
        for (let i = 0; i < 3; i++) effects.burst(HERO_X, GROUND_Y - 20, 16, GOLD, 70 + i * 20);
        effects.text(HERO_X, GROUND_Y - 60, 'LV UP!', GOLD, 2, 1.4);
        break;
      case 'death':
        effects.shatter(HERO, HERO_X, GROUND_Y, 2, false);
        shake = 4;
        break;
      case 'stage':
        break;
    }
  };

  return {
    app,
    setStyle: ink.setStyle,
    draw(state, alpha, events) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      for (const e of events) onEvent(e, state);

      const t = (state.tick + alpha) / TICK_RATE; // secondi di gioco, continui
      const a = t * 1.6;
      orb.position.set(HERO_X + Math.cos(a) * 26, GROUND_Y - 24 + Math.sin(a) * 8);
      orb.zIndex = Math.sin(a) > 0 ? 1 : -1;
      heroGlow.alpha = 0.8 + Math.sin(t * 2) * 0.2;
      eclipseGlow.scale.set(1 + Math.sin(t * 0.7) * 0.05);
      for (const s of stars) s.sprite.alpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 1000 * s.speed + s.phase));

      // affondo: scatto rapido in avanti e ritorno morbido
      heroLunge = Math.max(0, heroLunge - dt * 6);
      enemyLunge = Math.max(0, enemyLunge - dt * 5);
      hero.flash.alpha = Math.max(0, hero.flash.alpha - dt * 8);
      enemy.flash.alpha = Math.max(0, enemy.flash.alpha - dt * 10);
      hero.root.x = HERO_X + Math.sin(heroLunge * Math.PI) * 8;

      const e = state.enemy;
      if (e && !hadEnemy) enemySpawnT = 0;
      hadEnemy = !!e;
      enemy.root.visible = !!e;
      if (e) {
        enemyScale = e.boss ? 3 : 2;
        enemySpawnT = Math.min(1, enemySpawnT + dt * 4);
        const enter = (1 - enemySpawnT) ** 2 * 60; // entra da destra
        enemy.root.scale.set(-enemyScale, enemyScale);
        enemy.root.x = ENEMY_X + enter - Math.sin(enemyLunge * Math.PI) * 8;
        enemy.root.alpha = enemySpawnT;
      }

      const stats = heroStats(state.hero.level, state.upgrades);
      bars.clear();
      drawBar(bars, HERO_X - 12, GROUND_Y - 46, 24, state.hero.hp / stats.maxHp);
      if (e) drawBar(bars, enemy.root.x - 12 * (enemyScale / 2), GROUND_Y - GHOUL.rows.length * enemyScale - 6, 24 * (enemyScale / 2), e.hp / e.maxHp);

      shake = Math.max(0, shake - dt * 20);
      world.position.set(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
      effects.update(dt);
    },
  };
}

function drawBar(g: Graphics, x: number, y: number, w: number, frac: number) {
  x = Math.round(x);
  g.rect(x - 1, y - 1, w + 2, 4).fill('#000000');
  g.rect(x, y, w, 2).fill('#5a5f78');
  g.rect(x, y, Math.max(0, Math.round(w * Math.min(1, frac))), 2).fill('#f4f1e6');
}

function drawBackdrop(): Graphics {
  const g = new Graphics();
  // cielo a bande con dithering a scacchiera, tipico della pixel art
  const bands = ['#05060d', '#080a18', '#0c1024', '#111631', '#171c3d'];
  const bandH = GROUND_Y / bands.length;
  bands.forEach((c, i) => g.rect(0, i * bandH, VIEW_W, bandH).fill(c));
  for (let i = 1; i < bands.length; i++) {
    const y = Math.round(i * bandH);
    for (let x = 0; x < VIEW_W; x += 2) g.rect(x + (i % 2), y - 1, 1, 1).fill(bands[i]);
  }
  // colline lontane
  for (let x = 0; x < VIEW_W; x++) {
    const h = 18 + Math.round(Math.sin(x * 0.03) * 8 + Math.sin(x * 0.11) * 3);
    g.rect(x, GROUND_Y - h, 1, h).fill('#0a0c1c');
  }
  return g;
}

function drawEclipse(cx: number, cy: number): Graphics {
  const g = new Graphics();
  g.circle(cx, cy, 15).fill('#f3d27a');
  g.circle(cx, cy, 14).fill('#fff1c2');
  g.circle(cx - 1, cy + 1, 13).fill('#030308');
  return g;
}

function drawGround(): Graphics {
  const g = new Graphics();
  g.rect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y).fill('#0d0f1a');
  g.rect(0, GROUND_Y, VIEW_W, 1).fill('#2a2f4a');
  for (let x = 0; x < VIEW_W; x += 7) {
    g.rect(x, GROUND_Y + 3 + ((x * 13) % 9), 2, 1).fill('#171a2b');
  }
  return g;
}

function makeStars(n: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const sprite = new Graphics().rect(0, 0, 1, 1).fill(rnd() > 0.8 ? '#ffe9a8' : '#c9d1ff');
    sprite.position.set(Math.floor(rnd() * VIEW_W), Math.floor(rnd() * (GROUND_Y - 40)));
    return { sprite, speed: 0.5 + rnd() * 2, phase: rnd() * 6 };
  });
}
