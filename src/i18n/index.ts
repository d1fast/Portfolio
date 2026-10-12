import { ru } from './ru';
import { en } from './en';
import type { Dict, Lang } from './types';

export const dicts: Record<Lang, Dict> = { ru, en };
export const langs: Lang[] = ['ru', 'en'];
export const defaultLang: Lang = 'ru';

export function t(lang: Lang): Dict {
  return dicts[lang];
}

/** Префикс пути для языка: '' для русского, '/en' для английского. */
export function langPrefix(lang: Lang): string {
  return lang === defaultLang ? '' : `/${lang}`;
}

export type { Dict, Lang };
