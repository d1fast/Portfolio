/**
 * Зал для блока «Работы»: силуэты зрителей и ряды кресел. Считается при сборке (Works.astro),
 * в браузер уходит готовая разметка. Силуэты нарисованы в квадрате 100x100, низ (плечи) уходит за спинку кресла.
 */

// плечи и шея: общие для всех взрослых силуэтов
const SH = '<path d="M0 100C2 86 14 79 31 77C38 76 41 72 41 67H59C59 72 62 76 69 77C86 79 98 86 100 100Z"/>';
const HEAD = '<ellipse cx="50" cy="45" rx="19" ry="23"/>';
const EARS = '<ellipse cx="31" cy="48" rx="3.6" ry="6"/><ellipse cx="69" cy="48" rx="3.6" ry="6"/>';
const circles = (list: [number, number, number][]) => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');

/** Причёски и головные уборы. Внутренние линии (околыш, отворот) рисуются штрихом цвета экрана. */
export const SHAPES: Record<string, string> = {
  short: SH + HEAD + EARS + '<path d="M32 36C33 24 42 18 51 18.5C61 19 69 26 68.5 37C63 30 57 27.5 50 27.5C43 27.5 37 30 32 36Z"/>',
  bun: SH + HEAD + EARS + '<path d="M31 40C31 26 40 21 50 21C60 21 69 26 69 40C64 33 57 31 50 31C43 31 36 33 31 40Z"/>' + circles([[50, 17, 9.5]]),
  pony: SH + HEAD + EARS + '<path d="M58 38C71 43 77 57 73 79C70 69 64 61 55 57Z"/><path d="M31 40C31 26 40 21 50 21C60 21 69 26 69 40C64 33 57 31 50 31C43 31 36 33 31 40Z"/>',
  afro: SH + circles([[50, 40, 27], [26, 30, 8.5], [34, 18, 8.5], [50, 12.5, 8.5], [66, 18, 8.5], [74, 30, 8.5], [77.5, 44, 7.5], [22.5, 44, 7.5]]),
  long: SH + '<path d="M29 46C27 23 39 17.5 50 17.5C61 17.5 73 23 71 46L75 84C64 89 36 89 25 84Z"/>',
  cap: SH + HEAD + EARS + '<path d="M30 40C30 22 40 15.5 50 15.5C60 15.5 70 22 70 40Z"/><path d="M66 36.5C76 35.5 86 37.5 89.5 41C88 44.5 80 45 67 44Z"/>' + circles([[50, 15.5, 2.8]])
    + '<path class="ln" d="M30.5 39.5C42 36 58 36 69.5 39.5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  beanie: SH + HEAD + EARS + '<path d="M30 38C30 22 40 15.5 50 15.5C60 15.5 70 22 70 38Z"/><rect x="28" y="33.5" width="44" height="10" rx="4.5"/>' + circles([[50, 12, 7.5]])
    + '<path class="ln" d="M29 34C42 31.5 58 31.5 71 34" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  spiky: SH + HEAD + EARS + '<path d="M31 39L31.5 24L38 29.5L40.5 15.5L47 25L51 11.5L56 24L61 14.5L64 27L70.5 20.5L69 39Z"/>',
  curly: SH + HEAD + EARS + circles([[33.5, 33, 7.5], [39.5, 24, 7.5], [49, 19.5, 7.5], [58.5, 21.5, 7.5], [65.5, 28, 7.5], [68.5, 37, 6], [31, 41, 5.5]]),
  bald: SH + '<ellipse cx="50" cy="46" rx="19.5" ry="22.5"/><ellipse cx="30.5" cy="49" rx="4.3" ry="6.6"/><ellipse cx="69.5" cy="49" rx="4.3" ry="6.6"/>',
  bob: SH + '<path d="M28 50C26 25 39 19 50 19C61 19 74 25 72 50L73 65C66 68 34 68 27 65Z"/>',
  scarf: SH + '<path d="M28 48C26 24 38 16.5 50 16.5C62 16.5 74 24 72 48C73 62 80 72 93 82L7 82C20 72 27 62 28 48Z"/>'
    + '<path class="ln" d="M33 62C44 66 56 66 67 62" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  kid: SH + HEAD + EARS + '<path d="M32 36C33 24 42 18 51 18.5C61 19 69 26 68.5 37C63 30 57 27.5 50 27.5C43 27.5 37 30 32 36Z"/><path d="M50 21C47.5 12 54 7 60 9.5C55.5 11.5 53.5 15.5 54.5 21Z"/>',
  pigtails: SH + HEAD + EARS + '<path d="M31 40C31 26 40 21 50 21C60 21 69 26 69 40C64 33 57 31 50 31C43 31 36 33 31 40Z"/>'
    + '<ellipse cx="25.5" cy="37" rx="10.5" ry="5.5" transform="rotate(-30 25.5 37)"/><ellipse cx="74.5" cy="37" rx="10.5" ry="5.5" transform="rotate(30 74.5 37)"/>' + circles([[32, 35, 3.4], [68, 35, 3.4]]),
};

