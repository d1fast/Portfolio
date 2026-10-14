/**
 * Свой курсор, только для мыши: перекрестие с координатами, как в САПР.
 * Над ссылками становится кольцом.
 */
export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const html = document.documentElement;
  let el = document.querySelector<HTMLElement>('.cursor');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cursor is-hidden';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="cursor__h"></i><i class="cursor__v"></i><i class="cursor__ring"></i><b class="cursor__xy"><span data-cx>0</span>, <span data-cy>0</span></b>';
    document.body.append(el);
  }
  html.classList.add('has-cursor');
  const cx = el.querySelector<HTMLElement>('[data-cx]')!, cy = el.querySelector<HTMLElement>('[data-cy]')!;
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, shown = false, frame = 0;

  const loop = () => {
    x += (tx - x) * 0.4; y += (ty - y) * 0.4;
    el!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if ((frame++ & 3) === 0) { cx.textContent = String(Math.round(tx)); cy.textContent = String(Math.round(ty)); }
    if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) raf = requestAnimationFrame(loop); else raf = 0;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; x = tx; y = ty; el!.classList.remove('is-hidden'); }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('mouseleave', () => el!.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => shown && el!.classList.remove('is-hidden'));
  addEventListener('pointerdown', () => el!.classList.add('is-down'));
  addEventListener('pointerup', () => el!.classList.remove('is-down'));

  const isLink = (t: Element | null) => t?.closest('a, button, label, [role="button"], input, textarea, select, [data-active-list] > *');
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    el!.classList.toggle('is-link', !!isLink(t));
    el!.classList.toggle('is-text', !!t.closest('input, textarea'));
  });
}
