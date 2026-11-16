// Render the goal-level MVP view without regenerating the existing diagram gallery.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'use-cases.json'), 'utf8'));
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ids = model.originalMapping.flatMap(row => row.originalIds).sort((a, b) => a - b);
if (ids.length !== 52 || ids.some((id, i) => id !== i + 1)) throw Error('Original UC-01..52 must each be mapped exactly once.');
if (model.useCases.length !== 9 || model.actors.length !== 3) throw Error('Unexpected MVP scope.');
const actorIds = new Set(model.actors.map(actor => actor.id));
for (const item of model.useCases) if (item.actors.some(id => !actorIds.has(id))) throw Error('Unknown actor.');
const W = 1440, H = 1060;
const shapes = [], edges = [], labels = [];
const text = (x, y, value, size = 20, anchor = 'middle', color = '#17243a', weight = 400) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
const line = points => `<path d="M ${points.map(p => p.join(' ')).join(' L ')}" fill="none" stroke="#7c8999" stroke-width="1.6"/>`;
function actor(id, x, y) {
  const item = model.actors.find(actor => actor.id === id);
  shapes.push(`<circle cx="${x}" cy="${y - 31}" r="14" fill="white" stroke="#526174" stroke-width="2"/><path d="M ${x} ${y - 17} v 44 m -30 -28 h 60 m -30 28 l -26 31 m 26 -31 l 26 31" fill="none" stroke="#526174" stroke-width="2"/>`);
  shapes.push(text(x, y + 85, item.label, 21));
  if (item.detail) shapes.push(text(x, y + 113, item.detail, 16, 'middle', '#526174'));
}
labels.push(text(45, 48, model.title, 31, 'start', '#17243a', 600));
labels.push(text(45, 82, '사용자 목표 9개 · 액터 3개 · 세부 절차와 운영 계획은 별도 명세', 19, 'start', '#526174'));
shapes.push(`<rect x="210" y="113" width="1020" height="813" rx="12" fill="#fbfcff" stroke="#64748b" stroke-width="1.8"/>`);
labels.push(text(720, 149, model.scope, 22, 'middle', '#17243a', 600));
for (const item of model.useCases) {
  const shared = item.column === 2;
  const x = shared ? 490 : item.column === 0 ? 255 : 800;
  const y = shared ? 811 : 185 + item.row * 145;
  const w = shared ? 460 : 385, h = 88;
  const cy = y + h / 2;
  shapes.push(`<ellipse cx="${x + w / 2}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="${shared ? '#eef5f7' : '#f0edff'}" stroke="#8b87a8" stroke-width="1.6"/>`);
  shapes.push(text(x + w / 2, cy - 9, item.id, 16, 'middle', '#64548e', 600));
  shapes.push(text(x + w / 2, cy + 20, item.name, 21));
  if (shared) {
    edges.push(line([[120, 330], [166, 330], [166, 942], [445, 942], [490, 855]]));
    edges.push(line([[1320, 300], [1276, 300], [1276, 942], [995, 942], [950, 855]]));
  } else if (item.actors.includes('author')) edges.push(line([[120, 330], [255, cy]]));
  else if (item.actors.includes('reviewer')) edges.push(line([[1320, 300], [1185, cy]]));
  else edges.push(line([[1320, 675], [1185, cy]]));
}
actor('author', 90, 330);
actor('reviewer', 1350, 300);
actor('verifier', 1350, 675);
labels.push(text(720, 772, '승인 후 증명서 생성은 UC-04의 결과이며, 조회·다운로드는 UC-09에서 수행', 16, 'middle', '#526174'));
labels.push(text(45, 993, '실선: 역할의 참여 관계 · 처리 순서를 뜻하지 않음', 18, 'start', '#526174'));
labels.push(text(45, 1024, 'QR: 서명 없는 발급 당시 요약 / 파일 비교: 선택 / 다른 기기의 최신 효력·서버 서명: 운영 계획', 18, 'start', '#526174'));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">${escape(model.title)}</title><desc id="desc">작성자, 최종 승인을 겸하는 검토자, 검증자와 수신자의 사용자 목표 아홉 개를 보여 주는 현재 로컬 MVP 유스케이스 개요.</desc><rect width="100%" height="100%" fill="white"/><g font-family="Malgun Gothic, sans-serif">${shapes[0]}${edges.join('')}${shapes.slice(1).join('')}${labels.join('')}</g></svg>`;
fs.writeFileSync(path.join(__dirname, 'use-cases.svg'), svg);
(async () => {
  const dep = process.env.DIAGRAM_NODE_MODULES ? createRequire(path.join(process.env.DIAGRAM_NODE_MODULES, '__diagram__.cjs')) : require;
  const { chromium } = dep('playwright');
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, headless: true } : { channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>${svg}</html>`);
    await page.evaluate(() => document.fonts.ready);
    const report = await page.locator('svg').evaluate(svg => {
      const overflow = [...svg.querySelectorAll('text')].filter(node => { const b = node.getBBox(); return b.x < 0 || b.y < 0 || b.x + b.width > 1440 || b.y + b.height > 1060; }).map(node => node.textContent);
      return { textCount: svg.querySelectorAll('text').length, ellipseCount: svg.querySelectorAll('ellipse').length, overflow };
    });
    if (report.overflow.length) throw Error(`Clipped labels: ${report.overflow.join(', ')}`);
    await page.locator('svg').screenshot({ path: path.join(__dirname, 'use-cases.png') });
    console.log(JSON.stringify({ ...report, originalRequirementsMapped: ids.length, svg: 'use-cases.svg', png: 'use-cases.png' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
