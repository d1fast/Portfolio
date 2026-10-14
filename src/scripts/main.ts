import { initReveal } from './reveal';
import { initSectionThemes } from './theme';
import { initCursor } from './cursor';
import { initMagnetic, initScramble, initActiveItems, initMarquee, initCopy, initTilt } from './interactions';
import { initForm } from './form';
import { initHero } from './hero';
import { initWorksPreview } from './works-preview';
import { initSnapNav } from './snapnav';

/* Скрипты блоков главной подгружаются, когда блок первый раз приближается к экрану. */
const BLOCKS: Record<string, () => Promise<{ init: (root: HTMLElement) => void }>> = {
  about: () => import('../blocks/about/about'),
  services: () => import('../blocks/services/services'),
  works: () => import('../blocks/works/works'),
  process: () => import('../blocks/process/process'),
  contacts: () => import('../blocks/contacts/contacts'),
};

function initBlocks() {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-block]:not([data-block="hero"]):not(.is-block-bound)')];
  if (!roots.length) return;
  roots.forEach((r) => r.classList.add('is-block-bound'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const root = e.target as HTMLElement;
      BLOCKS[root.dataset.block!]?.().then((m) => m.init(root)).catch(() => {});
    }
  }, { rootMargin: '35% 0px 35% 0px', threshold: 0.01 });
  roots.forEach((r) => io.observe(r));
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
  initBlocks();
  initSnapNav();
  initReveal();
  initSectionThemes();
  initMagnetic();
  initScramble();
  initActiveItems();
  initMarquee();
  initCopy();
  initTilt();
  initForm();
  initWorksPreview();
}

initCursor();
document.addEventListener('astro:page-load', init);
