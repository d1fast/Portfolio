import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { watchBlock, splitChars, rise, wrap, nn } from '../../scripts/block';

gsap.registerPlugin(DrawSVGPlugin, TextPlugin, ScrambleTextPlugin);

/**
 * Что делаю: меню из игры. Пункт выбирается наведением, тапом или стрелками, окно диалога
 * перепечатывает описание. Если ничего не трогать, меню само перебирает пункты.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const items = q<HTMLElement>('[data-services-item]');
  const btns = q<HTMLButtonElement>('[data-services-btn]');
  const names = items.map((i) => i.querySelector('.services__name')!.textContent || '');
  const texts = items.map((i) => i.querySelector('.services__desc')!.textContent || '');
  const band = q('[data-services-band]')[0];
  const marker = q('[data-services-marker]')[0];
  const menu = q<HTMLElement>('[data-services-menu]')[0];
  const list = q<HTMLElement>('[data-services-list]')[0];
  const icons = q<HTMLElement>('.services__icon');
  const ghost = q('[data-services-ghost]')[0];
  const dname = q('[data-services-name]')[0];
  const dtext = q('[data-services-text]')[0];
  const count = q('[data-services-count]')[0];
  const dots = q<HTMLElement>('[data-services-dots] i');
  const cyr = /[а-яё]/i.test(names.join(''));
  let current = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hovering = false;
  let shown = false;

  // полоса и треугольник лежат в меню, пункты в списке со сдвигом 28px влево от края меню
  const place = (i: number, instant = false) => {
    const el = items[i];
    const b = { x: el.offsetLeft + list.offsetLeft, y: el.offsetTop + list.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    const m = { x: el.offsetLeft, y: el.offsetTop + list.offsetTop, height: el.offsetHeight };
    if (instant) { gsap.set(band, b); gsap.set(marker, m); return; }
    gsap.to(band, { ...b, duration: 0.45, ease: 'power3.out', overwrite: true });
    gsap.to(marker, { ...m, duration: 0.55, ease: 'back.out(2)', overwrite: true });
  };

  const typeText = (i: number, delay = 0) => {
    gsap.killTweensOf(dtext);
    gsap.set(dtext, { text: '' });
    gsap.to(dtext, { text: { value: texts[i], delimiter: '' }, duration: Math.min(1.3, 0.3 + texts[i].length * 0.012), ease: 'none', delay });
  };

  const select = (i: number, byUser = false) => {
    if (i === current && shown) return;
    const prev = current;
    current = (i + items.length) % items.length;
    items.forEach((el, k) => el.classList.toggle('is-active', k === current));
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === current ? 'true' : 'false'));
    dots.forEach((d, k) => d.classList.toggle('is-on', k === current));
    place(current);
    // окно диалога: иконка уходит, новая выпрыгивает; номер перелистывается; имя перемешивается; текст печатается
    gsap.to(icons[prev], { scale: 0.6, opacity: 0, rotation: -12, duration: 0.2, ease: 'power2.in', overwrite: true, onComplete: () => icons[prev].classList.remove('is-on') });
    icons[current].classList.add('is-on');
    gsap.fromTo(icons[current], { scale: 0.5, opacity: 0, rotation: 12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)', delay: 0.15, overwrite: true });
    gsap.fromTo(ghost, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true, onStart: () => { ghost.textContent = nn(current + 1); } });
    count.textContent = nn(current + 1);
    gsap.to(dname, { duration: 0.5, scrambleText: { text: names[current], chars: cyr ? 'абвгдежзиклмнопрстуфхцчшщэюя' : 'abcdefghijklmnopqrstuvwxyz', speed: 0.7, revealDelay: 0.05 }, overwrite: true });
    typeText(current, 0.1);
    if (byUser) arm(7000); else arm();
  };

  const arm = (ms = 3800) => { clearTimeout(timer); timer = setTimeout(() => { if (!hovering && root.classList.contains('is-in')) select(current + 1); else arm(); }, ms); };

  btns.forEach((b, i) => {
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(i, true); });
    b.addEventListener('focus', () => select(i, true));
    b.addEventListener('click', () => select(i, true));
  });
  menu.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  menu.addEventListener('pointerleave', () => { hovering = false; arm(); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); btns[(current + 1) % btns.length].focus(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); btns[(current - 1 + btns.length) % btns.length].focus(); }
  });
  addEventListener('resize', () => place(current, true), { passive: true });

  // вход: заголовок по буквам, пункты выезжают слева по очереди, рамка окна рисуется, текст печатается
  const title = splitChars(q('[data-services-title]')[0], { stagger: { each: 0.035, from: 'random' }, duration: 0.7 });
  const listIn = rise(items, { x: -24, y: 0, stagger: 0.06, duration: 0.6 });
  const cursor = wrap(gsap.timeline({ paused: true })
    .fromTo([band, marker], { opacity: 0, x: -30 }, { opacity: 1, x: (i) => (i === 0 ? list.offsetLeft : 0), duration: 0.5, ease: 'expo.out' })
    .fromTo(q('[data-services-frame]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }, 0)
    .fromTo(q('[data-services-dialog] > :not(svg)'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.1 }, 0.3));

  watchBlock(root, () => {
    shown = true;
    current = 0;
    items.forEach((el, k) => el.classList.toggle('is-active', k === 0));
    icons.forEach((ic, k) => { ic.classList.toggle('is-on', k === 0); gsap.set(ic, { clearProps: 'all' }); });
    dots.forEach((d, k) => d.classList.toggle('is-on', k === 0));
    gsap.killTweensOf([dname, dtext]);
    ghost.textContent = '01'; count.textContent = '01'; dname.textContent = names[0]; dtext.textContent = '';
    place(0, true);
    title.play(0);
    listIn.play(0.2);
    cursor.play(0.4);
    typeText(0, 0.9);
    arm(4600);
  }, () => {
    shown = false;
    clearTimeout(timer);
    [title, listIn, cursor].forEach((p) => p.reset());
  });
}
