/** На телефоне видео работы играет прямо в карточке, когда карточка в центре экрана. */
export function initWorksPreview() {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-inline-preview]:not(.is-preview-bound)')];
  if (!videos.length) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  videos.forEach((v) => v.classList.add('is-preview-bound'));
  // постер подставляется, когда карточка близко к экрану
  const posterIo = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { const v = e.target as HTMLVideoElement; if (v.dataset.poster) { v.poster = v.dataset.poster; delete v.dataset.poster; } posterIo.unobserve(v); }
  }, { rootMargin: '600px 0px' });
  videos.forEach((v) => posterIo.observe(v));
  if (reduced) return;
  if (fine) {
    // На десктопе видео показывает курсор; в карточке играет только при наведении клавиатурой/фокусе.
    videos.forEach((v) => {
      const card = v.closest('a');
      card?.addEventListener('focus', () => { v.play().catch(() => {}); });
      card?.addEventListener('blur', () => v.pause());
    });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }
  }, { rootMargin: '-30% 0px -30% 0px', threshold: 0 });
  videos.forEach((v) => io.observe(v));
}
