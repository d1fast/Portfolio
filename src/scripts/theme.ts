/**
 * Разделы меняют цветовую схему, когда до них доходишь: не плавно за скроллом,
 * а по триггеру. Раздел с data-theme становится активным, когда его верх
 * пересекает линию на 55% высоты экрана; тема ставится на <html>.
 */
export function initSectionThemes() {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-theme]')];
  if (!sections.length) return;
  const html = document.documentElement;
  let current = '';
  const apply = (name: string) => {
    if (name === current) return;
    current = name;
    html.setAttribute('data-theme', name);
  };
  const pick = () => {
    const line = innerHeight * 0.55;
    let best = sections[0];
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= line) best = s; else break;
    }
    apply(best.dataset.theme!);
  };
  // Наблюдаем пересечение линии, а не скроллим в каждом кадре.
  const io = new IntersectionObserver(() => pick(), { rootMargin: '-55% 0px -45% 0px', threshold: [0, 1] });
  sections.forEach((s) => io.observe(s));
  pick();
  addEventListener('resize', pick, { passive: true });
}
