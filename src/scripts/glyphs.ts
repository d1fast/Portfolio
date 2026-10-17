import * as THREE from 'three';

/**
 * Имя из символов. Тысячи мелких знаков кода ({ } < / > ; 0 1 и буквы имени) летают роем над первым экраном
 * и собираются в «Савелий Лопатин». Знаки разлетаются от курсора и пальца, по клику расходится волна,
 * на месте они слегка мерцают и меняются. Дальние знаки фона плывут медленнее и уходят в глубину.
 *
 * Координаты в CSS-пикселях блока, ось y вниз. Глубина z: 0 на плоскости имени, больше 0 дальше.
 * Физика считается на процессоре: пружина к месту в имени, поток шума, отталкивание, затухание.
 */

// знаки кода и буквы имени; на английской версии латиница вместо кириллицы, число знаков то же
const GLYPHS = ('{}<>/=+*#01;()[]&%$@~^3D' + (typeof document !== 'undefined' && document.documentElement.lang.startsWith('en') ? 'SLJRZ' : 'СЛФЖЯ') + 'λ▲:').split('');
const COLS = 8;
const CELL = 64;

const VERT = /* glsl */ `
attribute float aSize;
attribute float aGlyph;
attribute float aAlpha;
attribute float aHeat;
uniform float uPR;
uniform vec2 uCenter;
uniform float uPersp;
uniform vec2 uPar;
varying float vGlyph;
varying float vAlpha;
varying float vHeat;
void main() {
  float s = 1.0 / (1.0 + max(position.z, -0.6) * uPersp);
  vec2 p = uCenter + (position.xy - uCenter) * s + uPar * clamp(position.z, 0.0, 3.2) * 0.35;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  gl_PointSize = aSize * s * uPR;
  vGlyph = aGlyph;
  vAlpha = aAlpha * clamp(1.15 - position.z * 0.32, 0.12, 1.0);
  vHeat = aHeat;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uCols;
uniform float uRows;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vGlyph;
varying float vAlpha;
varying float vHeat;
void main() {
  vec2 cell = vec2(mod(vGlyph, uCols), floor(vGlyph / uCols));
  vec2 uv = (cell + gl_PointCoord) / vec2(uCols, uRows);
  float a = texture2D(uAtlas, uv).a * vAlpha;
  if (a < 0.03) discard;
  // цвет с домноженной прозрачностью: так холст правильно ложится на фон страницы
  gl_FragColor = vec4(mix(uColor, uHot, clamp(vHeat, 0.0, 1.0)) * a, a);
}`;

