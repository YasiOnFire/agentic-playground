import * as THREE from 'three';
import { config } from './config.ts';
import { mix, seededRandom, smooth } from './timeline.ts';
import type { Timeline } from './timeline.ts';
import { glyphVertex, glyphFragment, lineVertex, lineFragment, gridVertex, gridFragment } from './shaders.ts';

const centers = [
  new THREE.Vector3(-6.6, 2.5, -1.5),
  new THREE.Vector3(6.4, 2.2, -1),
  new THREE.Vector3(6.2, -2.1, 1),
  new THREE.Vector3(-6.3, -2.2, 1),
  new THREE.Vector3(-2.6, 4.1, -4.5),
  new THREE.Vector3(2.9, -3.4, -3)
];

export type SceneInteraction = {
  pointerX: number;
  pointerY: number;
  active: boolean;
  pulseAge: number;
  pulseX: number;
  pulseY: number;
  hovered: number;
  selected: number;
  elapsed: number;
  reducedMotion: boolean;
};

function color(value: string) { return new THREE.Color(value); }

function makeAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 26px "IBM Plex Mono"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  '01{}[]<>/+*=:;.#'.split('').forEach((char, i) => ctx.fillText(char, i * 32 + 16, 17));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function titleSamples() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.font = '600 220px "IBM Plex Mono"';
  ctx.letterSpacing = '-15.4px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.text.title, 600, 120);
  const data = ctx.getImageData(0, 0, 1200, 240).data;
  const points: [number, number][] = [];
  for (let y = 0; y < 240; y += 3) {
    for (let x = 0; x < 1200; x += 3) {
      if (data[(y * 1200 + x) * 4 + 3] > 160) points.push([(x - 600) / 1200, (120 - y) / 240]);
    }
  }
  return points;
}

