import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

type Line = { id: string; text: string };
type Brief = { brief: Line[]; typo: { line: number; wrong: string; right: string } };

const isPhone = () => innerWidth < 760;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Первый экран. Первый визит в сессии: бриф печатается и его строки становятся элементами.
 * Повторный визит: короткий выход листа (рамка, заголовок по буквам, размеры), без печати.
 * ?intro в адресе или клик по логотипу запускают полную версию заново.
 */
export function initHero(onDone?: (hero: HTMLElement) => void) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero || hero.classList.contains('is-bound')) return;
  hero.classList.add('is-bound');
  const data = JSON.parse(hero.querySelector('[data-brief]')?.textContent || 'null') as Brief | null;

  const logo = document.querySelector<HTMLElement>('[data-logo]');
  logo?.addEventListener('click', (e) => {
    if (!location.pathname.replace(/\/en\/?$/, '/').endsWith('/') || hero.classList.contains('is-intro')) return;
    if (scrollY > 10) return; // с середины страницы логотип просто ведёт наверх
    e.preventDefault();
    resetHero(hero);
    runFull(hero, data!, onDone);
  });

  if (!data) { finish(hero); onDone?.(hero); return; }
  runFull(hero, data, onDone);
}

function resetHero(hero: HTMLElement) {
  hero.classList.remove('is-done');
  gsap.set(hero.querySelectorAll('.hero-final, .hero-final *, .hero__object, .hero__scroll'), { clearProps: 'all' });
  hero.querySelectorAll('.dim, .sheet').forEach((el) => el.classList.remove('is-in'));
}

function measureDims(hero: HTMLElement) {
  const name = hero.querySelector('.hero__name') as HTMLElement;
  const final = hero.querySelector('.hero__final') as HTMLElement;
  const dh = hero.querySelector<HTMLElement>('[data-dim-h]'); const dv = hero.querySelector<HTMLElement>('[data-dim-v]');
  if (!name || !final || !dh || !dv) return { w: 0, h: 0 };
  const r = name.getBoundingClientRect(); const fr = final.getBoundingClientRect();
  const over = parseFloat(getComputedStyle(name).fontSize) * 0.13; // выносной элемент буквы Й выше строки
  dh.style.left = r.left - fr.left + 'px'; dh.style.width = r.width + 'px'; dh.style.top = r.top - fr.top - 24 - over + 'px';
  dv.style.top = r.top - fr.top - over + 'px'; dv.style.height = r.height + over + 'px'; dv.style.left = r.right - fr.left + 16 + 'px';
  return { w: Math.round(r.width), h: Math.round(r.height) };
}

function countDims(hero: HTMLElement, tl: gsap.core.Timeline, at: number) {
  const { w, h } = measureDims(hero);
  const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');
  const cw = hero.querySelector<HTMLElement>('[data-dim-w]'); const ch = hero.querySelector<HTMLElement>('[data-dim-hgt]');
  const o = { w: 0, h: 0 };
  tl.call(() => { hero.querySelector('[data-dim-h]')?.classList.add('is-in'); hero.querySelector('[data-dim-v]')?.classList.add('is-in'); }, [], at);
  tl.to(o, { w, h, duration: 0.9, ease: 'power2.out', onUpdate: () => { if (cw) cw.textContent = fmt(o.w); if (ch) ch.textContent = fmt(o.h); } }, at + 0.1);
  if (!hero.dataset.dimsBound) {
    hero.dataset.dimsBound = '1';
    addEventListener('resize', () => { const m = measureDims(hero); if (cw) cw.textContent = fmt(m.w); if (ch) ch.textContent = fmt(m.h); }, { passive: true });
  }
}

function finish(hero: HTMLElement) {
  document.documentElement.classList.remove('intro-pending');
  hero.classList.remove('is-intro', 'is-morphing');
  hero.classList.add('is-done');
  hero.querySelector('.hero__final')?.removeAttribute('inert');
  hero.querySelector('[data-sheet]')?.classList.add('is-in');
  gsap.set(hero.querySelectorAll('.hero-final, .hero-final *, .hero__object, .hero__scroll'), { clearProps: 'all' });
  const m = measureDims(hero);
  const cw = hero.querySelector<HTMLElement>('[data-dim-w]'); const ch = hero.querySelector<HTMLElement>('[data-dim-hgt]');
  if (cw) cw.textContent = m.w.toLocaleString('ru-RU'); if (ch) ch.textContent = m.h.toLocaleString('ru-RU');
  hero.querySelectorAll('.dim').forEach((el) => el.classList.add('is-in'));
  initNameFlex(hero);
  hero.dispatchEvent(new CustomEvent('hero:done'));
}