function atlas(font: string) {
  const rows = Math.ceil(GLYPHS.length / COLS);
  const c = document.createElement('canvas');
  c.width = COLS * CELL; c.height = rows * CELL;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${CELL * 0.74}px ${font}`;
  GLYPHS.forEach((ch, i) => g.fillText(ch, (i % COLS) * CELL + CELL / 2, Math.floor(i / COLS) * CELL + CELL * 0.54));
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return { tex, rows };
}

/** Точки внутри букв заголовка: текст рисуется на скрытом холсте там же, где стоит в вёрстке. */
export function sampleText(lines: HTMLElement[], root: HTMLElement, step: number) {
  const R = root.getBoundingClientRect();
  const W = Math.ceil(R.width), H = Math.ceil(R.height);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000';
  g.textBaseline = 'alphabetic';
  for (const el of lines) {
    const cs = getComputedStyle(el);
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    const text = cs.textTransform === 'uppercase' ? (el.textContent || '').toUpperCase() : el.textContent || '';
    const r = el.getBoundingClientRect();
    // базовая линия строки из самой вёрстки: пустой inline-block стоит ровно на ней
    const probe = document.createElement('i');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(probe);
    const y = probe.getBoundingClientRect().top - R.top;
    probe.remove();
    g.fillText(text, r.left - R.left, y);
  }
  const data = g.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  // сетка со сдвигом через ряд: точки ложатся плотнее и без полос
  for (let y = 0, row = 0; y < H; y += step * 0.87, row++) {
    const off = row % 2 ? step / 2 : 0;
    for (let x = off; x < W; x += step) {
      const xi = Math.round(x), yi = Math.round(y);
      if (data[(yi * W + xi) * 4 + 3] > 140) pts.push(x + (Math.random() - 0.5) * step * 0.35, y + (Math.random() - 0.5) * step * 0.35);
    }
  }
  return new Float32Array(pts);
}

export interface FieldOpts { canvas: HTMLCanvasElement; root: HTMLElement; color: string; hot: string; monoFont: string }

export function createField(o: FieldOpts) {
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  const { tex, rows } = atlas(o.monoFont);
  const uniforms = {
    uAtlas: { value: tex }, uCols: { value: COLS }, uRows: { value: rows },
    uColor: { value: new THREE.Color(o.color) }, uHot: { value: new THREE.Color(o.hot) },
    uPR: { value: PR }, uCenter: { value: new THREE.Vector2(0, 0) }, uPersp: { value: 0.55 }, uPar: { value: new THREE.Vector2(0, 0) },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true });

  let W = 1, H = 1;
  let N = 0, NT = 0; // всего частиц и сколько из них в имени (остальные фон)
  let pos = new Float32Array(0), vel = new Float32Array(0), tgt = new Float32Array(0);
  let size = new Float32Array(0), glyph = new Float32Array(0), alpha = new Float32Array(0), heat = new Float32Array(0);
  let act = new Float32Array(0), delay = new Float32Array(0), seed = new Float32Array(0), locked = new Uint8Array(0), hit = new Uint8Array(0);
  let geo: THREE.BufferGeometry | null = null;
  let points: THREE.Points | null = null;
  let glyphSize = 8;

  const pointer = { x: -1e4, y: -1e4, on: false, r: 110 };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let ripple: { t0: number; x: number; y: number; speed: number; power: number; heat: boolean } | null = null;
  let t = 0, t0 = 0, assembling = false, running = false, raf = 0, last = 0;
  let onAssembled: (() => void) | null = null, assembledFired = true;

  function build(targets: Float32Array, ambient: number, step: number) {
    NT = targets.length / 2;
    N = NT + ambient;
    glyphSize = Math.max(5, step * 2.05);
    pos = new Float32Array(N * 3); vel = new Float32Array(N * 3); tgt = new Float32Array(N * 3);
    size = new Float32Array(N); glyph = new Float32Array(N); alpha = new Float32Array(N); heat = new Float32Array(N);
    act = new Float32Array(N); delay = new Float32Array(N); seed = new Float32Array(N); locked = new Uint8Array(N); hit = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      seed[i] = Math.random() * 1000;
      glyph[i] = Math.floor(Math.random() * GLYPHS.length);
      if (i < NT) {
        tgt[i * 3] = targets[i * 2]; tgt[i * 3 + 1] = targets[i * 2 + 1]; tgt[i * 3 + 2] = 0;
        size[i] = glyphSize * (0.85 + Math.random() * 0.4);
        alpha[i] = 1;
      } else {
        // фон: редкие знаки по всему экрану на разной глубине. Перспектива стягивает дальние к центру,
        // поэтому место в мире берётся с поправкой: на экране знаки ложатся от края до края
        const z = 0.6 + Math.random() * 2.6;
        const ps = 1 / (1 + z * uniforms.uPersp.value), cx = uniforms.uCenter.value.x, cy = uniforms.uCenter.value.y;
        tgt[i * 3] = cx + (Math.random() * W - cx) / ps; tgt[i * 3 + 1] = cy + (Math.random() * (H + 60) - 30 - cy) / ps; tgt[i * 3 + 2] = z;
        pos[i * 3] = tgt[i * 3]; pos[i * 3 + 1] = tgt[i * 3 + 1]; pos[i * 3 + 2] = z;
        size[i] = glyphSize * (1.1 + Math.random() * 1.6);
        // на телефоне фон заметнее: экран меньше, знаки мельче
        alpha[i] = W < 600 ? 0.24 + Math.random() * 0.3 : 0.16 + Math.random() * 0.22;
      }
    }
    if (points) { scene.remove(points); geo?.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1).setUsage(THREE.DynamicDrawUsage));
    points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);
  }

  /** Новые места для букв (смена размера экрана): частицы просто перелетают, рой не пересоздаётся без нужды. */
  function retarget(targets: Float32Array, step: number) {
    const n = targets.length / 2;
    if (n !== NT || !geo) { const amb = N - NT; build(targets, amb || ambientFor(), step); scatterNow(false); return; }
    for (let i = 0; i < NT; i++) { tgt[i * 3] = targets[i * 2]; tgt[i * 3 + 1] = targets[i * 2 + 1]; }
  }
  const ambientFor = () => Math.round(Math.min(2000, (W * H) / (W < 600 ? 450 : 700)));

  function resize() {
    const r = o.root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = H;
    camera.updateProjectionMatrix();
    uniforms.uCenter.value.set(W / 2, H * 0.45);
  }

  /** Разброс: имя рассыпано роем по всему экрану и в глубину. inward: летят из-за краёв, иначе из облака. */
  function scatterNow(inward: boolean) {
    for (let i = 0; i < NT; i++) {
      const k = i * 3;
      if (inward) {
        // из-за краёв экрана широким кольцом
        const a = Math.random() * Math.PI * 2, rr = Math.max(W, H) * (0.6 + Math.random() * 0.5);
        pos[k] = W / 2 + Math.cos(a) * rr; pos[k + 1] = H / 2 + Math.sin(a) * rr * 0.7; pos[k + 2] = -0.3 + Math.random() * 2.8;
      } else {
        pos[k] = Math.random() * W; pos[k + 1] = Math.random() * H; pos[k + 2] = 0.4 + Math.random() * 2.4;
      }
      vel[k] = (Math.random() - 0.5) * 120; vel[k + 1] = (Math.random() - 0.5) * 120; vel[k + 2] = 0;
      act[i] = 0; locked[i] = 0; heat[i] = 0;
    }
  }

  function assemble(opts: { inward?: boolean; spread?: number; lead?: number } = {}) {
    const spread = opts.spread ?? 1.1, lead = opts.lead ?? 0.15;
    scatterNow(!!opts.inward);
    // буквы встают слева направо волной, с небольшим разбросом
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < NT; i++) { minX = Math.min(minX, tgt[i * 3]); maxX = Math.max(maxX, tgt[i * 3]); }
    const span = Math.max(1, maxX - minX);
    for (let i = 0; i < NT; i++) delay[i] = lead + ((tgt[i * 3] - minX) / span) * spread + Math.random() * 0.35;
    t0 = t; assembling = true; assembledFired = false;
    start();
  }

  function burst(x: number, y: number, power = 520, withHeat = true) { ripple = { t0: t, x, y, speed: 1400, power, heat: withHeat }; hit.fill(0); start(); }

  function step(dt: number) {
    const time = t - t0;
    const damp = Math.pow(0.84, dt * 60);
    const K = 46;
    const pr = pointer.r, pr2 = pr * pr;
    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    let lockedCount = 0;
    const rp = ripple, rr = rp ? (t - rp.t0) * rp.speed : 0;
    if (rp && rr > Math.hypot(W, H)) ripple = null;
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      let x = pos[k], y = pos[k + 1], z = pos[k + 2];
      let vx = vel[k], vy = vel[k + 1], vz = vel[k + 2];
      const sd = seed[i];
      const name = i < NT;
      let a = 1;
      if (name) {
        if (assembling && time > delay[i]) act[i] = Math.min(1, act[i] + dt * 2.6);
        a = act[i];
      }
      // поток: мягкий вихрь, сильнее, пока знак не встал на место
      const ang = Math.sin(x * 0.0052 + t * 0.6 + sd) * 2.2 + Math.cos(y * 0.0047 - t * 0.45 + sd * 0.5) * 2.2;
      const flow = name ? (1 - a) * 260 + 6 : 14;
      let ax = Math.cos(ang) * flow, ay = Math.sin(ang) * flow, az = 0;
      if (name) {
        const kk = K * a * a;
        ax += (tgt[k] - x) * kk; ay += (tgt[k + 1] - y) * kk; az += (0 - z) * kk;
        if (a < 1) az += (Math.sin(t * 0.8 + sd) * 0.6) * (1 - a);
      } else {
        // фон держится у своей точки и плывёт вверх, как пыль в луче
        ax += (tgt[k] - x) * 0.4; ay += (tgt[k + 1] - y) * 0.4 - 6;
        const ps = 1 / (1 + z * uniforms.uPersp.value), cx = uniforms.uCenter.value.x, cy = uniforms.uCenter.value.y;
        tgt[k + 1] -= (dt * (4 + z * 3)) / ps;
        // ушёл за верх экрана: появляется снизу, за краем, а не посреди экрана
        if (tgt[k + 1] < cy - (cy + 30) / ps) { tgt[k + 1] = cy + (H + 30 - cy) / ps; y = tgt[k + 1]; tgt[k] = cx + (Math.random() * W - cx) / ps; x = tgt[k]; }
      }
      // курсор: расталкивает знаки, рядом с ним они нагреваются
      if (pointer.on) {
        const s = 1 / (1 + Math.max(z, -0.6) * uniforms.uPersp.value);
        const sx = uniforms.uCenter.value.x + (x - uniforms.uCenter.value.x) * s, sy = uniforms.uCenter.value.y + (y - uniforms.uCenter.value.y) * s;
        const dx = sx - pointer.x, dy = sy - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < pr2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / pr);
          const push = f * f * (name ? 5200 : 2600);
          ax += (dx / d) * push; ay += (dy / d) * push;
          if (name) heat[i] = Math.max(heat[i], f * 0.95);
        }
      }
      // волна от клика
      if (rp && !hit[i]) {
        const dx = x - rp.x, dy = y - rp.y, d = Math.hypot(dx, dy) || 1;
        if (d < rr) {
          hit[i] = 1;
          const fall = Math.max(0.15, 1 - d / (Math.max(W, H) * 0.9));
          vx += (dx / d) * rp.power * fall; vy += (dy / d) * rp.power * fall; vz += (Math.random() - 0.3) * 0.8 * fall;
          if (rp.heat && name) heat[i] = Math.max(heat[i], 0.9 * fall);
        }
      }
      vx = (vx + ax * dt) * damp; vy = (vy + ay * dt) * damp; vz = (vz + az * dt) * damp;
      x += vx * dt; y += vy * dt; z += vz * dt;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      vel[k] = vx; vel[k + 1] = vy; vel[k + 2] = vz;
      if (name) {
        const near = Math.abs(tgt[k] - x) + Math.abs(tgt[k + 1] - y) < 3 && Math.abs(z) < 0.05;
        if (near) lockedCount++;
        // знак встал на место: короткая вспышка акцентом
        if (near && !locked[i] && a >= 1) { locked[i] = 1; heat[i] = 1; }
        heat[i] *= Math.pow(0.9, dt * 60);
        // быстрые знаки меняются чаще, стоящие изредка мерцают
        const sp = Math.abs(vx) + Math.abs(vy);
        if (Math.random() < (sp > 40 ? 0.25 : 0.004)) glyph[i] = Math.floor(Math.random() * GLYPHS.length);
      } else if (Math.random() < 0.002) glyph[i] = Math.floor(Math.random() * GLYPHS.length);
    }
    if (!assembledFired && assembling && lockedCount > NT * 0.9) { assembledFired = true; onAssembled?.(); }
    if (geo) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aGlyph.needsUpdate = true;
      geo.attributes.aHeat.needsUpdate = true;
    }
    uniforms.uPar.value.set(par.x, par.y);
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(1 / 30, (now - (last || now)) / 1000) || 1 / 60;
    last = now;
    t += dt;
    step(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  resize();
  return {
    get size() { return { W, H }; },
    resize,
    build: (targets: Float32Array, step: number) => build(targets, ambientFor(), step),
    retarget,
    assemble,
    burst,
    start,
    stop,
    onAssembled: (fn: () => void) => { onAssembled = fn; },
    pointer: (x: number, y: number, on: boolean, r?: number) => { pointer.x = x; pointer.y = y; pointer.on = on; if (r) pointer.r = r; },
    parallax: (x: number, y: number) => { par.tx = x; par.ty = y; },
    setColors: (c: string, h: string) => { uniforms.uColor.value.set(c); uniforms.uHot.value.set(h); },
    dispose: () => { stop(); geo?.dispose(); material.dispose(); tex.dispose(); renderer.dispose(); },
  };
}
export type Field = ReturnType<typeof createField>;
