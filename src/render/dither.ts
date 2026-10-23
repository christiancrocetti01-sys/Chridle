import { Filter, GlProgram } from 'pixi.js';

/**
 * Post-processing "inchiostro": scala di grigi a pochi livelli con dithering ordinato (Bayer 4×4).
 * Applicato all'intera scena rende coerenti anche asset di autori diversi.
 * `accent` (0..1) conserva una tinta dorata sulle zone calde: la Luce resta l'unico colore.
 */
export type InkStyle = 'mono' | 'oro' | 'colore';

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`;

const fragment = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform highp vec4 uInputSize; // stessa precisione del vertex shader
uniform float uLevels;
uniform float uAccent;
uniform vec3 uAccentColor;

float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

void main(void) {
  vec4 c = texture(uTexture, vTextureCoord);
  vec2 px = floor(vTextureCoord * uInputSize.xy);
  // curva di contrasto: neri pieni come l'inchiostro, luci che "bruciano"
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  lum = clamp((lum - 0.06) * 1.5, 0.0, 1.0);
  float steps = uLevels - 1.0;
  float q = clamp(floor(lum * steps + bayer4(px)) / steps, 0.0, 1.0);
  float warmth = clamp((c.r - c.b) * 2.5, 0.0, 1.0) * uAccent;
  vec3 ink = mix(vec3(q), q * uAccentColor, warmth);
  finalColor = vec4(ink, c.a);
}`;

export function createInkFilter(): { filter: Filter; setStyle(style: InkStyle): void } {
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex, fragment, name: 'ink-dither' }),
    resources: {
      ink: {
        uLevels: { value: 4, type: 'f32' },
        uAccent: { value: 1, type: 'f32' },
        uAccentColor: { value: new Float32Array([1.0, 0.86, 0.55]), type: 'vec3<f32>' },
      },
    },
  });
  return {
    filter,
    setStyle(style) {
      filter.enabled = style !== 'colore';
      filter.resources.ink.uniforms.uAccent = style === 'oro' ? 1 : 0;
    },
  };
}
