/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** URL серверной функции для формы. Пусто, пока функция не развёрнута. */
  readonly PUBLIC_FORM_ENDPOINT?: string;
}
