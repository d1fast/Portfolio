export type Lang = 'ru' | 'en';

export interface BriefLine {
  id: 'name' | 'do' | 'who' | 'main' | 'contact';
  text: string;
}

export interface Dict {
  lang: Lang;
  htmlLang: string;
  meta: { title: string; description: string; ogTitle: string; ogDescription: string };
  nav: {
    about: string; services: string; works: string; process: string; contacts: string;
    langSwitch: string; langSwitchTitle: string; skipToContent: string;
  };
  hero: {
    fileName: string;
    brief: BriefLine[];
    typo: { line: number; wrong: string; right: string };
    name: string; nick: string; tagline: string;
    ctaTelegram: string; ctaWorks: string; skip: string; scrollHint: string;
  };
  about: { title: string; photoAlt: string; photoSoon: string; p1: string; p2: string; p3: string; facts: string[] };
  services: { title: string; items: { title: string; text: string }[] };
  works: { title: string; open: string; year: string; stack: string };
  process: { title: string; steps: { title: string; text: string }[] };
  contacts: {
    title: string; lead: string; telegram: string; emailLabel: string; copy: string; copied: string;
    formTitle: string; nameLabel: string; namePlaceholder: string; messageLabel: string; messagePlaceholder: string;
    consent: string; consentLink: string; submit: string; submitTelegram: string; telegramHint: string;
    sending: string; success: string; error: string; errorConsent: string; errorEmpty: string;
    footerNote: string; policy: string; easterHint: string; easterHintMobile: string;
  };
  notFound: { title: string; text: string; home: string; works: string };
  policy: { title: string; updated: string; body: string[]; back: string };
  a11y: { close: string; openMenu: string; closeMenu: string; videoPreview: string };
  easter: { title: string; lines: string[]; close: string };
}
