// Canonical source: model.json. Reuses the existing renderer without running its gallery build.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { sceneSVG, sequenceSVG, sequenceMermaid } = require('../../render.cjs');
const root = __dirname;
const model = JSON.parse(fs.readFileSync(path.join(root, 'model.json'), 'utf8'));
const classes = new Map(model.classes.map(item => [item.id, item]));
const methodExists = reference => {
  const [classId, operation] = reference.split('.');
  return classes.get(classId)?.operations.some(item => item.name === operation);
};
const failures = [];
const covered = new Set();
for (const diagram of model.diagrams) {
  for (const id of diagram.useCases) if (!model.useCases.includes(id)) failures.push(`${diagram.id}: unknown UC ${id}`);
  if (diagram.kind === 'sequence') {
    diagram.useCases.forEach(id => covered.add(id));
    const participants = new Map(diagram.data.participants.map(item => [item.id, item]));
    for (const item of participants.values()) if (item.classId && !classes.has(item.classId)) failures.push(`${diagram.id}: unknown participant type`);
    let nesting = 0;
    for (const event of diagram.data.events) {
      if (event.type === 'block') nesting++;
      if (event.type === 'end') nesting--;
      if (nesting < 0) failures.push(`${diagram.id}: unbalanced fragment`);
      if (event.call) {
        if (!methodExists(event.call)) failures.push(`${diagram.id}: missing operation ${event.call}`);
        if (participants.get(event.to)?.classId !== event.call.split('.')[0]) failures.push(`${diagram.id}: receiver mismatch ${event.call}`);
      }
    }
    if (nesting !== 0) failures.push(`${diagram.id}: unclosed fragment`);
  }
  for (const reference of diagram.operationRefs || []) if (!methodExists(reference)) failures.push(`${diagram.id}: transition operation missing ${reference}`);
}
if (model.useCases.some(id => !covered.has(id))) failures.push('Not all nine UCs have a sequence scenario.');
if (failures.length) throw Error(failures.join('\n'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function hydrate(scene) {
  const result = structuredClone(scene);
  for (const node of result.nodes) if (node.classId) {
    const data = classes.get(node.classId);
    if (!data) throw Error('Unknown scene class: ' + node.classId);
    node.type = 'class';
    node.title = data.id + ' · ' + data.label;
    node.attributes = data.attributes;
    node.operations = data.operations.map(item => '+ ' + item.signature);
    node.h = Math.max(node.h || 0, 65 + data.attributes.length * 26 + (data.operations.length ? 35 + data.operations.length * 26 : 5));
  }
  return result;
}
function classMermaid(diagram) {
  const lines = ['classDiagram'];
  for (const node of diagram.scene.nodes.filter(item => item.classId)) {
    const item = classes.get(node.classId);
    lines.push(`    class ${item.id} {`);
    for (const attribute of item.attributes) lines.push('        ' + attribute.replaceAll('<', '~').replaceAll('>', '~'));
    for (const operation of item.operations) lines.push('        +' + operation.signature);
    lines.push('    }');
  }
  for (const rel of diagram.relations || []) lines.push(`    ${rel.from} "${rel.fromMultiplicity || ''}" ${rel.dependency ? '..>' : '--'} "${rel.toMultiplicity || ''}" ${rel.to} : ${rel.label}`);
  return lines.join('\n') + '\n';
}
async function main() {
  const requested = new Set(process.argv.slice(2));
  for (const id of requested) if (!model.diagrams.some(item => item.id === id)) throw Error('Unknown diagram: ' + id);
  const selected = requested.size ? model.diagrams.filter(item => requested.has(item.id)) : model.diagrams;
  fs.mkdirSync(path.join(root, 'images'), { recursive: true });
  fs.mkdirSync(path.join(root, 'sources'), { recursive: true });
  const dep = process.env.DIAGRAM_NODE_MODULES ? createRequire(path.join(process.env.DIAGRAM_NODE_MODULES, '__diagram__.cjs')) : require;
  const { chromium } = dep('playwright');
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, headless: true } : { channel: 'chrome', headless: true });
  const checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 2 });
    for (const diagram of selected) {
      const scene = diagram.kind === 'scene' ? hydrate(diagram.scene) : null;
      const svg = scene ? sceneSVG(scene) : sequenceSVG(diagram.data);
      fs.writeFileSync(path.join(root, 'images', diagram.id + '.svg'), svg);
      fs.writeFileSync(path.join(root, 'sources', diagram.id + '.json'), JSON.stringify(scene || diagram.data, null, 2) + '\n');
      const mermaid = diagram.kind === 'sequence' ? sequenceMermaid(diagram.data) : diagram.mermaid || (diagram.category === 'Class' ? classMermaid(diagram) : null);
      if (mermaid) fs.writeFileSync(path.join(root, 'sources', diagram.id + '.mmd'), mermaid);
      await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block}</style>${svg}</html>`);
      await page.evaluate(() => document.fonts.ready);
      const report = await page.locator('svg').evaluate(svg => {
        const vb = svg.viewBox.baseVal;
        const clipped = [...svg.querySelectorAll('text')].filter(node => { const b = node.getBBox(); return b.x < 0 || b.y < 0 || b.x + b.width > vb.width || b.y + b.height > vb.height; }).map(node => node.textContent);
        const classOverflow = [];
        for (const node of svg.querySelectorAll('text')) {
          const b = node.getBBox();
          if (node.textContent.startsWith('+ ') && b.width > 745) classOverflow.push(node.textContent);
        }
        return { width: vb.width, height: vb.height, clipped, classOverflow };
      });
      if (report.clipped.length) throw Error(`${diagram.id}: clipped labels: ${report.clipped.join('; ')}`);
      await page.locator('svg').screenshot({ path: path.join(root, 'images', diagram.id + '.png') });
      checks.push({ id: diagram.id, checkedOn: model.date, ...report });
    }
  } finally { await browser.close(); }
  const previousPath = path.join(root, 'validation.json');
  const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : { diagrams: [] };
  const reports = new Map(previous.diagrams.map(item => [item.id, { checkedOn: previous.date, ...item }]));
  for (const check of checks) reports.set(check.id, check);
  fs.writeFileSync(previousPath, JSON.stringify({ date: model.date, sequenceCoverage: [...covered].sort(), operationConsistency: 'PASS', renderedThisRun: checks.map(item => item.id), diagrams: model.diagrams.map(item => reports.get(item.id)).filter(Boolean) }, null, 2) + '\n');
  const cards = model.diagrams.map(item => `<section id="${item.id}"><p class="tag">${item.category} · ${item.useCases.join(' / ')}</p><h2>${escape(item.title)}</h2><p>${escape(item.summary)}</p><a href="images/${item.id}.svg"><img src="images/${item.id}.svg" alt="${escape(item.title)}"></a><p><a href="images/${item.id}.png">PNG</a> · <a href="images/${item.id}.svg">SVG</a> · <a href="sources/${item.id}.mmd">Mermaid</a></p></section>`).join('');
  fs.writeFileSync(path.join(root, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HAVE UML · 9개 유스케이스</title><style>body{margin:0;background:#f6f8fc;color:#17243a;font-family:'Malgun Gothic',sans-serif}main{max-width:1500px;margin:auto;padding:32px}p{line-height:1.8}nav{display:flex;flex-wrap:wrap;gap:16px;margin:24px 0}a{color:#5143a0}section{background:white;border:1px solid #d8dfe9;border-radius:8px;padding:24px;margin:28px 0}img{display:block;width:100%;height:auto}.tag{color:#526174}h2{margin:8px 0}@media(max-width:600px){main{padding:14px}section{padding:12px}}</style></head><body><main><h1>HAVE · 유스케이스에서 도출한 UML</h1><p>${escape(model.scope)}<br>${model.date} · 현재 9개 유스케이스 · 클래스 / 시퀀스 / 상태 / 활동<br><a href="README.md">모델 설명·추적성·강의 근거</a> · <a href="model.json">수정 원본</a></p><nav>${model.diagrams.map(item => `<a href="#${item.id}">${escape(item.id)}</a>`).join('')}</nav>${cards}</main></body></html>`);
  console.log(JSON.stringify({ rendered: checks.length, sequenceCoverage: [...covered].sort(), operationConsistency: 'PASS' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
