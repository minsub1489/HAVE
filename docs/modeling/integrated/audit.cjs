const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=__dirname,m=require('./model.json');
const dep=process.env.DIAGRAM_NODE_MODULES?createRequire(path.join(process.env.DIAGRAM_NODE_MODULES,'__audit__.cjs')):require;
const checks=[];
function check(name,pass){checks.push({name,pass});if(!pass)throw Error(name)}
const ids=new Set(m.classes.map(c=>c.id));
check('정규화된 클래스 ID 중복 없음',ids.size===m.classes.length);
check('이전 별칭의 중복 엔티티 없음',['Version','VersionSnapshot','ReviewSnapshot','Receipt','ApprovalHistory','Verifier','AIUsage','Evidence'].every(id=>!ids.has(id)));
check('UC01~UC10의 클래스 추적 가능',Array.from({length:10},(_,i)=>String(i+1).padStart(2,'0')).every(uc=>m.classes.some(c=>c.ucs.includes(uc))));
check('모든 관계 끝점 존재',m.relations.every(r=>ids.has(r.a)&&ids.has(r.b)));
const entityIds=m.classes.filter(c=>!['application','ports','boundary'].includes(c.group)).map(c=>c.id);
const reachable=new Set([entityIds[0]]);
for(let i=0;i<entityIds.length;i++)for(const r of m.relations.filter(r=>r.kind!=='dependency')){if(reachable.has(r.a))reachable.add(r.b);if(reachable.has(r.b))reachable.add(r.a)}
check('25개 도메인 타입이 하나의 관계망으로 연결',entityIds.length===25&&entityIds.every(id=>reachable.has(id)));
const rel=(a,b,am,bm)=>m.relations.some(r=>r.a===a&&r.b===b&&r.am===am&&r.bm===bm);
check('초안 작업의 버전 0개 허용',rel('Work','WorkVersion','1','0..*'));
check('버전당 결정 대상·대상당 승인 최대 1개',rel('WorkVersion','ApprovalCase','1','0..1')&&rel('ApprovalCase','Approval','1','0..1'));
check('승인 증명서와 철회 기록의 수명 구분',rel('Approval','Certificate','1','1')&&rel('Approval','Revocation','1','0..1'));
check('Revision 보완·반려 근거의 선택적 관계 양쪽 존재',rel('Revision','Review','0..1','0..1')&&rel('Revision','ApprovalCase','0..1','0..1'));
check('공유 재발급과 대상 미식별 검증 결과 허용',rel('Certificate','ShareLink','1','0..*')&&rel('Certificate','VerificationResult','0..1','0..*'));
check('합성의 부분 타입은 소유자 타입 하나만 가짐',m.relations.filter(r=>r.kind==='composition').every(r=>m.relations.filter(s=>s.kind==='composition'&&s.b===r.b).length===1));
(async()=>{
 const {chromium}=dep('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
 try{const page=await browser.newPage();for(const name of ['HAVE_통합클래스_핵심도메인','HAVE_통합클래스_전체설계']){
  await page.setContent(fs.readFileSync(path.join(root,'images',name+'.svg'),'utf8'));await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.locator('svg').evaluate(svg=>[...svg.querySelectorAll('g.node')].flatMap(g=>{
   const polygons=[...g.querySelectorAll('polygon')];if(!polygons.length||!g.querySelector('title')?.textContent)return [];
   const boxes=polygons.map(p=>p.getBBox()),left=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.x+b.width));
   return [...g.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<left-2||b.x+b.width>right+2}).map(t=>g.querySelector('title').textContent+': '+t.textContent);
  }));
  check(name+' 클래스 외곽 가로 넘침 없음',overflow.length===0);reports.push({name,overflow});
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(root,'audit.json'),JSON.stringify({date:m.date,checks,reports,limitations:'모형 구조 검사이며 실행 시스템·정책 확정 검증이 아님. XOR·동일 버전·상태별 필수 관계는 README의 별도 도메인 제약.'},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,reports}));
})().catch(e=>{console.error(e);process.exitCode=1});
