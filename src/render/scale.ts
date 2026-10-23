/**
 * Scala intera in pixel *fisici*: su un telefono con dpr 3 una scena di 320px
 * può essere ingrandita ×3 anche se lo schermo è largo solo 390px CSS.
 */
export function pixelPerfectSize(
  availCssW: number,
  availCssH: number,
  dpr: number,
  innerW: number,
  innerH: number,
): { scale: number; cssWidth: number; cssHeight: number } {
  const scale = Math.max(1, Math.floor(Math.min((availCssW * dpr) / innerW, (availCssH * dpr) / innerH)));
  return { scale, cssWidth: (innerW * scale) / dpr, cssHeight: (innerH * scale) / dpr };
}
