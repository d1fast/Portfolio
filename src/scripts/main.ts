import { initReveal } from './reveal';
import { initSectionThemes } from './theme';
import { initCursor } from './cursor';
import { initMagnetic, initScramble, initActiveItems, initMarquee, initCopy } from './interactions';
import { initForm } from './form';
import { initHero } from './hero';

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
}

initCursor();
document.addEventListener('astro:page-load', init);
