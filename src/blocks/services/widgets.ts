import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

/**
 * Живые штуки в экранчике окна диалога, по одной на пункт меню. Играет только показанная:
 * play() запускает её с начала, stop() останавливает и возвращает в исходное состояние.
 * DOM-штуки рисуются на «сцене» 360×170 и масштабируются целиком (--k на трубке экрана),
 * игра и 3D рисуются в canvas низкого разрешения с крупными пикселями на весь экран.
 */
export interface Widget {
  dwell: number;
  play(): void;
  stop(): void;
  resize?(): void;
  jump?(): void;
  point?(nx: number, ny: number, touch?: boolean): void;
}
export interface WidgetUI {
  tapFine: string; tapTouch: string; hi: string;
  bot: string; online: string; typing: string; ask: string; pick: string; t1: string; t2: string; done: string;
  send: string; spec: string; checks: string[];
}

// те же цвета, что в services.css (--s0, --s1, --s2, --pk) и в теме блока
const C = { s0: '#2B0614', s1: '#4B0B23', s2: '#7A1E45', fg: '#C6DBA2', ac: '#EAF5D6', pk: '#F06A93', dim: '#716654', pkDim: '#84334D', fgDark: '#8E9C74' };

type Box = [number, number, number, number];
function el(parent: HTMLElement, cls: string, box?: Box, text?: string): HTMLElement {
  const e = document.createElement('div');
  e.className = cls;
  if (box) Object.assign(e.style, { left: box[0] + 'px', top: box[1] + 'px', width: box[2] + 'px', height: box[3] + 'px' });
  if (text != null) e.textContent = text;
  parent.appendChild(e);
  return e;
}
function at(e: HTMLElement, x: number, y: number) { e.style.left = x + 'px'; e.style.top = y + 'px'; return e; }

