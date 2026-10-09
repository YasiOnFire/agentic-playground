import { config } from './config.ts';

export const clamp = (v: number, low = 0, high = 1) => Math.min(high, Math.max(low, v));
export const smooth = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const windowed = (a: number, b: number, c: number, d: number, t: number) => smooth(a, b, t) * (1 - smooth(c, d, t));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function timeline(input: number) {
  if (!Number.isFinite(input)) throw new RangeError('Time must be finite');
  const remainder = input % config.duration;
  const t = remainder < 0 ? remainder + config.duration : remainder;
  const phase = t < config.phases[1] ? 0 : t < config.phases[2] ? 1 : t < config.phases[3] ? 2 : t < config.phases[4] ? 3 : 4;
  const unfold = smooth(2.45, 4.25, t);
  const reveal = smooth(15.95, 16.8, t);
  const reset = smooth(19.05, 20, t);
  const passWave = smooth(13.9, 15.25, t);
  return {
    t,
    phase,
    unfold,
    reveal,
    reset,
    passWave,
    world: unfold * (1 - reveal) * (1 - reset),
    boot: (1 - smooth(2.6, 3.35, t)) + smooth(19.5, 20, t),
    context: windowed(3.2, 3.8, 6.2, 6.9, t),
    build: windowed(7, 7.5, 10.25, 10.9, t),
    test: windowed(10.95, 11.35, 15.5, 16, t),
    final: smooth(16.5, 16.95, t) * (1 - smooth(19.05, 19.45, t)),
    failure: windowed(11.95, 12.06, 13.15, 13.3, t),
    repair: windowed(12.55, 12.75, 13.45, 13.6, t),
    success: windowed(14.4, 14.7, 15.6, 16.05, t),
    glitch: (windowed(2.92, 2.95, 2.98, 3.02, t) + windowed(12.02, 12.04, 12.08, 12.13, t)) * config.effects.glitch,
    tests: config.text.testNames.map((name, i) => ({
      name,
      status: t < 11.35 + i * .28 ? 'WAIT' : i === 2 && t < 13.65 ? 'FAIL' : 'PASS'
    }))
  };
}
export type Timeline = ReturnType<typeof timeline>;
