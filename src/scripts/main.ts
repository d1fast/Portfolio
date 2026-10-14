import { initReveal } from './reveal';
import { initCursor } from './cursor';
import { initMagnetic, initScramble, initActiveItems, initMarquee, initCopy, initTilt } from './interactions';
import { initForm } from './form';
import { initHero, heroReenter } from './hero';
import { initStage } from './stage';

/* Скрипты блоков главной подгружаются, когда блок первый раз приближается к экрану. */
const BLOCKS: Record<string, () => Promise<{ init: (root: HTMLElement) => void }>> = {
  about: () => import('../blocks/about/about'),
  services: () => import('../blocks/services/services'),
  works: () => import('../blocks/works/works'),
  process: () => import('../blocks/process/process'),
  contacts: () => import('../blocks/contacts/contacts'),
};

const loaded = new WeakMap<HTMLElement, Promise<void>>();
/** Подгружает и запускает скрипт блока один раз. Сцена ждёт его перед тем, как открыть блок. */
function ensureBlock(root: HTMLElement) {
  let p = loaded.get(root);
  if (!p) {
    const load = BLOCKS[root.dataset.block || ''];
    p = load ? load().then((m) => m.init(root)).catch(() => {}) : Promise.resolve();
    loaded.set(root, p);
  }
  return p;
}

function initBlocks() {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-block]:not([data-block="hero"])')];
  if (!roots.length) return;
  // текущий блок сразу, остальные, когда браузер свободен
  roots.filter((r) => r.classList.contains('is-current')).forEach(ensureBlock);
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 600));
  idle(() => roots.forEach(ensureBlock));
  if (!document.documentElement.classList.contains('stage-on')) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); ensureBlock(e.target as HTMLElement); }
    }, { rootMargin: '35% 0px 35% 0px' });
    roots.forEach((r) => io.observe(r));
  }
}

let sceneStarted = false;
function startScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  if (!canvas || sceneStarted) return;
  sceneStarted = true;
  import('./scene').then((m) => m.initHeroScene(canvas, { modelUrl: canvas.dataset.model || undefined })).catch(() => {});
}

function init() {
  sceneStarted = false;
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 300));
  initHero(() => idle(startScene));
  setTimeout(() => idle(startScene), 1800);
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  hero?.addEventListener('block:enter', (e) => { if (!(e as CustomEvent).detail?.first) heroReenter(hero); });
  initStage({ prepare: (b) => (b.dataset.block === 'hero' ? undefined : ensureBlock(b)) });
  initBlocks();
  initReveal();
  initMagnetic();
  initScramble();
  initActiveItems();
  initMarquee();
  initCopy();
  initTilt();
  initForm();
}

initCursor();
init();
