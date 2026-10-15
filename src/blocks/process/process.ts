import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { watchBlock } from '../../scripts/block';
import { J0, J1, J2, BENCH, MARKS, LENS_ROUTE, type P } from './lamp';

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, ScrambleTextPlugin);

/**
 * Как я работаю: сборочная линия. Лампа в центре проходит четыре поста:
 * 1 набросок с вопросами, лупа ищет ответы; 2 набросок выпрямляется в чертёж, рисуются размеры;
 * 3 детали прилетают и защёлкиваются; 4 лампа загорается, по ней пробегает блик, ставится галочка.
 * Шаги идут сами (переезд около 1 с и DWELL секунд стоянки). Наведение, фокус или тап выбирают шаг и ставят на паузу.
 */
const DWELL = 3.5;
const N = 4;
type Sketch = 'off' | 'scribble' | 'clean' | 'ghost';

export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const one = <T extends Element = HTMLElement>(s: string) => root.querySelector(s) as T;

  const words = q<HTMLElement>('[data-process-word]');
  const roll = one('[data-process-roll]');
  const says = q<HTMLElement>('[data-process-say]');
  const num = one('.process__num');
  const stage = one('[data-process-stage]');
  const svg = one<SVGSVGElement>('[data-process-svg]');
  const lines = q<SVGPathElement>('[data-process-line]');
  const marks = q<SVGTextElement>('[data-process-mark]');
  const axes = q<SVGPathElement>('[data-process-axis]');
  const dims = q<SVGPathElement>('[data-process-dim]');
  const labels = q<SVGTextElement>('[data-process-label]');
  const lamp = one<SVGGElement>('[data-process-lamp]');
  const part = (k: string) => one<SVGGElement>(`[data-part="${k}"]`);
  const pivot1 = one<SVGGElement>('[data-process-pivot1]');
  const pivot2 = one<SVGGElement>('[data-process-pivot2]');
  const nod = one<SVGGElement>('[data-process-nod]');
  const cone = one<SVGPathElement>('[data-process-cone]');
  const glints = q<SVGPathElement>('.pr-glint');
  const shine = one<SVGLinearGradientElement>('[data-process-shine]');
  const SHINE_OFF = { x1: -35, x2: 35 };
  const spring = one<SVGPathElement>('[data-process-spring]');
  const check = one<SVGGElement>('[data-process-check]');
  const checkC = one<SVGPathElement>('[data-process-check-c]');
  const checkM = one<SVGPathElement>('[data-process-check-m]');
  const snaps = q<SVGGElement>('.pr-snap');
  const lens = one<SVGGElement>('[data-process-lens]');
  const lensView = one<SVGUseElement>('[data-process-lens-view]');
  const belt = one('[data-process-belt]');
  const rail = one('[data-process-rail]');
  const track = one('.process__track');
  const done = one('[data-process-done]');
  const prog = one('[data-process-prog]');
  const cart = one('[data-process-cart]');
  const gear = one('[data-process-gear]');
  const list = one('[data-process-list]');
  const steps = q<HTMLElement>('[data-process-step]');
  const btns = q<HTMLButtonElement>('[data-process-btn]');
  const nodes = q<HTMLElement>('[data-process-node]');
  const names = q<HTMLElement>('.process__name');

  const cs = getComputedStyle(root);
  const FG = cs.getPropertyValue('--fg').trim() || '#21262B';
  const ACC = cs.getPropertyValue('--accent').trim() || '#5F7389';
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const isOn = () => root.classList.contains('is-on');

  // детали: откуда прилетают
  const KEYS = ['base', 'arm1', 'spring', 'arm2', 'bulb', 'shade', 'j0', 'j1', 'j2'];
  const parts = Object.fromEntries(KEYS.map((k) => [k, part(k)])) as Record<string, SVGGElement>;
  const AWAY: Record<string, gsap.TweenVars> = {
    base: { x: -360, y: 0, rotation: 0, scale: 1 },
    arm1: { x: -150, y: -300, rotation: -60, scale: 1 },
    spring: { x: -80, y: -320, rotation: 0, scale: 1 },
    arm2: { x: 300, y: -240, rotation: 50, scale: 1 },
    bulb: { x: 0, y: 0, rotation: 0, scale: 0 },
    shade: { x: 240, y: -330, rotation: -70, scale: 1 },
    j0: { x: 0, y: 0, rotation: -300, scale: 0 },
    j1: { x: 0, y: 0, rotation: -300, scale: 0 },
    j2: { x: 0, y: 0, rotation: -300, scale: 0 },
  };
  gsap.set(Object.values(parts), { transformOrigin: '50% 50%' });
  gsap.set(lamp, { svgOrigin: `${J0[0]} ${BENCH}` });
  gsap.set(pivot1, { svgOrigin: `${J1[0]} ${J1[1]}` });
  gsap.set(pivot2, { svgOrigin: `${J2[0]} ${J2[1]}` });
  gsap.set(nod, { svgOrigin: `${J2[0]} ${J2[1]}` });
  gsap.set(snaps, { transformOrigin: '50% 50%' });
  gsap.set(marks, { transformOrigin: '50% 50%' });
  gsap.set(check, { transformOrigin: '50% 50%' });
  gsap.set(['.pr-blue', '.pr-sketch', '.pr-lens', '.pr-check'].map((s) => one(s)), { opacity: 1 });

  /* ---------- состояние сцены ---------- */
  let cur = -1;
  let sk: Sketch = 'off';
  let partsOn = false;
  let polishOn = false;
  let lensOn = false;
  const flipped = MARKS.map(() => false);
  let shapeAt: 'sketch' | 'clean' | 'mid' = 'sketch';

  /**
   * Очередь по элементам без stagger. В GSAP 3.15 killTweensOf не останавливает отложенные твины со stagger
   * или keyframes (они живут во вложенном таймлайне), и при быстром переключении шагов старая анимация
   * доигрывала поверх новой. Поэтому по отдельному твину на элемент.
   */
  function each(els: Element[], from: gsap.TweenVars | null, to: gsap.TweenVars, step: number) {
    const d = Number(to.delay) || 0;
    els.forEach((el, i) => {
      const v: gsap.TweenVars = { ...to, delay: d + i * step };
      if (i < els.length - 1) delete v.onComplete;
      if (from) gsap.fromTo(el, from, v); else gsap.to(el, v);
    });
  }

  const clearDash = (el: Element) => { (el as SVGElement).style.strokeDasharray = ''; (el as SVGElement).style.strokeDashoffset = ''; };

  /** 1–2: линии наброска. Из пустоты рисуются, между видами перетекают (MorphSVG). */
  function sketch(mode: Sketch, delay = 0) {
    const prev = sk;
    sk = mode;
    gsap.killTweensOf(lines);
    lines.forEach(clearDash);
    if (mode === 'off') { gsap.to(lines, { opacity: 0, duration: 0.35, delay, ease: 'power1.out' }); return; }
    const key = mode === 'scribble' ? 'sketch' : 'clean';
    const look = { stroke: mode === 'scribble' ? FG : ACC, strokeWidth: mode === 'scribble' ? 2.2 : 1.6, opacity: mode === 'ghost' ? 0.28 : 1 };
    if (prev === 'off') {
      lines.forEach((l) => l.setAttribute('d', l.dataset[key]!));
      shapeAt = key;
      gsap.set(lines, { ...look, opacity: mode === 'ghost' ? 0 : 1 });
      if (mode === 'ghost') { gsap.to(lines, { opacity: look.opacity, duration: 0.4, delay }); return; }
      each(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: mode === 'scribble' ? 0.55 : 0.6, ease: 'power2.inOut', delay, onComplete() { lines.forEach(clearDash); } }, 0.075);
      return;
    }
    if (shapeAt !== key) {
      shapeAt = 'mid';
      lines.forEach((l, i) => gsap.to(l, { morphSVG: l.dataset[key]!, duration: 0.95, ease: 'power3.inOut', delay: delay + i * 0.035,
        onComplete: i === lines.length - 1 ? () => { shapeAt = key; } : undefined }));
    }
    gsap.to(lines, { ...look, duration: 0.5, delay: delay + (mode === 'ghost' ? 0 : 0.2), ease: 'power1.inOut' });
  }

  /** 1: вопросы. Лупа проходит над вопросом, и он становится восклицательным знаком. */
  function marksShow(delay: number) {
    flipped.fill(false);
    marks.forEach((m) => { m.textContent = '?'; m.classList.remove('is-got'); });
    each(marks, { scale: 0, rotation: -35, opacity: 1 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(3)', delay, overwrite: true }, 0.12);
  }
  const marksHide = () => each(marks, null, { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true }, 0.04);
  function flip(i: number) {
    flipped[i] = true;
    marks[i].textContent = '!';
    marks[i].classList.add('is-got');
    gsap.fromTo(marks[i], { scale: 1.7, rotation: 12 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, .4)', overwrite: true });
  }

  /* лупа: идёт по замкнутому маршруту, мышь может перехватить её */
  const L = { t: 0, k: 0, w: 0, mx: 360, my: 200 };
  const route = (t: number): P => {
    const pts = LENS_ROUTE, n = pts.length;
    const f = (((t % 1) + 1) % 1) * n, i = Math.floor(f), u = f - i;
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  };
  const START: P = [150, -70];
  function lensRender() {
    const [rx, ry] = route(L.t);
    let x = START[0] + (rx - START[0]) * L.k, y = START[1] + (ry - START[1]) * L.k;
    x += (L.mx - x) * L.w; y += (L.my - y) * L.w;
    lens.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    lensView.setAttribute('transform', `scale(1.55) translate(${(-x).toFixed(1)} ${(-y).toFixed(1)})`);
    if (L.k > 0.85 && lensOn) MARKS.forEach((m, i) => { if (!flipped[i] && Math.hypot(m[0] - x, m[1] - y) < 26) flip(i); });
  }
  let ticking = false;
  const tick = (on: boolean) => { if (on && !ticking) gsap.ticker.add(lensRender); if (!on && ticking) gsap.ticker.remove(lensRender); ticking = on; };
  function lensShow(delay: number) {
    lensOn = true;
    L.t = 0; L.k = 0;
    gsap.killTweensOf([L, lens]);
    gsap.fromTo(lens, { opacity: 0 }, { opacity: 1, duration: 0.3, delay });
    lensRender();
    tick(true);
    gsap.to(L, { k: 1, duration: 0.9, ease: 'power3.out', delay });
    gsap.to(L, { t: 1, duration: 3.6, ease: 'none', repeat: -1, delay: delay + 0.35 });
  }
  function lensHide() {
    if (!lensOn) return;
    lensOn = false;
    gsap.killTweensOf(L, 'k,t');
    gsap.killTweensOf(lens); // иначе отложенное появление лупы сыграет уже на другом шаге
    gsap.to(lens, { opacity: 0, duration: 0.3, ease: 'power1.in', onComplete: () => { if (!lensOn) tick(false); } });
  }

  /** 2: осевые и размеры чертежа. На сборке чертёж остаётся бледной подложкой. */
  let blueAt: 'off' | 'on' | 'ghost' = 'off';
  function blue(mode: 'off' | 'on' | 'ghost', delay = 0) {
    const prev = blueAt;
    blueAt = mode;
    gsap.killTweensOf([...axes, ...dims, ...labels]);
    const ink = [...axes, ...dims, ...labels];
    // прерванная «рулетка» цифр не должна оставить мусор в подписях
    labels.forEach((l) => { if (l.dataset.text) l.textContent = l.dataset.text; });
    if (mode === 'off') {
      if (prev === 'off') return;
      gsap.to(dims, { drawSVG: '0%', duration: 0.35, ease: 'power2.in' });
      gsap.to([...axes, ...labels], { opacity: 0, duration: 0.25 });
      return;
    }
    if (mode === 'ghost') {
      if (prev === 'off') {
        gsap.set(ink, { opacity: 0 });
        gsap.set(dims, { drawSVG: '100%' });
      }
      gsap.to(ink, { opacity: 0.2, duration: 0.6, delay, ease: 'power1.inOut' });
      return;
    }
    gsap.set(dims, { opacity: 1 });
    each(axes, { opacity: 0 }, { opacity: 0.9, duration: 0.5, delay }, 0.12);
    each(dims, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.65, ease: 'power2.inOut', delay: delay + 0.15 }, 0.09);
    labels.forEach((l, i) => {
      const text = l.dataset.text || (l.dataset.text = l.textContent || '');
      gsap.set(l, { opacity: 0 });
      gsap.to(l, { opacity: 1, duration: 0.01, delay: delay + 0.55 + i * 0.12 });
      gsap.to(l, { duration: 0.7, delay: delay + 0.55 + i * 0.12, scrambleText: { text, chars: '0123456789', speed: 0.6 } });
    });
  }

  /** 3: детали. Сборка, разлёт или «уехала по ленте». */
  const snap = (k: number, delay: number) => gsap.fromTo(snaps[k], { opacity: 1, scale: 0.55 }, { opacity: 0, scale: 1.35, duration: 0.5, ease: 'power2.out', delay });
  function assemble(delay: number) {
    partsOn = true;
    gsap.killTweensOf([...Object.values(parts), spring, lamp]);
    gsap.set(lamp, { x: 0, opacity: 1 });
    const t = (k: string, at: number, dur: number, ease: string) =>
      gsap.to(parts[k], { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: dur, ease, delay: delay + at });
    t('base', 0, 0.75, 'power3.out');
    t('arm1', 0.22, 0.75, 'back.out(1.5)');
    t('j0', 0.85, 0.55, 'back.out(2)');
    snap(0, delay + 0.9);
    gsap.set(parts.spring, { x: 0, y: 0, opacity: 1 });
    gsap.fromTo(spring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut', delay: delay + 0.95, onComplete: () => clearDash(spring) });
    t('arm2', 0.5, 0.75, 'back.out(1.5)');
    t('j1', 1.1, 0.55, 'back.out(2)');
    snap(1, delay + 1.18);
    t('shade', 0.8, 0.8, 'back.out(1.7)');
    t('bulb', 1.25, 0.5, 'back.out(3)');
    t('j2', 1.35, 0.55, 'back.out(2)');
    snap(2, delay + 1.45);
  }
  function scatter() {
    partsOn = false;
    gsap.killTweensOf([...Object.values(parts), spring, ...snaps]);
    gsap.set(snaps, { opacity: 0 });
    KEYS.forEach((k, i) => gsap.to(parts[k], { ...AWAY[k], opacity: 0, duration: 0.42, ease: 'power2.in', delay: i * 0.025 }));
  }
  function rideAway() {
    partsOn = false;
    gsap.killTweensOf([...Object.values(parts), lamp, ...snaps]);
    gsap.set(snaps, { opacity: 0 });
    gsap.to(lamp, { x: 820, duration: 0.75, ease: 'power2.in', onComplete: () => {
      KEYS.forEach((k) => gsap.set(parts[k], { ...AWAY[k], opacity: 0 }));
      gsap.set(lamp, { x: 0, rotation: 0 });
    } });
  }

  /** 4: свет, блики, галочка. */
  function polish(on: boolean, delay = 0) {
    gsap.killTweensOf([cone, ...glints, check, checkC, checkM, nod, shine]);
    if (!on) {
      if (polishOn) gsap.to([cone, check, ...glints], { opacity: 0, duration: 0.3 });
      else gsap.set([cone, check, ...glints], { opacity: 0 });
      gsap.to(nod, { rotation: 0, duration: 0.4 });
      gsap.set(shine, { attr: SHINE_OFF });
      polishOn = false;
      return;
    }
    polishOn = true;
    // лампа моргает и загорается (таймлайн, а не keyframes: killTweensOf не видит твины внутри keyframes)
    gsap.set(cone, { opacity: 0 });
    const flick = gsap.timeline({ delay });
    [0.85, 0.15, 0.6, 0.1, 1].forEach((o) => flick.to(cone, { opacity: o, duration: 0.14, ease: 'none' }));
    each(glints, { opacity: 0 }, { opacity: 0.6, duration: 0.5, delay: delay + 0.3 }, 0.08);
    // блик проходит по всей лампе, потом повторяется
    gsap.fromTo(shine, { attr: SHINE_OFF }, { attr: { x1: 525, x2: 595 }, duration: 1.3, ease: 'sine.inOut', delay: delay + 0.55, repeat: -1, repeatDelay: 2 });
    // галочка в пятне света
    gsap.set(check, { opacity: 1, scale: 1 });
    gsap.set(checkC, { fillOpacity: 0 });
    gsap.fromTo(checkC, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut', delay: delay + 0.75 });
    gsap.to(checkC, { fillOpacity: 1, duration: 0.25, delay: delay + 1.15 });
    gsap.fromTo(checkM, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power3.out', delay: delay + 1.3 });
    gsap.timeline({ delay: delay + 1.3 }).to(check, { scale: 1.18, duration: 0.16, ease: 'power2.out' }).to(check, { scale: 1, duration: 0.3, ease: 'power2.inOut' });
    // плафон чуть кивает
    gsap.fromTo(nod, { rotation: 0 }, { rotation: -4, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: delay + 1.6 });
  }

  /** лента под лампой едет, лампа по инерции качается */
  const beltP = { v: 0 };
  const wrap60 = gsap.utils.wrap(0, 60);
  function ride(dist: number) {
    gsap.to(beltP, { v: `+=${dist}`, duration: 1.05, ease: 'power3.inOut', overwrite: true, onUpdate: () => gsap.set(belt, { x: -wrap60(beltP.v) }) });
    if (partsOn) gsap.timeline().to(lamp, { rotation: 3.5, duration: 0.4, ease: 'power2.out' }).to(lamp, { rotation: 0, duration: 1.2, ease: 'elastic.out(1, .32)' });
  }

  function scene(from: number, to: number) {
    const t0 = from < 0 ? 0.25 : 0;
    const had = partsOn;
    if (to === 0) {
      blue('off'); polish(false);
      if (had) { if (from === N - 1) rideAway(); else scatter(); }
      const d = t0 + (had ? (from === N - 1 ? 0.8 : 0.45) : 0);
      sketch('scribble', d);
      marksShow(d + 0.75);
      lensShow(d + 1.0);
    } else if (to === 1) {
      lensHide(); marksHide(); polish(false);
      if (had) scatter();
      sketch('clean', t0 + (had ? 0.35 : 0.15));
      blue('on', t0 + (had ? 0.7 : 0.8));
    } else if (to === 2) {
      lensHide(); marksHide(); polish(false);
      blue('ghost', t0 + 0.05);
      sketch('ghost', t0 + 0.05);
      if (!had) assemble(t0 + 0.2);
    } else {
      lensHide(); marksHide(); blue('off');
      if (!had) assemble(t0 + 0.1);
      sketch('off', t0 + (had ? 0 : 1.6));
      polish(true, t0 + (had ? 0.35 : 1.8));
    }
  }

  /* ---------- линия с постами ---------- */
  const center = (i: number) => {
    const r = rail.getBoundingClientRect(), n = nodes[i].getBoundingClientRect();
    return { x: n.left + n.width / 2 - r.left, y: n.top + n.height / 2 - r.top };
  };
  const trackBox = () => { const r = rail.getBoundingClientRect(), t = track.getBoundingClientRect(); return { x: t.left - r.left, w: t.width }; };
  let cartX = 0;
  function moveCart(i: number, dur: number) {
    const c = center(i), tb = trackBox();
    const dx = c.x - cartX;
    cartX = c.x;
    gsap.to(cart, { x: c.x, y: c.y, duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
    // шестерня катится: поворот = путь / радиус (зубцы по радиусу 29 из 30 единиц рисунка)
    const rad = (cart.offsetWidth / 2) * (29 / 30) || 31;
    if (dur) gsap.to(gear, { rotation: `+=${(dx / rad) * (180 / Math.PI)}`, duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(done, { scaleX: Math.max(0, (c.x - tb.x) / tb.w), duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
    if (dur) gsap.timeline({ delay: dur * 0.85 }).to(gear, { scale: 1.14, duration: 0.14, ease: 'power2.out' }).to(gear, { scale: 1, duration: 0.26, ease: 'power2.inOut' });
  }
  function progBox(i: number) {
    const tb = trackBox();
    const a = center(i).x - tb.x;
    const b = i < N - 1 ? center(i + 1).x - tb.x : tb.w;
    gsap.set(prog, { left: a, width: Math.max(0, b - a) });
  }

  // пауза автопрокрутки: наведение, фокус, тап, мышь над рисунком
  const holds = new Set<string>();
  let timer: gsap.core.Tween | undefined;
  let touchHold: gsap.core.Tween | undefined;
  const hold = (src: string, on: boolean) => {
    if (on) holds.add(src); else holds.delete(src);
    if (holds.size) timer?.pause(); else timer?.resume();
  };
  function startTimer(delay: number) {
    timer?.kill();
    progBox(cur);
    timer = gsap.fromTo(prog, { scaleX: 0 }, { scaleX: 1, duration: DWELL, ease: 'none', delay, paused: holds.size > 0,
      onComplete: () => { if (isOn()) go(cur + 1); } });
  }

  const digits = roll.children.length; // 1 2 3 4 и ещё раз 1 для перехода по кругу
  // подпись шага: старая уходит вверх под маску, новая поднимается снизу, когда старой уже нет
  function swapSay(from: number, to: number) {
    const out = from >= 0 && from !== to;
    says.forEach((s, k) => {
      if (k === to || (out && k === from)) return;
      gsap.killTweensOf(s);
      s.classList.remove('is-on');
      gsap.set(s, { opacity: 0, yPercent: 0 });
    });
    if (out) {
      says[from].classList.remove('is-on');
      gsap.to(says[from], { opacity: 0, yPercent: -60, duration: 0.22, ease: 'power2.in', overwrite: true });
    }
    says[to].classList.add('is-on');
    gsap.fromTo(says[to], { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: 0.6, ease: 'expo.out', delay: out ? 0.22 : 0, overwrite: true });
  }

  function setUI(i: number) {
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
  }

  function go(next: number, byUser = false) {
    const i = ((next % N) + N) % N;
    if (i === cur) return;
    const from = cur;
    cur = i;
    setUI(i);
    // номер: барабан крутится вперёд, с 4 на 1 через лишнюю единицу
    const loop = from === N - 1 && i === 0 && digits > N;
    gsap.to(roll, { yPercent: (-100 / digits) * (loop ? N : i), duration: 0.8, ease: 'expo.inOut', overwrite: true,
      onComplete: () => { if (loop) gsap.set(roll, { yPercent: 0 }); } });
    swapSay(from, i);
    moveCart(i, from < 0 ? 0 : 0.95);
    if (from >= 0) ride(from === N - 1 && i === 0 ? 240 : 180 * Math.abs(i - from));
    scene(from, i);
    startTimer(byUser ? 0.25 : from < 0 ? 1.1 : 0.95);
  }

  /* ---------- управление ---------- */
  let lastPointer = 'mouse';
  list.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
  btns.forEach((b, i) => {
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && isOn()) go(i, true); });
    b.addEventListener('focus', () => { if (isOn()) go(i, true); });
    b.addEventListener('click', () => {
      if (!isOn()) return;
      go(i, true);
      if (lastPointer !== 'mouse') {
        hold('touch', true);
        touchHold?.kill();
        touchHold = gsap.delayedCall(7, () => hold('touch', false));
      }
    });
  });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const k = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (k < 0) return;
    e.preventDefault();
    btns[(k + (e.key === 'ArrowRight' ? 1 : -1) + N) % N].focus();
  });
  list.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold('hover', true); });
  list.addEventListener('pointerleave', () => hold('hover', false));
  list.addEventListener('focusin', (e) => { if ((e.target as HTMLElement).matches(':focus-visible')) hold('focus', true); });
  list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget as Node)) hold('focus', false); });

  // мышь над рисунком: на первом шаге лупа идёт за курсором, на собранной лампе плафон смотрит на курсор
  const toSvg = (e: PointerEvent): P => {
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  // quickTo пересоздаётся при сбросе: killTweensOf убивает его внутренний твин, и поворот переставал работать
  let rot1: gsap.QuickToFunc, rot2: gsap.QuickToFunc;
  function makeLook() {
    gsap.killTweensOf([pivot1, pivot2]);
    gsap.set([pivot1, pivot2], { rotation: 0 });
    rot1 = gsap.quickTo(pivot1, 'rotation', { duration: 0.8, ease: 'power3' });
    rot2 = gsap.quickTo(pivot2, 'rotation', { duration: 0.6, ease: 'power3' });
  }
  const lookAt = (p: P | null) => {
    if (!p) { rot1(0); rot2(0); return; }
    const a = Math.atan2(p[1] - J2[1], p[0] - J2[0]) * (180 / Math.PI); // 60 = смотрит вниз-вперёд, как нарисовано
    const d = gsap.utils.clamp(-50, 50, a - 60);
    // вверх плафон поднимается немного: иначе луч света уходит за правый край рисунка
    rot1(gsap.utils.clamp(-4, 5, d * 0.12));
    rot2(gsap.utils.clamp(-9, 20, d * 0.45));
  };
  stage.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    gsap.to(L, { w: 1, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    const p = toSvg(e);
    L.mx = p[0]; L.my = p[1];
    if (partsOn) lookAt(p);
  });
  stage.addEventListener('pointerleave', () => {
    gsap.to(L, { w: 0, duration: 0.6, ease: 'power2.inOut', overwrite: 'auto' });
    lookAt(null);
  });

  addEventListener('resize', () => {
    if (cur < 0) return;
    const c = center(cur), tb = trackBox();
    cartX = c.x;
    gsap.set(cart, { x: c.x, y: c.y });
    gsap.set(done, { scaleX: Math.max(0, (c.x - tb.x) / tb.w) });
    progBox(cur);
  }, { passive: true });

  /* ---------- исходное состояние ---------- */
  function reset() {
    timer?.kill(); timer = undefined;
    touchHold?.kill(); holds.clear();
    // блок мог открыться потому, что на шаг перешёл фокус с клавиатуры, или курсор уже стоит над линией
    const fe = document.activeElement as HTMLElement | null;
    if (fe && list.contains(fe) && fe.matches(':focus-visible')) holds.add('focus');
    if (fine.matches && list.matches(':hover')) holds.add('hover');
    tick(false);
    lensOn = false; partsOn = false; polishOn = false; sk = 'off'; cur = -1; shapeAt = 'sketch'; blueAt = 'off';
    const all = [lines, marks, axes, dims, labels, Object.values(parts), spring, lamp, nod, cone, glints, shine, check, checkC, checkM, snaps, lens, L, beltP, belt, roll, says, cart, done, prog].flat();
    gsap.killTweensOf(all);
    gsap.killTweensOf(gear, 'rotation,scale');
    lines.forEach((l) => { l.setAttribute('d', l.dataset.sketch!); clearDash(l); });
    gsap.set(lines, { opacity: 0, stroke: FG, strokeWidth: 2.2 });
    marks.forEach((m) => { m.textContent = '?'; m.classList.remove('is-got'); });
    gsap.set(marks, { scale: 0, opacity: 0 });
    gsap.set(lens, { opacity: 0 });
    Object.assign(L, { t: 0, k: 0, w: 0 });
    gsap.set(dims, { drawSVG: '0%' });
    gsap.set([...axes, ...labels], { opacity: 0 });
    KEYS.forEach((k) => gsap.set(parts[k], { ...AWAY[k], opacity: 0 }));
    clearDash(spring);
    gsap.set(lamp, { x: 0, rotation: 0, opacity: 1 });
    gsap.set(nod, { rotation: 0 });
    makeLook();
    gsap.set([cone, check, ...glints], { opacity: 0 });
    gsap.set(shine, { attr: SHINE_OFF });
    gsap.set(snaps, { opacity: 0 });
    beltP.v = 0; gsap.set(belt, { x: 0 });
    gsap.set(roll, { yPercent: 0 });
    says.forEach((s, k) => { s.classList.toggle('is-on', k === 0); gsap.set(s, { opacity: k === 0 ? 1 : 0, yPercent: 0, y: 0 }); });
    setUI(0);
    gsap.set(done, { scaleX: 0 });
    gsap.set(prog, { scaleX: 0 });
    gsap.set(gear, { rotation: 0, scale: 1 });
    const c = center(0);
    cartX = c.x;
    gsap.set(cart, { x: c.x, y: c.y });
  }

  /* ---------- вход ---------- */
  const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'ru';
  const CH = lang === 'en' ? 'ABCDEFGHKMNPRSTUVWXYZ0123456789' : 'АБВГДЕЖЗИКЛМНПРСТУФХЦЧШЭЮЯ0123456789';
  const finals = words.map((w) => w.textContent || '');
  const randomOf = (s: string) => Array.from(s, () => CH[Math.floor(Math.random() * CH.length)]).join('');
  const titleIn = () => words.forEach((w, i) => {
    gsap.killTweensOf(w, 'scrambleText');
    w.textContent = randomOf(finals[i]);
    gsap.to(w, { duration: 0.9 + i * 0.15, delay: 0.05 + i * 0.12, ease: 'none', scrambleText: { text: finals[i], chars: CH, speed: 0.7, revealDelay: 0.25 } });
  });

  const intro = gsap.timeline({ paused: true })
    .fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.08 }, 0)
    .fromTo(num, { clipPath: 'inset(100% 0% 0% 0%)', y: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.9, ease: 'expo.out' }, 0.25)
    .fromTo(q('.process__belt'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' }, 0.05)
    .fromTo(track, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.inOut' }, 0.15)
    .fromTo(nodes, { scale: 0 }, { scale: 1, duration: 0.55, ease: 'back.out(2.4)', stagger: 0.08, immediateRender: false }, 0.4)
    .fromTo(names, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 }, 0.5)
    .fromTo(gear, { y: -46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'bounce.out', immediateRender: false }, 0.8);

  let first: gsap.core.Tween | undefined;
  watchBlock(root, () => {
    reset();
    gsap.set(nodes, { scale: 0 });
    gsap.set(gear, { y: -46, opacity: 0 });
    intro.restart();
    titleIn();
    first?.kill();
    first = gsap.delayedCall(0.3, () => { if (isOn()) go(Math.max(0, btns.indexOf(document.activeElement as HTMLButtonElement))); });
  }, () => {
    first?.kill();
    intro.pause(0);
    words.forEach((w, i) => { gsap.killTweensOf(w, 'scrambleText'); w.textContent = finals[i]; });
    reset();
  });

  reset();
}
