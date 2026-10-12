/** Свой курсор: точка и кольцо, только для мыши. Над работой показывает её видео. */
export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const html = document.documentElement;
  let el = document.querySelector<HTMLElement>('.cursor');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cursor is-hidden';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="cursor__ring"></div><div class="cursor__dot"></div><div class="cursor__video"><video muted playsinline loop preload="none"></video></div>';
    document.body.append(el);
  }
  html.classList.add('has-cursor');
  const video = el.querySelector('video')!;
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, shown = false;

  const loop = () => {
    x += (tx - x) * 0.35; y += (ty - y) * 0.35;
    el!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(loop); else raf = 0;
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

  const isLink = (t: Element | null) => t?.closest('a, button, label, [role="button"], input, textarea');
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    el!.classList.toggle('is-link', !!isLink(t));
    const card = t.closest<HTMLElement>('[data-preview-mp4]');
    if (card) {
      const mp4 = card.dataset.previewMp4!; const webm = card.dataset.previewWebm;
      if (video.dataset.src !== mp4) {
        video.innerHTML = (webm ? `<source src="${webm}" type="video/webm">` : '') + `<source src="${mp4}" type="video/mp4">`;
        video.dataset.src = mp4; video.load();
      }
      el!.classList.add('is-preview');
      video.play().catch(() => {});
    }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target as Element;
    const to = e.relatedTarget as Element | null;
    if (t.closest('[data-preview-mp4]') && !(to && to.closest('[data-preview-mp4]'))) {
      el!.classList.remove('is-preview');
      video.pause();
    }
  });
}
