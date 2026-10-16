/**
 * Луч проектора: из будки над зрителем (под шапкой сайта) веером к экрану. Мягкий конус, несколько
 * лучей поярче и пылинки, которые медленно плавают в свете. Холст занимает только рамку луча
 * и рисуется из общего тикера блока, пока блок на экране.
 */
type Mote = { u: number; w: number; v: number; dv: number; s: number; p: number; f: number };

export interface Beam {
  /** 0..1: насколько горит лампа (вход блока анимирует) */
  state: { on: number };
  measure(): void;
  draw(t: number): void;
  clear(): void;
  color(rgb: [number, number, number]): void;
}

export function createBeam(canvas: HTMLCanvasElement, inner: HTMLElement, screen: HTMLElement): Beam {
  const ctx = canvas.getContext('2d');
  const state = { on: 0 };
  let W = 0, H = 0;
  // в координатах холста: вершина луча и прямоугольник экрана
  let ax = 0, ay = 0, l = 0, t = 0, r = 0, b = 0;
  let rgb: [number, number, number] = [235, 228, 214];
  const motes: Mote[] = Array.from({ length: 64 }, () => ({
    u: Math.random(), w: Math.random(), v: 0.05 + Math.random() * 0.9,
    dv: (Math.random() - 0.5) * 0.012, s: 0.5 + Math.random() * 1.3, p: Math.random() * 6.28, f: 0.4 + Math.random() * 1.2,
  }));

  const measure = () => {
    const ir = inner.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    if (!sr.width || !ir.width) { W = 0; return; }
    const sl = sr.left - ir.left, st = sr.top - ir.top;
    const pad = Math.ceil(sr.width * 0.04);
    const left = Math.max(0, Math.floor(sl - pad)), right = Math.ceil(sl + sr.width + pad);
    W = right - left; H = Math.ceil(st + sr.height);
    canvas.style.left = `${left}px`;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = W; canvas.height = H;
    ax = sl + sr.width / 2 - left; ay = Math.min(st * 0.12, 20);
    l = sl - left; r = l + sr.width; t = st; b = st + sr.height;
  };

  const col = (a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(4)})`;

  const draw = (time: number) => {
    if (!ctx || !W) return;
    ctx.clearRect(0, 0, W, H);
    const on = state.on;
    if (on <= 0.001) return;
    // лампа дышит: две медленные волны и редкие провалы
    const fl = 0.9 + 0.05 * Math.sin(time * 11.3) + 0.04 * Math.sin(time * 29.1 + 1.3) - (Math.sin(time * 1.7) > 0.985 ? 0.12 : 0);
    const k = on * fl;
    const R = Math.hypot(Math.max(ax - l, r - ax), b - ay);
    ctx.globalCompositeOperation = 'lighter';
    // конус
    const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, R);
    g.addColorStop(0, col(0.3 * k));
    g.addColorStop(0.25, col(0.13 * k));
    g.addColorStop(0.6, col(0.05 * k));
    g.addColorStop(1, col(0.012 * k));
    ctx.fillStyle = g;
    // мягкий край: два контура, внешний чуть шире и вдвое слабее
    for (const [sp, a] of [[0.035, 0.5], [0, 0.5]] as const) {
      const dx = (r - l) * sp;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(l - dx, t); ctx.lineTo(l - dx, b); ctx.lineTo(r + dx, b); ctx.lineTo(r + dx, t);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // лучи поярче внутри конуса
    for (let i = 0; i < 5; i++) {
      const c = (i + 0.5) / 5 + 0.05 * Math.sin(time * 0.23 + i * 1.9);
      const x = l + (r - l) * c, hw = (r - l) * (0.018 + 0.012 * Math.sin(time * 0.4 + i * 2.3));
      const gr = ctx.createLinearGradient(ax, ay, x, b);
      gr.addColorStop(0, col(0.12 * k));
      gr.addColorStop(0.5, col(0.03 * k));
      gr.addColorStop(1, col(0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(x - hw, b); ctx.lineTo(x + hw, b);
      ctx.closePath();
      ctx.fill();
    }
    // пыль: каждая пылинка висит на своём луче и медленно плывёт вдоль него, ярче ближе к будке
    for (const m of motes) {
      m.v += m.dv * 0.016;
      if (m.v < 0.04 || m.v > 0.95) m.dv = -m.dv;
      m.u += Math.sin(time * 0.3 + m.p) * 0.00025;
      const tx = l + (r - l) * m.u, ty = t + (b - t) * m.w;
      const x = ax + (tx - ax) * m.v + Math.sin(time * m.f + m.p) * 3;
      const y = ay + (ty - ay) * m.v + Math.cos(time * m.f * 0.8 + m.p) * 2;
      const tw = 0.55 + 0.45 * Math.sin(time * (1.5 + m.f) + m.p * 3);
      const a = k * tw * Math.pow(1 - m.v, 1.1) * 0.75;
      if (a < 0.01) continue;
      ctx.fillStyle = col(a);
      ctx.fillRect(x, y, m.s, m.s);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  return {
    state, measure, draw,
    clear: () => { if (ctx && W) ctx.clearRect(0, 0, W, H); },
    color: (c) => { rgb = [Math.round(c[0] * 0.45 + 235 * 0.55), Math.round(c[1] * 0.45 + 228 * 0.55), Math.round(c[2] * 0.45 + 214 * 0.55)]; },
  };
}
