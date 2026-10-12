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
  import('./scene').then((m) => m.initHeroScene(canvas, { reduced, modelUrl })).catch(() => {});
}

function init() {
  sceneStarted = false;
  initHero(() => startScene());
  // если вступление длинное, 3D всё равно стартует заранее, чтобы к концу уже крутился
  setTimeout(startScene, 900);
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
