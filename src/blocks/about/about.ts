import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { SplitText } from 'gsap/SplitText';
import { watchBlock, splitLines, wrap, type Player } from '../../scripts/block';

gsap.registerPlugin(DrawSVGPlugin, Draggable, InertiaPlugin, SplitText);

// почерк открывается слева направо; запас по краям, чтобы хвосты букв Caveat не резались
const HIDE = 'inset(-30% 100% -45% -12%)';
const SHOW = 'inset(-30% -12% -45% -12%)';

type Writer = Player & { dur(): number };

/** Рукописная строка: каждая строка текста «пишется» слева направо, следующая после предыдущей. */
function handwrite(el: HTMLElement, speed = 0.034): Writer {
  let tl: gsap.core.Timeline | undefined;
  SplitText.create(el, {
    type: 'lines', linesClass: 'about__wl', autoSplit: true, aria: 'none',
    onSplit(self) {
      const running = !!tl && !tl.paused();
      tl = gsap.timeline({ paused: true });
      for (const ln of self.lines as HTMLElement[]) {
        const len = (ln.textContent || '').trim().length;
        tl.fromTo(ln, { clipPath: HIDE }, { clipPath: SHOW, duration: Math.max(0.3, len * speed), ease: 'sine.inOut', immediateRender: true });
      }
      if (running) { const t = tl; gsap.delayedCall(0, () => t.play()); }
      return tl;
    },
  });
  return {
    play: (delay = 0) => { if (tl) { tl.delay(delay); tl.restart(true); } },
    reset: () => { tl?.pause(0); },
    dur: () => tl?.duration() ?? 0.8,
  };
}

/** Штрих рисуется рукой. */
const idle: Player = { play() {}, reset() {} };
const draw = (paths: Element[], duration = 0.6, ease = 'power2.inOut'): Player =>
  paths.length ? wrap(gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration, ease, stagger: duration * 0.85, paused: true })) : idle;

/**
 * Обо мне: заголовок поднимается по буквам и первую букву обводит рука, полароид падает на
 * страницу, его прихватывает скотч, снимок проявляется. Лид по строкам, ник подчёркивается,
 * пометки пишутся от руки, к каждой дорисовывается каракуля. Наклейки шлёпаются с отскоком,
 * их можно таскать и бросать по блоку.
 */
