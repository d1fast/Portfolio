# Как устроен сайт

Статика на Astro, движение на GSAP, деплой на GitHub Pages.

## Запуск

```bash
npm install
npm run dev
```

Сайт откроется на `http://localhost:4321`. Сборка: `npm run build`, результат в `dist/`.
Проверка типов: `npm run check`. Скриншоты страниц: `npm run shots` при запущенном `npm run dev`.

## Как добавить кейс

1. Создайте папку `src/content/work/<slug>/` с файлами `ru.md` и `en.md`. Проще скопировать `aroma-forge/` и заменить тексты.
2. Медиа в `public/work/<slug>/`: обложка, видео-превью (`mp4` и `webm`, 8 секунд без звука), картинки галереи. Пути в md от корня сайта.
3. В шапке файла: `title`, `subtitle`, `year`, `order`, `role`, `stack`, `cover`, `video`, `media`. Тело: «Задача», «Решения», «Результат».
4. Пуш в `main`. Кейс появится по адресу `/work/<slug>/` и `/en/work/<slug>/`. `draft: true` прячет кейс.

## Тексты

Все тексты интерфейса в `src/i18n/ru.ts` и `src/i18n/en.ts`. Контакты и адреса в `src/config.ts`.

## Деплой

Каждый пуш в `main` собирает сайт и выкладывает его на GitHub Pages (`.github/workflows/deploy.yml`).
У Pages в настройках репозитория источник «GitHub Actions». Для репозитория `d1fast.github.io` сайт лежит в корне домена,
для другого имени в подпапке `/<имя>/`.

## Форма

Сообщения из формы уходят в Telegram через серверную функцию, код и инструкция в `server/yandex-cloud-function/`.
Пока адрес функции не задан, форма открывает Telegram с готовым текстом. Чтобы включить бота, добавьте в
Settings → Secrets and variables → Actions → Variables переменную `PUBLIC_FORM_ENDPOINT`. Токен бота живёт только в функции.
