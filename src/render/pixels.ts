import { Texture } from 'pixi.js';
import type { PixelSprite } from '../data/sprites';

export function spriteTexture(sprite: PixelSprite): Texture {
  const h = sprite.rows.length;
  const w = sprite.rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  sprite.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = sprite.palette[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return Texture.from(canvas);
}

/** Alone radiale morbido, da usare con blendMode 'add' per la luce. */
export function glowTexture(radius: number, color: string): Texture {
  const size = radius * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}
