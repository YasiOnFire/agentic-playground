import './style.css';
import './branding.css';
import './interactive.css';
import { config } from './config.ts';
import { CodeScene } from './scene.ts';
import type { SceneInteraction } from './scene.ts';
import { clamp, smooth, timeline } from './timeline.ts';

type Chapter = 'context' | 'build' | 'verify' | 'reveal';
type Mode = 'ambient' | 'explore' | 'verify' | 'retest';
declare global {
  interface Window {
    animationReady: boolean;
    playground: { select: (chapter: Chapter) => void; inspect: (index: number) => void; diagnostics: () => unknown };
  }
}

const root = document.querySelector<HTMLDivElement>('#app')!;
const titleMarkup = config.text.title.replace('×', '<span class="multiply">×</span>');
const eventMarkup = `<span class="event-title">${config.text.event.replace(config.branding.eventEmphasis, `<span class="event-emphasis">${config.branding.eventEmphasis}</span>`)}</span>`;
const chapters: { id: Chapter; label: string }[] = [{ id: 'context', label: 'Context' }, { id: 'build', label: 'Build' }, { id: 'verify', label: 'Verify' }, { id: 'reveal', label: 'Reveal' }];
const notes = [
  'Set the working agreement. Give the agent context and keep the human in the loop.',
  'Connect the modules. The plan becomes a change you can inspect.',
  'Evidence beats confidence. Run the checks, fix the edge case, then run them again.',
  'Define acceptance before implementation. A small plan keeps the work on track.',
  'The agent reads, acts and verifies. You decide which change is ready.',
  'Tests and the diff are the evidence. The final decision still belongs to you.'
];
root.innerHTML = `
<main class="app-shell"><section class="stage" aria-label="Agentic Playground - interactive world of code">
  <canvas aria-hidden="true"></canvas><div class="vignette"></div><div class="pointer-light"></div><div class="click-wave"></div>
  <div class="frame"><div class="frame-top">
    <a class="site-brand" href="${config.branding.url}" target="_blank" rel="noopener noreferrer" aria-label="Yasio.dev portfolio">&lt;/&gt; <span>Yasio<span class="brand-x">.dev</span></span></a>
    <span class="experience-label">AGENTIC PLAYGROUND <i class="live-dot"></i></span>
    <a class="byline" href="${config.branding.url}" target="_blank" rel="noopener noreferrer">${config.branding.author} <span aria-hidden="true">↗</span></a>
  </div><div class="frame-bottom"><span class="interaction-hint">MOVE TO EXPLORE <span>/</span> CLICK TO SEND A PULSE</span><span id="system-status">CONTEXT / RESOLVED</span></div></div>
  <div class="scene-layer boot"><div class="eyebrow">${config.text.bootLabel}</div><div class="terminal"><div class="terminal-head"><span>${config.text.terminalPath}</span><span>- &nbsp; □ &nbsp; ×</span></div><div class="terminal-body"><div><span class="prompt">❯</span><span class="command"></span><i class="cursor"></i></div><div class="boot-status"><span class="context-loaded"><b>✓</b>${config.text.contextLoaded}</span><span class="agent-ready"><b>✓</b>${config.text.agentReady}</span></div></div></div><div class="boot-caption">${config.text.bootCaption}</div></div>
  <div class="scene-layer context"><div class="section-heading"><div class="eyebrow">${config.text.chapterLabels[0]}</div><h2>${config.text.contextTitle}</h2><div class="section-note">CLICK A MODULE TO LOOK INSIDE</div></div></div>
  <div class="scene-layer build"><div class="section-heading"><div class="eyebrow">${config.text.chapterLabels[1]}</div><h2>${config.text.buildTitle}</h2><div class="section-note">${config.text.buildNote}</div></div><div class="build-counter"><span>${config.text.connectedModules}</span><strong class="module-counter">06 / 06</strong></div><div class="build-diff"><div class="diff-title">${config.text.diffTitle}</div>${config.text.diff.map((line, i) => `<div class="diff-line ${i ? 'added' : 'removed'}">${line}</div>`).join('')}</div></div>
  <div class="scene-layer test"><div class="section-heading"><div class="eyebrow">${config.text.chapterLabels[2]}</div><h2>${config.text.testTitle}</h2></div><div class="test-panel"><div class="terminal-head"><span>${config.text.testCommand}</span><span class="suite-state">RUNNING</span></div><div class="test-rows">${config.text.testNames.map((n, i) => `<div class="test-row"><span><span class="test-number">0${i + 1}</span>${n}</span><span class="test-state">WAIT</span></div>`).join('')}</div><div class="repair">assertions running<span>_</span></div></div><div class="test-summary"><span class="success-mark">✓</span>${config.text.success}</div></div>
  <div class="scene-layer reveal"><div class="eyebrow">${config.text.finalEyebrow}</div><h1>${titleMarkup}</h1><div class="reveal-event"><span class="event-prompt" aria-hidden="true">&gt;</span>${eventMarkup}</div><div class="reveal-tagline">${config.text.tagline}</div><div class="reveal-rule"></div><a class="reveal-coordinate" href="${config.branding.url}" target="_blank" rel="noopener noreferrer">${config.branding.author} / yasio.dev ↗</a></div>
  <aside class="inspector" aria-labelledby="inspector-title" hidden><div class="inspector-head"><span class="eyebrow">MODULE / INSPECT</span><button class="close-inspector" aria-label="Close module">×</button></div><h3 id="inspector-title"></h3><pre class="inspector-code"></pre><p class="inspector-note"></p><nav class="module-picker" aria-label="Inspect module">${config.text.modules.map((m, i) => `<button data-module="${i}">${m.name}</button>`).join('')}</nav></aside>
  <div class="action-dock"><span class="activity-log" role="status" aria-live="polite">// THE HUMAN IS STILL AT THE HELM</span><button class="action-button" id="action">INITIALIZE <span>↗</span></button></div>
  <nav class="chapter-nav" aria-label="Explore the workflow">${chapters.map((c, i) => `<button class="chapter" data-chapter="${c.id}"><span class="chapter-number">0${i + 1}</span><span>${c.label}</span><span class="chapter-dot"></span></button>`).join('')}</nav>
  <button class="module-access" aria-label="Inspect code modules">[ MODULES ]</button>
  <div class="scanlines"></div><div class="grain"></div><div class="loading">INITIALIZING THE PLAYGROUND<span>_</span></div>
</section></main>`;

