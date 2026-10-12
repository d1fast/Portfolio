/**
 * Пасхалка: клавиша T (на телефоне долгое нажатие на ник) показывает бриф этого сайта.
 * Сайт на секунду снова становится текстом, из которого он вырос.
 */
export function initEaster() {
  const box = document.querySelector<HTMLElement>('[data-easter]');
  if (!box || box.classList.contains('is-bound')) return;
  box.classList.add('is-bound');
  const lines = JSON.parse(box.dataset.lines || '[]') as string[];
  const root = box.querySelector<HTMLElement>('[data-easter-lines]')!;
  const closeBtn = box.querySelector<HTMLButtonElement>('[data-easter-close]')!;
  let open = false; let stop = false; let lastFocus: HTMLElement | null = null;

  const typeAll = async () => {
    root.innerHTML = '';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const text of lines) {
      if (stop) return;
      const div = document.createElement('div');
      div.className = 'brief-line';
      const span = document.createElement('span');
      span.className = 'brief-txt';
      div.append(span);
      root.append(div);
      if (reduced) { span.textContent = text; continue; }
      div.classList.add('is-active');
      for (const ch of text) { if (stop) return; span.textContent += ch; await new Promise((r) => setTimeout(r, 6 + Math.random() * 9)); }
      div.classList.remove('is-active');
    }
  };
  const show = () => {
    if (open) return;
    open = true; stop = false;
    lastFocus = document.activeElement as HTMLElement;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    document.querySelectorAll('header, main, footer').forEach((el) => el.setAttribute('inert', ''));
    closeBtn.focus();
    typeAll();
  };
  const hide = () => {
    if (!open) return;
    open = false; stop = true;
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    document.querySelectorAll('header, main, footer').forEach((el) => el.removeAttribute('inert'));
    setTimeout(() => { box.hidden = true; }, 300);
    lastFocus?.focus();
  };
  closeBtn.addEventListener('click', hide);
  box.addEventListener('click', (e) => { if (e.target === box) hide(); });
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' && open) { hide(); return; }
    if ((e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && (open || document.activeElement === document.body)) open ? hide() : show();
  });
  // долгое нажатие на ник в шапке
  for (const el of document.querySelectorAll<HTMLElement>('[data-logo]')) {
    let timer = 0;
    const start = () => { timer = window.setTimeout(show, 650); };
    const cancel = () => clearTimeout(timer);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel); el.addEventListener('touchmove', cancel); el.addEventListener('touchcancel', cancel);
    el.addEventListener('contextmenu', (e) => { if (open) e.preventDefault(); });
  }
}
