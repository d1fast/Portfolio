import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Появление блоков при входе на экран. Срабатывает один раз, доигрывает само,
 * от скорости прокрутки не зависит. [data-reveal="lines"] режет текст на строки,
 * [data-reveal="up"] поднимает элемент целиком, [data-reveal="stagger"] детей по очереди.
 */
export function initReveal(root: ParentNode = document) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-reveal-bound)')];
  if (!items.length) return;
  if (reduced()) { items.forEach((el) => { el.classList.add('is-in', 'is-reveal-bound'); }); return; }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      play(e.target as HTMLElement);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  for (const el of items) { el.classList.add('is-reveal-bound'); io.observe(el); }
}

function play(el: HTMLElement) {
  const type = el.dataset.reveal || 'up';
  const delay = Number(el.dataset.revealDelay || 0);
  if (type === 'lines') {
    const split = new SplitText(el, { type: 'lines', linesClass: 'split-line', autoSplit: true, onSplit(self) {
      self.lines.forEach((line) => {
        const inner = document.createElement('span');
        inner.className = 'split-inner';
        inner.append(...line.childNodes);
        line.append(inner);
      });
      const inners = self.lines.map((l) => l.firstElementChild);
      el.classList.add('is-in');
      const n = inners.length;
      return gsap.fromTo(inners, { yPercent: 110 }, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: Math.min(0.07, 0.3 / Math.max(1, n - 1)), delay, clearProps: 'transform',
        onComplete: () => { split.revert(); } });
    } });
    return;
  }
  if (type === 'stagger') {
    const kids = [...el.children] as HTMLElement[];
    el.classList.add('is-in');
    if (!kids.length) return;
    gsap.fromTo(kids, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: Math.min(0.06, 0.35 / Math.max(1, kids.length - 1)), delay, clearProps: 'all' });
    return;
  }
  if (type === 'stamp') {
    el.classList.add('is-in');
    gsap.fromTo(el, { scale: 1.8, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.55, ease: 'back.out(2.2)', delay: delay + 0.35, clearProps: 'scale,opacity' });
    return;
  }
  if (type === 'scale') {
    el.classList.add('is-in');
    gsap.fromTo(el, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out', delay, clearProps: 'all' });
    return;
  }
  el.classList.add('is-in');
  gsap.fromTo(el, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay, clearProps: 'all' });
}
