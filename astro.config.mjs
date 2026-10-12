import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// На GitHub Pages сайт лежит либо в корне (репозиторий d1fast.github.io),
// либо в подпапке /<repo>/. Воркфлоу деплоя передаёт BASE_PATH.
const base = process.env.BASE_PATH || '/';
const site = process.env.SITE_URL || 'https://d1fast.github.io';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru-RU', en: 'en' } },
      filter: (page) => !page.includes('/proto'),
    }),
  ],
  devToolbar: { enabled: false },
  vite: { build: { cssMinify: 'lightningcss' } },
});