/** Пиксельный спрайт в SVG: каждая буква строки = цвет из палитры, точка = пусто. */
function sprite(rows: string[], pal: Record<string, string>, scale = 1, cls = ''): string {
  const w = Math.max(...rows.map((r) => r.length));
  const paths: Record<string, string> = {};
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length;) {
      const c = r[x];
      if (!pal[c]) { x++; continue; }
      let e = x;
      while (e < r.length && r[e] === c) e++;
      paths[c] = (paths[c] || '') + `M${x} ${y}h${e - x}v1h${x - e}z`;
      x = e;
    }
  });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${rows.length}" width="${w * scale}" height="${rows.length * scale}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(paths).map(([c, d]) => `<path d="${d}" fill="${pal[c]}"/>`).join('')}</svg>`;
}

const ARROW = ['o.......', 'oo......', 'owo.....', 'owwo....', 'owwwo...', 'owwwwo..', 'owwwwwo.', 'owwwwwwo', 'owwwoooo', 'owoowo..', 'oo..owo.', '....owo.', '.....oo.'];
const MOUNT = ['.....x..................', '....xxx.........x.......', '...xxxxx.......xxx......', '..xxxxxxx.....xxxxx.....', '.xxxxxxxxx...xxxxxxx....', 'xxxxxxxxxxx.xxxxxxxxx...', 'xxxxxxxxxxxxxxxxxxxxxx..', 'xxxxxxxxxxxxxxxxxxxxxxxx'];
const SUN = ['.xxxx.', 'xxxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxx.'];
const CHECK = ['......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'];
const UP = ['..x..', '.xxx.', 'xxxxx'];

function cursor(parent: HTMLElement, x: number, y: number) {
  const c = el(parent, 'svc-cur');
  c.innerHTML = sprite(ARROW, { o: C.s0, w: C.ac });
  return at(c, x, y);
}
function stage(root: HTMLElement) {
  const st = el(root, 'svc-st');
  const all = el(st, 'svc-all');
  return all;
}

// мигание выделения: 0,1,0,1…
const blink = (n: number) => (p: number) => (p >= 1 ? 1 : Math.floor(p * n) % 2);

/** Обёртка для штук на таймлайне GSAP: таймлайн строится при первом показе. */
function timed(dwell: number, build: () => gsap.core.Timeline): Widget {
  let tl: gsap.core.Timeline | undefined;
  return {
    dwell,
    play() { (tl ??= build()).restart(); },
    stop() { tl?.pause(0); },
  };
}

/* ---------- 1. Сайты: окно браузера, страница собирается, курсор её прокручивает ---------- */
function sites(root: HTMLElement): Widget {
  const all = stage(root);
  const win = el(all, 'svc-win', [48, 4, 264, 162]);
  const bar = el(win, 'svc-bar', [0, 0, 260, 14]);
  const lights = [5, 13, 21].map((x) => el(bar, 'svc-sq', [x, 4, 6, 6]));
  el(bar, 'svc-sq', [34, 4, 150, 6]).style.opacity = '.55';
  const view = el(win, 'svc-view', [0, 14, 260, 144]);
  const page = el(view, '', [0, 0, 250, 300]);
  const thumb = el(view, 'svc-dim', [253, 3, 4, 64]);
  const nav = [el(page, 'svc-ac', [8, 6, 14, 6]), ...[172, 194, 216].map((x) => el(page, 'svc-dim', [x, 7, 16, 3]))];
  const hero = el(page, 'svc-s2', [8, 18, 234, 70]);
  const hl = [el(hero, 'svc-ac', [10, 12, 104, 8]), el(hero, 'svc-ac', [10, 24, 76, 8])];
  const sub = [el(hero, 'svc-dim', [10, 38, 92, 3]), el(hero, 'svc-dim', [10, 44, 70, 3])];
  const cta = el(hero, 'svc-pk', [10, 54, 36, 10]);
  const pic = el(hero, 'svc-pic', [148, 8, 78, 54]);
  const sun = el(pic, '', [56, 6, 12, 12]); sun.innerHTML = sprite(SUN, { x: C.pk }, 2);
  const mnt = el(pic, '', [3, 30, 72, 24]); mnt.innerHTML = sprite(MOUNT, { x: C.fg }, 3);
  const lines = [[98, 226], [105, 196], [112, 140]].map(([y, w]) => el(page, 'svc-dim', [8, y, w, 3]));
  const cards = [8, 89, 170].map((x) => {
    const c = el(page, 'svc-card', [x, 124, 72, 56]);
    el(c, 'svc-s2', [4, 4, 64, 28]); el(c, 'svc-dim', [4, 38, 48, 3]); el(c, 'svc-dim2', [4, 45, 34, 3]);
    return c;
  });
  const s2 = [el(page, 'svc-ac', [8, 196, 120, 8]), ...[[212, 220], [219, 180], [226, 200]].map(([y, w]) => el(page, 'svc-dim', [8, y, w, 3]))];
  const big = el(page, 'svc-s2', [8, 238, 234, 50]);
  const bigM = el(big, '', [8, 18, 96, 32]); bigM.innerHTML = sprite(MOUNT, { x: C.fg }, 4);
  const bigS = el(big, '', [196, 8, 18, 18]); bigS.innerHTML = sprite(SUN, { x: C.ac }, 3);
  el(page, 'svc-dim2', [8, 294, 234, 4]);
  const cur = cursor(all, 330, 180);
  const S = (n: number) => `steps(${n})`;
  return timed(6, () => gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.25 })
    .set(all, { opacity: 1 }, 0)
    .fromTo(win, { scaleY: 0.08, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.24, ease: S(4) }, 0)
    .fromTo(lights, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: S(1), stagger: 0.06 }, 0.2)
    .fromTo(nav, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.16, ease: S(2), stagger: 0.04 }, 0.3)
    .fromTo(hero, { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 0%', duration: 0.3, ease: S(5) }, 0.4)
    .fromTo(hl, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.3, ease: S(6), stagger: 0.12 }, 0.65)
    .fromTo(sub, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.24, ease: S(5), stagger: 0.08 }, 0.9)
    .fromTo(cta, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 1.05)
    .fromTo(pic, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: S(6) }, 0.75)
    .fromTo(sun, { y: 14 }, { y: 0, duration: 0.5, ease: S(6) }, 1.0)
    .fromTo(lines, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.3, ease: S(8), stagger: 0.1 }, 1.2)
    .fromTo(cards, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, ease: S(3), stagger: 0.1 }, 1.45)
    // курсор подходит к кнопке первого экрана и жмёт её
    .fromTo(cur, { x: 0, y: 0, opacity: 0 }, { x: -244, y: -83, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 1.9)
    .to(cur, { scale: 0.8, duration: 0.08, ease: S(1), yoyo: true, repeat: 1 }, 2.65)
    .to(cta, { backgroundColor: C.ac, duration: 0.08, ease: S(1), yoyo: true, repeat: 1, repeatDelay: 0.12 }, 2.67)
    // и прокручивает страницу вниз
    .to(cur, { x: -150, y: -70, duration: 0.4, ease: 'power2.inOut' }, 3.0)
    .fromTo([page, thumb], { y: 0 }, { y: (i) => (i === 0 ? -156 : 72), duration: 1.0, ease: 'power2.inOut' }, 3.35)
    .fromTo(s2, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.3, ease: S(8), stagger: 0.08 }, 3.7)
    .fromTo(big, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: S(8) }, 3.9)
    .to(cur, { x: -160, y: -40, duration: 0.4, ease: 'power2.inOut' }, 4.4)
    .to(cur, { scale: 0.8, duration: 0.08, ease: S(1), yoyo: true, repeat: 1 }, 4.85)
    .fromTo([bigM, bigS], { y: 0 }, { y: -4, duration: 0.16, ease: S(2), yoyo: true, repeat: 1, stagger: 0.06 }, 4.9)
    .to([page, thumb], { y: 0, duration: 0.6, ease: 'power2.inOut' }, 5.1)
    .to(cur, { x: 40, y: 30, opacity: 0, duration: 0.5, ease: 'power2.in' }, 5.1)
    .to(all, { opacity: 0, duration: 0.24, ease: S(3) }, 5.75));
}

/* ---------- 2. Веб-приложения: панель, столбики растут, число бежит, график рисуется ---------- */
function apps(root: HTMLElement): Widget {
  const all = stage(root);
  const win = el(all, 'svc-win', [30, 6, 300, 158]);
  const side = el(win, 'svc-s0', [0, 0, 38, 154]);
  const sideEls = [el(side, 'svc-ac', [12, 10, 14, 14]), ...[38, 48, 58, 68].map((y, i) => el(side, i === 1 ? 'svc-ac' : 'svc-dim', [10, y, 18, 4]))];
  const k1 = el(win, 'svc-s0', [46, 8, 116, 46]);
  el(k1, 'svc-dim', [8, 8, 40, 3]);
  const num = el(k1, 'svc-arc', [8, 21, 100, 16], '0');
  Object.assign(num.style, { fontSize: '16px', color: C.ac });
  const up = el(k1, '', [96, 6, 10, 6]); up.innerHTML = sprite(UP, { x: C.pk }, 2);
  const k2 = el(win, 'svc-s0', [170, 8, 120, 46]);
  el(k2, 'svc-dim', [8, 8, 48, 3]);
  const segs = Array.from({ length: 10 }, (_, i) => el(k2, 'svc-dim2', [8 + i * 10, 24, 8, 12]));
  const segOn = segs.map((s) => el(s, 'svc-fg', [0, 0, 8, 12]));
  const k3 = el(win, 'svc-s0', [46, 62, 116, 86]);
  el(k3, 'svc-dim2', [6, 76, 104, 2]);
  const bars = Array.from({ length: 6 }, (_, i) => el(k3, i === 5 ? 'svc-ac' : 'svc-fg', [10 + i * 17, 20, 10, 56]));
  const k4 = el(win, 'svc-s0', [170, 62, 120, 86]);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 86'); svg.setAttribute('width', '120'); svg.setAttribute('height', '86'); svg.setAttribute('shape-rendering', 'crispEdges');
  const grid = document.createElementNS(NS, 'path');
  grid.setAttribute('d', 'M8 76H112'); grid.setAttribute('stroke', C.dim); grid.setAttribute('stroke-width', '2'); grid.setAttribute('fill', 'none');
  const line = document.createElementNS(NS, 'path');
  line.setAttribute('stroke', C.ac); line.setAttribute('stroke-width', '2'); line.setAttribute('fill', 'none');
  svg.append(grid, line);
  k4.appendChild(svg);
  const dot = el(k4, 'svc-pk', [0, 0, 6, 6]);
  // данные: ступенчатая линия и высоты столбиков, заново на каждый показ
  let target = 2048, filled = 7;
  const reroll = () => {
    const ys: number[] = [];
    let y = 62;
    for (let i = 0; i < 11; i++) { y = Math.max(16, Math.min(68, y + Math.round((Math.random() - 0.62) * 22))); ys.push(Math.round(y / 2) * 2); }
    let d = `M8 ${ys[0]}`;
    ys.forEach((v, i) => { if (i) d += `V${v}`; d += `H${8 + (i + 1) * 10}`; });
    line.setAttribute('d', d);
    at(dot, 8 + 11 * 10 - 3, ys[ys.length - 1] - 3);
    bars.forEach((b) => { const h = 18 + Math.round(Math.random() * 19) * 2; b.style.height = h + 'px'; b.style.top = 76 - h + 'px'; });
    target = 1200 + Math.round(Math.random() * 2400);
    filled = 5 + Math.floor(Math.random() * 5);
  };
  reroll();
  const fmt = (n: number) => String(Math.round(n));
  const counter = { v: 0 };
  let tl: gsap.core.Timeline | undefined;
  const S = (n: number) => `steps(${n})`;
  const build = () => gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.2, onRepeat: () => { reroll(); tl?.invalidate(); } })
    .set(all, { opacity: 1 }, 0)
    .fromTo(win, { scaleX: 0.06, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.24, ease: S(4) }, 0)
    .fromTo(sideEls, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: S(1), stagger: 0.05 }, 0.2)
    .fromTo([k1, k2, k3, k4], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, ease: S(3), stagger: 0.08 }, 0.3)
    .fromTo(counter, { v: 0 }, { v: () => target, duration: 1.3, ease: 'power2.out', onUpdate: () => { num.textContent = fmt(counter.v); } }, 0.55)
    .fromTo(up, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: S(3) }, 1.7)
    .fromTo(segOn, { opacity: 0 }, { opacity: (i) => (i < filled ? 1 : 0), duration: 0.06, ease: S(1), stagger: 0.07 }, 0.65)
    .fromTo(bars, { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.42, ease: S(7), stagger: 0.08 }, 0.7)
    .fromTo(line, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.3, ease: 'none' }, 0.85)
    .fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, 2.15)
    .to(dot, { opacity: 0, duration: 0.6, ease: blink(6) }, 2.4)
    .to(bars, { scaleY: 0, duration: 0.3, ease: S(5), stagger: 0.04 }, 3.9)
    .to(line, { drawSVG: '100% 100%', duration: 0.4, ease: S(6) }, 3.9)
    .to(all, { opacity: 0, duration: 0.24, ease: S(3) }, 4.4);
  return {
    dwell: 4.8,
    play() { reroll(); (tl ??= build()).invalidate().restart(); },
    stop() { tl?.pause(0); },
  };
}

/* ---------- 3. Telegram-бот: вопрос, бот печатает, отвечает кнопками, одну нажимают ---------- */
function bots(root: HTMLElement, ui: WidgetUI): Widget {
  const all = stage(root);
  const win = el(all, 'svc-win', [76, 3, 208, 164]);
  const head = el(win, 'svc-head', [0, 0, 204, 26]);
  const ava = el(head, 'svc-ac', [7, 6, 14, 14]);
  el(ava, 'svc-s0', [3, 4, 2, 3]); el(ava, 'svc-s0', [9, 4, 2, 3]); el(ava, 'svc-s0', [4, 9, 6, 2]);
  const name = el(head, 'svc-txt', [28, 3, 120, 12], ui.bot);
  Object.assign(name.style, { fontSize: '12px', color: C.ac });
  const st1 = el(head, 'svc-txt', [28, 15, 120, 10], ui.online);
  const st2 = el(head, 'svc-txt', [28, 15, 120, 10], ui.typing);
  Object.assign(st1.style, { fontSize: '10px', color: C.fg });
  Object.assign(st2.style, { fontSize: '10px', color: C.pk });
  // пузыри по 24px высотой: вопрос 32, ответ 62, кнопки 92, итог 120
  const me = el(win, 'svc-bub svc-bub--me', undefined, ui.ask);
  Object.assign(me.style, { right: '8px', top: '32px' });
  const typing = el(win, 'svc-bub svc-bub--bot', [8, 62, 40, 24]);
  const dots = [8, 17, 26].map((x) => el(typing, 'svc-dot', [x, 10, 4, 4]));
  const bot1 = at(el(win, 'svc-bub svc-bub--bot', undefined, ui.pick), 8, 62);
  const keys = [ui.t1, ui.t2].map((t, i) => el(win, 'svc-key', [8 + i * 64, 92, 60, 22], t));
  const bot2 = at(el(win, 'svc-bub svc-bub--bot', undefined, ui.done), 8, 120);
  bot2.insertAdjacentHTML('beforeend', sprite(CHECK, { x: C.pk }, 1, 'svc-check'));
  // волна от нажатия: рамка по форме кнопки «18:30» (72, 92, 60×22) расходится от её центра на 8 и 4 px
  // и гаснет, не задевая пузыри выше и ниже; конечный размер = рамка 2px без искажения
  const ring = el(win, 'svc-ring', [64, 88, 76, 30]);
  const cur = cursor(all, 320, 186);
  const S = (n: number) => `steps(${n})`;
  // кнопка «18:30» в координатах сцены: окно 76+2, 3+2; центр кнопки 72+30, 92+11
  const tx = 78 + 102 - 320, ty = 5 + 103 - 186;
  return timed(5.4, () => gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.3 })
    .set(all, { opacity: 1 }, 0)
    .fromTo(win, { scaleY: 0.08, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.24, ease: S(4) }, 0)
    .fromTo(st2, { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0)
    .fromTo(me, { scale: 0.4, opacity: 0, transformOrigin: '100% 100%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)' }, 0.3)
    .to(st1, { opacity: 0, duration: 0.01 }, 0.75)
    .to(st2, { opacity: 1, duration: 0.01 }, 0.75)
    .fromTo(typing, { scale: 0.4, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(2.4)' }, 0.8)
    .fromTo(dots, { y: 0 }, { y: -3, duration: 0.14, ease: S(1), stagger: { each: 0.1, repeat: 5, yoyo: true } }, 0.95)
    .to(typing, { opacity: 0, duration: 0.05, ease: S(1) }, 1.95)
    .to(st2, { opacity: 0, duration: 0.01 }, 1.95)
    .to(st1, { opacity: 1, duration: 0.01 }, 1.95)
    .fromTo(bot1, { scale: 0.4, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)' }, 1.95)
    .fromTo(keys, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: S(3), stagger: 0.1 }, 2.2)
    .fromTo(cur, { x: 0, y: 0, opacity: 0 }, { x: tx, y: ty, opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 2.55)
    .to(cur, { scale: 0.78, duration: 0.08, ease: S(1), yoyo: true, repeat: 1 }, 3.2)
    .fromTo(keys[1], { backgroundColor: 'rgba(0,0,0,0)', color: C.fg }, { backgroundColor: C.ac, color: C.s0, duration: 0.05, ease: S(1) }, 3.22)
    .set(ring, { opacity: 0 }, 0)
    .fromTo(ring, { scaleX: 60 / 76, scaleY: 22 / 30, opacity: 1 }, { scaleX: 1, scaleY: 1, opacity: 0, duration: 0.42, ease: S(5), immediateRender: false }, 3.22)
    .to(cur, { x: tx + 60, y: ty + 70, opacity: 0, duration: 0.6, ease: 'power2.in' }, 3.5)
    .fromTo(bot2, { scale: 0.4, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)' }, 3.6)
    .to(all, { opacity: 0, duration: 0.24, ease: S(3) }, 5.1));
}

/* ---------- 6. Интерфейсы: тумблеры щёлкают, ползунок едет, курсор жмёт кнопку с волной ---------- */
function kit(root: HTMLElement, ui: WidgetUI): Widget {
  const all = stage(root);
  const win = el(all, 'svc-win', [50, 6, 260, 158]);
  const tog = (y: number) => {
    const t = el(win, 'svc-tg', [14, y, 32, 18]);
    const k = el(t, 'svc-knob', [2, 2, 10, 10]);
    return { t, k };
  };
  const t1 = tog(14), t2 = tog(42);
  el(win, 'svc-dim', [56, 21, 80, 4]); el(win, 'svc-dim2', [56, 49, 56, 4]);
  const cb = el(win, 'svc-box', [160, 15, 16, 16]);
  const tick = el(cb, '', [1, 2, 10, 9]); tick.innerHTML = sprite(CHECK, { x: C.ac }, 1.5);
  el(win, 'svc-dim', [184, 21, 56, 4]);
  const cb2 = el(win, 'svc-box', [160, 43, 16, 16]);
  el(cb2, 'svc-fg', [3, 3, 6, 6]);
  el(win, 'svc-dim2', [184, 49, 40, 4]);
  el(win, 'svc-dim', [14, 72, 50, 3]);
  const val = el(win, 'svc-arc', [214, 70, 30, 8], '20');
  val.style.color = C.ac;
  el(win, 'svc-dim2', [14, 88, 226, 4]);
  const fill = el(win, 'svc-fg', [14, 88, 226, 4]);
  const thumb = el(win, 'svc-ac', [14, 82, 10, 16]);
  thumb.style.clipPath = 'var(--px2)';
  const ghost = el(win, 'svc-ghost', [14, 114, 100, 28]);
  el(ghost, 'svc-dim', [30, 10, 36, 4]);
  const btn = el(win, 'svc-btn', [130, 114, 112, 28], ui.send);
  const ring = el(win, 'svc-ring', [122, 106, 128, 44]); // вокруг кнопки «Отправить» (130, 114, 112×28)
  const cur = cursor(all, 330, 186);
  const S = (n: number) => `steps(${n})`;
  const sx = (x: number) => 52 + x - 330, sy = (y: number) => 8 + y - 186; // из координат окна в сдвиг курсора
  const v = { p: 0.2 };
  const setV = () => { val.textContent = String(Math.round(v.p * 100)); };
  const press = () => ({ scale: 0.78, duration: 0.08, ease: S(1), yoyo: true, repeat: 1 });
  return timed(5.6, () => gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.25 })
    .set(all, { opacity: 1 }, 0)
    .fromTo(win, { scaleX: 0.06, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.24, ease: S(4) }, 0)
    .fromTo(fill, { scaleX: 0.2 }, { scaleX: 0.2, transformOrigin: '0% 50%', duration: 0.01 }, 0)
    .fromTo(thumb, { x: 0.2 * 226 - 5 }, { x: 0.2 * 226 - 5, duration: 0.01 }, 0)
    .fromTo(v, { p: 0.2 }, { p: 0.2, duration: 0.01, onUpdate: setV }, 0)
    .fromTo(cur, { x: 0, y: 0, opacity: 0 }, { x: sx(30), y: sy(24), opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 0.3)
    .to(cur, press(), 0.85)
    .fromTo(t1.k, { x: 0 }, { x: 16, duration: 0.15, ease: S(3) }, 0.88)
    .fromTo(t1.t, { backgroundColor: C.s0 }, { backgroundColor: C.pk, duration: 0.05, ease: S(1) }, 0.9)
    .to(cur, { x: sx(30), y: sy(52), duration: 0.32, ease: 'power2.inOut' }, 1.15)
    .to(cur, press(), 1.5)
    .fromTo(t2.k, { x: 0 }, { x: 16, duration: 0.15, ease: S(3) }, 1.53)
    .fromTo(t2.t, { backgroundColor: C.s0 }, { backgroundColor: C.pk, duration: 0.05, ease: S(1) }, 1.55)
    .to(cur, { x: sx(168), y: sy(24), duration: 0.4, ease: 'power2.inOut' }, 1.8)
    .to(cur, press(), 2.22)
    .fromTo(tick, { scale: 0 }, { scale: 1, duration: 0.15, ease: S(3) }, 2.25)
    .to(cur, { x: sx(19 + 0.2 * 226), y: sy(92), duration: 0.45, ease: 'power2.inOut' }, 2.5)
    .to(cur, { scale: 0.85, duration: 0.06, ease: S(1) }, 2.98)
    .to(cur, { x: sx(19 + 0.78 * 226), duration: 0.7, ease: 'power2.inOut' }, 3.05)
    .to(thumb, { x: 0.78 * 226 - 5, duration: 0.7, ease: 'power2.inOut' }, 3.05)
    .to(fill, { scaleX: 0.78, duration: 0.7, ease: 'power2.inOut' }, 3.05)
    .to(v, { p: 0.78, duration: 0.7, ease: 'power2.inOut', onUpdate: setV }, 3.05)
    .to(cur, { scale: 1, duration: 0.06, ease: S(1) }, 3.78)
    .to(cur, { x: sx(186), y: sy(128), duration: 0.45, ease: 'power2.inOut' }, 3.9)
    .to(cur, press(), 4.4)
    .to(btn, { y: 3, boxShadow: 'inset 0 0px 0 rgba(0,0,0,0)', duration: 0.06, ease: S(1), yoyo: true, repeat: 1, repeatDelay: 0.1 }, 4.42)
    .set(ring, { opacity: 0 }, 0)
    .fromTo(ring, { scaleX: 112 / 128, scaleY: 28 / 44, opacity: 1 }, { scaleX: 1, scaleY: 1, opacity: 0, duration: 0.45, ease: S(5), immediateRender: false }, 4.44)
    .to(cur, { x: sx(250), y: sy(190), opacity: 0, duration: 0.5, ease: 'power2.in' }, 4.8)
    .to(all, { opacity: 0, duration: 0.24, ease: S(3) }, 5.3));
}

/* ---------- 7. Разобраться и описать: пункты ТЗ печатаются и отмечаются галочками ---------- */
function spec(root: HTMLElement, ui: WidgetUI): Widget {
  const all = stage(root);
  const paper = el(all, 'svc-paper', [92, 4, 176, 162]);
  const fold = el(all, 'svc-fold', [92 + 176 - 14, 4, 14, 14]);
  const mark = el(paper, 'svc-pk', [9, 9, 30, 20]);
  const title = el(paper, 'svc-txt svc-ink', [12, 10, 60, 18], ui.spec);
  Object.assign(title.style, { font: `400 16px/1 var(--font-pixel)` });
  const under = el(paper, 'svc-ink-bg', [12, 31, 30, 2]);
  const widths = [96, 122, 82, 108];
  const rows = ui.checks.slice(0, 4).map((label, i) => {
    const y = 42 + i * 26;
    const box = el(paper, 'svc-cb', [12, y, 13, 13]);
    const t = el(box, '', [1, 2, 7, 6]); t.innerHTML = sprite(CHECK, { x: C.s0 }, 1);
    const lab = el(paper, 'svc-txt svc-ink', [32, y, 130, 14], label);
    lab.style.fontSize = '14px';
    const bar = el(paper, 'svc-ibar', [32, y + 17, widths[i], 3]);
    return { box, t, lab, bar, len: label.length };
  });
  const segs = [0, 1, 2, 3].map((j) => {
    const s = el(paper, 'svc-ibar', [12 + j * 38, 150, 34, 5]);
    return el(s, 'svc-ink-bg', [0, 0, 34, 5]);
  });
  const S = (n: number) => `steps(${n})`;
  return timed(5.2, () => {
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.25 })
      .set(all, { opacity: 1 }, 0)
      .fromTo([paper, fold], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: S(5) }, 0)
      .fromTo(title, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.2, ease: S(2) }, 0.3)
      .fromTo(under, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.2, ease: S(4) }, 0.45)
      .fromTo(mark, { scaleX: 0 }, { scaleX: 0, duration: 0.01 }, 0)
      .fromTo(segs, { scaleX: 0 }, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.01 }, 0);
    rows.forEach((r, i) => {
      const t0 = 0.6 + i * 0.72;
      tl.fromTo(r.box, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: S(1) }, t0)
        .fromTo(r.lab, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.04 * r.len + 0.05, ease: S(r.len) }, t0 + 0.05)
        .fromTo(r.bar, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.26, ease: S(6) }, t0 + 0.12 + 0.04 * r.len)
        .fromTo(r.t, { scale: 0 }, { scale: 1, duration: 0.12, ease: S(3) }, t0 + 0.5)
        .to(segs[i], { scaleX: 1, duration: 0.12, ease: S(3) }, t0 + 0.5);
    });
    tl.to(mark, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.25, ease: S(5) }, 3.65)
      .to(paper, { y: -3, duration: 0.1, ease: S(1), yoyo: true, repeat: 1 }, 3.9)
      .to(all, { opacity: 0, duration: 0.24, ease: S(3) }, 4.9);
    return tl;
  });
}

/* ---------- canvas с крупными пикселями ---------- */
const rgba = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
const P = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, rgba(v)])) as Record<keyof typeof C, number>;

class Pix {
  cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w = 0; h = 0; img!: ImageData; buf!: Uint32Array;
  rows: (H: number) => number;
  constructor(parent: HTMLElement, rows: (H: number) => number) {
    this.rows = rows;
    this.cv = document.createElement('canvas');
    this.cv.className = 'svc-cv';
    this.cv.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d')!;
  }
  /** ширина в пикселях подстраивается под пропорции экрана, высота постоянная */
  fit() {
    const p = this.cv.parentElement!;
    const W = p.offsetWidth, H = p.offsetHeight;
    if (!W || !H) return;
    const h = Math.round(this.rows(H));
    const w = Math.max(80, Math.round((h * W) / H));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.cv.width = w; this.cv.height = h;
    this.img = this.ctx.createImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
  }
  clear(c: number) { this.buf.fill(c); }
  px(x: number, y: number, c: number) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c; }
  rect(x: number, y: number, w: number, h: number, c: number) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) this.buf.fill(c, yy * this.w + x0, yy * this.w + Math.max(x0, x1));
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      this.px(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 2000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  sprite(rows: string[], x: number, y: number, pal: Record<string, number>) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) this.px(x + i, y + j, c); }
  }
  flush() { if (this.w) this.ctx.putImageData(this.img, 0, 0); }
}

function loop(tick: (dt: number, t: number) => void) {
  let raf = 0, last = 0;
  const f = (t: number) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; tick(dt, t / 1000); raf = requestAnimationFrame(f); };
  return {
    start() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(f); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}

/* ---------- 4. 3D: каркас куба с кубом внутри над сеточным полом, наклоняется к указателю ---------- */
function cube(root: HTMLElement): Widget {
  // пиксель около 3 css-px на ПК и около 2 на телефоне
  const pc = new Pix(root, (H) => Math.min(130, Math.max(64, H / (H > 260 ? 3.2 : 2.2))));
  const V: number[][] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]);
  const E: [number, number][] = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) { const d = V[a].reduce((s, v, i) => s + (v !== V[b][i] ? 1 : 0), 0); if (d === 1) E.push([a, b]); }
  let ay = 0.6, tx = 0, ty = 0, cx = 0, cy = 0, spin = 0, phase = 0, time = 0;
  const draw = (dt: number) => {
    time += dt; phase = (phase + dt * 1.1) % 1;
    spin *= Math.exp(-2.2 * dt);
    ay += dt * (0.75 + spin);
    cx += (tx - cx) * Math.min(1, dt * 4); cy += (ty - cy) * Math.min(1, dt * 4);
    const W = pc.w, H = pc.h; if (!W) return;
    const f = H * 0.95, hor = Math.round(H * 0.47), zObj = 4.6, floorY = 1.75;
    const mx = W / 2;
    pc.clear(P.s0);
    // солнце на горизонте, полосами
    const sr = Math.round(H * 0.2), sxc = Math.round(W * 0.76);
    for (let y = -sr; y <= 0; y++) {
      const half = Math.round(Math.sqrt(sr * sr - y * y));
      const yy = hor + y;
      if (y > -sr * 0.55 && (y + 40) % 3 === 0) continue;
      pc.rect(sxc - half, yy, half * 2 + 1, 1, y < -sr * 0.5 ? P.pk : P.pkDim);
    }
    // пол: линии бегут к зрителю; у горизонта сплошная дымка, чтобы дальние линии не рябили
    const sy = (z: number) => hor + (floorY * f) / z;
    const fog = Math.max(3, Math.round(H * 0.07));
    const zFar = (floorY * f) / fog;
    for (let k = 0; k < 9; k++) {
      const z = 2.2 + (k + 1 - phase) * 1.5;
      if (z < zFar) pc.rect(0, Math.round(sy(z)), W, 1, z < 6 ? P.pk : P.pkDim);
    }
    for (let x = -14; x <= 14; x += 2) pc.line(mx + (x * f) / 2.2, sy(2.2), mx + (x * f) / zFar, hor + fog, P.pkDim);
    pc.rect(0, hor, W, fog, P.s1);
    pc.rect(0, hor, W, 1, P.pkDim);
    // тень
    const shy = Math.round(sy(zObj)), shw = Math.round((f * 1.2) / zObj);
    for (let j = -2; j <= 2; j++) { const w = Math.round(shw * Math.sqrt(1 - (j * j) / 9)); pc.rect(mx - w, shy + j, w * 2, 1, P.s1); }
    // объект
    const ry = ay + cx, rx = 0.42 + Math.sin(time * 0.7) * 0.08 + cy;
    const cyc = Math.cos(ry), syn = Math.sin(ry), cxc = Math.cos(rx), sxn = Math.sin(rx);
    const bob = Math.sin(time * 1.6) * 0.08 - 0.35;
    const proj = (v: number[], s: number) => {
      const x1 = v[0] * s * cyc + v[2] * s * syn, z1 = -v[0] * s * syn + v[2] * s * cyc;
      const y1 = v[1] * s * cxc - z1 * sxn, z2 = v[1] * s * sxn + z1 * cxc;
      const z = zObj + z2;
      return [mx + (x1 * f) / z, hor - H * 0.05 + ((y1 + bob) * f) / z, z2];
    };
    const inner = 0.42 + Math.sin(time * 2.1) * 0.08;
    const A = V.map((v) => proj(v, 0.95)), B = V.map((v) => proj([v[0], v[1], v[2]], inner));
    for (let i = 0; i < 8; i++) pc.line(A[i][0], A[i][1], B[i][0], B[i][1], P.dim);
    for (const [a, b] of E) pc.line(B[a][0], B[a][1], B[b][0], B[b][1], P.pk);
    for (const [a, b] of E) pc.line(A[a][0], A[a][1], A[b][0], A[b][1], A[a][2] + A[b][2] < 0 ? P.ac : P.fg);
    for (const p of A) if (p[2] < 0) pc.rect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 2, 2, P.ac);
    pc.flush();
  };
  const lp = loop((dt) => draw(dt));
  return {
    dwell: 4.6,
    play() { pc.fit(); time = 0; spin = 1.6; lp.start(); },
    stop() { lp.stop(); tx = ty = cx = cy = 0; },
    resize() { pc.fit(); },
    point(nx, ny, touch) { tx = (nx - 0.5) * 1.3; ty = (ny - 0.5) * 0.9; if (touch) spin += 3; },
  };
}

/* ---------- 5. Небольшие игры: бегун прыгает через баги; клик, тап, пробел = прыжок ---------- */
const RUN1 = ['...aaaa.', '...aoaa.', '...aaaa.', '..ppaa..', '.ppaaaa.', '.a.aaa.a', '...aaa..', '...a.a..', '..a...a.', '.a.....a'];
const RUN2 = ['...aaaa.', '...aoaa.', '...aaaa.', '.ppp.aa.', '...aaaa.', '..aaaa.a', '.a.aaa..', '....aa..', '....a.a.', '...a..a.'];
const JUMP = ['...aaaa.', '...aoaa.', '...aaaa.', 'ppp..aa.', '.a.aaaaa', '..aaaa..', '...aaa..', '..a...a.', '..a...a.', '..........'];
const DEAD = ['...aaaa.', '...axaa.', '...aaaa.', '..ppaa..', '.ppaaaa.', '.a.aaa.a', '...aaa..', '...a.a..', '..a...a.', '.a.....a'];
const BUG = ['p.....p', '.p...p.', 'ppppppp', 'pkpppkp', 'ppppppp', 'p.p.p.p'];
const CRATE = ['ffffff', 'f.ff.f', 'ff..ff', 'ff..ff', 'f.ff.f', 'ffffff'];
const CLOUD = ['...dddd....', '.ddddddddd.', 'ddddddddddd'];
// камешки под землёй: [доля ширины, ряд под линией земли, длина]
const PEBBLES = [[0.06, 4, 3], [0.23, 9, 2], [0.41, 5, 4], [0.58, 12, 2], [0.74, 3, 3], [0.9, 8, 5]];

function game(root: HTMLElement, ui: WidgetUI): Widget {
  const pc = new Pix(root, () => 78);
  const score = el(root, 'svc-score');
  score.setAttribute('aria-hidden', 'true');
  const hiEl = document.createElement('span'), scEl = document.createElement('span');
  score.append(hiEl, scEl);
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const hint = el(root, 'svc-hint', undefined, fine.matches ? ui.tapFine : ui.tapTouch);
  hint.setAttribute('aria-hidden', 'true');
  const GROUND = 60, CX = 22;
  type Ob = { x: number; kind: 0 | 1 | 2 };
  let hintOff = false;
  let obs: Ob[] = [], y = 0, vy = 0, speed = 74, dist = 0, gap = 70, frame = 0, ft = 0, crash = 0, lastInput = -99, now = 0, best = 0, clouds: number[][] = [], hills = 0, pebble = 0;
  const pad = (n: number) => String(Math.floor(n)).padStart(5, '0');
  const reset = () => { obs = []; y = 0; vy = 0; speed = 74; dist = 0; gap = 60; crash = 0; };
  const size = (o: Ob) => (o.kind === 0 ? [7, 6] : o.kind === 1 ? [6, 6] : [6, 12]);
  const auto = () => now - lastInput > 3.5;
  const doJump = () => { if (y <= 0.01 && crash <= 0) { vy = 150; } };
  const tick = (dt: number) => {
    now += dt;
    const W = pc.w; if (!W) return;
    if (crash > 0) {
      crash -= dt;
      if (crash <= 0) reset();
    } else {
      speed = Math.min(128, speed + dt * 1.6);
      const dx = speed * dt;
      dist += dx; hills += dx * 0.25; pebble += dx;
      for (const c of clouds) c[0] -= dx * 0.12;
      clouds = clouds.filter((c) => c[0] > -14);
      if (clouds.length < 3 && Math.random() < dt * 0.6) clouds.push([W + 2, 8 + Math.random() * 18]);
      for (const o of obs) o.x -= dx;
      obs = obs.filter((o) => o.x > -10);
      gap -= dx;
      if (gap <= 0) {
        const r = Math.random();
        obs.push({ x: W + 4, kind: r < 0.5 ? 0 : r < 0.82 ? 1 : 2 });
        gap = 52 + Math.random() * 70 + speed * 0.35;
      }
      // физика прыжка
      if (y > 0 || vy > 0) { y += vy * dt; vy -= 520 * dt; if (y <= 0) { y = 0; vy = 0; } }
      // автопилот, пока игрок не трогал
      const next = obs.find((o) => o.x + size(o)[0] > CX);
      if (auto() && next && y === 0) { const d = next.x - (CX + 8); if (d < speed * 0.15 + 3 && d > -2) doJump(); }
      // столкновение считается, только когда играет человек
      if (!auto() && next) {
        const [w, h] = size(next);
        if (next.x < CX + 6 && next.x + w > CX + 2 && y < h - 1) crash = 0.9;
      }
      ft += dt; if (ft > 0.09) { ft = 0; frame ^= 1; }
    }
    best = Math.max(best, dist / 6);
    const off = !auto();
    if (off !== hintOff) { hintOff = off; hint.classList.toggle('is-off', off); }
    const hs = `${ui.hi.toUpperCase()} ${pad(best)}`, ss = pad(dist / 6);
    if (hs !== hiEl.textContent) hiEl.textContent = hs;
    if (ss !== scEl.textContent) scEl.textContent = ss;
    // кадр
    pc.clear(P.s0);
    for (const c of clouds) pc.sprite(CLOUD, Math.round(c[0]), Math.round(c[1]), { d: P.s1 });
    // дальние холмы ступеньками
    for (let x = 0; x < W; x++) {
      const u = (x + hills) / 64 * Math.PI * 2;
      const h = Math.round(7 + Math.sin(u) * 4 + Math.sin(u * 2.3) * 2);
      pc.rect(x, GROUND - h, 1, h, P.s1);
    }
    pc.rect(0, GROUND, W, 1, P.fg);
    pc.rect(0, GROUND + 1, W, pc.h - GROUND - 1, P.s1);
    const span = W + 40;
    for (const [ox, oy, ow] of PEBBLES) {
      const px = Math.round((((ox * span - pebble) % span) + span) % span) - 20;
      pc.rect(px, GROUND + oy, ow, 1, P.s2);
    }
    for (const o of obs) {
      const [, h] = size(o);
      if (o.kind === 0) pc.sprite(BUG, Math.round(o.x), GROUND - h, { p: P.pk, k: P.s0 });
      else { pc.sprite(CRATE, Math.round(o.x), GROUND - 6, { f: P.fg }); if (o.kind === 2) pc.sprite(CRATE, Math.round(o.x), GROUND - 12, { f: P.fgDark }); }
    }
    const spr = crash > 0 ? DEAD : y > 0 ? JUMP : frame ? RUN1 : RUN2;
    const visible = crash <= 0 || Math.floor(crash * 10) % 2 === 0;
    if (visible) pc.sprite(spr, CX, Math.round(GROUND - 10 - y), { a: P.ac, o: P.s0, p: P.pk, x: P.pk });
    if (crash > 0.75) pc.rect(0, 0, W, 2, P.pk);
    pc.flush();
  };
  const lp = loop((dt) => tick(dt));
  return {
    dwell: 6.5,
    play() { pc.fit(); reset(); now = 0; lastInput = -99; clouds = [[30, 10], [110, 20]]; lp.start(); },
    stop() { lp.stop(); },
    resize() { pc.fit(); },
    jump() { lastInput = now; doJump(); },
  };
}

export function buildWidgets(slots: HTMLElement[], ui: WidgetUI): Widget[] {
  const map: Record<string, (r: HTMLElement) => Widget> = {
    sites, apps, bots: (r) => bots(r, ui), cube, game: (r) => game(r, ui), ui: (r) => kit(r, ui), spec: (r) => spec(r, ui),
  };
  return slots.map((s) => map[s.dataset.svcW || '']?.(s) ?? { dwell: 4, play() {}, stop() {} });
}