/* Полная версия: бриф печатается, строки превращаются в элементы. */
function runFull(hero: HTMLElement, data: Brief, onDone?: (hero: HTMLElement) => void) {
  const lines = isPhone() ? data.brief.filter((l) => l.id !== 'who') : data.brief;
  const linesRoot = hero.querySelector<HTMLElement>('[data-lines]')!;
  const skip = hero.querySelector<HTMLButtonElement>('[data-skip]');
  const sig = { stop: false };
  let tl: gsap.core.Timeline | null = null;
  hero.classList.add('is-intro');
  hero.classList.remove('is-done');
  // пока идёт вступление, невидимые ссылки не ловят фокус
  hero.querySelector('.hero__final')?.setAttribute('inert', '');
  document.documentElement.classList.remove('intro-pending');
  if (skip) { skip.hidden = false; skip.onclick = () => { sig.stop = true; tl?.kill(); finish(hero); onDone?.(hero); }; }

  document.fonts.ready.then(async () => {
    if (sig.stop) return;
    hero.querySelector('[data-sheet]')?.classList.add('is-in');
    await sleep(350);
    const els = await typeLines(linesRoot, lines, data.typo, isPhone() ? 110 : 95, sig);
    if (sig.stop) return;
    tl = morph(hero, els, () => { finish(hero); onDone?.(hero); });
  });
}

async function typeLines(root: HTMLElement, lines: Line[], typo: Brief['typo'], cps: number, sig: { stop: boolean }) {
  root.innerHTML = '';
  const els = lines.map((l) => {
    const div = document.createElement('div');
    div.className = 'brief-line';
    div.dataset.id = l.id;
    div.innerHTML = '<span class="brief-txt"></span>';
    root.appendChild(div);
    return div;
  });
  const delay = () => (1000 / cps) * (0.6 + Math.random() * 0.9);
  for (let i = 0; i < lines.length; i++) {
    const el = els[i];
    const txt = el.querySelector('.brief-txt') as HTMLElement;
    el.classList.add('is-active');
    els[i - 1]?.classList.remove('is-active');
    const target = lines[i].text;
    if (typo.line === i && target.startsWith(typo.right)) {
      for (const ch of typo.wrong) { if (sig.stop) return els; txt.textContent += ch; await sleep(delay()); }
      await sleep(240);
      // ошибка подчёркивается красным и стирается
      txt.innerHTML = `<span class="brief-err">${txt.textContent}</span>`;
      await sleep(260);
      const err = txt.querySelector('.brief-err') as HTMLElement;
      while (err.textContent!.length) { if (sig.stop) return els; err.textContent = err.textContent!.slice(0, -1); await sleep(14); }
      txt.textContent = '';
    }
    for (const ch of target) { if (sig.stop) return els; txt.textContent += ch; await sleep(ch === ' ' ? delay() * 0.5 : delay()); }
    await sleep(90);
  }
  els[els.length - 1].classList.remove('is-active');
  return els;
}

function morph(hero: HTMLElement, lineEls: HTMLElement[], onComplete: () => void) {
  const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete });
  hero.classList.add('is-morphing');
  let k = 0;
  for (const line of lineEls) {
    const id = line.dataset.id!;
    const target = hero.querySelector<HTMLElement>(`[data-target="${id}"]`);
    // строка без места на странице просто растворяется
    if (!target) { tl.to(line, { opacity: 0, y: -10, duration: 0.4, ease: 'power2.in' }, 0.1 + k * 0.07); continue; }
    let mover: HTMLElement = line;
    if (id === 'main') {
      const txt = line.querySelector('.brief-txt') as HTMLElement;
      const split = new SplitText(txt, { type: 'words' });
      const w = split.words.find((x) => /показ|show/i.test(x.textContent || '')) as HTMLElement | undefined;
      mover = w || line;
      tl.to(split.words.filter((x) => x !== mover), { opacity: 0, duration: 0.3 }, 0.1);
    }
    const at = 0.1 + k * 0.07;
    gsap.set(mover, { x: 0, y: 0, scale: 1, transformOrigin: '0 0', willChange: 'transform' });
    const mr = mover.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const scale = Math.min(3.2, Math.max(1, tr.height / mr.height));
    tl.to(mover, { x: tr.left - mr.left, y: tr.top - mr.top, scale, duration: 0.8 }, at);
    tl.to(mover, { opacity: 0, duration: 0.22, ease: 'power1.in' }, at + 0.55);
    if (id === 'name') {
      // имя собирается по буквам, навстречу летящей строке
      const words = target.querySelectorAll<HTMLElement>('[data-chars]');
      const chars: HTMLElement[] = [];
      words.forEach((w) => { const s = new SplitText(w, { type: 'chars', charsClass: 'char' }); chars.push(...(s.chars as HTMLElement[])); });
      tl.set(target, { opacity: 1 }, at + 0.35);
      tl.fromTo(chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.025, ease: 'expo.out' }, at + 0.4);
    } else {
      tl.fromTo(target, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }, at + 0.42);
    }
    k++;
  }
  countDims(hero, tl, 1.1);
  const rest = [...hero.querySelectorAll<HTMLElement>('.hero-final > *:not([data-target]):not(.dim), .hero__cta > *:not([data-target]), .hero__object, .hero__scroll')];
  tl.fromTo(rest, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0.9);
  hero.dispatchEvent(new CustomEvent('hero:morph', { detail: { tl } }));
  return tl;
}

