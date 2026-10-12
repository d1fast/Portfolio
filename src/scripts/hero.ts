import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

type Line = { id: string; text: string };
type Brief = { brief: Line[]; typo: { line: number; wrong: string; right: string } };

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => innerWidth < 760;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Первый экран: бриф печатается, потом его строки становятся элементами страницы.
 * Финальный контент есть в HTML с самого начала, вступление идёт поверх.
 * Повторно в той же сессии и при prefers-reduced-motion сразу финал.
 */
export function initHero(onDone?: (hero: HTMLElement) => void) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero || hero.classList.contains('is-bound')) return;
  hero.classList.add('is-bound');
  let seen = false;
  try { seen = !!sessionStorage.getItem('intro-seen'); } catch {}
  if (seen || reduced() || !hero.querySelector('[data-brief]')) { finish(hero); onDone?.(hero); return; }

  const data = JSON.parse(hero.querySelector('[data-brief]')!.textContent || '{}') as Brief;
  const lines = isPhone() ? data.brief.filter((l) => l.id !== 'who') : data.brief;
  const linesRoot = hero.querySelector<HTMLElement>('[data-lines]')!;
  const skip = hero.querySelector<HTMLButtonElement>('[data-skip]');
  const sig = { stop: false };
  hero.classList.add('is-intro');
  if (skip) { skip.hidden = false; skip.addEventListener('click', () => { sig.stop = true; tl?.kill(); finish(hero); onDone?.(hero); }); }
  let tl: gsap.core.Timeline | null = null;

  document.fonts.ready.then(async () => {
    if (sig.stop) return;
    const els = await typeLines(linesRoot, lines, data.typo, isPhone() ? 110 : 95, sig);
    if (sig.stop) return;
    tl = morph(hero, els, () => { finish(hero); onDone?.(hero); });
  });
}

function finish(hero: HTMLElement) {
  hero.classList.remove('is-intro', 'is-morphing');
  hero.classList.add('is-done');
  gsap.set(hero.querySelectorAll('.hero-final, .hero-final *'), { clearProps: 'all' });
  try { sessionStorage.setItem('intro-seen', '1'); } catch {}
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
      await sleep(200);
      while (txt.textContent!.length) { if (sig.stop) return els; txt.textContent = txt.textContent!.slice(0, -1); await sleep(16); }
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
    if (!target) continue;
    let mover: HTMLElement = line;
    if (id === 'main') {
      const txt = line.querySelector('.brief-txt') as HTMLElement;
      const split = new SplitText(txt, { type: 'words' });
      const w = split.words.find((x) => /показ|show/i.test(x.textContent || '')) as HTMLElement | undefined;
      mover = w || line;
      gsap.to(split.words.filter((x) => x !== mover), { opacity: 0, duration: 0.3 }, 0.1);
    }
    const at = 0.1 + k * 0.07;
    gsap.set(mover, { x: 0, y: 0, scale: 1, transformOrigin: '0 0', willChange: 'transform' });
    const mr = mover.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const scale = Math.min(3.2, Math.max(1, tr.height / mr.height));
    tl.to(mover, { x: tr.left - mr.left, y: tr.top - mr.top, scale, duration: 0.8 }, at);
    tl.to(mover, { opacity: 0, duration: 0.22, ease: 'power1.in' }, at + 0.55);
    tl.fromTo(target, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }, at + 0.42);
    k++;
  }
  const rest = [...hero.querySelectorAll<HTMLElement>('.hero-final > *:not([data-target]), .hero-final .hero__cta > *:not([data-target])')];
  tl.fromTo(rest, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0.7);
  hero.dispatchEvent(new CustomEvent('hero:morph', { detail: { tl } }));
  return tl;
}
