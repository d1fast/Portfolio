import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

/**
 * Один скролл переносит на следующий блок. На десктопе колесо и клавиши перехватываются,
 * страница плавно едет к началу соседнего блока; CSS scroll-snap остаётся как страховка.
 * На тач-устройствах работает обычный скролл с мягкой привязкой (proximity).
 */
let bound = false;

export function initSnapNav() {
  // слушатели вешаются один раз на всё время жизни вкладки; при переходах между страницами
  // каждый обработчик сам проверяет, есть ли на текущей странице блоки
  if (bound) return;
  bound = true;
  const html = document.documentElement;
  const blocks = () => (html.classList.contains('snap') ? [...document.querySelectorAll<HTMLElement>('.block')] : []);
  const desktop = () => innerWidth > 760 && innerHeight > 640;
  let busy = false;
  let lastWheel = 0;
  // после доезда ждём, пока стихнет инерция тачпада, иначе один жест перелистнёт два блока
  const release = () => { if (performance.now() - lastWheel > 220) busy = false; else setTimeout(release, 80); };

  const currentIndex = () => {
    const list = blocks();
    let idx = 0;
    const y = scrollY + innerHeight * 0.4;
    list.forEach((b, i) => { if (b.offsetTop <= y) idx = i; });
    return idx;
  };
  const go = (dir: 1 | -1) => {
    if (busy || !desktop()) return;
    const list = blocks();
    if (!list.length) return;
    const idx = currentIndex();
    const cur = list[idx];
    // блок выше экрана: сначала докручиваем внутри него
    const bottom = cur.offsetTop + cur.offsetHeight;
    if (dir === 1 && bottom - (scrollY + innerHeight) > 8) return scrollTo(scrollY + innerHeight * 0.85);
    if (dir === -1 && scrollY - cur.offsetTop > 8) return scrollTo(Math.max(cur.offsetTop, scrollY - innerHeight * 0.85));
    const next = list[Math.min(list.length - 1, Math.max(0, idx + dir))];
    if (next === cur) return;
    scrollTo(next.offsetTop);
  };
  const scrollTo = (y: number) => {
    busy = true;
    gsap.to(window, { scrollTo: { y, autoKill: false }, duration: 0.8, ease: 'power3.inOut', onComplete: release });
  };

  // своё колесо вместо обычной прокрутки: один щелчок или жест тачпада = один блок.
  // На узком окне и тач-экранах не вмешиваемся, там работает обычный скролл с мягкой привязкой.
  addEventListener('wheel', (e) => {
    if (!desktop() || e.ctrlKey || !blocks().length) return;
    const t = e.target as HTMLElement;
    if (t.closest?.('input, textarea, select, [data-scroll-inside]')) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    lastWheel = performance.now();
    if (busy || Math.abs(e.deltaY) < 4) return;
    go(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !blocks().length) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    // стрелки внутри меню блока принадлежат меню, пробел на кнопке и ссылке нажимает их
    if (t.closest?.('[data-keys]')) return;
    if (e.key === ' ' && t.closest?.('button, a, [role="button"], label')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); go(-1); }
  });
  // точки и ссылки по якорям едут плавно
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"], a[href*="/#"]');
    if (!a) return;
    const id = a.getAttribute('href')!.split('#')[1];
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollTo(el.offsetTop);
    history.replaceState(null, '', '#' + id);
  });
}
