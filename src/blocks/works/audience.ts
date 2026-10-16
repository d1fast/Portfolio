import { gsap } from 'gsap';

/**
 * Зрители. Покачиваются сами (CSS), а здесь привычки отдельных людей: попкорн ко рту, шёпот соседу,
 * поворот головы, ребёнок ёрзает, пара склоняется друг к другу. На смену кадра несколько голов
 * чуть вздрагивают, а под мышью ближние головы поворачиваются к курсору.
 */
type Person = { el: HTMLElement; act: HTMLElement; head: SVGSVGElement; kind: string; cx: number; cy: number; vis: boolean; turn: gsap.QuickToFunc; shift: gsap.QuickToFunc };

export interface Audience { start(): void; stop(): void; react(): void; measure(): void }

const rnd = gsap.utils.random;

export function createAudience(root: HTMLElement): Audience {
  const people: Person[] = [...root.querySelectorAll<HTMLElement>('[data-works-p]')].map((el) => {
    const head = el.querySelector<SVGSVGElement>('.works__head')!;
    return {
      el, head, act: el.querySelector<HTMLElement>('[data-works-act]')!, kind: el.dataset.act || '', cx: 0, cy: 0, vis: false,
      turn: gsap.quickTo(head, 'rotation', { duration: 0.9, ease: 'power3.out' }),
      shift: gsap.quickTo(head, 'x', { duration: 0.9, ease: 'power3.out' }),
    };
  });
  const by = (k: string) => people.filter((p) => p.kind === k);
  // шептун поворачивается вправо, к соседу: нос рисуем с другой стороны
  by('whisper').forEach((p) => p.el.querySelector('[data-works-nose]')?.setAttribute('transform', 'matrix(-1 0 0 1 100 0)'));

  const loops: gsap.core.Timeline[] = [];
  let reacts: gsap.core.Tween[] = [];
  const loop = (build: (tl: gsap.core.Timeline) => void, every: [number, number]) => {
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: rnd(every[0], every[1]), delay: rnd(0.5, every[0]) });
    build(tl);
    loops.push(tl);
  };

  // попкорн: рука поднимается к лицу, голова чуть кивает, жуёт
  by('popcorn').forEach((p) => {
    const arm = p.el.querySelector('[data-works-arm]');
    if (!arm) return;
    loop((tl) => tl
      .to(arm, { y: 0, rotation: -6, svgOrigin: '82 100', duration: 0.45, ease: 'power2.out' })
      .to(p.act, { rotation: -3, y: '-2%', duration: 0.3, ease: 'sine.inOut' }, 0.25)
      .to(p.act, { keyframes: { y: ['-2%', '-0.5%', '-2%', '-0.5%', '-1.5%'] }, duration: 0.9, ease: 'none' }, 0.6)
      .to(arm, { y: 46, rotation: 0, duration: 0.55, ease: 'power2.in' }, 0.8)
      .to(p.act, { rotation: 0, y: 0, duration: 0.6, ease: 'sine.inOut' }, 1.5), [2.6, 4.2]);
  });
  // шёпот: шептун склоняется к соседу, сосед наклоняет голову навстречу
  const whisper = by('whisper')[0], listen = by('listen')[0];
  if (whisper && listen) {
    const nose = whisper.el.querySelector('[data-works-nose]');
    loop((tl) => tl
      .to(whisper.act, { rotation: 11, x: '14%', y: '3%', duration: 0.7, ease: 'power2.inOut' })
      .to(nose, { opacity: 1, duration: 0.3 }, 0.3)
      .to(listen.act, { rotation: -6, x: '-5%', duration: 0.6, ease: 'power2.inOut' }, 0.35)
      .to(whisper.act, { keyframes: { y: ['3%', '2%', '3%', '2%', '3%'] }, duration: 1.3, ease: 'none' }, 0.8)
      .to(listen.act, { rotation: -2, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.9)
      .to(nose, { opacity: 0, duration: 0.3 }, 2.2)
      .to([whisper.act, listen.act], { rotation: 0, x: 0, y: 0, duration: 0.8, ease: 'power2.inOut' }, 2.3), [5, 8]);
  }
  // поворот головы: оглядывается на соседа, виден профиль
  by('turn').forEach((p) => {
    const nose = p.el.querySelector('[data-works-nose]');
    loop((tl) => tl
      .to(p.act, { rotation: -7, x: '-6%', scaleX: 0.94, duration: 0.5, ease: 'power2.out' })
      .to(nose, { opacity: 1, duration: 0.25 }, 0.15)
      .to(p.act, { rotation: -5, duration: 1.2, ease: 'sine.inOut' }, 0.5)
      .to(nose, { opacity: 0, duration: 0.25 }, 1.7)
      .to(p.act, { rotation: 0, x: 0, scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 1.75), [4.5, 7]);
  });
  // ребёнок ёрзает и подпрыгивает в кресле
  by('kid').forEach((p) => {
    loop((tl) => tl
      .to(p.act, { y: '-12%', duration: 0.18, ease: 'power2.out' })
      .to(p.act, { y: 0, duration: 0.3, ease: 'bounce.out' })
      .to(p.act, { y: '-8%', rotation: 6, duration: 0.18, ease: 'power2.out' }, 0.6)
      .to(p.act, { y: 0, rotation: 0, duration: 0.35, ease: 'bounce.out' }, 0.78), [3.5, 6.5]);
  });
  // пара: одна голова ложится на плечо другой и возвращается
  const pair = by('lean-r')[0];
  if (pair) {
    loop((tl) => tl
      .to(pair.act, { rotation: 12, x: '10%', y: '7%', duration: 1.1, ease: 'sine.inOut' })
      .to(pair.act, { rotation: 0, x: 0, y: 0, duration: 1.1, ease: 'sine.inOut' }, 3.6), [6, 9]);
  }

  const measure = () => {
    const vw = innerWidth;
    people.forEach((p) => {
      const r = p.el.getBoundingClientRect();
      p.cx = r.left + r.width / 2; p.cy = r.top + r.height / 2;
      p.vis = r.width > 0 && r.right > 0 && r.left < vw && getComputedStyle(p.el).display !== 'none' && !!p.el.offsetParent;
    });
  };

  // голова тянется к курсору: ближние сильнее, дальние почти не замечают
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let raf = 0, mx = 0, my = 0;
  const look = () => {
    raf = 0;
    people.forEach((p) => {
      if (!p.vis) return;
      const dx = mx - p.cx, dy = my - p.cy;
      const near = Math.max(0, 1 - Math.hypot(dx * 0.7, dy) / 380);
      const a = Math.max(-1, Math.min(1, dx / 260)) * near;
      p.turn(a * 9);
      p.shift(a * 2.5);
    });
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(look);
  };
  const onLeave = () => people.forEach((p) => { p.turn(0); p.shift(0); });

  return {
    measure,
    start() {
      measure();
      loops.forEach((tl) => tl.restart(true));
      root.addEventListener('pointermove', onMove);
      root.addEventListener('pointerleave', onLeave);
    },
    stop() {
      loops.forEach((tl) => tl.pause(0));
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      // циклы привычек встают в начало сами (pause(0)), а вздрагивания на смену кадра просто гасим
      reacts.forEach((t) => t.kill());
      reacts = [];
      people.forEach((p) => { if (!p.kind) gsap.set(p.act, { clearProps: 'transform' }); p.turn(0, 0); p.shift(0, 0); });
    },
    // смена кадра: две-три головы вздрагивают, кто-то подаётся вперёд
    react() {
      const free = people.filter((p) => p.vis && !p.kind);
      reacts = reacts.filter((t) => t.isActive());
      gsap.utils.shuffle(free).slice(0, 3).forEach((p, i) => {
        reacts.push(gsap.fromTo(p.act, { y: 0, rotation: 0 }, {
          y: i % 2 ? '-5%' : '3%', rotation: rnd(-4, 4), duration: 0.3, delay: 0.08 + i * 0.12, ease: 'power2.out', yoyo: true, repeat: 1, repeatDelay: rnd(0.2, 0.7), overwrite: true,
        }));
      });
    },
  };
}