/**
 * Возвращение на первый экран после других блоков: без печати заметок,
 * имя снова поднимается по буквам, размеры пересчитываются, остальное проявляется.
 */
export function heroReenter(hero: HTMLElement) {
  if (!hero.classList.contains('is-done')) return;
  let chars = [...hero.querySelectorAll<HTMLElement>('.hero__name .char')];
  if (!chars.length) {
    hero.querySelectorAll<HTMLElement>('[data-chars]').forEach((w) => { const s = new SplitText(w, { type: 'chars', charsClass: 'char' }); chars.push(...(s.chars as HTMLElement[])); });
  }
  const rest = [...hero.querySelectorAll<HTMLElement>('.hero__tag, .hero__cta > *, .hero__object')];
  hero.querySelectorAll('.dim').forEach((el) => el.classList.remove('is-in'));
  const tl = gsap.timeline();
  tl.fromTo(chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.03, ease: 'expo.out' }, 0.05);
  tl.fromTo(rest, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.35);
  countDims(hero, tl, 0.5);
}

/**
 * Живое имя: буквы истончаются под курсором (ось толщины шрифта Unbounded 200-900),
 * размерные линии сразу пересчитывают ширину. На тач-экранах по имени время от времени
 * пробегает волна толщины, пока первый экран открыт.
 */
function initNameFlex(hero: HTMLElement) {
  if (hero.dataset.flexBound) return;
  hero.dataset.flexBound = '1';
  const name = hero.querySelector<HTMLElement>('.hero__name');
  if (!name) return;
  let chars = [...name.querySelectorAll<HTMLElement>('.char')];
  if (!chars.length) {
    hero.querySelectorAll<HTMLElement>('[data-chars]').forEach((w) => { const s = new SplitText(w, { type: 'chars', charsClass: 'char' }); chars.push(...(s.chars as HTMLElement[])); });
  }
  const cw = hero.querySelector<HTMLElement>('[data-dim-w]'); const chh = hero.querySelector<HTMLElement>('[data-dim-hgt]');
  const MAX = 900, MIN = 220;
  const state = chars.map(() => ({ w: MAX }));
  let raf = 0;
  const render = () => {
    raf = 0;
    chars.forEach((c, i) => { c.style.fontVariationSettings = `'wght' ${Math.round(state[i].w)}`; });
    const m = measureDims(hero);
    if (cw) cw.textContent = m.w.toLocaleString('ru-RU');
    if (chh) chh.textContent = m.h.toLocaleString('ru-RU');
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(render); };
  const to = (i: number, w: number, d = 0.6, ease = 'power3.out', delay = 0) => gsap.to(state[i], { w, duration: d, ease, delay, overwrite: 'auto', onUpdate: queue });
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !hero.classList.contains('is-done')) return;
      const r = name.getBoundingClientRect();
      const reach = r.height * 1.05;
      chars.forEach((c, i) => {
        const b = c.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
        const k = Math.max(0, 1 - d / reach);
        to(i, MAX - (MAX - MIN) * k * k);
      });
    });
    hero.addEventListener('pointerleave', () => chars.forEach((_, i) => to(i, MAX, 1.2, 'elastic.out(1, 0.5)')));
  } else {
    // волна по буквам раз в несколько секунд, только пока первый экран на экране
    const wave = () => {
      if (!hero.classList.contains('is-current') && document.documentElement.classList.contains('stage-on')) return;
      chars.forEach((_, i) => {
        gsap.timeline({ delay: i * 0.05 })
          .to(state[i], { w: MIN + 80, duration: 0.45, ease: 'power2.out', onUpdate: queue })
          .to(state[i], { w: MAX, duration: 0.9, ease: 'elastic.out(1, 0.55)', onUpdate: queue });
      });
    };
    setInterval(wave, 5200);
    setTimeout(wave, 900);
  }
}