export function init(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const later: gsap.core.Tween[] = [];
  const after = (t: number, fn: () => void) => later.push(gsap.delayedCall(t, fn));
  // анимации от действий пользователя: их гасим при уходе, анимации входа не трогаем
  const fx = new Set<gsap.core.Animation>();
  const own = <T extends gsap.core.Animation>(a: T) => { fx.add(a); a.eventCallback('onComplete', () => fx.delete(a)); return a; };
  let active = false;

  /* ---------- заголовок ---------- */
  const chars = q<HTMLElement>('.about__ch');
  const title = wrap(gsap.fromTo(chars, { yPercent: 118, rotation: 10 }, { yPercent: 0, rotation: 0, duration: 1, ease: 'expo.out', stagger: 0.05, paused: true }));
  const ring = draw(q('[data-about-ring]'), 0.8, 'power2.inOut');
  let titleDone = false;
  // буквы подпрыгивают под мышью, когда заголовок уже собран
  if (fine.matches) {
    chars.forEach((ch) => ch.addEventListener('pointerenter', () => {
      if (!titleDone || ch.dataset.hop) return;
      ch.dataset.hop = '1';
      own(gsap.timeline({ onComplete: () => { delete ch.dataset.hop; } }))
        .to(ch, { yPercent: -16, rotation: gsap.utils.random(-8, 8), duration: 0.16, ease: 'power2.out' })
        .to(ch, { yPercent: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1.1, .35)' });
    }));
  }

  /* ---------- полароид ---------- */
  const drop = q<HTMLElement>('[data-about-drop]')[0];
  const swing = q<HTMLElement>('[data-about-swing]')[0];
  const tape = q('[data-about-tape]');
  const dev = q('[data-about-dev]');
  const photoIn = wrap(gsap.timeline({ paused: true })
    .fromTo(drop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'none', immediateRender: true }, 0)
    .fromTo(drop, { y: -70, scale: 1.18, rotation: -11 }, { y: 0, scale: 1, rotation: 0, duration: 1, ease: 'back.out(1.5)', immediateRender: true }, 0)
    .fromTo(tape, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: 'power3.out', immediateRender: true }, 0.62)
    .fromTo(dev, { opacity: 1 }, { opacity: 0, duration: 2.4, ease: 'power2.inOut', immediateRender: true }, 0.7));
  const nameW = handwrite(q<HTMLElement>('[data-about-write]')[0], 0.05);

  // пружина: полароид висит на скотче, мышь его раскачивает, потом он успокаивается
  let ang = 0, vel = 0, target = 0, raf = 0, last = 0;
  const K = 52, C = 3.6;
  const tick = (now: number) => {
    const dt = Math.min(0.034, (now - last) / 1000 || 0.016);
    last = now;
    vel += (-K * (ang - target) - C * vel) * dt;
    vel = gsap.utils.clamp(-80, 80, vel);
    ang += vel * dt;
    swing.style.transform = `rotate(${ang.toFixed(3)}deg)`;
    if (Math.abs(ang - target) < 0.004 && Math.abs(vel) < 0.01) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (!raf && active) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const kick = (v: number) => { vel += v; wake(); };
  const stopSwing = () => { cancelAnimationFrame(raf); raf = 0; ang = vel = target = 0; swing.style.transform = ''; };
  root.addEventListener('pointermove', (e) => {
    if (!active || e.pointerType !== 'mouse') return;
    const r = swing.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    target = gsap.utils.clamp(-3.5, 3.5, ((e.clientX - cx) / r.width) * 2.6);
    // мышь задела снимок: толкаем его по ходу движения
    if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) vel += gsap.utils.clamp(-9, 9, e.movementX * 0.6);
    wake();
  });
  root.addEventListener('pointerleave', () => { target = 0; wake(); });
  let side = 1;
  swing.addEventListener('click', () => { side = -side; kick(side * 70); });

  /* ---------- текст ---------- */
  const leadEl = q<HTMLElement>('[data-about-lead]')[0];
  const lead = splitLines(leadEl, { stagger: 0.08, duration: 1 });
  const nickLine = wrap(gsap.fromTo(leadEl, { '--u': 0 }, { '--u': 1, duration: 0.7, ease: 'power2.inOut', paused: true, immediateRender: true }));

  const noteItems = q<HTMLElement>('[data-about-note-item]');
  const notes = noteItems.map((li) => {
    const w = handwrite(li.querySelector<HTMLElement>('[data-about-note]')!);
    const doodle = draw([...li.querySelectorAll('[data-about-doodle]')], 0.55);
    const alt = draw([...li.querySelectorAll('[data-about-doodle-alt]')], 0.4);
    if (fine.matches) li.addEventListener('pointerenter', () => { if (titleDone) doodle.play(0); });
    return { w, doodle, alt };
  });
  const hint = handwrite(q<HTMLElement>('[data-about-hint]')[0], 0.04);
  const hintArrow = draw(q('[data-about-hint-arrow]'), 0.4);

  /* ---------- наклейки ---------- */
  const desk = q<HTMLElement>('[data-about-desk]')[0];
  const stickers = q<HTMLElement>('[data-about-sticker]');
  const ins = stickers.map((s) => s.querySelector<HTMLElement>('.about__st-in')!);
  const slap = wrap(gsap.timeline({ paused: true })
    .fromTo(ins, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14, stagger: 0.16, ease: 'none', immediateRender: true }, 0)
    .fromTo(ins, { scale: 1.9, rotation: (i) => [-34, 28, -26][i % 3], y: -24 }, { scale: 1, rotation: 0, y: 0, duration: 1.05, stagger: 0.16, ease: 'elastic.out(1, .48)', immediateRender: true }, 0));

  const hops = new WeakMap<HTMLElement, gsap.core.Animation>();
  const hop = (el: HTMLElement) => {
    hops.get(el)?.kill();
    hops.set(el, own(gsap.timeline()
      .to(el, { y: -26, rotation: gsap.utils.random(-16, 16), scale: 1.06, duration: 0.17, ease: 'power2.out' })
      .to(el, { y: 0, rotation: 0, scale: 1, duration: 0.8, ease: 'elastic.out(1.1, .32)' })));
  };

  let z = 10;
  // на сайте свой курсор для мыши: системную руку поверх него не показываем
  const custom = document.documentElement.classList.contains('has-cursor');
  const tilts: ReturnType<typeof gsap.quickTo>[] = [];
  const drags = stickers.map((btn, i) => {
    const inner = ins[i];
    const tilt = gsap.quickTo(inner, 'rotation', { duration: 0.4, ease: 'power3.out' });
    tilts.push(tilt);
    let lift: gsap.core.Tween | undefined;
    const scaleTo = (v: number, dur: number, ease: string) => { lift?.kill(); lift = own(gsap.to(inner, { scale: v, duration: dur, ease })); };
    const lean = () => tilt(gsap.utils.clamp(-24, 24, InertiaPlugin.getVelocity(btn, 'x') / 40));
    const [d] = Draggable.create(btn, {
      type: 'x,y', bounds: desk, inertia: true, dragClickables: true, edgeResistance: 0.85, minimumMovement: 4, zIndexBoost: false,
      cursor: custom ? 'none' : 'grab', activeCursor: custom ? 'none' : 'grabbing',
      onPress() {
        this.applyBounds(desk);
        btn.style.zIndex = String(++z);
        btn.classList.add('is-lifted');
        hops.get(inner)?.kill();
        scaleTo(1.1, 0.25, 'power3.out');
      },
      onDrag: lean,
      onThrowUpdate: lean,
      onRelease() {
        btn.classList.remove('is-lifted');
        scaleTo(1, 0.7, 'elastic.out(1, .45)');
        if (!this.isThrowing) tilt(0);
      },
      onThrowComplete() { tilt(0); },
      onClick() { hop(inner); },
    });
    // с клавиатуры наклейка подпрыгивает
    btn.addEventListener('click', (e) => { if (e.detail === 0) hop(inner); });
    return d;
  });
  const homeStickers = () => {
    drags.forEach((d, i) => {
      gsap.killTweensOf(stickers[i]);
      gsap.set(stickers[i], { x: 0, y: 0 });
      stickers[i].style.zIndex = '';
      stickers[i].classList.remove('is-lifted');
      d.update();
    });
  };
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; homeStickers(); } }, { passive: true });

  const all: Player[] = [title, ring, photoIn, nameW, lead, nickLine, slap, hint, hintArrow, ...notes.flatMap((n) => [n.w, n.doodle, n.alt])];

  watchBlock(root, () => {
    active = true;
    titleDone = false;
    title.play(0);
    ring.play(0.55);
    photoIn.play(0.05);
    after(0.62, () => kick(-45));
    lead.play(0.32);
    nickLine.play(1.15);
    nameW.play(1.25);
    let t = 0.95;
    notes.forEach((n) => {
      n.w.play(t);
      n.doodle.play(t + n.w.dur() - 0.05);
      n.alt.play(t + n.w.dur() - 0.05);
      t += 0.42;
    });
    slap.play(1.35);
    hint.play(2.05);
    hintArrow.play(2.05 + hint.dur());
    after(2.2, () => { titleDone = true; });
  }, () => {
    active = false;
    titleDone = false;
    later.splice(0).forEach((c) => c.kill());
    stopSwing();
    homeStickers();
    fx.forEach((a) => a.kill());
    fx.clear();
    tilts.forEach((t) => t.tween.pause());
    chars.forEach((ch) => { delete ch.dataset.hop; });
    all.forEach((p) => p.reset());
  });
}
