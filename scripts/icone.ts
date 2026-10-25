/**
 * Genera le icone PNG dell'app (PWA) dal disegno dell'eroe in linee di luce.
 * Uso: `npm run icone` (serve Chromium di Playwright). Scrive in `public/icons/`.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { heroArt } from '../src/ui/art';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BG = '#0a0a0a';
const GOLD = '#ffd98a';
// [file, lato in px, quota del lato occupata dall'eroe]; le "maskable" stanno nella zona sicura (cerchio dell'80%)
const ICONS: [string, number, number][] = [
  ['icon-192.png', 192, 0.72],
  ['icon-512.png', 512, 0.72],
  ['maskable-512.png', 512, 0.56],
  ['apple-touch-icon.png', 180, 0.66],
  ['favicon-32.png', 32, 0.9],
];

const page = (size: number, k: number) => {
  const art = Math.round(size * k);
  const glow = Math.max(1, size / 96);
  return `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${BG};
    display:flex;align-items:center;justify-content:center;color:${GOLD}">
    <div style="width:${art}px;height:${art}px;filter:drop-shadow(0 0 ${glow}px ${GOLD}) drop-shadow(0 0 ${glow * 3}px ${GOLD})">
    ${heroArt('hero').replace('<svg ', `<svg width="${art}" height="${art}" `)}</div></body></html>`;
};

mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [file, size, k] of ICONS) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(page(size, k));
  await tab.screenshot({ path: `public/icons/${file}` });
  console.log('scritto', file);
}
await browser.close();
