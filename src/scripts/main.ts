import { initReveal } from './reveal';
import { initSectionThemes } from './theme';
import { initCursor } from './cursor';
import { initMagnetic, initScramble, initActiveItems, initMarquee, initCopy } from './interactions';
import { initForm } from './form';
import { initHero } from './hero';
import { initEaster } from './easter';
import { initWorksPreview } from './works-preview';

function init() {
  initHero();
  initReveal();
  initSectionThemes();
  initMagnetic();
  initScramble();
  initActiveItems();
  initMarquee();
  initCopy();
  initForm();
  initEaster();
  initWorksPreview();
}

initCursor();
document.addEventListener('astro:page-load', init);
