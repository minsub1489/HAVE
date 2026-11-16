const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const model = require('./model.json');
const patterns = require('./class-pattern-views.cjs');
const load = process.env.DIAGRAM_NODE_MODULES
  ? createRequire(path.join(process.env.DIAGRAM_NODE_MODULES, '__diagram__.cjs')) : require;
const root = path.join(__dirname, 'class-views');
const byId = new Map(model.classes.map(item => [item.id, item]));
const q = JSON.stringify;
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sections = [
  { id: 'work', title: '01  작업·버전·권한·감사', packages: [
    ['Auth', ['User', 'WorkMember']], ['Work', ['Work', 'WorkVersion', 'Revision',
      'AiDisclosure', 'AiToolUsage', 'Contribution', 'EvidenceItem']], ['Audit', ['AuditEvent']],
  ] },
  { id: 'review', title: '02  검토·이해 과제', packages: [
    ['Review', ['RiskAssessment', 'ReviewRequest', 'Challenge', 'ChallengeResponse', 'Evaluation', 'Review', 'Feedback']],
  ] },
  { id: 'approval', title: '03  최종 결정·철회', packages: [
    ['Approval', ['ApprovalCase', 'Approval', 'Revocation', 'OutboxEvent']],
  ] },
  { id: 'certificate', title: '04  증명서·공유·검증', packages: [
    ['Certificate', ['Certificate', 'ShareLink', 'QRCode']], ['Verification', ['VerificationResult']],
  ] },
];
const owner = new Map(sections.flatMap(section => section.packages.flatMap(([, ids]) =>
  ids.map(id => [id, section.id]))));
const domain = model.classes.filter(item => !['application', 'boundary', 'ports'].includes(item.group));
if (sections.flatMap(section => section.packages.flatMap(([, ids]) => ids)).length !== domain.length ||
    owner.size !== domain.length || domain.some(item => !owner.has(item.id))) {
  throw new Error('도메인 클래스 배치 오류');
}
const relations = model.relations.filter(rel => owner.has(rel.a) && owner.has(rel.b));
const routedByReference = rel => owner.get(rel.a) !== owner.get(rel.b) ||
  (rel.a === 'Revision' && rel.b === 'WorkVersion');
const cross = relations.filter(routedByReference)
  .map((rel, i) => ({ ...rel, id: 'R' + String(i + 1).padStart(2, '0') }));
const refs = id => cross.filter(rel => rel.a === id || rel.b === id).map(rel => rel.id);
const style = `graph [fontname="Malgun Gothic", fontsize=26, labelloc=t, pad=.38,
  bgcolor=white, nodesep=.48, ranksep=.65, newrank=true, splines=polyline];
  node [shape=plain,fontname="Malgun Gothic",fontsize=17];
  edge [fontname="Malgun Gothic",fontsize=14,color="#5f7289",arrowsize=.8];`;
const row = (lines, fill = 'white') => lines.length
  ? `<TR><TD ALIGN="LEFT" BGCOLOR="${fill}">${lines.map(escape).join('<BR ALIGN="LEFT"/>')}</TD></TR>` : '';
function box(id, caption, lines, refs = [], fill = '#eaf2fb', operations = []) {
  return `<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="8" COLOR="#667e97">
    <TR><TD BGCOLOR="${fill}"><B>${escape(id)}</B>${caption ? '<BR/>' + escape(caption) : ''}</TD></TR>
    ${row(lines)}
    ${row(operations)}
    ${row(refs.length ? ['관계 참조  ' + refs.join(' · ')] : [], '#fff4dc')}
  </TABLE>>`;
}
function domainDot(section) {
  const nodes = section.packages.map(([name, ids], i) => `
    subgraph cluster_${i} { label=${q(name)}; color="#bccadc"; style=rounded; margin=19;
    ${ids.map(id => {
      const type = byId.get(id);
      return `${id} [label=${box(id, type.label, type.attrs.map(attr => '- ' + attr),
        refs(id), '#eaf2fb', type.ops.map(op => '+ ' + op))}];`;
    }).join('\n')}
    }`).join('\n');
  const edges = relations.filter(rel => owner.get(rel.a) === section.id && !routedByReference(rel))
    .map(rel => `${rel.a} -> ${rel.b} [dir=both,arrowhead=none,
      arrowtail=${rel.kind === 'composition' ? 'diamond' : 'none'},
      taillabel=${q(rel.am)},headlabel=${q(rel.bm)},labeldistance=2.1,
      label=${q(rel.label.split(' {')[0])}];`);
  return `digraph G { ${style} label=${q(section.title)}; ${nodes} ${edges.join('\n')} }`;
}
const patternEdges = {
  extends: 'arrowhead=empty',
  implements: 'style=dashed,arrowhead=empty',
  uses: 'style=dashed,arrowhead=open',
  aggregates: 'dir=both,arrowhead=none,arrowtail=odiamond',
  association: 'arrowhead=none',
};
function patternDot(pattern) {
  const nodes = pattern.nodes.map(([id, role, lines, name]) => `${id} [label=${
    box(name || id, role === 'ref' ? '공유 타입 참조' : '«' + role + '»', lines, [],
      role === 'ref' ? '#eef2f7' : '#fce8e8')}];`);
  const edges = pattern.edges.map(([a, b, kind, label]) =>
    `${a} -> ${b} [${patternEdges[kind]}${label ? ',label=' + q(label) : ''}];`);
  return `digraph G { ${style} label=${q(pattern.title)}; ${nodes.join('\n')} ${edges.join('\n')} }`;
}
const uniquePatternTypes = new Set(patterns.flatMap(pattern =>
  pattern.nodes.filter(([, role]) => role !== 'ref').map(([id]) => id)));
