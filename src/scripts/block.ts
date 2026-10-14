import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/** Анимация с кнопками «сыграть заново» и «вернуть в начало». */
export interface Player { play(delay?: number): void; reset(): void; }

/**
 * Блок на экране. Как только видна пятая часть, запускаются анимации входа; когда блок
 * полностью ушёл с экрана, они сбрасываются и в следующий раз сыграют заново.
 * Класс is-on стоит, пока блок хоть чуть виден: по нему живут бесконечные анимации.
 */
export function watchBlock(root: HTMLElement, enter: () => void, leave?: () => void) {
  let active = false;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      root.classList.toggle('is-on', e.isIntersecting);
      if (e.intersectionRatio >= 0.2 && !active) { active = true; root.classList.add('is-in'); enter(); }
      else if (!e.isIntersecting && active) { active = false; root.classList.remove('is-in'); leave?.(); }
    }
  }, { threshold: [0, 0.2] });
  io.observe(root);
}

function player(get: () => gsap.core.Animation | undefined): Player {
  return {
    play: (delay = 0) => { const a = get(); if (a) { a.delay(delay); a.restart(true); } },
    reset: () => { get()?.pause(0); },
  };
}

/** Текст по строкам: строки выезжают из-под маски. Переживает смену ширины (autoSplit). */
export function splitLines(el: HTMLElement, vars: gsap.TweenVars = {}): Player {
  let tween: gsap.core.Tween | undefined;
  SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit(self) {
    // при пересборке строк (смена ширины, догрузка шрифта) новая анимация продолжает с того же места
    const running = !!tween && !tween.paused();
    tween = gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08, paused: true, ...vars });
    if (running) { const t = tween; gsap.delayedCall(0, () => t.play()); }
    return tween;
  } });
  return player(() => tween);
}

/** Текст по буквам: буквы поднимаются из-под маски слова. */
export function splitChars(el: HTMLElement, vars: gsap.TweenVars = {}): Player {
  let tween: gsap.core.Tween | undefined;
  SplitText.create(el, { type: 'words,chars', mask: 'words', wordsClass: 'wd', charsClass: 'ch', onSplit(self) {
    tween = gsap.from(self.chars, { yPercent: 120, duration: 0.8, ease: 'expo.out', stagger: 0.03, paused: true, ...vars });
    return tween;
  } });
  return player(() => tween);
}

/** Несколько элементов по очереди снизу. */
export function rise(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}): Player {
  const tween = gsap.from(targets, { y: 28, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, paused: true, ...vars });
  return player(() => tween);
}

/** Любой твин или таймлайн, созданный на паузе. */
export function wrap(anim: gsap.core.Animation): Player {
  return player(() => anim);
}

export const nn = (n: number) => String(n).padStart(2, '0');
