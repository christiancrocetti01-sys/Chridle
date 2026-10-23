import type { GameState } from '../core/state';

export interface Hud {
  update(state: GameState, fps: number): void;
  flash(message: string): void;
}

export function createHud(root: HTMLElement): Hud {
  root.innerHTML = `
    <h1 class="title">Chridle</h1>
    <p class="subtitle">Il Guerriero della Luce</p>
    <dl class="stats">
      <dt>FPS</dt><dd data-k="fps">–</dd>
      <dt>Tick</dt><dd data-k="tick">0</dd>
      <dt>Tempo di gioco</dt><dd data-k="time">0s</dd>
    </dl>
    <p class="toast" aria-live="polite"></p>`;
  const el = (k: string) => root.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const fpsEl = el('fps');
  const tickEl = el('tick');
  const timeEl = el('time');
  const toast = root.querySelector<HTMLElement>('.toast')!;
  let toastTimer = 0;

  return {
    update(state, fps) {
      fpsEl.textContent = fps.toFixed(0);
      tickEl.textContent = String(state.tick);
      timeEl.textContent = formatDuration(state.tick / 10);
    },
    flash(message) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500);
    },
  };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