const stage = document.querySelector<HTMLElement>('.stage')!;
const get = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const layers = ['boot', 'context', 'build', 'test', 'reveal'].map(name => get('.' + name));
const testStates = [...document.querySelectorAll<HTMLElement>('.test-state')];
const inspector = get('.inspector');
const action = get('#action');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
Object.entries(config.colors).forEach(([key, value]) => document.documentElement.style.setProperty('--' + key, value));
document.documentElement.style.setProperty('--paper', config.colors.foreground);
document.documentElement.style.setProperty('--scanlines', String(config.effects.scanlines));
document.documentElement.style.setProperty('--grain', String(config.effects.grain));
let scene: CodeScene;
let time = reducedMotion.matches ? 5.5 : 3.4;
let mode: Mode = reducedMotion.matches ? 'explore' : 'ambient';
let last = 0;
let elapsed = 0;
let pulseCount = 0;
let targetX = 0;
let targetY = 0;
let lastAction = '// THE HUMAN IS STILL AT THE HELM';
const interaction: SceneInteraction = { pointerX: 0, pointerY: 0, active: false, pulseAge: 10, pulseX: 0, pulseY: 0, hovered: -1, selected: -1, elapsed: 0, reducedMotion: reducedMotion.matches };
const opacity = (element: HTMLElement, value: number) => { element.style.opacity = value.toFixed(5); element.style.visibility = value < .0001 ? 'hidden' : 'visible'; };
function log(message: string) { lastAction = message; get('.activity-log').textContent = message; }
function closeInspector() { inspector.hidden = true; interaction.selected = -1; }
function select(chapter: Chapter) {
  closeInspector();
  time = { context: 5.5, build: 9.3, verify: 11.1, reveal: 17.4 }[chapter];
  mode = chapter === 'verify' ? 'verify' : 'explore';
  log({ context: '// CONTEXT LOADED - CLICK A MODULE', build: '// PLAN READY - RUN THE CHECKS', verify: '// RUNNING CHECKS - WATCH THE EVIDENCE', reveal: '// SAME CRAFT. NEW WORKSHOP.' }[chapter]);
  render();
}
function inspect(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= config.text.modules.length) return;
  if (timeline(time).phase !== 1 && timeline(time).phase !== 2) select('context');
  mode = 'explore'; interaction.selected = index; inspector.hidden = false;
  get('#inspector-title').textContent = config.text.modules[index].name;
  get('.inspector-code').textContent = config.text.modules[index].lines.join('\n');
  get('.inspector-note').textContent = notes[index];
  document.querySelectorAll<HTMLElement>('[data-module]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.module) === index)));
  log(`// INSPECT ${config.text.modules[index].name} - ${config.text.modules[index].label}`);
}
function triggerPulse(x = 0, y = 0) {
  interaction.pulseAge = 0; interaction.pulseX = x; interaction.pulseY = y; pulseCount++;
  const wave = get('.click-wave'); wave.style.left = `${(x + 1) * 50}%`; wave.style.top = `${(1 - y) * 50}%`;
  if (!reducedMotion.matches) wave.animate([{ opacity: .65, transform: 'translate(-50%, -50%) scale(.05)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1.8)' }], { duration: 950, easing: 'ease-out' });
}
function runAction() {
  const phase = timeline(time).phase; triggerPulse();
  if (phase < 1) select('context');
  else if (phase === 1) select('build');
  else if (phase === 2) select('verify');
  else if (time < 13.65) { time = 12.6; mode = 'retest'; log('// PATCH APPLIED - VERIFYING THE CHANGE'); }
  else if (phase === 3) select('reveal');
  else select('context');
}
function render() {
  if (!scene) return;
  const state = timeline(time); time = state.t; const { t } = state;
  [state.boot, state.context, state.build, state.test, state.final].forEach((v, i) => opacity(layers[i], v));
  const bootT = t > 19 ? 0 : t;
  get('.command').textContent = config.text.command.slice(0, Math.floor(clamp((bootT - .35) / 1) * config.text.command.length));
  opacity(get('.cursor'), Math.floor(elapsed * 2.5) % 2 === 0 ? 1 : .15);
  opacity(get('.context-loaded'), smooth(1.35, 1.55, bootT)); opacity(get('.agent-ready'), smooth(1.85, 2.05, bootT));
  get('.terminal').style.transform = `perspective(900px) rotateX(${state.unfold * (1 - state.reset) * 28}deg) scale(${1 + state.unfold * (1 - state.reset) * .25})`;
  get('.module-counter').textContent = `${String(Math.min(6, Math.floor(1 + (t - 7) * 2))).padStart(2, '0')} / 06`;
  testStates.forEach((element, i) => { const status = state.tests[i].status; element.textContent = status === 'WAIT' ? '···' : (status === 'PASS' ? '✓ ' : '× ') + status; element.dataset.state = status; });
  get('.suite-state').textContent = t < 11.9 ? 'RUNNING' : t < 12.6 ? '1 FAILED' : t < 13.65 ? 'RE-RUNNING' : '4 / 4 PASS';
  get('.suite-state').style.color = t >= 13.65 ? config.colors.pass : t >= 11.9 && t < 12.6 ? config.colors.fail : config.colors.muted;
  get('.repair').innerHTML = t < 12.55 ? 'assertions running<span>_</span>' : t < 13.65 ? `${config.text.patch} &nbsp; <b>${config.text.patchStatus}</b>` : `<b>${config.text.retryComplete}</b>`;
  opacity(get('.test-summary'), state.success); scene.render(state, interaction);
  get('.reveal h1').style.opacity = String(smooth(16.7, 16.95, t));
  if (!reducedMotion.matches) layers[4].style.transform = `translate(${interaction.pointerX * 9}px, ${-interaction.pointerY * 6}px)`;
  const chapter = state.phase < 2 ? 'context' : state.phase === 2 ? 'build' : state.phase === 3 ? 'verify' : 'reveal';
  document.querySelectorAll<HTMLElement>('[data-chapter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === chapter)));
  get('#system-status').textContent = ['SYSTEM / BOOT', 'CONTEXT / RESOLVED', 'BUILD / IN PROGRESS', t < 13.65 ? 'TEST / VERIFYING' : 'TEST / ALL PASS', 'SYSTEM / READY'][state.phase];
  const actionLabels = ['INITIALIZE', 'BUILD THE PLAN', 'RUN CHECKS', t < 13.65 ? 'PATCH + RETEST' : 'SHIP IT', 'EXPLORE AGAIN'];
  action.innerHTML = `${actionLabels[state.phase]} <span>↗</span>`; action.classList.toggle('patch-action', state.phase === 3 && t < 13.65); action.setAttribute('aria-label', actionLabels[state.phase]);
  stage.style.setProperty('--pointer-x', `${(interaction.pointerX + 1) * 50}%`); stage.style.setProperty('--pointer-y', `${(1 - interaction.pointerY) * 50}%`);
  stage.classList.toggle('pointer-active', interaction.active && !reducedMotion.matches); stage.classList.toggle('module-hovered', interaction.hovered >= 0);
}
function tick(now: number) {
  const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; elapsed += dt;
  interaction.elapsed = elapsed; interaction.pulseAge += dt;
  interaction.pointerX += (targetX - interaction.pointerX) * Math.min(dt * 7, 1); interaction.pointerY += (targetY - interaction.pointerY) * Math.min(dt * 7, 1);
  if (!reducedMotion.matches) {
    if (mode === 'ambient') time += dt;
    if (mode === 'verify') time = Math.min(12.3, time + dt);
    if (mode === 'retest') time = Math.min(15.3, time + dt);
  } else { if (mode === 'verify') time = 12.3; if (mode === 'retest') time = 15.3; }
  if (mode === 'retest' && time >= 15.3) { mode = 'explore'; log('// ALL CHECKS PASSED - HUMAN REVIEW COMPLETE'); }
  render(); requestAnimationFrame(tick);
}
function point(event: PointerEvent) { const box = stage.getBoundingClientRect(); return { x: (event.clientX - box.left) / box.width * 2 - 1, y: 1 - (event.clientY - box.top) / box.height * 2 }; }
function resize() { if (!scene) return; scene.resize(stage.clientWidth, stage.clientHeight); render(); }
async function init() {
  await Promise.all([document.fonts.load('400 16px "IBM Plex Mono"'), document.fonts.load('500 16px "IBM Plex Mono"'), document.fonts.load('600 16px "IBM Plex Mono"'), document.fonts.load('700 16px "Workshop Mono"')]);
  await document.fonts.ready; scene = new CodeScene(document.querySelector('canvas')!); resize(); get('.loading').hidden = true;
  document.querySelectorAll<HTMLElement>('[data-chapter]').forEach(button => button.addEventListener('click', () => { select(button.dataset.chapter as Chapter); triggerPulse(); }));
  document.querySelectorAll<HTMLElement>('[data-module]').forEach(button => button.addEventListener('click', () => inspect(Number(button.dataset.module))));
  get('.close-inspector').addEventListener('click', closeInspector); get('.module-access').addEventListener('click', () => inspector.hidden ? inspect(0) : closeInspector()); action.addEventListener('click', runAction);
  stage.addEventListener('pointermove', event => { const p = point(event); targetX = p.x; targetY = p.y; interaction.active = event.pointerType !== 'touch'; interaction.hovered = scene.panelAt(p.x, p.y); });
  stage.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; interaction.active = false; interaction.hovered = -1; });
  stage.addEventListener('pointerdown', event => {
    if (!(event.target instanceof HTMLElement) || event.target.closest('button,a,.inspector')) return;
    const p = point(event); triggerPulse(p.x, p.y); const panel = scene.panelAt(p.x, p.y);
    if (panel >= 0) inspect(panel); else log(`// SIGNAL ${String(pulseCount).padStart(3, '0')} - HUMAN INPUT RECEIVED`);
  });
  document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement) return;
    if (['1', '2', '3', '4'].includes(event.key)) select(chapters[Number(event.key) - 1].id);
    if (event.key === 'Escape') closeInspector();
    if (event.key === 'Enter' && event.target === document.body) runAction();
  });
  reducedMotion.addEventListener('change', () => { interaction.reducedMotion = reducedMotion.matches; if (reducedMotion.matches && mode === 'ambient') select('context'); });
  document.addEventListener('visibilitychange', () => { last = 0; }); new ResizeObserver(resize).observe(stage);
  window.playground = { select, inspect, diagnostics: () => ({ time, mode, pulseCount, lastAction, interaction: { ...interaction }, panelPositions: scene.panelPositions(), renderer: scene.renderer.info.render, width: scene.width, height: scene.height }) };
  window.animationReady = true; requestAnimationFrame(tick);
}
init().catch(error => { get('.loading').innerHTML = '<div class="error-state">This playground needs WebGL.<br>Enable hardware acceleration and reload.<br><a href="https://yasio.dev">Visit Yasio.dev ↗</a></div>'; console.error(error); });
