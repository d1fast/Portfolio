/**
 * Тема шапки, курсора и точек следует за блоком, который сейчас на экране.
 * Переключение по триггеру: активен блок, занимающий середину экрана.
 */
export function initSectionThemes() {
  const blocks = [...document.querySelectorAll<HTMLElement>('[data-block][data-theme]')];
  if (!blocks.length) return;
  const html = document.documentElement;
  const dots = [...document.querySelectorAll<HTMLElement>('[data-dot]')];
  let current = '';
  const apply = (block: HTMLElement) => {
    const name = block.dataset.theme!;
    if (name !== current) { current = name; html.setAttribute('data-theme', name); }
    dots.forEach((d) => d.classList.toggle('is-active', d.dataset.dot === block.id));
  };
  const pick = () => {
    const line = innerHeight * 0.5;
    let best = blocks[0];
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (r.top <= line) best = b; else break;
    }
    apply(best);
  };
  const io = new IntersectionObserver(() => pick(), { rootMargin: '-50% 0px -50% 0px', threshold: [0, 1] });
  blocks.forEach((b) => io.observe(b));
  pick();
  addEventListener('resize', pick, { passive: true });
}
