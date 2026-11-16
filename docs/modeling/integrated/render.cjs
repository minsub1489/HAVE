// Source: model.json. The two views share IDs and relations; no duplicate classes.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=__dirname,m=require('./model.json');
const dep=process.env.DIAGRAM_NODE_MODULES?createRequire(path.join(process.env.DIAGRAM_NODE_MODULES,'__diagram__.cjs')):require;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const q=JSON.stringify;
const groups={identity:'공통 사용자·권한',artifact:'작업·버전·AI 신고 | UC01·02',review:'검토 요청·평가·수정 | UC03·04·05',approval:'최종 승인·반려·철회 | UC06·10',public:'증명서 공유·검증 | UC07·08',history:'전 구간 감사·이력 | UC09',application:'응용 서비스·정책',ports:'저장·파일·알림 계약',boundary:'사용자 접점·API'};
const colors={identity:'#eeeafa',artifact:'#edf3ff',review:'#e9f4ed',approval:'#fff0df',public:'#f1eaff',history:'#f1f4f8',application:'#eaf3f7',ports:'#fff9df',boundary:'#edf0fa'};
const ids=new Set(m.classes.map(c=>c.id));
if(ids.size!==m.classes.length)throw Error('Duplicate class');
for(const r of m.relations){if(!ids.has(r.a)||!ids.has(r.b))throw Error('Unknown endpoint');if(r.kind!=='dependency'&&(!r.am||!r.bm))throw Error('Missing multiplicity');}
const coverage=Object.fromEntries(Array.from({length:10},(_,i)=>{const uc=String(i+1).padStart(2,'0');return [uc,m.classes.filter(c=>c.ucs.includes(uc)).map(c=>c.id)]}));
if(Object.values(coverage).some(a=>a.length===0))throw Error('UC missing');
function table(c){
 const header=c.kind==='entity'?'':`«${c.kind}» · `;
 return `<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="12" COLOR="#5b6e87"><TR><TD BGCOLOR="${colors[c.group]}"><B>${header}${esc(c.id)}</B><BR/>${esc(c.label)}</TD></TR><TR><TD ALIGN="LEFT">${c.attrs.length?c.attrs.map(a=>esc('- '+a)).join('<BR ALIGN="LEFT"/>'):' '}</TD></TR><TR><TD ALIGN="LEFT">${c.ops.length?c.ops.map(a=>esc('+ '+a)).join('<BR ALIGN="LEFT"/>'):' '}</TD></TR></TABLE>>`;
}
function dot(full){
 const selected=m.classes.filter(c=>full||!['application','ports','boundary'].includes(c.group));const set=new Set(selected.map(c=>c.id));
 const rels=m.relations.filter(r=>set.has(r.a)&&set.has(r.b));
 const sections=Object.keys(groups).filter(g=>selected.some(c=>c.group===g)).map(g=>`subgraph cluster_${g} {label=${q(groups[g])}; style="rounded";color="#becbdb";margin=28; ${selected.filter(c=>c.group===g).map(c=>`${c.id} [label=${table(c)}];`).join('\n')}}`).join('\n');
 const edges=rels.map(r=>`${r.a} -> ${r.b} [${r.kind==='dependency'?'style=dashed,arrowhead=open':`dir=both,arrowhead=none,arrowtail=${r.kind==='composition'?'diamond':'none'},taillabel=${q(r.am)},headlabel=${q(r.bm)},labeldistance=2.1`},label=${q(r.label)},${r.a===r.b?'constraint=false,':''}];`).join('\n');
 return `digraph G { graph [fontname="Malgun Gothic",fontsize=28,bgcolor="white",pad=0.5,nodesep=0.6,ranksep=1.0,splines=polyline,compound=true,newrank=true,labelloc=t,label=${q('HAVE | UC01–UC10 통합 클래스 다이어그램\n'+(full?'전체 설계 뷰 · 도메인 + 서비스 + 인터페이스 + 사용자 접점':'핵심 도메인 뷰 · 동일 클래스 통합 및 유스케이스 간 관계 연결')+'\n2026-11-03 · 운영 서비스 분석·설계안')}];node [shape=plain,fontname="Malgun Gothic",fontsize=18];edge [fontname="Malgun Gothic",fontsize=15,color="#65778e",arrowsize=0.85];${sections}${edges}
 legend [shape=note,fontsize=18,style=filled,fillcolor="#fffbea",label="실선: 연관 + 양 끝 다중도 | 검은 마름모: 합성 | 점선 열린 화살표: 사용 의존\n제출 버전 불변 · 새 버전은 승인 미상속 · 버전당 승인 최대 1건 · 철회 기록 보존\nCertificate = Receipt 발급 레코드 / AuditEvent = ApprovalHistory 감사 이력\n서명 상태 · 승인 효력 · 파일 일치 · 공유 링크 만료를 별도로 판단\nUC05 보완 근거: Review 또는 반려 ApprovalCase 중 정확히 하나 (XOR)\n저장·파일·알림 실패 처리와 세부 상태값은 통합 설명 문서 참조"]; Certificate -> legend [style=invis];}`;
}
async function main(){
 fs.mkdirSync(path.join(root,'images'),{recursive:true});fs.mkdirSync(path.join(root,'sources'),{recursive:true});
 const {instance}=dep('@viz-js/viz'),viz=await instance();const {chromium}=dep('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
 try{const page=await browser.newPage({viewport:{width:1800,height:1200},deviceScaleFactor:1});
 for(const full of [false,true]){
  const id=full?'HAVE_통합클래스_전체설계':'HAVE_통합클래스_핵심도메인';const source=dot(full);fs.writeFileSync(path.join(root,'sources',id+'.dot'),source);
  // WASM font metrics are narrower than Malgun Korean glyphs; preserve layout
  // while fitting glyphs inside the calculated compartments and line spacing.
  const svg=viz.renderString(source,{format:'svg'}).replace(/font-size="([0-9.]+)"/g,(_,n)=>'font-size="'+(Number(n)*0.79).toFixed(2)+'"');
  fs.writeFileSync(path.join(root,'images',id+'.svg'),svg);
  await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>${svg}</html>`);await page.evaluate(()=>document.fonts.ready);
  const report=await page.locator('svg').evaluate(svg=>{const s=svg.getBoundingClientRect();return {width:s.width,height:s.height,clipped:[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBoundingClientRect();return b.left<s.left||b.top<s.top||b.right>s.right||b.bottom>s.bottom}).map(t=>t.textContent)}});
  if(report.clipped.length)throw Error(id+': '+report.clipped.join(';'));
  await page.locator('svg').screenshot({path:path.join(root,'images',id+'.png')});reports.push({id,...report});
 }
 }finally{await browser.close()}
 const classLines=['@startuml','skinparam classAttributeIconSize 0','title HAVE UC01–UC10 통합 클래스'];
 for(const c of m.classes){classLines.push(`${c.kind==='interface'?'interface':'class'} ${c.id} {`,...c.attrs.map(a=>'  -'+a),...c.ops.map(o=>'  +'+o),'}');}
 for(const r of m.relations)classLines.push(r.kind==='dependency'?`${r.a} ..> ${r.b} : ${r.label}`:`${r.a} "${r.am}" ${r.kind==='composition'?'*--':'--'} "${r.bm}" ${r.b} : ${r.label}`);
 classLines.push('@enduml');fs.writeFileSync(path.join(root,'sources','HAVE_통합클래스.puml'),classLines.join('\n')+'\n');
 fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify({date:m.date,classCount:m.classes.length,domainCount:m.classes.filter(c=>!['application','ports','boundary'].includes(c.group)).length,relationCount:m.relations.length,uniqueIds:'PASS',relationEndpoints:'PASS',multiplicitiesPresent:'PASS',ucCoverage:coverage,images:reports},null,2)+'\n');
 fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><title>HAVE 통합 클래스</title><style>body{font-family:'Malgun Gothic';margin:32px;background:#f4f6fa;color:#21314b}section{background:white;margin:24px 0;padding:20px}img{width:100%;height:auto}a{color:#2853a2}</style><h1>HAVE · UC01–UC10 통합 클래스</h1><p>핵심 도메인 25개 / 전체 설계 55개 타입 · 운영 설계안</p><p><a href="README.md">통합 결정·다중도·UC 대응표</a></p>${reports.map(r=>`<section><h2>${r.id}</h2><a href="images/${r.id}.svg"><img src="images/${r.id}.svg"></a><p><a href="images/${r.id}.png">PNG</a> · <a href="images/${r.id}.svg">확대용 SVG</a></p></section>`).join('')}</html>`);
 console.log(JSON.stringify({classes:m.classes.length,coverage:Object.keys(coverage),images:reports}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
