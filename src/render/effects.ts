import { Container, Sprite, Texture } from 'pixi.js';
import { GLYPHS, GLYPH_W } from '../data/font';
import type { PixelSprite } from '../data/sprites';
import { spriteTexture } from './pixels';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  node: Container;
  vy: number;
  life: number;
  maxLife: number;
}

const WHITE_PIXEL: PixelSprite = { palette: { W: '#ffffff' }, rows: ['W'] };

/** Particelle a pixel e numeri fluttuanti, con pool per non allocare a ogni colpo. */
export class Effects {
  readonly layer = new Container();
  private particles: Particle[] = [];
  private free: Sprite[] = [];
  private texts: FloatingText[] = [];
  private pixel: Texture;
  private glyphs: Record<string, Texture> = {};

  constructor() {
    this.pixel = spriteTexture(WHITE_PIXEL);
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      this.glyphs[ch] = spriteTexture({ palette: { '#': '#ffffff' }, rows });
    }
  }

  burst(x: number, y: number, n: number, color: number, speed = 60, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, Math.cos(a) * v, Math.sin(a) * v - 20, color, size, 0.3 + Math.random() * 0.4, 120);
    }
  }

  /** Il nemico si sgretola: ogni suo pixel diventa una particella. */
  shatter(sprite: PixelSprite, centerX: number, bottomY: number, scale: number, flipX: boolean) {
    const h = sprite.rows.length;
    const w = sprite.rows[0].length;
    sprite.rows.forEach((row, py) => {
      [...row].forEach((ch, px) => {
        if (ch === '.') return;
        const lx = (flipX ? w - 1 - px : px) - w / 2;
        const x = centerX + lx * scale;
        const y = bottomY - (h - py) * scale;
        const color = parseInt(sprite.palette[ch].slice(1), 16);
        const vx = lx * 4 + (Math.random() - 0.5) * 40;
        const vy = -30 - Math.random() * 50;
        this.spawn(x, y, vx, vy, color, scale, 0.5 + Math.random() * 0.6, 160);
      });
    });
  }

  text(x: number, y: number, content: string, color: number, scale = 1, life = 0.8) {
    const node = new Container();
    [...content].forEach((ch, i) => {
      const tex = this.glyphs[ch] ?? this.glyphs[' '];
      const s = new Sprite(tex);
      s.x = i * (GLYPH_W + 1);
      s.tint = color;
      node.addChild(s);
    });
    node.scale.set(scale);
    node.position.set(Math.round(x - node.width / 2), Math.round(y));
    this.layer.addChild(node);
    this.texts.push({ node, vy: -28, life, maxLife: life });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        this.free.push(p.sprite);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = Math.min(1, (p.life / p.maxLife) * 1.5);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        t.node.destroy({ children: true });
        this.texts.splice(i, 1);
        continue;
      }
      t.vy *= 0.92;
      t.node.y += t.vy * dt;
      t.node.alpha = Math.min(1, (t.life / t.maxLife) * 2);
    }
  }

  private spawn(x: number, y: number, vx: number, vy: number, color: number, size: number, life: number, gravity: number) {
    const sprite = this.free.pop() ?? this.layer.addChild(new Sprite(this.pixel));
    sprite.visible = true;
    sprite.tint = color;
    sprite.scale.set(size);
    sprite.position.set(x, y);
    sprite.alpha = 1;
    this.particles.push({ sprite, vx, vy, gravity, life, maxLife: life });
  }
}
