/** Контакты и адреса. Здесь нет секретов: всё это публично на сайте. */
export const site = {
  name: 'd1fast',
  email: 'saveliylopatin@yandex.ru',
  /** Адрес функции, которая пересылает заявку из формы в Telegram-бота владельца. Пусто, пока не развёрнута:
   *  тогда форма открывает почтовую программу с готовым письмом. Как развернуть: server/README.md */
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || '',
  year: 2026,
};
