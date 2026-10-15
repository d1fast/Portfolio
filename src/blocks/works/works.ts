import { gsap } from 'gsap';
import { watchBlock, splitChars, splitLines, rise, wrap, nn } from '../../scripts/block';

/** Склейки между кадрами. roll: плёнка протягивается, shutter: обтюратор, wipe: шторка со световой кромкой,
 *  flash: засветка, cut: жёсткая склейка (флипбук мышью). */
type Cut = 'roll' | 'shutter' | 'wipe' | 'flash' | 'cut';
const AUTO: Cut[] = ['roll', 'shutter', 'wipe', 'flash'];
const HOLD = 3.4; // сколько кадр стоит на экране при автопоказе, с
const GAP = 14; // межкадровый промежуток плёнки, px

/**
 * Работы: кинопроектор. При входе плёнка заправляется и бежит, ракорд отсчитывает 3-2-1, лампа мигает,
 * объектив наводит резкость, название встаёт по строкам. Дальше кадры сменяются сами разными склейками;
 * мышью по кадру они листаются как флипбук, пальцем свайпом, кнопками под кадром напрямую.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const reel = q<HTMLElement>('[data-works-reel]')[0];
  if (!reel) return;
  const gate = q<HTMLElement>('[data-works-gate]')[0];
  const frame = q<HTMLAnchorElement>('[data-works-media]')[0];
  const stills = q<HTMLImageElement>('[data-works-still]');
  const caps = q<HTMLElement>('[data-works-caption]');
  const capsBox = q<HTMLElement>('[data-works-captions]')[0];
  const btns = q<HTMLButtonElement>('[data-works-btn]');
  const fills = q<HTMLElement>('[data-works-fill]');
  const num = q<HTMLElement>('[data-works-num]')[0];
  const perfs = q<HTMLElement>('[data-works-perf]');
  const blades = q<HTMLElement>('[data-works-blade]');
  const bar = q<HTMLElement>('[data-works-bar]')[0];
  const leak = q<HTMLElement>('[data-works-leak]')[0];
  const flash = q<HTMLElement>('[data-works-flash]')[0];
  const glow = q<HTMLElement>('[data-works-glow]')[0];
  const leader = q<HTMLElement>('[data-works-leader]')[0];
  const leaderNum = q<HTMLElement>('[data-works-leader-num]')[0];
  const sweep = q<HTMLElement>('[data-works-sweep]')[0];
  const track = q<HTMLElement>('[data-works-track]')[0];
  const n = stills.length;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // кадры грузятся заранее, чтобы флипбук не ждал сеть
  stills.forEach((img) => { img.loading = 'eager'; });

  /* ---------- перфорация ---------- */
  const film = { x: 0 };
  let pitch = 0; // шаг перфорации = высота полосы
  addEventListener('resize', () => { pitch = 0; }, { passive: true });
  const drawPerf = () => {
    const p = pitch || (pitch = perfs[0]?.offsetHeight || 20);
    const x = (((film.x % p) + p) % p) - p;
    perfs.forEach((el) => { el.style.transform = `translate3d(${x}px,0,0)`; });
  };
  const advance = (dir: number) => film.x - (frame.clientWidth + GAP) * dir;

  /* ---------- состояние ---------- */
  let cur = 0;
  let live = false; // вход отыграл, можно листать
  let hover = false, focus = false;
  let busy: gsap.core.Timeline | null = null;
  let hold: gsap.core.Tween | null = null;
  let entry: gsap.core.Timeline | null = null;
  let autoIdx = 0;

  const normalize = () => {
    stills.forEach((im, k) => {
      gsap.set(im, { clearProps: 'transform,clipPath,filter,zIndex' });
      gsap.set(im, { autoAlpha: k === cur ? 1 : 0, zIndex: k === cur ? 1 : 0 });
    });
    gsap.set(blades, { scaleY: 0 });
    gsap.set([bar, leak, flash], { opacity: 0 });
  };
  const mark = (i: number) => {
    stills.forEach((im, k) => { im.classList.toggle('is-active', k === i); if (k === i) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true'); });
    caps.forEach((c, k) => { c.classList.toggle('is-active', k === i); if (k === i) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true'); });
    btns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-current', String(k === i)); });
    fills.forEach((f, k) => gsap.set(f, { scaleX: k < i ? 1 : 0, overwrite: true }));
  };
  const swapCaption = (from: number, to: number) => {
    gsap.to(caps[from], { autoAlpha: 0, y: -8, duration: 0.18, ease: 'power2.in', overwrite: true });
    gsap.fromTo(caps[to], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.14, ease: 'expo.out', overwrite: true });
  };
  const rollNum = (to: number, dir: number) => {
    gsap.timeline()
      .to(num, { yPercent: -110 * dir, duration: 0.16, ease: 'power2.in', overwrite: true })
      .add(() => { num.textContent = nn(to + 1); })
      .fromTo(num, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.45, ease: 'expo.out' });
  };
  const pulseGlow = () => gsap.fromTo(glow, { opacity: 0.55 }, { opacity: 1, duration: 0.7, ease: 'power2.out', overwrite: true });

  /* ---------- склейки ---------- */
  const go = (target: number, kind: Cut, dir = 1) => {
    const to = ((target % n) + n) % n;
    if (to === cur || n < 2) return;
    busy?.progress(1);
    const a = stills[cur], b = stills[to];
    const from = cur;
    cur = to;
    mark(to);
    swapCaption(from, to);
    rollNum(to, dir);
    pulseGlow();
    const W = frame.clientWidth;
    const tl = gsap.timeline({ onComplete: () => { busy = null; normalize(); } });
    busy = tl;
    gsap.set(a, { zIndex: 1 });
    if (kind === 'roll') {
      // плёнка протягивается на кадр: старый уезжает, новый въезжает, перфорация идёт вместе с ними
      // если кадр уже тянули пальцем, новый встаёт вплотную к нему, промежуток не прыгает
      const ax = Number(gsap.getProperty(a, 'x')) || 0;
      gsap.set(b, { autoAlpha: 1, zIndex: 2, x: ax, xPercent: (100 + (GAP / W) * 100) * dir });
      tl.to(a, { xPercent: -(100 + (GAP / W) * 100) * dir, x: 0, duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(b, { xPercent: 0, x: 0, duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(film, { x: advance(dir), duration: 0.8, ease: 'expo.inOut', onUpdate: drawPerf }, 0);
    } else if (kind === 'shutter') {
      // обтюратор закрывается, плёнку дёргает грейфер, обтюратор открывается со вспышкой лампы
      tl.to(blades, { scaleY: 1, duration: 0.2, ease: 'power3.in' }, 0)
        .to(film, { x: advance(dir), duration: 0.26, ease: 'power2.inOut', onUpdate: drawPerf }, 0.06)
        .add(() => { gsap.set(a, { autoAlpha: 0 }); gsap.set(b, { autoAlpha: 1, zIndex: 2 }); }, 0.2)
        .to(blades, { scaleY: 0, duration: 0.45, ease: 'power3.out' }, 0.3)
        .fromTo(flash, { opacity: 0.4 }, { opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 0.3);
    } else if (kind === 'wipe') {
      // шторка со световой кромкой, старый кадр чуть уходит в сторону
      gsap.set(b, { autoAlpha: 1, zIndex: 2, clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' });
      tl.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'expo.inOut' }, 0)
        .to(a, { xPercent: -7 * dir, duration: 0.85, ease: 'expo.inOut' }, 0)
        .fromTo(bar, { x: dir > 0 ? W : 0, opacity: 1 }, { x: dir > 0 ? 0 : W, duration: 0.85, ease: 'expo.inOut' }, 0)
        .to(bar, { opacity: 0, duration: 0.2 }, 0.68)
        .to(film, { x: advance(dir), duration: 0.85, ease: 'expo.inOut', onUpdate: drawPerf }, 0);
    } else if (kind === 'flash') {
      // засветка: пятно света проходит по кадру, новый кадр проявляется из пересвета
      tl.fromTo(leak, { xPercent: -45 * dir, opacity: 0 }, { xPercent: 45 * dir, duration: 0.9, ease: 'power2.inOut' }, 0)
        .to(leak, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .to(leak, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.45)
        .fromTo(b, { autoAlpha: 0, zIndex: 2, filter: 'brightness(2.2) contrast(.85)' }, { autoAlpha: 1, filter: 'brightness(1) contrast(1)', duration: 0.65, ease: 'power2.out' }, 0.2)
        .set(a, { autoAlpha: 0 }, 0.5)
        .to(film, { x: advance(dir), duration: 0.9, ease: 'power3.inOut', onUpdate: drawPerf }, 0);
    } else {
      // жёсткая склейка: кадр меняется сразу, короткий блик и рывок плёнки
      gsap.set(a, { autoAlpha: 0 });
      gsap.set(b, { autoAlpha: 1, zIndex: 2 });
      tl.fromTo(flash, { opacity: 0.22 }, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0)
        .to(film, { x: advance(dir), duration: 0.35, ease: 'power3.out', onUpdate: drawPerf }, 0);
    }
  };

  /* ---------- автопоказ ---------- */
  const paused = () => !live || hover || focus;
  const startHold = () => {
    hold?.kill();
    if (!live) return;
    hold = gsap.fromTo(fills[cur], { scaleX: 0 }, {
      scaleX: 1, duration: HOLD, ease: 'none',
      onComplete: () => { go(cur + 1, AUTO[autoIdx++ % AUTO.length], 1); startHold(); },
    });
    if (paused()) hold.pause();
  };
  const sync = () => { if (hold) { if (paused()) hold.pause(); else hold.resume(); } };
  const user = (to: number, kind: Cut, dir: number) => {
    if (!live) return;
    capsBox.setAttribute('aria-live', 'polite');
    go(to, kind, dir);
    startHold();
  };

  // наведение и фокус ставят показ на паузу
  reel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  reel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  reel.addEventListener('focusin', () => { focus = true; sync(); });
  reel.addEventListener('focusout', (e) => { if (!reel.contains(e.relatedTarget as Node)) { focus = false; sync(); } });

  // кнопки под кадром
  btns.forEach((b, i) => b.addEventListener('click', () => user(i, 'wipe', i > cur ? 1 : -1)));
  reel.addEventListener('keydown', (e) => {
    if (!(e.target as HTMLElement).closest('[data-works-btn]')) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    user(cur + dir, 'roll', dir);
    btns[cur]?.focus();
  });

  // мышь: позиция по горизонтали выбирает кадр, как в флипбуке
  gate.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !live || !fine.matches) return;
    const r = frame.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    if (i !== cur) { capsBox.setAttribute('aria-live', 'polite'); go(i, 'cut', i > cur ? 1 : -1); hold?.kill(); hold = null; }
  });
  gate.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && live && !hold) startHold(); });

  // тачпад: горизонтальный жест по кадру листает плёнку
  let lastWheel = 0;
  gate.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 6) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 650) { lastWheel = now; return; }
    lastWheel = now;
    const dir = e.deltaX > 0 ? 1 : -1;
    user(cur + dir, 'roll', dir);
  }, { passive: false });

  // палец: плёнка тянется за свайпом, отпустил дальше порога, кадр протягивается
  let sx = 0, sy = 0, base = 0, drag = false, swiped = false, pid = -1;
  gate.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !live) return;
    sx = e.clientX; sy = e.clientY; base = film.x; drag = true; swiped = false; pid = e.pointerId;
  });
  gate.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== pid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < Math.abs(dy)) return;
    film.x = base + dx; drawPerf();
    gsap.set(stills[cur], { x: dx * 0.25 });
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== pid) return;
    drag = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (e.type === 'pointerup' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped = true;
      const dir = dx < 0 ? 1 : -1;
      user(cur + dir, 'roll', dir);
    } else {
      gsap.to(stills[cur], { x: 0, duration: 0.5, ease: 'expo.out' });
      gsap.to(film, { x: base, duration: 0.5, ease: 'expo.out', onUpdate: drawPerf });
    }
  };
  gate.addEventListener('pointerup', endDrag);
  gate.addEventListener('pointercancel', endDrag);
  frame.addEventListener('click', (e) => { if (swiped) { e.preventDefault(); swiped = false; } });

  /* ---------- бегущая строка: копий столько, чтобы лента всегда закрывала ширину ---------- */
  const fillTicker = () => {
    if (!track) return;
    const halves = [...track.children] as HTMLElement[];
    const first = halves[0];
    if (!first) return;
    let guard = 0;
    while (first.offsetWidth < root.clientWidth + 40 && guard++ < 12) {
      halves.forEach((h) => h.append(h.firstElementChild!.cloneNode(true)));
    }
    track.style.setProperty('--tick-dur', `${Math.max(18, first.offsetWidth / 55)}s`);
  };
  fillTicker();
  document.fonts?.ready.then(fillTicker);
  addEventListener('resize', fillTicker, { passive: true });

  /* ---------- вход ---------- */
  const title = splitChars(q('[data-works-title]')[0], { stagger: 0.035, duration: 0.9 });
  const name = splitLines(q('[data-works-name]')[0], { yPercent: 105, scaleY: 1.6, transformOrigin: '50% 100%', stagger: 0.13, duration: 1.15 });
  const tag = splitLines(q('[data-works-tag]')[0], { stagger: 0.07 });
  const credits = rise(q('[data-works-credits] dt, [data-works-credits] dd'), { y: 14, stagger: 0.04, duration: 0.7 });
  const ticket = wrap(gsap.timeline({ paused: true })
    .fromTo(q('[data-works-ticket]'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0)
    .fromTo(q('[data-works-stub]'), { rotate: 28, yPercent: -40, opacity: 0 }, { rotate: 0, yPercent: 0, opacity: 1, duration: 1, ease: 'elastic.out(1, 0.55)', clearProps: 'transform,opacity' }, 0.45));
  const cap = rise(q('.works__counter, [data-works-captions], [data-works-seg]'), { y: 12, stagger: 0.07, duration: 0.7 });
  const ticker = wrap(gsap.fromTo(q('[data-works-tickin]'), { yPercent: 120 }, { yPercent: 0, duration: 1, ease: 'expo.out', paused: true }));

  // до входа: плёнка не заправлена, в окне ракорд, кадр погашен
  const prime = () => {
    entry?.kill(); entry = null;
    busy?.kill(); busy = null;
    hold?.kill(); hold = null;
    live = false;
    cur = 0; autoIdx = 0;
    film.x = 0; drawPerf();
    num.textContent = nn(1);
    gsap.set(num, { yPercent: 0 });
    mark(0);
    gsap.set(fills, { scaleX: 0 });
    gsap.set(caps, { autoAlpha: (k: number) => (k === 0 ? 1 : 0), y: 0 });
    capsBox.setAttribute('aria-live', 'off');
    normalize();
    gsap.set(stills[0], { autoAlpha: 0 });
    gsap.set(gate, { clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set(leader, { autoAlpha: 1 });
    gsap.set(glow, { opacity: 0 });
    leaderNum.textContent = '3';
  };

  const gateIn = () => {
    const W = frame.clientWidth || 600;
    const tl = gsap.timeline({ onComplete: () => { entry = null; } });
    // плёнку заправляют слева направо, она бежит и тормозит
    tl.fromTo(gate, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
      .fromTo(film, { x: W * 2.6 }, { x: 0, duration: 1.8, ease: 'power3.out', onUpdate: drawPerf }, 0);
    // ракорд: 3, 2, 1, стрелка обегает круг
    [3, 2, 1].forEach((k, j) => {
      const at = 0.3 + j * 0.28;
      tl.add(() => { leaderNum.textContent = String(k); }, at)
        .fromTo(sweep, { '--a': '0deg' }, { '--a': '360deg', duration: 0.28, ease: 'none' }, at)
        .fromTo(leaderNum, { scale: 1.3, opacity: 0.35 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power3.out', immediateRender: !j }, at);
    });
    // лампа загорается с миганием, объектив наводит резкость
    const on = 1.14;
    tl.set(leader, { autoAlpha: 0 }, on)
      .set(stills[0], { visibility: 'inherit' }, on)
      .to(stills[0], { keyframes: { opacity: [0, 0.9, 0.15, 0.75, 0.3, 1], easeEach: 'steps(1)' }, duration: 0.5, ease: 'none' }, on)
      .to(glow, { keyframes: { opacity: [0, 0.9, 0.2, 0.8, 0.35, 1], easeEach: 'steps(1)' }, duration: 0.5, ease: 'none' }, on)
      .fromTo(stills[0], { filter: 'blur(10px) brightness(1.5)', scale: 1.08 }, { filter: 'blur(0px) brightness(1)', scale: 1, duration: 1.3, ease: 'expo.out', clearProps: 'filter,transform' }, on)
      .add(() => { live = true; startHold(); }, on + 0.55);
    return tl;
  };

  prime();

  watchBlock(root, () => {
    prime();
    entry = gateIn();
    title.play(0);
    name.play(0.35);
    tag.play(0.65);
    credits.play(0.8);
    ticket.play(0.9);
    ticker.play(0.9);
    cap.play(1.2);
  }, () => {
    [title, name, tag, credits, ticket, cap, ticker].forEach((p) => p.reset());
    prime();
  });
}
