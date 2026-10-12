import { initReveal } from './reveal';
import { initSectionThemes } from './theme';
import { initCursor } from './cursor';
import { initMagnetic, initScramble, initActiveItems, initMarquee, initCopy, initSheets, initStampDates, initTilt } from './interactions';
import { initForm } from './form';
import { initHero } from './hero';
import { initEaster } from './easter';
import { initWorksPreview } from './works-preview';

let sceneStarted = false;
function startScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  if (!canvas || sceneStarted) return;
  sceneStarted = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modelUrl = canvas.dataset.model || undefined;
  const conn = (navigator as any).connection;
  if (conn && conn.saveData) return;
  import('./scene').then((m) => m.initHeroScene(canvas, { reduced, modelUrl })).catch(() => {});
}

function init() {
  sceneStarted = false;
  // 3D подгружается, когда главный поток свободен: после вступления или в простое
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 300));
  initHero(() => idle(startScene));
  setTimeout(() => idle(startScene), 1800);
  initSheets();
  initStampDates();
  initReveal();
  initSectionThemes();
  initMagnetic();
  initScramble();
  initActiveItems();
  initMarquee();
  initCopy();
  initTilt();
  initForm();
  initEaster();
  initWorksPreview();
}

initCursor();
document.addEventListener('astro:page-load', init);