if (uniquePatternTypes.size !== 24) throw new Error('첨부 패턴의 신규 타입 수가 일치하지 않습니다.');

function compose(panels) {
  const width = 2200, panelWidth = 1060, margin = 24;
  let y = 112;
  const positioned = [];
  for (let i = 0; i < panels.length; i += 2) {
    const row = panels.slice(i, i + 2);
    const dimensions = row.map(svg => {
      const [, w, h] = svg.match(/viewBox="0(?:\.0+)? 0(?:\.0+)? ([\d.]+) ([\d.]+)"/);
      return { w: Number(w), h: Number(h) };
    });
    const heights = dimensions.map(({ w, h }) => Math.min(800, h * (panelWidth - 24) / w));
    const rowHeight = Math.max(...heights) + 26;
    row.forEach((svg, j) => {
      const x = margin + j * (panelWidth + margin);
      const inner = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)[1].replace(/id="([^"]+)"/g, (_, id) => `id="panel${i+j}-${id}"`);
      positioned.push(`<rect x="${x}" y="${y}" width="${panelWidth}" height="${rowHeight}" rx="12" fill="white" stroke="#bccadc"/>
        <svg x="${x + 12}" y="${y + (rowHeight-heights[j])/2}" width="${panelWidth-24}" height="${heights[j]}"
          viewBox="0 0 ${dimensions[j].w} ${dimensions[j].h}">${inner}</svg>`);
    });
    y += rowHeight + margin;
  }
  const rowsPerColumn = Math.ceil(cross.length / 2);
  const refHeight = 96 + rowsPerColumn * 55;
  const referenceRows = cross.map((rel, index) => {
    const x = margin + 22 + Math.floor(index / rowsPerColumn) * (panelWidth + margin);
    const lineY = y + 69 + (index % rowsPerColumn) * 55;
    const type = rel.kind === 'composition' ? '합성' : '연관';
    return `<text x="${x}" y="${lineY}" font-size="18" font-weight="bold">${rel.id}  ${rel.a} [${rel.am}] — ${rel.b} [${rel.bm}]</text>
      <text x="${x + 48}" y="${lineY + 23}" font-size="15">${escape(type + ' · ' + rel.label)}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y + refHeight}" viewBox="0 0 ${width} ${y + refHeight}">
    <rect width="100%" height="100%" fill="#f4f7fb"/>
    <g font-family="Malgun Gothic" fill="#18324e">
      <text x="26" y="44" font-size="29" font-weight="bold">HAVE · 통합 클래스 다이어그램 · UC01–UC10</text>
      <text x="26" y="79" font-size="19">서버 도메인 25개 · 관계 R01~${cross.at(-1).id}는 하단 대응표 참조 · 검은 마름모는 합성</text>
    </g>${positioned.join('\n')}
    <rect x="${margin}" y="${y}" width="${panelWidth * 2 + margin}" height="${refHeight - margin}" rx="12" fill="white" stroke="#bccadc"/>
    <g font-family="Malgun Gothic" fill="#18324e">
      <text x="46" y="${y + 34}" font-size="22" font-weight="bold">관계 대응표 · 양 끝의 다중도와 제약</text>
      ${referenceRows}
    </g>
  </svg>`;
}
function gallery() {
  const sectionLink = section => `<a href="#${section.id}">${escape(section.title)}</a>`;
  const image = (id, title, note = '') => `<section id="${id}"><h2>${escape(title)}</h2>
    ${note ? '<p>' + escape(note) + '</p>' : ''}<a href="${id}.svg"><img src="${id}.svg" alt="${escape(title)}"></a>
    <p>${id === 'overview' ? '<a href="overview.png">PNG</a> · ' : ''}<a href="${id}.svg">확대용 SVG</a></p></section>`;
  const crossRows = cross.map(r => `<tr id="${r.id}"><th>${r.id}</th><td><a href="#${owner.get(r.a)}">${r.a}</a> · ${escape(r.am)}</td>
    <td>${escape(r.label)}</td><td><a href="#${owner.get(r.b)}">${r.b}</a> · ${escape(r.bm)}</td></tr>`).join('\n');
  const internalRows = relations.filter(rel => !routedByReference(rel)).map(rel =>
    `<li>${escape(rel.a + ' [' + rel.am + '] — ' + rel.b + ' [' + rel.bm + '] · ' + rel.label)}</li>`).join('\n');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <title>HAVE 통합 클래스와 설계 패턴</title><style>
  body{margin:0;background:#f4f7fb;color:#18324e;font:16px/1.6 "Malgun Gothic",sans-serif}
  main{max-width:1400px;margin:auto;padding:24px}section{background:white;margin:24px 0;padding:20px;border:1px solid #bccadc}
  img{display:block;max-width:100%;height:auto;margin:auto}nav{display:flex;flex-wrap:wrap;gap:14px}a{color:#245697}
  table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border:1px solid #bccadc}
  </style><main><h1>HAVE 통합 클래스와 설계 패턴</h1>
  <nav><a href="#overview">통합 그림</a><a href="#relations">관계 대응표</a>
  ${sections.map(sectionLink).join('')}${patterns.map(sectionLink).join('')}</nav>
  ${image('overview', '통합 클래스 개요', '네 영역을 확대해 읽을 수 있다. 황색 R 번호는 아래 대응표의 관계를 가리킨다.')}
  <section id="relations"><h2>관계 대응표와 다중도</h2><table>
  <tr><th>번호</th><th>첫 클래스와 다중도</th><th>관계</th><th>둘째 클래스와 다중도</th></tr>${crossRows}</table>
  <p>Revision의 보완 근거는 Review 또는 반려 ApprovalCase 중 하나다. 새 버전은 이전 승인을 상속하지 않는다.</p>
  <details><summary>영역 내부 관계의 전체 제약 보기</summary><ul>${internalRows}</ul></details></section>
  ${sections.map(section => image(section.id, section.title)).join('')}
  ${patterns.map(pattern => image(pattern.id, pattern.title, pattern.note)).join('')}
  </main></html>`;
}
async function main() {
  fs.mkdirSync(root, { recursive: true });
  const { instance } = load('@viz-js/viz');
  const { chromium } = load('playwright');
  const viz = await instance();
  const drawings = [...sections.map(s => [s.id, domainDot(s)]), ...patterns.map(p => [p.id, patternDot(p)])];
  const svgs = drawings.map(([id, dot]) => [id, viz.renderString(dot, { format: 'svg' })
    .replace(/font-size="([\d.]+)"/g, (_, size) => `font-size="${(Number(size) * .8).toFixed(2)}"`)]);
  svgs.unshift(['overview', compose(svgs.slice(0, sections.length).map(([, svg]) => svg))]);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1.25 });
    for (const [id, svg] of svgs) {
      await page.setContent('<meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>' + svg);
      await page.evaluate(() => document.fonts.ready);
      const graphic = page.locator('body > svg');
      const overflow = await graphic.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll('text')].filter(text => {
          const box = text.getBoundingClientRect();
          return box.left < bounds.left - 1 || box.right > bounds.right + 1 ||
            box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1;
        }).map(text => text.textContent);
      });
      if (overflow.length) throw new Error(id + ' 글자 넘침: ' + overflow.join(', '));
      fs.writeFileSync(path.join(root, id + '.svg'), svg);
      await graphic.screenshot({ path: path.join(root, id + '.png') });
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(root, 'index.html'), gallery());
  console.log(JSON.stringify({ domain: domain.length, relations: relations.length,
    cross: cross.length, patternTypes: uniquePatternTypes.size, images: svgs.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