/** Роли в зале: у кого какая привычка. */
export type Act = 'popcorn' | 'whisper' | 'listen' | 'turn' | 'lean-r' | 'lean-l' | 'kid';
type Spot = null | string | [string, Act];

/* Ряды слева направо. Центр ряда стоит под экраном; крайние места уходят за края и в темноту.
   В переднем ряду середина видна и на телефоне, поэтому там самые узнаваемые зрители. */
const FRONT: Spot[] = [
  'short', null, 'long', null, 'cap', ['short', 'lean-r'], ['bob', 'lean-l'], null, ['afro', 'popcorn'], ['kid', 'kid'], null, 'beanie', null,
];
const MIDDLE: Spot[] = [
  'curly', null, 'pony', 'spiky', null, 'scarf', ['short', 'whisper'], ['long', 'listen'], null, 'bald', ['bun', 'turn'], null, ['pigtails', 'kid'], 'short', null, 'bob', 'cap',
];
const BACK: Spot[] = [
  'short', 'long', null, 'cap', 'short', null, 'afro', 'bun', null, 'short', 'pony', 'bald', null, 'long', 'beanie', null, 'curly', 'short', null, 'spiky', 'short',
];

/** Детерминированный «случай», чтобы зал при каждой сборке был одинаковым. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface Seat {
  i: number;
  /** 0 в центре ряда, 1 на краю: насколько место ниже и крупнее из-за дуги ряда */
  arc: number;
  person?: {
    shape: string;
    act?: Act;
    style: string;
    /** у кого-то рядом стоит ведро попкорна */
  };
  bucket?: boolean;
}
export interface Row { name: 'back' | 'middle' | 'front'; n: number; seats: Seat[] }

function build(name: Row['name'], spots: Spot[], seed: number): Row {
  const rand = rng(seed);
  const n = spots.length, c = (n - 1) / 2;
  const seats = spots.map((s, i): Seat => {
    const arc = r2(((i - c) / c) ** 2);
    const seat: Seat = { i, arc };
    if (!s) return seat;
    const [shape, act] = Array.isArray(s) ? s : [s, undefined];
    const kid = act === 'kid';
    const lean = act === 'lean-r' ? 6 : act === 'lean-l' ? -6 : 0;
    const vars = {
      '--bd': `${r2(5 + rand() * 5)}s`, // период покачивания
      '--dl': `${r2(-rand() * 9)}s`,
      '--tl': `${r2(lean + (rand() - 0.5) * 4)}deg`, // наклон головы
      '--sc': `${r2(kid ? 0.74 : 0.92 + rand() * 0.16)}`, // рост
      '--dx': `${r2(lean ? lean * 1.4 : (rand() - 0.5) * 8)}%`, // сдвиг в кресле
      '--dy': kid ? '14%' : `${r2((rand() - 0.5) * 8)}%`,
    };
    seat.person = { shape, act, style: Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';') };
    if (act === 'popcorn') seat.bucket = true;
    return seat;
  });
  return { name, n, seats };
}

export const ROWS: Row[] = [build('back', BACK, 7), build('middle', MIDDLE, 19), build('front', FRONT, 41)];
