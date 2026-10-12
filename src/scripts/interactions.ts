import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Магнитные кнопки: тянутся к курсору в радиусе, возвращаются пружиной. Только мышь. */
export function initMagnetic(root: ParentNode = document) {
  if (!fine() || reduced()) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-magnetic]:not(.is-bound)')) {
    el.classList.add('is-bound');
    const strength = Number(el.dataset.magnetic || 0.35);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    });
  }
}

/** Скрэмбл текста ссылок при наведении. Текст не меняет ширину: символы из того же набора. */
export function initScramble(root: ParentNode = document) {
  if (!fine() || reduced()) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-scramble]:not(.is-bound)')) {
    el.classList.add('is-bound');
    const text = el.textContent || '';
    const cyr = /[а-яё]/i.test(text);
    let tween: gsap.core.Tween | null = null;
    el.addEventListener('pointerenter', () => {
      tween?.kill();
      tween = gsap.to(el, { duration: 0.6, scrambleText: { text, chars: cyr ? 'абвгдежзиклмнопрстуфхцчшщэюя' : 'abcdefghijklmnopqrstuvwxyz', speed: 0.8, revealDelay: 0.1 } });
    });
  }
}

/**
 * Пункты списков оживают при наведении, а на телефоне, когда пункт в центре экрана.
 * Ставит класс is-active на один пункт за раз.
 */
export function initActiveItems(root: ParentNode = document) {
  const lists = root.querySelectorAll<HTMLElement>('[data-active-list]:not(.is-bound)');
  for (const list of lists) {
    list.classList.add('is-bound');
    const items = [...list.children] as HTMLElement[];
    const set = (el: HTMLElement | null) => items.forEach((i) => i.classList.toggle('is-active', i === el));
    if (fine()) {
      items.forEach((i) => {
        i.addEventListener('pointerenter', () => set(i));
        i.addEventListener('focusin', () => set(i));
      });
      list.addEventListener('pointerleave', () => set(null));
      list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget as Node)) set(null); });
    } else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) set(e.target as HTMLElement);
      }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
      items.forEach((i) => io.observe(i));
    }
  }
}

/** Бегущая строка: двигается через CSS, а здесь только ставится на паузу вне экрана. */
export function initMarquee(root: ParentNode = document) {
  const els = root.querySelectorAll<HTMLElement>('[data-marquee]:not(.is-bound)');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) (e.target as HTMLElement).classList.toggle('is-paused', !e.isIntersecting);
  });
  els.forEach((el) => { el.classList.add('is-bound'); io.observe(el); });
}

/** Почта копируется по клику. */
export function initCopy(root: ParentNode = document) {
  for (const btn of root.querySelectorAll<HTMLElement>('[data-copy]:not(.is-bound)')) {
    btn.classList.add('is-bound');
    const label = btn.querySelector<HTMLElement>('[data-copy-label]');
    const original = label?.textContent || '';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy!);
        if (label) { label.textContent = btn.dataset.copied || original; btn.classList.add('is-copied'); setTimeout(() => { label.textContent = original; btn.classList.remove('is-copied'); }, 1600); }
      } catch { location.href = `mailto:${btn.dataset.copy}`; }
    });
  }
}
