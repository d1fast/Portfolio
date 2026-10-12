/**
 * Форма связи. Если задан адрес серверной функции, шлёт JSON туда и сообщение
 * уходит в Telegram через бота. Если адреса нет, открывает Telegram с готовым текстом.
 * При ошибке показывает Telegram и почту.
 */
export function initForm(root: ParentNode = document) {
  const form = root.querySelector<HTMLFormElement>('form[data-contact-form]:not(.is-bound)');
  if (!form) return;
  form.classList.add('is-bound');
  const endpoint = form.dataset.endpoint || '';
  const tgUser = form.dataset.tgUser || '';
  const lang = form.dataset.lang || 'ru';
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const labels = { submit: submit.textContent || '', sending: form.dataset.sending || '', success: form.dataset.success || '', error: form.dataset.error || '', errorConsent: form.dataset.errorConsent || '', errorEmpty: form.dataset.errorEmpty || '' };
  const fallback = form.querySelector<HTMLElement>('[data-form-fallback]');
  const last = { t: 0 };

  const show = (text: string, kind: 'ok' | 'err' | '') => {
    status.textContent = text;
    status.dataset.kind = kind;
    if (fallback) fallback.hidden = kind !== 'err';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const message = String(data.get('message') || '').trim();
    const consent = data.get('consent') === 'on';
    const website = String(data.get('website') || '');
    if (website) return; // ловушка для ботов
    if (!message || message.length < 3) { show(labels.errorEmpty, 'err'); (form.querySelector('[name="message"]') as HTMLElement).focus(); if (fallback) fallback.hidden = true; return; }
    if (!consent) { show(labels.errorConsent, 'err'); if (fallback) fallback.hidden = true; return; }
    if (Date.now() - last.t < 15000) return; // не чаще раза в 15 секунд

    if (!endpoint) {
      const text = `${name ? name + '\n' : ''}${message}`;
      const url = `https://t.me/${tgUser}?text=${encodeURIComponent(text)}`;
      last.t = Date.now();
      window.open(url, '_blank', 'noopener');
      show(labels.success, 'ok');
      return;
    }

    submit.disabled = true;
    submit.textContent = labels.sending;
    show('', '');
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, message, consent, lang, website }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || res.statusText);
      last.t = Date.now();
      form.reset();
      show(labels.success, 'ok');
    } catch {
      show(labels.error, 'err');
    } finally {
      submit.disabled = false;
      submit.textContent = labels.submit;
    }
  });
}
