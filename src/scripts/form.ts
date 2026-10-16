/**
 * Форма связи. Если задан адрес серверной функции, шлёт JSON туда, и заявка приходит
 * владельцу в Telegram-бота, посетителю никуда переходить не нужно. Если адреса нет,
 * открывает почтовую программу с готовым письмом. При ошибке показывает почту.
 */
export function initForm(root: ParentNode = document) {
  const form = root.querySelector<HTMLFormElement>('form[data-contact-form]:not(.is-form-bound)');
  if (!form) return;
  form.classList.add('is-form-bound');
  const endpoint = form.dataset.endpoint || '';
  const email = form.dataset.email || '';
  const lang = form.dataset.lang || 'ru';
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const labels = { submit: submit.textContent || '', sending: form.dataset.sending || '', success: form.dataset.success || '', successMail: form.dataset.successMail || form.dataset.success || '', error: form.dataset.error || '', errorConsent: form.dataset.errorConsent || '', errorEmpty: form.dataset.errorEmpty || '' };
  const fallback = form.querySelector<HTMLElement>('[data-form-fallback]');
  const last = { t: 0 };

  const msgField = form.querySelector<HTMLElement>('[name="message"]')!;
  const consentBox = form.querySelector<HTMLElement>('[name="consent"]')!;
  const show = (text: string, kind: 'ok' | 'err' | '', field?: HTMLElement) => {
    status.textContent = text;
    status.dataset.kind = kind;
    if (fallback) fallback.hidden = kind !== 'err';
    for (const el of [msgField, consentBox]) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    if (kind === 'err' && field) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', status.id); field.focus(); }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const message = String(data.get('message') || '').trim();
    const consent = data.get('consent') === 'on';
    const website = String(data.get('website') || '');
    if (website) return; // ловушка для ботов
    if (!message || message.length < 3) { show(labels.errorEmpty, 'err', msgField); if (fallback) fallback.hidden = true; return; }
    if (!consent) { show(labels.errorConsent, 'err', consentBox); if (fallback) fallback.hidden = true; return; }
    if (Date.now() - last.t < 15000) return; // не чаще раза в 15 секунд

    if (!endpoint) {
      // функция для бота ещё не подключена: письмо с готовым текстом открывается в почтовой программе
      const subject = lang === 'en' ? 'Request from the website' : 'Заявка с сайта';
      const body = `${name ? name + '\n\n' : ''}${message}`;
      last.t = Date.now();
      location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      show(labels.successMail, 'ok');
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
