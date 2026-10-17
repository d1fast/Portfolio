import { gsap } from 'gsap';
import type { Field } from './glyphs';

/**
 * Первый экран. Имя собирается из роя знаков (glyphs.ts): на первом входе из облака по всему экрану,
 * при возвращении знаки слетаются из-за краёв. Когда буквы встали, по имени проходит волна.
 * Курсор расталкивает знаки, клик или тап по пустому месту пускает волну, на телефоне имя само
 * время от времени вздрагивает. Подпись и кнопки поднимаются по строкам после сборки.
 * Без WebGL заголовок остаётся обычным текстом.
 */
export function initHero(onDone?: (hero: HTMLElement) => void) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero || hero.classList.contains('is-bound')) return;
  hero.classList.add('is-bound');
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-gl]');
  const lines = [...hero.querySelectorAll<HTMLElement>('[data-hero-line]')];
  const tag = hero.querySelector<HTMLElement>('[data-hero-tag]');
  const cta = [...hero.querySelectorAll<HTMLElement>('[data-hero-cta] > *')];
  let field: Field | null = null;
  let firstShown = false;

  // подпись поднимается целиком и проявляется, кнопки следом. Без разбивки на строки: так неразрывные пробелы
  // («и\u00a0интерфейсы») остаются, и предлог не висит в конце строки
  const tagTween = tag ? gsap.fromTo(tag, { y: 26, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' }, { y: 0, opacity: 1, clipPath: 'inset(-10% -2% -20% -2%)', duration: 1, ease: 'expo.out', paused: true }) : null;
  const showText = (delay: number) => {
    tagTween?.delay(delay).restart(true);
    gsap.fromTo(cta, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08, delay: delay + 0.2, overwrite: true });
  };
  const hideText = () => { tagTween?.pause(0); gsap.set(cta, { opacity: 0, y: 24 }); };

  const flat = () => { hero.classList.add('is-flat'); hero.classList.remove('is-gl'); if (!firstShown) { firstShown = true; showText(0.1); } onDone?.(hero); };

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const fontReady = document.fonts?.ready ?? Promise.resolve();
  hideText();

  fontReady.then(async () => {
    if (!canvas) return flat();
    let mod: typeof import('./glyphs');
    try { mod = await import('./glyphs'); } catch { return flat(); }
    const cs = getComputedStyle(hero);
    try {
      field = mod.createField({ canvas, root: hero, color: cs.getPropertyValue('--fg').trim() || '#F3F0E8', hot: cs.getPropertyValue('--accent').trim() || '#FF6A3D', monoFont: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace' });
    } catch { return flat(); }
    const f = field;
    hero.classList.add('is-gl');
    // шаг сетки знаков от кегля имени: мельче на телефоне, но знаков не больше, чем потянет устройство
    const stepFor = () => { const fs = parseFloat(getComputedStyle(lines[0]).fontSize) || 120; return Math.max(3, Math.min(6.4, fs / (isTouch ? 19 : 30))); };
    const targets = () => { const s = stepFor(); return { pts: mod.sampleText(lines, hero, s), s }; };
    const tg = targets();
    f.build(tg.pts, tg.s);
    f.onAssembled(() => {
      // буквы встали: под знаками проступает бледная заливка, имя читается чётко и после разлёта
      hero.classList.add('is-assembled');
      const c = centerOf();
      f.burst(c.x, c.y, isTouch ? 160 : 240, true);
    });
    // открыли сразу другой блок (ссылка с якорем): рой не крутится впустую, имя соберётся при входе
    const stage = document.documentElement.classList.contains('stage-on');
    if (!stage || hero.classList.contains('is-current')) { f.assemble({ inward: false, spread: 1, lead: 0.2 }); showText(1.25); }
    firstShown = true;
    onDone?.(hero);

    // смена размера: знаки перелетают на новые места
    let rt = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        f.resize(); const t2 = targets(); f.retarget(t2.pts, t2.s);
        // рой оживает, только если первый экран сейчас открыт: иначе он крутился бы впустую под другими блоками
        if (!document.documentElement.classList.contains('stage-on') || hero.classList.contains('is-current')) f.start();
      }, 160);
    }, { passive: true });

    // курсор и палец
    const local = (e: PointerEvent) => { const r = hero.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height }; };
    let downAt = { x: 0, y: 0, t: 0 }, lastTouch = 0;
    hero.addEventListener('pointermove', (e) => {
      const p = local(e);
      f.pointer(p.x, p.y, true, e.pointerType === 'mouse' ? 120 : 90);
      if (e.pointerType === 'mouse') f.parallax((p.x / p.W - 0.5) * -60, (p.y / p.H - 0.5) * -40);
      else lastTouch = performance.now();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { f.pointer(-1e4, -1e4, false); f.parallax(0, 0); });
    hero.addEventListener('pointerdown', (e) => { const p = local(e); downAt = { x: p.x, y: p.y, t: performance.now() }; });
    hero.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') f.pointer(-1e4, -1e4, false);
      if ((e.target as Element).closest('a, button')) return;
      const p = local(e);
      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < 10 && performance.now() - downAt.t < 450) f.burst(p.x, p.y, 620, true);
    });

    // на телефоне имя само вздрагивает, если его давно не трогали
    if (isTouch) {
      setInterval(() => {
        if (!hero.classList.contains('is-current') && document.documentElement.classList.contains('stage-on')) return;
        if (performance.now() - lastTouch < 4000) return;
        const c = centerOf();
        f.burst(c.x + (Math.random() - 0.5) * c.w * 0.8, c.y + (Math.random() - 0.5) * c.h * 0.6, 200, true);
      }, 5200);
    }

    // рендер идёт, только пока первый экран открыт
    hero.addEventListener('block:leave', () => f.stop());
    if (!document.documentElement.classList.contains('stage-on')) {
      new IntersectionObserver(([en]) => { if (en.isIntersecting) f.start(); else f.stop(); }).observe(hero);
    }
  });

  function centerOf() {
    const r = hero!.getBoundingClientRect();
    const a = lines[0].getBoundingClientRect(), b = lines[lines.length - 1].getBoundingClientRect();
    const l = Math.min(a.left, b.left), rt = Math.max(a.right, b.right), t = a.top, bt = b.bottom;
    return { x: (l + rt) / 2 - r.left, y: (t + bt) / 2 - r.top, w: rt - l, h: bt - t };
  }

  /** Возвращение на первый экран: знаки слетаются из-за краёв, подпись поднимается заново. */
  (hero as HTMLElement & { _reenter?: () => void })._reenter = () => {
    hideText();
    hero.classList.remove('is-assembled');
    if (field && hero.classList.contains('is-gl')) { field.start(); field.assemble({ inward: true, spread: 0.7, lead: 0.05 }); showText(0.9); }
    else showText(0.1);
  };
}

export function heroReenter(hero: HTMLElement) {
  (hero as HTMLElement & { _reenter?: () => void })._reenter?.();
}
