import { AnimatedSprite, Application, Container, Graphics, Sprite, TextureStyle } from 'pixi.js';
import { GHOUL, HERO, breathFrame } from '../data/sprites';
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
  draw(state: GameState, alpha: number): void;
  setStyle(style: InkStyle): void;
  app: Application;
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

  const hero = new AnimatedSprite([spriteTexture(HERO), spriteTexture(breathFrame(HERO, 13))]);
  hero.anchor.set(0.5, 1);
  hero.position.set(96, GROUND_Y);
  hero.scale.set(2); // segnaposto ingranditi: gli asset veri avranno la loro risoluzione
  hero.animationSpeed = 1 / 30;
  hero.play();

  const heroGlow = new Sprite(glowTexture(40, 'rgba(255,233,168,0.35)'));
  heroGlow.anchor.set(0.5);
  heroGlow.position.set(96, GROUND_Y - 20);
  heroGlow.blendMode = 'add';

  const ghoul = new AnimatedSprite([spriteTexture(GHOUL), spriteTexture(breathFrame(GHOUL, 9))]);
  ghoul.anchor.set(0.5, 1);
  ghoul.scale.set(-2, 2);
  ghoul.position.set(224, GROUND_Y);
  ghoul.animationSpeed = 1 / 24;
  ghoul.play();

  // orbita della luce: guidata dalla logica (tick) e interpolata a 60 fps
  const orb = new Sprite(glowTexture(6, 'rgba(255,246,214,1)'));
  orb.anchor.set(0.5);
  orb.blendMode = 'add';

  world.addChild(heroGlow, hero, ghoul, orb);

  return {
    app,
    setStyle: ink.setStyle,
    draw(state, alpha) {
      const t = (state.tick + alpha) / TICK_RATE; // secondi di gioco, continui
      const a = t * 1.6;
      orb.position.set(96 + Math.cos(a) * 26, GROUND_Y - 24 + Math.sin(a) * 8);
      orb.zIndex = Math.sin(a) > 0 ? 1 : -1;
      heroGlow.alpha = 0.8 + Math.sin(t * 2) * 0.2;
      eclipseGlow.scale.set(1 + Math.sin(t * 0.7) * 0.05);
      const now = performance.now() / 1000;
      for (const s of stars) s.sprite.alpha = 0.35 + 0.65 * Math.abs(Math.sin(now * s.speed + s.phase));
    },
  };
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
