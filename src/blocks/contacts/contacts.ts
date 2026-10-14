import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { watchBlock, splitChars, splitLines, rise, wrap } from '../../scripts/block';

gsap.registerPlugin(DrawSVGPlugin);

/**
 * Контакты: самолётик летит по петле через весь экран, за ним тянется хвост. Маршрут
 * строится под размер блока. Форма раскрывается как письмо, поля появляются по очереди.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const sky = q<SVGSVGElement>('[data-contacts-sky]')[0];
  const route = q<SVGPathElement>('[data-contacts-route]')[0];
  const trail = q<SVGPathElement>('[data-contacts-trail]')[0];
  const plane = q<SVGGElement>('[data-contacts-plane]')[0];
  const form = q<HTMLElement>('[data-contacts-form]')[0];
  let len = 0;
  const state = { p: 0 };

  const head = q<HTMLElement>('.contacts__head')[0];
  const linksEl = q<HTMLElement>('[data-contacts-links]')[0];

  // плавная кривая через точки (Catmull-Rom в кубические Безье)
  const smooth = (pts: [number, number][]) => {
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };

  // маршрут строится по реальной раскладке: самолётик облетает текст и ныряет за форму
  const build = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    sky.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const R = root.getBoundingClientRect();
    const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left - R.left, t: r.top - R.top, r: r.right - R.left, b: r.bottom - R.top, w: r.width, h: r.height }; };
    const H = rel(head), F = rel(form), L = rel(linksEl);
    let pts: [number, number][];
    if (F.t > H.b - 10) {
      // форма под текстом: петля в просвете между кнопками и формой
      const cy = (L.b + F.t) / 2, r = Math.min(26, (F.t - L.b) / 2 - 4), cx = w * 0.56;
      pts = [[-40, cy + r * 0.6], [cx - r * 2, cy + r * 0.7], [cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy], [cx + r * 0.4, cy + r * 0.9], [w * 0.86, cy + r * 0.3], [w + 40, cy - r * 0.2]];
    } else {
      // форма справа: снизу под кнопками, вверх по просвету между колонками, над формой и за неё
      const gx = (H.r + F.l) / 2;
      pts = [[-60, L.b + 70], [L.l + L.w * 0.45, L.b + 56], [gx - 10, L.b + 10], [gx, H.t + H.h * 0.45], [gx + 10, F.t - 46], [F.l + F.w * 0.45, F.t - 64], [F.r - 30, F.t + F.h * 0.35], [F.l + F.w * 0.25, F.b + 34], [w + 60, F.b - 10]];
    }
    const d = smooth(pts);
    route.setAttribute('d', d);
    trail.setAttribute('d', d);
    len = route.getTotalLength();
    draw();
  };
  const draw = () => {
    if (!len) return;
    const p = state.p;
    const at = route.getPointAtLength(p * len);
    const ahead = route.getPointAtLength(Math.min(len, p * len + 2));
    const back = route.getPointAtLength(Math.max(0, p * len - 2));
    const a = Math.atan2(ahead.y - back.y, ahead.x - back.x) * 180 / Math.PI;
    plane.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${a})`);
    gsap.set(trail, { drawSVG: `${Math.max(0, p - 0.16) * 100}% ${p * 100}%` });
  };
  build();
  addEventListener('resize', build, { passive: true });

  const flight = gsap.to(state, { p: 1, duration: 11, ease: 'none', repeat: -1, repeatDelay: 0.8, paused: true, onUpdate: draw });
  const routeIn = wrap(gsap.fromTo(route, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.8, ease: 'power2.inOut', paused: true }));

  const title = splitChars(q('[data-contacts-title]')[0], { stagger: 0.04, duration: 0.9, ease: 'back.out(1.6)' });
  const lead = splitLines(q('[data-contacts-lead]')[0]);
  const links = rise(q('[data-contacts-links] > *'), { y: 20, stagger: 0.1 });
  const envelope = wrap(gsap.timeline({ paused: true })
    .fromTo(form, { rotationX: -75, opacity: 0, transformPerspective: 1200 }, { rotationX: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0)
    .fromTo(form.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform' }, 0.35));
  const foot = rise(q('.site-footer'), { y: 0, duration: 0.8 });

  // отправленная форма: самолётик делает круг почёта быстрее обычного
  form.addEventListener('submit', () => { gsap.to(flight, { timeScale: 3, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 1.6 }); });

  watchBlock(root, () => {
    build();
    state.p = 0; draw();
    routeIn.play(0);
    flight.delay(0.6); flight.restart(true);
    title.play(0);
    lead.play(0.35);
    links.play(0.5);
    envelope.play(0.25);
    foot.play(0.9);
  }, () => {
    flight.pause(0);
    state.p = 0; draw();
    [routeIn, title, lead, links, envelope, foot].forEach((p) => p.reset());
  });
}
