import { gsap } from 'gsap';
import { watchBlock, splitChars, rise, wrap } from '../../scripts/block';

/**
 * Как я работаю: каретка едет по рельсу от шага к шагу, под активным шагом заполняется полоса,
 * потом каретка едет дальше. Наведение, фокус или тап выбирают шаг и ставят автопрокрутку на паузу.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const steps = q<HTMLElement>('[data-process-step]');
  const btns = q<HTMLButtonElement>('[data-process-btn]');
  const bars = q<HTMLElement>('[data-process-bar]');
  const nodes = q<HTMLElement>('[data-process-node]');
  const rail = q<HTMLElement>('[data-process-rail]')[0];
  const cart = q<HTMLElement>('[data-process-cart]')[0];
  const fill = q<HTMLElement>('[data-process-fill]')[0];
  const big = q<HTMLElement>('[data-process-big]')[0];
  const list = q<HTMLElement>('[data-process-list]')[0];
  const DWELL = 4.2;
  let current = 0;
  let bar: gsap.core.Tween | undefined;
  let held = false;
  let start: gsap.core.Tween | undefined;

  const place = (i: number, instant = false) => {
    const node = nodes[i];
    if (!node || !rail.offsetWidth) return;
    const x = node.offsetLeft;
    const scale = Math.min(1, (x + node.offsetWidth / 2) / rail.offsetWidth);
    const d = instant ? 0 : 0.9;
    gsap.to(cart, { x, duration: d, ease: 'power3.inOut', overwrite: true });
    gsap.to(fill, { scaleX: scale, duration: d, ease: 'power3.inOut', overwrite: true });
    nodes.forEach((n, k) => {
      const on = k <= i;
      if (on && !n.classList.contains('is-past') && !instant) gsap.fromTo(n, { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', delay: d * 0.85 });
      n.classList.toggle('is-past', on);
    });
  };

  const select = (i: number, byUser = false) => {
    current = (i + steps.length) % steps.length;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === current));
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === current ? 'true' : 'false'));
    gsap.to(big, { yPercent: (-100 / steps.length) * current, duration: 0.8, ease: 'expo.inOut', overwrite: true });
    place(current);
    bar?.kill();
    bars.forEach((b, k) => gsap.set(b, { scaleX: k < current ? 1 : 0 }));
    bar = gsap.fromTo(bars[current], { scaleX: 0 }, { scaleX: 1, duration: DWELL, ease: 'none', delay: byUser ? 0.2 : 0.6, paused: held,
      onComplete: () => { if (root.classList.contains('is-in')) select(current + 1); } });
  };

  btns.forEach((b, i) => {
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && i !== current) select(i, true); });
    b.addEventListener('focus', () => { if (i !== current) select(i, true); });
    b.addEventListener('click', () => select(i, true));
  });
  list.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { held = true; bar?.pause(); } });
  list.addEventListener('pointerleave', () => { held = false; bar?.resume(); });
  addEventListener('resize', () => place(current, true), { passive: true });

  // вход: болты закручиваются, заголовок по буквам, рельс протягивается, узлы выскакивают, шаги поднимаются
  const title = splitChars(q('[data-process-title]')[0], { stagger: 0.03, yPercent: 0, y: 0, rotationX: -90, opacity: 0, transformOrigin: '50% 100%', transformPerspective: 400, duration: 0.7 });
  const bolts = wrap(gsap.fromTo(q('.process__bolts i'), { rotation: -270, scale: 0 }, { rotation: 0, scale: 1, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.08, paused: true }));
  const railIn = wrap(gsap.timeline({ paused: true })
    .fromTo(q('.process__line'), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.inOut' }, 0)
    .fromTo(nodes, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.1 }, 0.4)
    .fromTo(cart, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'bounce.out' }, 0.8));
  const stepsIn = rise(steps, { y: 36, stagger: 0.1, duration: 0.8 });
  const bigIn = wrap(gsap.fromTo(q('.process__big'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: 'expo.out', paused: true }));

  watchBlock(root, () => {
    held = false;
    current = 0;
    gsap.set(big, { yPercent: 0 });
    nodes.forEach((n) => n.classList.remove('is-past'));
    gsap.set(cart, { x: nodes[0]?.offsetLeft || 0 });
    gsap.set(fill, { scaleX: 0 });
    bolts.play(0);
    title.play(0.05);
    bigIn.play(0.3);
    railIn.play(0.2);
    stepsIn.play(0.35);
    start = gsap.delayedCall(1.2, () => { if (root.classList.contains('is-in')) select(0); });
  }, () => {
    bar?.kill();
    start?.kill();
    gsap.killTweensOf([cart, fill, big]);
    bars.forEach((b) => gsap.set(b, { scaleX: 0 }));
    [title, bolts, railIn, stepsIn, bigIn].forEach((p) => p.reset());
  });
}