function panelTexture(index: number) {
  const content = config.text.modules[index];
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#171a1de8';
  ctx.fillRect(0, 0, 800, 440);
  ctx.strokeStyle = '#60686e';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 796, 436);
  ctx.strokeStyle = config.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(0, 0); ctx.lineTo(56, 0); ctx.stroke();
  ctx.font = '400 22px "IBM Plex Mono"';
  ctx.fillStyle = config.colors.muted;
  ctx.fillText(content.label, 36, 45);
  ctx.font = '500 52px "IBM Plex Mono"';
  ctx.fillStyle = config.colors.foreground;
  ctx.fillText(content.name, 36, 119);
  ctx.fillStyle = '#454b50';
  ctx.fillRect(36, 148, 728, 1);
  ctx.font = '400 26px "IBM Plex Mono"';
  content.lines.forEach((line, i) => {
    ctx.fillStyle = line.startsWith('+') ? config.colors.pass : line.startsWith('-') ? config.colors.fail : '#b2b7b9';
    ctx.fillText(line, 36, 197 + i * 43);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export class CodeScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, .1, 180);
  world = new THREE.Group();
  core = new THREE.Group();
  glyphs: THREE.Points;
  glyphMaterial: THREE.ShaderMaterial;
  lineMaterial: THREE.ShaderMaterial;
  gridMaterial: THREE.ShaderMaterial;
  panels: THREE.Mesh[] = [];
  frames: THREE.LineSegments[] = [];
  rings: THREE.LineLoop[] = [];
  links: { line: THREE.Line; index: number; strand: number }[] = [];
  baseWorld: Float32Array;
  points = titleSamples();
  width = 1920;
  height = 1080;
  portrait = false;
  raycaster = new THREE.Raycaster();
  pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  pointerWorld = new THREE.Vector3();
  pulseWorld = new THREE.Vector3();
  previousPulseAge = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setClearColor(config.colors.background, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.add(this.world);
    this.camera.position.set(0, 0, 24);
    this.glyphMaterial = new THREE.ShaderMaterial({
      vertexShader: glyphVertex, fragmentShader: glyphFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uAtlas: { value: makeAtlas() }, uTime: { value: 0 }, uUnfold: { value: 0 },
        uReveal: { value: 0 }, uReset: { value: 0 }, uPass: { value: 0 }, uOpacity: { value: 1 }, uGlow: { value: config.effects.glow },
        uPixelRatio: { value: this.renderer.getPixelRatio() }, uPointScale: { value: 190 },
        uWhite: { value: color(config.colors.foreground) }, uAccent: { value: color(config.colors.accentLight) }, uGreen: { value: color(config.colors.pass) },
        uPointer: { value: this.pointerWorld }, uPointerForce: { value: 0 }, uPulseOrigin: { value: this.pulseWorld }, uPulse: { value: -1 }
      }
    });
    const random = seededRandom(config.seed);
    const n = config.effects.glyphCount;
    const boot = new Float32Array(n * 3);
    const world = new Float32Array(n * 3);
    const target = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    const glyph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      seeds[i] = random();
      glyph[i] = Math.floor(random() * 16);
      boot[i * 3] = ((i % 120) / 120 - .5) * 20;
      boot[i * 3 + 1] = (.5 - Math.floor(i / 120) / 60) * 11;
      boot[i * 3 + 2] = -6;
      if (i < n * .43) {
        const face = i % 6;
        const p = [Math.round(random() * 26) / 26 * 4.7 - 2.35, Math.round(random() * 26) / 26 * 4.7 - 2.35, Math.round(random() * 26) / 26 * 4.7 - 2.35];
        p[face % 3] = face < 3 ? 2.35 : -2.35;
        world.set(p, i * 3);
      } else if (i < n * .9) {
        const center = centers[i % 6];
        world.set([center.x + (random() - .5) * 5.4, center.y + (random() - .5) * 3, center.z - .15 - random() * 1.3], i * 3);
      } else {
        world.set([(random() - .5) * 26, (random() - .5) * 14, (random() - .5) * 13], i * 3);
      }
    }
    this.baseWorld = world.slice();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(world, 3));
    geometry.setAttribute('aBoot', new THREE.BufferAttribute(boot, 3));
    geometry.setAttribute('aWorld', new THREE.BufferAttribute(world, 3));
    geometry.setAttribute('aTitle', new THREE.BufferAttribute(target, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1));
    this.glyphs = new THREE.Points(geometry, this.glyphMaterial);
    this.glyphs.frustumCulled = false;
    this.world.add(this.glyphs);

    this.lineMaterial = new THREE.ShaderMaterial({
      vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 }, uPass: { value: 0 }, uFailure: { value: 0 },
        uAccent: { value: color(config.colors.accentLight) }, uGreen: { value: color(config.colors.pass) }, uRed: { value: color(config.colors.fail) }
      }
    });
    centers.forEach((center, index) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.97), new THREE.MeshBasicMaterial({
        map: panelTexture(index), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0
      }));
      this.panels.push(panel);
      panel.renderOrder = 2;
      this.world.add(panel);
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(Math.sign(center.x) * 1.8, Math.sign(center.y), 0),
        new THREE.Vector3(center.x * .4, center.y * .1, 2.3),
        new THREE.Vector3(center.x * .65, center.y, 2.3),
        center
      );
      for (let strand = 0; strand < 3; strand++) {
        const linePoints = curve.getPoints(100).map(p => p.add(new THREE.Vector3(0, (strand - 1) * .13, (strand - 1) * .1)));
        const g = new THREE.BufferGeometry().setFromPoints(linePoints);
        g.setAttribute('aProgress', new THREE.Float32BufferAttribute(linePoints.map((_, i) => i / 100 + index * .17), 1));
        const line = new THREE.Line(g, this.lineMaterial);
        this.links.push({ line, index, strand });
        this.world.add(line);
      }
    });

    this.world.add(this.core);
    [2, 3.35, 4.85].forEach((size, i) => {
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
      const frame = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: i === 1 ? config.colors.foreground : config.colors.accent, transparent: true, opacity: 0 }));
      this.frames.push(frame);
      this.core.add(frame);
    });
    for (let i = 0; i < 3; i++) {
      const points: THREE.Vector3[] = [];
      for (let j = 0; j < 128; j++) {
        const a = j / 128 * Math.PI * 2;
        const r = 4.1 + i * .38;
        points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: config.colors.accent, transparent: true, opacity: 0 }));
      this.rings.push(ring);
      this.core.add(ring);
    }
    this.gridMaterial = new THREE.ShaderMaterial({
      vertexShader: gridVertex, fragmentShader: gridFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPass: { value: 0 }, uAccent: { value: color(config.colors.accentLight) }, uGreen: { value: color(config.colors.pass) }, uPulse: { value: -1 }, uPulseOrigin: { value: this.pulseWorld } }
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), this.gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -5;
    this.scene.add(grid);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.portrait = width / height < 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.glyphMaterial.uniforms.uPointScale.value = height * .2;
    const worldAttr = this.glyphs.geometry.getAttribute('aWorld');
    for (let i = 0; i < worldAttr.count; i++) {
      const source = new THREE.Vector3().fromArray(this.baseWorld, i * 3);
      if (this.portrait && i >= worldAttr.count * .43 && i < worldAttr.count * .9) {
        const index = i % 6;
        source.sub(centers[index]).add(this.center(index));
        if (index > 2) source.z = -35;
      }
      worldAttr.setXYZ(i, source.x, source.y, source.z);
    }
    worldAttr.needsUpdate = true;
    this.links.forEach(({ line, index, strand }) => {
      const center = this.center(index);
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(Math.sign(center.x) * 1.8, Math.sign(center.y), 0), new THREE.Vector3(center.x * .4, center.y * .1, 2.3), new THREE.Vector3(center.x * .65, center.y, 2.3), center);
      const points = curve.getPoints(100).map(p => p.add(new THREE.Vector3(0, (strand - 1) * .13, (strand - 1) * .1)));
      line.geometry.setFromPoints(points);
      line.visible = !this.portrait || index < 3;
    });
    const attr = this.glyphs.geometry.getAttribute('aTitle');
    const worldHeight = 2 * Math.tan(42 * Math.PI / 360) * 22;
    const titleSize = width * (this.portrait ? .168 : .108);
    const sampleScale = titleSize / 220;
    for (let i = 0; i < attr.count; i++) {
      const point = this.points[i % this.points.length];
      attr.setXYZ(i, point[0] * 1200 * sampleScale / height * worldHeight, point[1] * 240 * sampleScale / height * worldHeight + worldHeight * (this.portrait ? .12 : .13) - titleSize * .1 / height * worldHeight, 0);
    }
    attr.needsUpdate = true;
  }

  center(index: number) {
    if (!this.portrait) return centers[index];
    return new THREE.Vector3(index === 1 ? 2.55 : -2.55, [4.1, 0, -4.1, 4.1, 0, -4.1][index], -1.5);
  }

  panelAt(x: number, y: number) {
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const targets = this.panels.filter(panel => panel.visible && (panel.material as THREE.MeshBasicMaterial).opacity > .15);
    const hit = this.raycaster.intersectObjects(targets)[0];
    return hit ? this.panels.indexOf(hit.object as THREE.Mesh) : -1;
  }

  panelPositions() {
    return this.panels.map((panel, index) => {
      const p = panel.getWorldPosition(new THREE.Vector3()).project(this.camera);
      return { index, x: (p.x + 1) * .5 * this.width, y: (1 - p.y) * .5 * this.height, visible: panel.visible };
    });
  }

  render(state: Timeline, interaction?: SceneInteraction) {
    const { t, unfold, reveal, reset, world, passWave } = state;
    const u = this.glyphMaterial.uniforms;
    const motion = interaction && !interaction.reducedMotion ? interaction : undefined;
    const ambient = motion ? t + Math.sin(motion.elapsed * .23) * .4 : t;
    const impulse = motion && motion.pulseAge < 2 ? Math.exp(-motion.pulseAge * 2.5) : 0;
    u.uTime.value = motion?.elapsed ?? t;
    u.uUnfold.value = unfold;
    u.uReveal.value = reveal;
    u.uReset.value = reset;
    u.uPass.value = passWave;
    u.uOpacity.value = t < 19.05 ? smooth(0, .4, t) * (1 - smooth(16.7, 16.95, t)) : 0;
    const baseRotation = Math.sin((t - 3) * .2) * .28;
    this.world.rotation.set(-.08 * world + (motion?.pointerY ?? 0) * .055 * world, baseRotation * world + (motion?.pointerX ?? 0) * .07 * world, -.02 * world);
    const zoom = this.portrait ? Math.max(1.45, 1.58 * (.462 / this.camera.aspect)) : 1;
    const cameraZ = mix(24, mix(25, 21.6, smooth(6.8, 10.8, t)), unfold);
    this.camera.position.set(Math.sin(ambient * .34) * 1.4 * world + (motion?.pointerX ?? 0) * 1.25, Math.sin(ambient * .22) * .65 * world + (motion?.pointerY ?? 0) * .75, mix(mix(cameraZ * zoom, 22, reveal), 24, reset));
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    if (motion) {
      this.raycaster.setFromCamera(new THREE.Vector2(motion.pointerX, motion.pointerY), this.camera);
      this.raycaster.ray.intersectPlane(this.pointerPlane, this.pointerWorld);
      if (motion.pulseAge < this.previousPulseAge) {
        this.raycaster.setFromCamera(new THREE.Vector2(motion.pulseX, motion.pulseY), this.camera);
        this.raycaster.ray.intersectPlane(this.pointerPlane, this.pulseWorld);
      }
      this.previousPulseAge = motion.pulseAge;
    }
    u.uPointerForce.value = motion?.active ? 1 : 0;
    u.uPulse.value = motion && motion.pulseAge < 2.2 ? motion.pulseAge : -1;
    const staggerWorld = 1 - reveal;
    this.panels.forEach((panel, i) => {
      const amount = smooth(2.85 + i * .16, 4.5 + i * .16, t);
      const center = this.center(i);
      panel.position.copy(center).multiplyScalar(mix(.2, 1, amount));
      const focused = interaction?.hovered === i || interaction?.selected === i;
      panel.position.z += Math.sin(ambient * .6 + i) * .18 + (focused ? .35 : 0);
      panel.rotation.set(0, -Math.sign(center.x) * .13 + Math.sin(ambient * .3 + i) * .025, 0);
      panel.scale.setScalar(mix(.15, 1, amount) * mix(1, .6, reveal) * (focused ? 1.05 : 1));
      const emphasis = state.phase === 1 ? (i < 3 ? 1 : .35) : state.phase === 2 ? (i === 1 || i === 4 ? 1 : .55) : .65;
      (panel.material as THREE.MeshBasicMaterial).opacity = amount * staggerWorld * (focused ? 1 : emphasis) * .92;
      panel.visible = world > .002 && (!this.portrait || i < 3);
    });
    this.core.rotation.set(ambient * .12, ambient * .18, .35 + ambient * .075);
    this.core.scale.setScalar(mix(.25, this.portrait ? .6 : 1, smooth(4, 7.8, t)) * mix(1, .5, reveal) * (1 + impulse * .14));
    this.frames.forEach((frame, i) => {
      frame.rotation.set(i * .3 + t * .04, i * .2, i * .15);
      const m = frame.material as THREE.LineBasicMaterial;
      m.opacity = world * (.45 + i * .15);
      m.color.set(passWave > .4 ? config.colors.pass : i === 1 ? config.colors.foreground : config.colors.accent);
    });
    this.rings.forEach((ring, i) => {
      ring.rotation.set(Math.PI / 2 + i * .5 + t * .07, i * .7, t * .06);
      const m = ring.material as THREE.LineBasicMaterial;
      m.opacity = world * .2 * smooth(6.7, 7.8, t);
      m.color.set(passWave > .4 ? config.colors.pass : config.colors.accent);
    });
    this.lineMaterial.uniforms.uTime.value = motion?.elapsed ?? t;
    this.lineMaterial.uniforms.uOpacity.value = world;
    this.lineMaterial.uniforms.uPass.value = passWave;
    this.lineMaterial.uniforms.uFailure.value = state.failure;
    this.gridMaterial.uniforms.uTime.value = motion?.elapsed ?? t;
    this.gridMaterial.uniforms.uPulse.value = u.uPulse.value;
    this.gridMaterial.uniforms.uOpacity.value = world;
    this.gridMaterial.uniforms.uPass.value = passWave;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse(object => {
      const obj = object as THREE.Mesh;
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      materials.forEach(material => {
        if ('map' in material) (material.map as THREE.Texture | null)?.dispose();
        material.dispose();
      });
    });
    this.renderer.dispose();
  }
}
