import { gsap } from 'gsap';
import { watchBlock, splitChars, splitLines, rise, wrap, type Player } from '../../scripts/block';
import { createBeam } from './beam';
import { createAudience } from './audience';

/** Склейки между кадрами. roll: кадр уезжает вбок (палец, стрелки), shutter: обтюратор, wipe: шторка
 *  со световой кромкой, flash: засветка, slip: кадр проскальзывает в окне, cut: жёсткая склейка (флипбук мышью). */
type Cut = 'roll' | 'shutter' | 'wipe' | 'flash' | 'slip' | 'cut';
const AUTO: Cut[] = ['shutter', 'wipe', 'flash', 'slip'];
const HOLD = 3.6; // сколько кадр стоит на экране при автопоказе, с
const GAP = 14; // промежуток между кадрами при протяжке пальцем, px
const FOLLOW = 0.85; // насколько кадр идёт за пальцем
const LEAD = 0.34; // сколько стоит каждая цифра ракорда, с
const OPEN_R = 0.52; // ширина полотна занавеса в долях сцены (works.css, .works__curtain)

/**
 * Работы: кинозал. При входе в зале гаснет свет и бра, занавес разъезжается, складки сбиваются у краёв,
 * загорается луч проектора, ракорд отсчитывает 3-2-1, и пошёл фильм: кадры работы сменяются сами
 * разными склейками. Мышью по экрану кадры листаются как флипбук, пальцем свайпом, кнопками под экраном
 * напрямую. Каждая работа = сеанс в репертуаре справа; выбор сеанса меняет фильм и афишу.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const screen = q<HTMLAnchorElement>('[data-works-screen]')[0];
  if (!screen) return;
  const inner = q<HTMLElement>('[data-works-inner]')[0];
  const sign = q<HTMLElement>('[data-works-title]')[0];
  const folds = q<HTMLElement>('[data-works-fold]');
  const blades = q<HTMLElement>('[data-works-blade]');
  const bar = q<HTMLElement>('[data-works-bar]')[0];
  const leak = q<HTMLElement>('[data-works-leak]')[0];
  const flash = q<HTMLElement>('[data-works-flash]')[0];
  const leader = q<HTMLElement>('[data-works-leader]')[0];
  const leaderNum = q<HTMLElement>('[data-works-leader-num]')[0];
  const sweep = q<HTMLElement>('[data-works-sweep]')[0];
  const sessions = q<HTMLButtonElement>('[data-works-session]');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // фильмы: у каждой работы свои кадры, субтитры, кнопки кадров и афиша
  const films = q<HTMLElement>('[data-works-film]').map((el, i) => {
    const ctl = q<HTMLElement>(`[data-works-ctl="${i}"]`)[0];
    const bill = q<HTMLElement>(`[data-works-bill="${i}"]`)[0];
    const open = bill?.querySelector<HTMLAnchorElement>('[data-works-open]');
    return {
      el, ctl, bill,
      stills: [...el.querySelectorAll<HTMLImageElement>('[data-works-still]')],
      subs: ctl ? [...ctl.querySelectorAll<HTMLElement>('[data-works-sub]')] : [],
      subsBox: ctl?.querySelector<HTMLElement>('[data-works-subs]') ?? null,
      btns: ctl ? [...ctl.querySelectorAll<HTMLButtonElement>('[data-works-btn]')] : [],
      fills: ctl ? [...ctl.querySelectorAll<HTMLElement>('[data-works-fill]')] : [],
      href: open?.getAttribute('href') || screen.getAttribute('href') || '',
      slug: (open?.getAttribute('href') || '').split('/').filter(Boolean).pop() || '',
      amb: [] as ([number, number, number] | null)[],
      show: null as Player[] | null,
    };
  });
  if (!films.length) return;
  const allStills = films.flatMap((f) => f.stills);
  allStills.forEach((img) => { img.loading = 'eager'; });

  const beam = createBeam(q<HTMLCanvasElement>('[data-works-beam]')[0], inner, screen);
  const crowd = createAudience(root);

  /* ---------- цвет кадра: средний цвет миниатюры, приподнятый до заметного света ---------- */
  const probe = document.createElement('canvas');
  probe.width = 16; probe.height = 9;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const lift = ([r, g, b]: number[]): [number, number, number] => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 510;
    const k = Math.min(3.2, 0.62 / Math.max(l, 0.08));
    // светлее и чуть насыщеннее, но без кислотности
    const m = (r + g + b) / 3;
    return [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round((m + (c - m) * 1.35) * k)))) as [number, number, number];
  };
  films.forEach((f) => f.stills.forEach((img, i) => {
    f.amb[i] = null;
    const src = img.dataset.thumb;
    if (!src || !pctx) return;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      try {
        pctx.drawImage(im, 0, 0, 16, 9);
        const d = pctx.getImageData(0, 0, 16, 9).data;
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2]; }
        const n = d.length / 4;
        f.amb[i] = lift([r / n, g / n, b / n]);
        if (live && f === film() && i === cur) tint(i, 0.6);
      } catch { /* кадр с другого домена: остаётся цвет по умолчанию */ }
    };
    im.src = src;
  }));
  const LEADER: [number, number, number] = [150, 158, 168];
  const tint = (i: number | null, duration = 0.9) => {
    const c = i === null ? LEADER : film().amb[i] ?? [168, 176, 188];
    // цвет меняется сразу, под склейкой: плавная смена переменной перекрашивала бы весь зал каждый кадр и тормозила
    void duration;
    gsap.set(root, { '--amb': `rgb(${c[0]}, ${c[1]}, ${c[2]})` });
    beam.color(c);
  };

  /* ---------- состояние ---------- */
  let fi = 0; // текущий фильм
  let cur = 0; // текущий кадр
  let live = false; // фильм идёт, можно листать
  let hover = false, focus = false, dragging = false;
  let busy: gsap.core.Timeline | null = null;
  let hold: gsap.core.Tween | null = null;
  let show: gsap.core.Timeline | null = null;
  let autoIdx = 0;
  const film = () => films[fi];
  const stills = () => film().stills;

  const normalize = () => {
    stills().forEach((im, k) => {
      gsap.set(im, { clearProps: 'transform,clipPath,filter,zIndex' });
      gsap.set(im, { autoAlpha: k === cur ? 1 : 0, zIndex: k === cur ? 1 : 0 });
    });
    gsap.set(blades, { scaleY: 0 });
    gsap.set([bar, leak, flash], { opacity: 0 });
  };
  const mark = (i: number) => {
    const f = film();
    f.stills.forEach((im, k) => { im.classList.toggle('is-active', k === i); if (k === i) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true'); });
    f.subs.forEach((c, k) => { c.classList.toggle('is-active', k === i); if (k === i) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true'); });
    f.btns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-current', String(k === i)); });
    f.fills.forEach((el, k) => gsap.set(el, { scaleX: k < i ? 1 : 0, overwrite: true }));
  };
  // старый субтитр уходит целиком, и только потом встаёт новый
  const swapSub = (from: number, to: number) => {
    const subs = film().subs;
    if (!subs.length) return;
    subs.forEach((c, k) => { if (k !== from && k !== to) { gsap.killTweensOf(c); gsap.set(c, { autoAlpha: 0, y: 0 }); } });
    gsap.to(subs[from], { autoAlpha: 0, y: -5, duration: 0.15, ease: 'power2.in', overwrite: true });
    gsap.fromTo(subs[to], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, delay: 0.2, ease: 'expo.out', overwrite: true });
  };

  /* ---------- склейки ---------- */
  const go = (target: number, kind: Cut, dir = 1) => {
    const list = stills(), n = list.length;
    const to = ((target % n) + n) % n;
    if (to === cur || n < 2) return;
    busy?.progress(1);
    const a = list[cur], b = list[to];
    const from = cur;
    cur = to;
    mark(to);
    swapSub(from, to);
    tint(to);
    crowd.react();
    const W = screen.clientWidth;
    const tl = gsap.timeline({ onComplete: () => { busy = null; normalize(); } });
    busy = tl;
    gsap.set(a, { zIndex: 1 });
    if (kind === 'roll') {
      // кадр уезжает вбок, новый въезжает вплотную; если кадр уже тянули пальцем, промежуток не прыгает
      const ax = Number(gsap.getProperty(a, 'x')) || 0;
      gsap.set(b, { autoAlpha: 1, zIndex: 2, x: ax, xPercent: (100 + (GAP / W) * 100) * dir });
      tl.to(a, { xPercent: -(100 + (GAP / W) * 100) * dir, x: 0, duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(b, { xPercent: 0, x: 0, duration: 0.8, ease: 'expo.inOut' }, 0);
    } else if (kind === 'shutter') {
      // обтюратор закрывается и открывается со вспышкой лампы
      tl.to(blades, { scaleY: 1, duration: 0.2, ease: 'power3.in' }, 0)
        .add(() => { gsap.set(a, { autoAlpha: 0 }); gsap.set(b, { autoAlpha: 1, zIndex: 2 }); }, 0.2)
        .to(blades, { scaleY: 0, duration: 0.45, ease: 'power3.out' }, 0.3)
        .fromTo(flash, { opacity: 0.4 }, { opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 0.3);
    } else if (kind === 'wipe') {
      // шторка со световой кромкой, старый кадр чуть уходит в сторону
      gsap.set(b, { autoAlpha: 1, zIndex: 2, clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' });
      tl.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'expo.inOut' }, 0)
        .to(a, { xPercent: -7 * dir, duration: 0.85, ease: 'expo.inOut' }, 0)
        .fromTo(bar, { x: dir > 0 ? W : 0, opacity: 1 }, { x: dir > 0 ? 0 : W, duration: 0.85, ease: 'expo.inOut' }, 0)
        .to(bar, { opacity: 0, duration: 0.2 }, 0.68);
    } else if (kind === 'flash') {
      // засветка: пятно света проходит по кадру, новый кадр проявляется из пересвета
      tl.fromTo(leak, { xPercent: -45 * dir, opacity: 0 }, { xPercent: 45 * dir, duration: 0.9, ease: 'power2.inOut' }, 0)
        .to(leak, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .to(leak, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.45)
        .fromTo(b, { autoAlpha: 0, zIndex: 2, filter: 'brightness(2.2) contrast(.85)' }, { autoAlpha: 1, filter: 'brightness(1) contrast(1)', duration: 0.65, ease: 'power2.out' }, 0.2)
        .set(a, { autoAlpha: 0 }, 0.5);
    } else if (kind === 'slip') {
      // кадр проскальзывает в окне проектора, как при сбитой рамке, и встаёт с отскоком
      gsap.set(b, { autoAlpha: 1, zIndex: 2, yPercent: 100 });
      tl.to(a, { yPercent: -100, duration: 0.55, ease: 'power3.in' }, 0)
        .to(b, { yPercent: 0, duration: 0.55, ease: 'power3.in' }, 0)
        .to(b, { keyframes: { yPercent: [0, -3, 1.2, -0.4, 0] }, duration: 0.45, ease: 'none' }, 0.55)
        .fromTo(flash, { opacity: 0.18 }, { opacity: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, 0.55);
    } else {
      // жёсткая склейка: кадр меняется сразу, короткий блик
      gsap.set(a, { autoAlpha: 0 });
      gsap.set(b, { autoAlpha: 1, zIndex: 2 });
      tl.fromTo(flash, { opacity: 0.22 }, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0);
    }
  };

  /* ---------- автопоказ ---------- */
  const paused = () => !live || hover || focus || dragging;
  const startHold = () => {
    hold?.kill();
    hold = null;
    if (!live) return;
    const f = film();
    if (f.stills.length < 2) return;
    hold = gsap.fromTo(f.fills[cur], { scaleX: 0 }, {
      scaleX: 1, duration: HOLD, ease: 'none',
      onComplete: () => { go(cur + 1, AUTO[autoIdx++ % AUTO.length], 1); startHold(); },
    });
    if (paused()) hold.pause();
  };
  const sync = () => { if (hold) { if (paused()) hold.pause(); else hold.resume(); } };
  const user = (to: number, kind: Cut, dir: number) => {
    if (!live) return;
    film().subsBox?.setAttribute('aria-live', 'polite');
    go(to, kind, dir);
    startHold();
  };

  // наведение на экран и фокус с клавиатуры ставят показ на паузу
  const stage = q<HTMLElement>('[data-works-stage]')[0];
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  stage.addEventListener('focusin', (e) => { focus = (e.target as Element).matches(':focus-visible'); sync(); });
  stage.addEventListener('focusout', (e) => { if (!stage.contains(e.relatedTarget as Node)) { focus = false; sync(); } });

  // кнопки кадров под экраном и стрелки на них
  films.forEach((f, k) => f.btns.forEach((b, i) => b.addEventListener('click', () => { if (k === fi) user(i, 'wipe', i > cur ? 1 : -1); })));
  stage.addEventListener('keydown', (e) => {
    if (!(e.target as HTMLElement).closest('[data-works-btn]')) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    user(cur + dir, 'roll', dir);
    film().btns[cur]?.focus();
  });

  // мышь: позиция по горизонтали выбирает кадр, как в флипбуке
  screen.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !live || !fine.matches) return;
    const n = stills().length;
    const r = screen.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    if (i !== cur) { film().subsBox?.setAttribute('aria-live', 'polite'); go(i, 'cut', i > cur ? 1 : -1); hold?.kill(); hold = null; }
  });
  screen.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && live && !hold) startHold(); });

  // тачпад: горизонтальный жест по экрану листает кадры
  let lastWheel = 0;
  screen.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 6) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 650) { lastWheel = now; return; }
    lastWheel = now;
    const dir = e.deltaX > 0 ? 1 : -1;
    user(cur + dir, 'roll', dir);
  }, { passive: false });

  // скриншот не тащится призраком за курсором, а протяжка мышью не открывает кейс
  screen.addEventListener('dragstart', (e) => e.preventDefault());
  let mx = 0, my = 0;
  screen.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; } });
  screen.addEventListener('click', (e) => { if (e.pointerType === 'mouse' && Math.hypot(e.clientX - mx, e.clientY - my) > 8) e.preventDefault(); });

  // палец: кадр тянется за свайпом, из-за края выезжает соседний; отпустил дальше порога, кадр меняется.
  // Вертикальный свайп по экрану остаётся сцене и листает блоки, горизонтальный принадлежит кадрам:
  // его touchend не доходит до сцены.
  let sx = 0, sy = 0, drag = false, swiped = false, claimed = false, pid = -1, peek = -1;
  const hidePeek = () => { if (peek >= 0 && peek !== cur) gsap.set(stills()[peek], { autoAlpha: 0, x: 0, xPercent: 0, zIndex: 0 }); peek = -1; };
  screen.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !live) return;
    busy?.progress(1);
    sx = e.clientX; sy = e.clientY; drag = true; swiped = false; claimed = false; pid = e.pointerId;
    dragging = true; sync();
  });
  screen.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== pid) return;
    const list = stills(), n = list.length;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!claimed) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      claimed = true;
    }
    const off = dx * FOLLOW;
    gsap.set(list[cur], { x: off });
    const dir = dx < 0 ? 1 : -1;
    const k = (cur + dir + n) % n;
    if (n > 1 && k !== cur) {
      if (k !== peek) { hidePeek(); peek = k; gsap.set(list[k], { autoAlpha: 1, zIndex: 2, xPercent: 0 }); }
      gsap.set(list[k], { x: off + dir * (screen.clientWidth + GAP) });
    }
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== pid) return;
    drag = false; dragging = false;
    const list = stills(), n = list.length;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (e.type === 'pointerup' && claimed && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped = true;
      const dir = dx < 0 ? 1 : -1;
      if (peek !== (cur + dir + n) % n) hidePeek();
      peek = -1;
      user(cur + dir, 'roll', dir);
    } else {
      const k = peek, dir = dx < 0 ? 1 : -1;
      peek = -1;
      gsap.to(list[cur], { x: 0, duration: 0.5, ease: 'expo.out' });
      if (k >= 0) gsap.to(list[k], { x: dir * (screen.clientWidth + GAP), duration: 0.5, ease: 'expo.out', onComplete: () => { if (k !== cur) gsap.set(list[k], { autoAlpha: 0, x: 0, zIndex: 0 }); } });
      sync();
    }
  };
  screen.addEventListener('pointerup', endDrag);
  screen.addEventListener('pointercancel', endDrag);
  screen.addEventListener('touchend', (e) => { if (claimed) e.stopPropagation(); });
  screen.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); swiped = false; } });

  /* ---------- занавес ---------- */
  const N = folds.length / 2;
  const legR = () => (parseFloat(getComputedStyle(root).getPropertyValue('--leg')) || 0.085) / OPEN_R;
  const idx = (k: number) => k % N; // складки левого и правого полотна идут подряд, правое зеркально в CSS
  const closeCurtains = () => gsap.set(folds, { x: 0, xPercent: (k: number) => idx(k) * 74.07, scaleX: 1, skewX: 0 });
  const setOpen = () => { const r = legR(); gsap.set(folds, { x: 0, xPercent: (k: number) => idx(k) * 74.07 * r, scaleX: r * 1.75, skewX: 0 }); };
  // полотно тянут за передний край: ближние к середине складки трогаются первыми, дальние догоняют
  // и сбиваются плотнее; низ полотна отстаёт от верха и раскачивается, пока ткань не успокоится
  const openCurtains = () => {
    const r = legR();
    const tl = gsap.timeline();
    folds.forEach((el, k) => {
      const i = idx(k), at = (N - 1 - i) * 0.045;
      tl.to(el, { xPercent: i * 74.07 * r, scaleX: r * 1.75, duration: 1.55, ease: 'power3.inOut' }, at)
        .to(el, { keyframes: { skewX: [0, 4.5 + i * 0.35, -2.2, 0.8, 0] }, duration: 2.1, ease: 'sine.inOut' }, at + 0.05);
    });
    return tl;
  };

  /* ---------- вывеска ---------- */
  const bulbs = q<HTMLElement>('[data-works-bulb]');
  const signOn = (tl: gsap.core.Timeline, at: number) => {
    // лампочки вспыхивают вразнобой, потом бежит огонь
    tl.add(() => sign.classList.add('is-lit'), at)
      .fromTo(bulbs, { opacity: 0.2 }, { opacity: 1, duration: 0.05, stagger: { each: 0.012, from: 'random' }, ease: 'none', clearProps: 'opacity' }, at)
      .add(() => sign.classList.add('is-chase'), at + 0.55);
  };

  /* ---------- ракорд и первый кадр ---------- */
  const countdown = (tl: gsap.core.Timeline, at: number) => {
    tl.set(leader, { visibility: 'inherit', opacity: 0 }, at)
      .to(leader, { keyframes: { opacity: [0.8, 0.3, 1], easeEach: 'steps(1)' }, duration: 0.3, ease: 'none' }, at);
    [3, 2, 1].forEach((k, j) => {
      const t = at + 0.1 + j * LEAD;
      tl.add(() => { leaderNum.textContent = String(k); }, t)
        .fromTo(sweep, { '--a': '0deg' }, { '--a': '360deg', duration: LEAD, ease: 'none', immediateRender: false }, t)
        .fromTo(leaderNum, { scale: 1.3, opacity: 0.35 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'power3.out', immediateRender: false }, t);
    });
    return at + 0.1 + 3 * LEAD;
  };
  const filmIn = (tl: gsap.core.Timeline, on: number, k: number) => {
    const first = films[k].stills[0], sub = films[k].subs[0];
    tl.set(leader, { autoAlpha: 0 }, on)
      .set(first, { visibility: 'inherit', zIndex: 1 }, on)
      .add(() => tint(0, 0.5), on)
      .to(first, { keyframes: { opacity: [0, 0.9, 0.15, 0.75, 0.3, 1], easeEach: 'steps(1)' }, duration: 0.5, ease: 'none' }, on)
      .to(root, { keyframes: { '--lit': [0.4, 1, 0.5, 0.9, 0.6, 1], easeEach: 'steps(1)' }, duration: 0.5, ease: 'none' }, on)
      .fromTo(first, { filter: 'blur(10px) brightness(1.5)', scale: 1.08 }, { filter: 'blur(0px) brightness(1)', scale: 1, duration: 1.3, ease: 'expo.out', clearProps: 'filter,transform', immediateRender: false }, on)
      .add(() => { live = true; startHold(); }, on + 0.55);
    if (sub) tl.fromTo(sub, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out', immediateRender: false }, on + 0.5);
  };

  /* ---------- афиша и сеансы ---------- */
  const billPlayers = (k: number): Player[] => {
    const f = films[k];
    if (f.show || !f.bill) return f.show ?? [];
    const b = gsap.utils.selector(f.bill);
    f.show = [
      splitLines(b('[data-works-name]')[0], { yPercent: 105, scaleY: 1.6, transformOrigin: '50% 100%', stagger: 0.13, duration: 1.15 }),
      splitLines(b('[data-works-tag]')[0], { stagger: 0.07 }),
      rise(b('[data-works-credits] dd'), { y: 14, stagger: 0.05, duration: 0.7 }),
      wrap(gsap.timeline({ paused: true })
        .fromTo(b('[data-works-ticket]'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0)
        .fromTo(b('[data-works-stub]'), { rotate: 28, yPercent: -40, opacity: 0 }, { rotate: 0, yPercent: 0, opacity: 1, duration: 1, ease: 'elastic.out(1, 0.55)', clearProps: 'transform,opacity' }, 0.45)),
    ];
    return f.show;
  };
  const playBill = (k: number, d: number) => { const [name, tag, credits, ticket] = billPlayers(k); name?.play(d); tag?.play(d + 0.3); credits?.play(d + 0.45); ticket?.play(d + 0.55); };
  const title = splitChars(q('[data-works-sign]')[0], { stagger: 0.04, duration: 0.85 });
  const program = rise(q('[data-works-session-item]'), { y: 22, stagger: 0.1, duration: 0.9 });

  const showFilm = (k: number) => {
    films.forEach((f, j) => {
      const on = j === k;
      f.el.style.display = on ? '' : 'none';
      if (f.ctl) f.ctl.hidden = !on;
      if (f.bill) f.bill.hidden = !on;
    });
    sessions.forEach((s) => s.setAttribute('aria-pressed', String(Number(s.dataset.worksSession) === k)));
    const f = films[k];
    screen.href = f.href;
    if (f.slug) screen.style.setProperty('view-transition-name', `work-${f.slug}`);
  };

  // сеанс: смена фильма. Тот же сеанс ещё раз перематывает фильм на начало с ракордом
  const reelTo = (k: number) => {
    if (!live && show) return;
    const same = k === fi;
    show?.kill(); busy?.progress(1); hold?.kill(); hold = null;
    live = false;
    const old = film();
    const tl = gsap.timeline({ onComplete: () => { show = null; } });
    show = tl;
    if (!same && old.bill) tl.to(old.bill, { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(old.stills, { autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0)
      .to(root, { '--lit': 0.35, duration: 0.3 }, 0)
      .add(() => {
        old.subs.forEach((s) => gsap.set(s, { autoAlpha: 0 }));
        if (!same && old.bill) gsap.set(old.bill, { clearProps: 'opacity,visibility,transform' });
        fi = k; cur = 0; autoIdx = 0;
        showFilm(k);
        mark(0);
        gsap.set(film().fills, { scaleX: 0 });
        normalize();
        gsap.set(film().stills[0], { autoAlpha: 0 });
        gsap.set(film().subs, { autoAlpha: 0 });
        tint(null, 0.3);
        if (!same) playBill(k, 0);
      }, 0.3);
    const on = countdown(tl, 0.32);
    filmIn(tl, on, k);
  };
  sessions.forEach((s) => s.addEventListener('click', () => reelTo(Number(s.dataset.worksSession) || 0)));

  /* ---------- один тикер на луч ---------- */
  const tick = (t: number) => beam.draw(t);
  let measured = 0;
  const measure = () => { beam.measure(); crowd.measure(); };
  addEventListener('resize', () => {
    cancelAnimationFrame(measured);
    measured = requestAnimationFrame(() => {
      measure();
      if (live || show) setOpen();
    });
  }, { passive: true });
  document.fonts?.ready.then(() => measure());

  // до входа: в зале горит свет, занавес закрыт, проектор выключен
  const prime = () => {
    show?.kill(); show = null;
    busy?.kill(); busy = null;
    hold?.kill(); hold = null;
    live = false;
    fi = 0; cur = 0; autoIdx = 0;
    showFilm(0);
    films.forEach((f, k) => {
      f.stills.forEach((im) => gsap.set(im, { clearProps: 'transform,clipPath,filter,zIndex', autoAlpha: 0 }));
      f.subs.forEach((s) => gsap.set(s, { autoAlpha: 0, y: 0 }));
      f.subsBox?.setAttribute('aria-live', 'off');
      if (f.bill) gsap.set(f.bill, { clearProps: 'opacity,visibility,transform' });
      if (k === 0) { mark(0); gsap.set(f.fills, { scaleX: 0 }); }
    });
    gsap.set(blades, { scaleY: 0 });
    gsap.set([bar, leak, flash], { opacity: 0 });
    gsap.set(leader, { autoAlpha: 0 });
    leaderNum.textContent = '3';
    closeCurtains();
    gsap.set(root, { '--house': 1, '--lit': 0 });
    beam.state.on = 0;
    beam.clear();
    sign.classList.remove('is-lit', 'is-chase');
    tint(null, 0);
  };

  const enter = (d: number) => {
    const tl = gsap.timeline({ delay: d, onComplete: () => { show = null; } });
    show = tl;
    signOn(tl, 0.05);
    // свет в зале гаснет с подмигиванием бра, потом едет занавес, загорается луч и пошёл ракорд
    tl.to(root, { keyframes: { '--house': [1, 0.72, 0.86, 0.4, 0.55, 0.15, 0] }, duration: 1.1, ease: 'none' }, 0.3)
      .add(openCurtains(), 1.0)
      .add(() => tint(null, 0.4), 1.1)
      .to(beam.state, { keyframes: { on: [0, 0.8, 0.15, 0.9, 0.45, 1] }, duration: 0.5, ease: 'none' }, 1.1)
      .to(root, { '--lit': 0.45, duration: 0.4, ease: 'power2.out' }, 1.2);
    const on = countdown(tl, 1.15);
    filmIn(tl, on, 0);
  };

  prime();

  // Если блок открылся переходом сцены (не по прямой ссылке), круг перехода раскрывается ещё ~0,6 с:
  // свет и занавес ждут, чтобы не отыграть под ним. Слушатель стоит раньше watchBlock.
  let viaStage = false;
  root.addEventListener('block:enter', (e) => { viaStage = !(e as CustomEvent<{ first?: boolean }>).detail?.first; });

  watchBlock(root, () => {
    const d = viaStage ? 0.5 : 0;
    viaStage = false;
    prime();
    measure();
    gsap.ticker.add(tick);
    crowd.start();
    enter(d);
    title.play(0.05 + d * 0.4);
    playBill(0, 0.3 + d * 0.4);
    program.play(0.55 + d * 0.4);
  }, () => {
    gsap.ticker.remove(tick);
    crowd.stop();
    title.reset();
    program.reset();
    films.forEach((f) => f.show?.forEach((p) => p.reset()));
    prime();
  });
}
