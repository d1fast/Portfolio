/** Контакты и адреса. Здесь нет секретов: всё это публично на сайте. */
export const site = {
  name: 'd1fast',
  telegramUser: 'glslg031',
  telegramUrl: 'https://t.me/glslg031',
  email: 'saveliylopatin@yandex.ru',
  /** Адрес функции, которая пересылает сообщение из формы в Telegram. Пусто, пока не развёрнута. */
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '',
  year: 2026,
};
