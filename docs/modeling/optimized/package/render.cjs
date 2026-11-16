// Canonical model.json -> one package diagram; does not regenerate other UML artifacts.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = __dirname;
const m = JSON.parse(fs.readFileSync(path.join(root, 'model.json'), 'utf8'));
const classes = require('../uml/model.json').classes.map(c => c.id);
const grouped = m.packages.flatMap(p => p.classes);
if (new Set(grouped).size !== grouped.length || classes.length !== grouped.length || classes.some(id => !grouped.includes(id))) throw Error('All 14 analysis classes must belong to exactly one package.');
const packages = new Map(m.packages.map(p => [p.id,p]));
const visiting = new Set(), visited = new Set();
function visit(id) {
  if (visiting.has(id)) throw Error('Cyclic dependency: ' + id);
  if (visited.has(id)) return;
  if (!packages.has(id)) throw Error('Unknown package: ' + id);
  visiting.add(id);
  m.dependencies.filter(d=>d.from===id).forEach(d=>visit(d.to));
  visiting.delete(id); visited.add(id);
}
m.packages.forEach(p=>visit(p.id));
const esc = s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text = (x,y,s,size=21,color='#20324b')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const boxes = m.packages.map(p=>`<g><path d="M ${p.x} ${p.y+36} V ${p.y} H ${p.x+Math.min(p.w-25,Math.max(300,[...p.name].reduce((n,c)=>n+(c.charCodeAt(0)>255?22:12),40)))} V ${p.y+36} H ${p.x+p.w} V ${p.y+p.h} H ${p.x} Z" fill="${p.color}" stroke="#53667e" stroke-width="1.7"/>${text(p.x+17,p.y+25,p.name,22)}${p.lines.map((s,i)=>text(p.x+22,p.y+76+i*34,s,19)).join('')}${text(p.x+22,p.y+p.h-18,p.mapping,16,'#58677c')}</g>`).join('');
const arrows = m.dependencies.map(d=>`<polyline points="${d.points}" fill="none" stroke="#334760" stroke-width="1.8" stroke-dasharray="8 6" marker-end="url(#dependency)"/>${text(d.lx,d.ly,d.label,19)}`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}"><title>${esc(m.title)}</title><defs><marker id="dependency" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M 1 1 L 11 6 L 1 11" fill="none" stroke="#334760" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Malgun Gothic, sans-serif">${text(80,64,m.title,34)}${text(80,102,m.scope,21,'#58677c')}${boxes}${arrows}<rect x="920" y="864" width="540" height="136" rx="5" fill="#fafbfd" stroke="#bdc9d7"/>${text(940,894,'JSON 파일 연동 메모',19)}${m.integrationNote.map((s,i)=>text(940,924+i*26,s,16)).join('')}${text(80,1052,'점선 + 열린 화살촉: 사용하는 패키지 → 사용되는 패키지 (UML 의존 관계)',20)}${text(80,1090,'논리적 책임 구분이며 실제 폴더·JS 클래스 분리 완료를 뜻하지 않음 · 서버·인증·전자서명은 별도 운영 설계',18,'#58677c')}</g></svg>`;
fs.writeFileSync(path.join(root,'HAVE_패키지다이어그램.svg'),svg);
const puml = ['@startuml','title HAVE 패키지 다이어그램 (현재 MVP 분석 모델)','skinparam packageStyle folder',...m.packages.map(p=>`package "${p.name}" as ${p.id} {\n${p.classes.length?p.classes.map(c=>`  class ${c}`).join('\n'):'  note "웹 사용자 화면" as WebScreens'}\n}`),...m.dependencies.map(d=>`${d.from} ..> ${d.to} : ${d.label}`),'note bottom of capture : 사용자 확인 JSON 파일 교환\n직접 패키지 호출 없음','@enduml',''].join('\n');
fs.writeFileSync(path.join(root,'HAVE_패키지다이어그램.puml'),puml);
(async()=>{
  const dep = process.env.DIAGRAM_NODE_MODULES ? createRequire(path.join(process.env.DIAGRAM_NODE_MODULES,'__diagram__.cjs')) : require;
  const {chromium} = dep('playwright');
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:m.width,height:m.height},deviceScaleFactor:2});
    await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>${svg}</html>`);
    await page.evaluate(()=>document.fonts.ready);
    const overflow = await page.locator('svg').evaluate(svg=>[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>1540||b.y+b.height>1130}).map(t=>t.textContent));
    if(overflow.length) throw Error('Text overflow: '+overflow.join('; '));
    await page.locator('svg').screenshot({path:path.join(root,'HAVE_패키지다이어그램.png')});
    const report = {date:m.date,packages:m.packages.length,classes:grouped.length,classCoverage:'PASS',acyclicDependencies:'PASS',dependencies:m.dependencies.length,textOverflow:overflow};
    fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
