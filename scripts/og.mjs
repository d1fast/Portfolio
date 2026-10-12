// Картинки для ссылок и иконки: node scripts/og.mjs (нужен запущенный npm run dev для шрифтов).
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:4321/';
const exe = ['/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
// Шрифты встраиваются как data-URI: страница рендерится из about:blank, и внешние адреса не подходят.
const fontCss = fs.readFileSync('src/styles/fonts.generated.css', 'utf8')
  .split('\n').filter((l) => /Unbounded|Golos Text|JetBrains Mono/.test(l) && !/italic/.test(l))
  .map((l) => l.replace(/url\(\/fonts\/([^)]+)\)/, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync('public/fonts/' + f).toString('base64')})`))
  .join('\n');

const page = (w, h, scale = 1) => browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });

const og = (lang) => {
  const ru = lang === 'ru';
  const name = ru ? ['САВЕЛИЙ', 'ЛОПАТИН'] : ['SAVELIY', 'LOPATIN'];
  const tag = ru ? 'Сайты, 3D, небольшие игры и интерфейсы. От идеи до запуска.' : 'Websites, 3D, small games and interfaces. From idea to launch.';
  const stamp = ru ? ['Наим.', 'Савелий Лопатин, сайт', 'Разраб.', 'Лопатин С.', 'Лист', '1 / 6'] : ['Title', 'Saveliy Lopatin, site', 'Drawn by', 'S. Lopatin', 'Sheet', '1 / 6'];
  return `<!doctype html><html><head><base href="${base}"><meta charset="utf-8">
  <style>${fontCss}</style>
  <style>
    html,body{margin:0;width:1200px;height:630px;background:#050505;color:#F4F6F0;font-family:'Golos Text',sans-serif;overflow:hidden}
    .sheet{position:absolute;inset:22px;border:1px solid rgba(244,246,240,.5)}
    .c{position:absolute;width:16px;height:16px}
    .c::before,.c::after{content:'';position:absolute;background:#F4F6F0}.c::before{width:16px;height:1px;top:8px}.c::after{height:16px;width:1px;left:8px}
    .tl{left:14px;top:14px}.tr{right:14px;top:14px}.bl{left:14px;bottom:14px}.br{right:14px;bottom:14px}
    .grid{position:absolute;inset:22px;background-image:radial-gradient(rgba(244,246,240,.26) 1px,transparent 1.1px);background-size:32px 32px;mask-image:radial-gradient(ellipse 80% 70% at 50% 50%,#000 40%,transparent 100%);opacity:.6}
    .name{position:absolute;left:64px;top:150px;font:900 124px/.9 'Unbounded';letter-spacing:-.035em}
    .dim{position:absolute;left:64px;top:126px;width:var(--w);height:1px;background:#D7FF00}
    .dim::before,.dim::after{content:'';position:absolute;top:-5px;width:1px;height:11px;background:#D7FF00}.dim::before{left:0}.dim::after{right:0}
    .dim b{position:absolute;left:50%;top:-17px;transform:translateX(-50%);background:#050505;padding:0 8px;font:500 15px/1 'JetBrains Mono';color:#D7FF00}
    .dot{position:absolute;left:64px;top:64px;display:flex;align-items:center;gap:12px;font:600 22px/1 'JetBrains Mono'}
    .dot i{width:12px;height:12px;border-radius:50%;background:#D7FF00;box-shadow:0 0 0 5px rgba(215,255,0,.22)}
    .tag{position:absolute;left:64px;bottom:92px;font:500 28px/1.3 'Golos Text';max-width:720px}
    .stamp{position:absolute;right:22px;bottom:22px;display:flex;border:1px solid rgba(244,246,240,.5);border-right:0;border-bottom:0;background:#050505;font:500 15px/1 'JetBrains Mono'}
    .stamp span{padding:12px 16px;border-right:1px solid rgba(244,246,240,.5)}.stamp span:last-child{border-right:0}.stamp b{font-weight:500;opacity:.5;margin-right:8px}
  </style></head><body>
  <div class="grid"></div><div class="sheet"></div>
  <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
  <div class="dot"><i></i>d1fast</div>
  <div class="dim" id="dim"><b id="dimlabel"></b></div>
  <h1 class="name" id="name">${name[0]}<br>${name[1]}</h1>
  <p class="tag">${tag}</p>
  <div class="stamp"><span><b>${stamp[0]}</b>${stamp[1]}</span><span><b>${stamp[2]}</b>${stamp[3]}</span><span><b>${stamp[4]}</b>${stamp[5]}</span></div>
  <script>document.fonts.ready.then(()=>{const r=document.getElementById('name').getBoundingClientRect();const d=document.getElementById('dim');d.style.setProperty('--w',r.width+'px');document.getElementById('dimlabel').textContent=Math.round(r.width).toLocaleString('ru-RU')+' px';document.body.dataset.ready='1'})</script>
  </body></html>`;
};

for (const lang of ['ru', 'en']) {
  const p = await page(1200, 630);
  await p.setContent(og(lang), { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.body.dataset.ready === '1');
  await p.evaluate(() => Promise.all([document.fonts.load('900 150px Unbounded'), document.fonts.load('500 30px "Golos Text"'), document.fonts.load('500 15px "JetBrains Mono"')]));
  await p.evaluate(() => { const r = document.getElementById('name').getBoundingClientRect(); const d = document.getElementById('dim'); d.style.setProperty('--w', r.width + 'px'); document.getElementById('dimlabel').textContent = Math.round(r.width).toLocaleString('ru-RU') + ' px'; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `public/${lang === 'ru' ? 'og' : 'og-en'}.png` });
  await p.close();
  console.log('og', lang);
}

// Иконка: чёрный квадрат, лаймовая точка с перекрестием
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#050505"/><g stroke="#F4F6F0" stroke-width="2" opacity=".55"><line x1="32" y1="8" x2="32" y2="22"/><line x1="32" y1="42" x2="32" y2="56"/><line x1="8" y1="32" x2="22" y2="32"/><line x1="42" y1="32" x2="56" y2="32"/></g><circle cx="32" cy="32" r="9" fill="#D7FF00"/></svg>`;
fs.writeFileSync('public/favicon.svg', iconSvg);
for (const [file, size] of [['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const p = await page(size, size, 1);
  await p.setContent(`<html><body style="margin:0;background:#050505">${iconSvg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `public/${file}`, omitBackground: false });
  await p.close();
}
fs.writeFileSync('public/site.webmanifest', JSON.stringify({ name: 'd1fast', short_name: 'd1fast', start_url: '/', display: 'browser', background_color: '#050505', theme_color: '#050505', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2));
await browser.close();
console.log('icons done');
