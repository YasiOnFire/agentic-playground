import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.ts';
import { timeline, seededRandom } from '../src/timeline.ts';

test('all 1200 export samples obey the five exact scene intervals', () => {
  const count = [0, 0, 0, 0, 0];
  for (let n = 0; n < config.duration * config.export.fps; n++) count[timeline(n / config.export.fps).phase]++;
  assert.deepEqual(count, [180, 240, 240, 300, 240]);
});

test('one failure is repaired before all tests pass', () => {
  assert.equal(timeline(12.3).tests.filter(t => t.status === 'FAIL').length, 1);
  assert.equal(timeline(13).repair, 1);
  assert.ok(timeline(13.7).tests.every(t => t.status === 'PASS'));
  assert.equal(timeline(15.3).passWave, 1);
  assert.equal(timeline(15.3).success, 1);
});

test('finale stays fully readable for more than two seconds', () => {
  for (let i = 0; i <= 120; i++) assert.equal(timeline(17 + i / 60).final, 1);
});

test('timeline is stateless and wraps at exactly twenty seconds', () => {
  const samples = [0, .3, 3, 7, 11, 16, 19.9];
  const expected = samples.map(timeline);
  for (const t of samples.toReversed()) timeline(t);
  assert.deepEqual(samples.map(timeline), expected);
  assert.deepEqual(timeline(20), timeline(0));
  assert.deepEqual(timeline(-1), timeline(19));
  assert.throws(() => timeline(NaN), RangeError);
});

test('loop visual envelopes approach the opening without a black frame', () => {
  const last = timeline(1199 / 60);
  assert.ok(last.boot > .99);
  assert.ok(last.final < .001);
  assert.equal(last.world, 0);
  assert.equal(timeline(0).boot, 1);
});

test('fixed seed reproduces all geometry samples', () => {
  const a = seededRandom(config.seed);
  const b = seededRandom(config.seed);
  const c = seededRandom(config.seed + 1);
  const sequence = Array.from({ length: 1000 }, a);
  assert.deepEqual(sequence, Array.from({ length: 1000 }, b));
  assert.notDeepEqual(sequence.slice(0, 5), Array.from({ length: 5 }, c));
});
