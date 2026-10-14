import { gsap } from 'gsap';
import { watchBlock, splitChars, splitLines, rise, wrap } from '../../scripts/block';

/** Работы: заголовок по буквам, экран открывается диафрагмой, уголки сходятся к нему, текст по строкам, лента выезжает. */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const title = splitChars(q('[data-works-title]')[0], { stagger: 0.04, duration: 0.9 });
  const count = rise(q('[data-works-count]'), { y: 12, duration: 0.6 });
  const names = q<HTMLElement>('[data-works-name]').map((el) => splitLines(el, { stagger: 0.1 }));
  const subs = q<HTMLElement>('[data-works-sub]').map((el) => splitLines(el, { stagger: 0.06 }));
  const rest = rise([...q('[data-works-stack] li'), ...q('[data-works-open]'), ...q('.work-card__idx')], { y: 16, stagger: 0.05, duration: 0.6 });
  const screens = q<HTMLElement>('[data-works-screen]').map((screen) => {
    const media = screen.querySelector('[data-works-media]')!;
    const corners = screen.querySelectorAll('.work-card__corner');
    const rec = screen.querySelector('.work-card__rec');
    return wrap(gsap.timeline({ paused: true })
      .fromTo(media, { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' }, 0)
      .fromTo(media.firstElementChild, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.3)
      .fromTo(corners, { x: (i) => (i % 2 ? 40 : -40), y: (i) => (i < 2 ? -40 : 40), opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05 }, 0.5)
      .fromTo(rec, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4 }, 1.1));
  });
  const ticker = wrap(gsap.fromTo(q('[data-works-track]'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', paused: true }));

  watchBlock(root, () => {
    title.play(0);
    count.play(0.3);
    screens.forEach((s) => s.play(0.15));
    names.forEach((n) => n.play(0.5));
    subs.forEach((s) => s.play(0.65));
    rest.play(0.8);
    ticker.play(0.9);
  }, () => {
    [title, count, ...screens, ...names, ...subs, rest, ticker].forEach((p) => p.reset());
  });
}
