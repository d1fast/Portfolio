import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { watchBlock, splitChars, splitLines, rise, wrap } from '../../scripts/block';

gsap.registerPlugin(DrawSVGPlugin);

/** Обо мне: заголовок по буквам, рамка рисуется штрихом, фото открывается снизу, штамп прилетает, текст по строкам. */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const title = splitChars(q('[data-about-title]')[0], { stagger: 0.035 });
  const name = rise(q('[data-about-name] > *'), { y: 16, stagger: 0.1, duration: 0.7 });
  const paras = q<HTMLElement>('[data-about-p]').map((p) => splitLines(p, { stagger: 0.06, duration: 0.8 }));
  const facts = rise(q('[data-about-facts] li'), { y: 18, stagger: 0.08, duration: 0.6 });

  const frame = q('[data-about-frame]');
  const pic = q('[data-about-pic]');
  const ring = q('[data-about-ring]');
  const photo = wrap(gsap.timeline({ paused: true })
    .fromTo(frame, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut' }, 0)
    .fromTo(pic, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: 'expo.out' }, 0.25)
    .fromTo(pic[0].firstElementChild, { scale: 1.18 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.25)
    .fromTo(ring, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)' }, 0.95));

  watchBlock(root, () => {
    title.play(0);
    photo.play(0.1);
    name.play(0.35);
    paras.forEach((p, i) => p.play(0.5 + i * 0.16));
    facts.play(0.95);
  }, () => {
    [title, photo, name, ...paras, facts].forEach((p) => p.reset());
  });
}
