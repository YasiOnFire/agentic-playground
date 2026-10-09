export const glyphVertex = `
attribute vec3 aBoot;
attribute vec3 aWorld;
attribute vec3 aTitle;
attribute float aGlyph;
attribute float aSeed;
uniform float uTime;
uniform float uUnfold;
uniform float uReveal;
uniform float uReset;
uniform float uPixelRatio;
uniform float uPointScale;
uniform vec3 uPointer;
uniform float uPointerForce;
uniform vec3 uPulseOrigin;
uniform float uPulse;
varying float vGlyph;
varying float vSeed;
varying float vDepth;
varying vec3 vPosition;
void main() {
  float stagger = smoothstep(aSeed * .22, .75 + aSeed * .25, uUnfold);
  vec3 p = mix(aBoot, aWorld, stagger);
  float drift = sin(uTime * .65 + aSeed * 40.) * .075;
  p.y += drift * uUnfold * (1. - uReveal);
  p = mix(p, aTitle, smoothstep(aSeed * .18, .82 + aSeed * .18, uReveal));
  p = mix(p, aBoot, uReset);
  vec2 delta = p.xy - uPointer.xy;
  float proximity = exp(-dot(delta, delta) * .34);
  p.xy += normalize(delta + vec2(.001)) * proximity * uPointerForce * 1.1 * uUnfold * (1. - uReveal);
  float pulseDist = length(p.xy - uPulseOrigin.xy);
  float pulseWave = exp(-pow(pulseDist - uPulse * 12., 2.) * .75) * step(0., uPulse) * (1. - smoothstep(1.3, 2.2, uPulse));
  p.z += pulseWave * 1.15 * uUnfold * (1. - uReveal);
  vPosition = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPointScale * uPixelRatio / -mv.z, 2., 22.);
  vGlyph = aGlyph;
  vSeed = aSeed;
  vDepth = clamp(24. / -mv.z, .25, 1.);
}
`;
export const glyphFragment = `
uniform sampler2D uAtlas;
uniform vec3 uWhite;
uniform vec3 uAccent;
uniform vec3 uGreen;
uniform float uTime;
uniform float uUnfold;
uniform float uReveal;
uniform float uReset;
uniform float uPass;
uniform float uOpacity;
uniform float uGlow;
uniform vec3 uPointer;
uniform float uPointerForce;
uniform vec3 uPulseOrigin;
uniform float uPulse;
varying float vGlyph;
varying float vSeed;
varying float vDepth;
varying vec3 vPosition;
void main() {
  vec2 uv = vec2((gl_PointCoord.x + vGlyph) / 16., 1. - gl_PointCoord.y);
  float glyph = texture2D(uAtlas, uv).a;
  if(glyph < .05) discard;
  float signal = pow(.5 + .5 * sin(vPosition.x * 1.6 - uTime * 2.8 + vPosition.z), 12.);
  vec3 col = mix(uWhite * .7, uAccent, signal * (.65 + uGlow * .65));
  float wave = smoothstep(vPosition.x * .055 + .44, vPosition.x * .055 + .6, uPass);
  col = mix(col, uGreen, wave * step(.001, uPass));
  col = mix(col, uWhite, uReveal);
  float proximity = exp(-dot(vPosition.xy - uPointer.xy, vPosition.xy - uPointer.xy) * .25) * uPointerForce;
  float pulseWave = exp(-pow(length(vPosition.xy - uPulseOrigin.xy) - uPulse * 12., 2.) * .8) * step(0., uPulse) * (1. - smoothstep(1.3, 2.2, uPulse));
  col += uAccent * (proximity * .8 + pulseWave * 1.8);
  float alpha = mix(.06, .5, uUnfold) * vDepth;
  alpha = mix(alpha, .84, uReveal);
  alpha *= mix(1., .1, uReset);
  gl_FragColor = vec4(col, glyph * alpha * uOpacity);
}
`;
export const lineVertex = `
attribute float aProgress;
varying float vProgress;
varying vec3 vPos;
void main() {
  vProgress = aProgress;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`;
export const lineFragment = `
uniform float uTime;
uniform float uOpacity;
uniform float uPass;
uniform float uFailure;
uniform vec3 uAccent;
uniform vec3 uGreen;
uniform vec3 uRed;
varying float vProgress;
varying vec3 vPos;
void main() {
  float pulse = pow(max(0., 1. - abs(fract(vProgress * 2. - uTime * .45) - .5) * 2.), 10.);
  vec3 col = uAccent;
  float wave = smoothstep(vPos.x * .055 + .44, vPos.x * .055 + .6, uPass);
  col = mix(col, uGreen, wave * step(.001, uPass));
  col = mix(col, uRed, uFailure * step(3., vPos.x));
  gl_FragColor = vec4(col, (.14 + pulse * .85) * uOpacity);
}
`;
export const gridVertex = `
varying vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`;
export const gridFragment = `
uniform float uTime;
uniform float uOpacity;
uniform float uPass;
uniform vec3 uAccent;
uniform vec3 uGreen;
uniform float uPulse;
uniform vec3 uPulseOrigin;
varying vec3 vPosition;
void main() {
  vec2 p = vPosition.xy;
  vec2 cell = abs(fract(p + .5) - .5) / fwidth(p);
  float grid = 1. - min(min(cell.x, cell.y), 1.);
  float dist = length(p);
  float fade = exp(-dist * .055) * (1. - smoothstep(18., 42., dist));
  float ring = pow(max(0., 1. - abs(dist - uPass * 36.) * .5), 3.) * step(.01, uPass);
  float clickRing = exp(-pow(length(p - uPulseOrigin.xz) - uPulse * 18., 2.) * .5) * step(0., uPulse) * (1. - smoothstep(1.3, 2.2, uPulse));
  vec3 col = mix(uAccent * .5, uGreen, ring);
  gl_FragColor = vec4(col + uAccent * clickRing, (grid * .23 + ring * .18 + clickRing * .5) * fade * uOpacity);
}
`;
