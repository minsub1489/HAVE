// model.json is canonical. Generates only this UC06/UC10 submission set.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=__dirname,m=require('./model.json');
const dep=process.env.DIAGRAM_NODE_MODULES?createRequire(path.join(process.env.DIAGRAM_NODE_MODULES,'__diagram__.cjs')):require;
const {sequenceSVG}=require('../render.cjs');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const q=s=>JSON.stringify(s);
const titles=['순서 다이어그램','상태 다이어그램','활동 다이어그램','클래스 다이어그램','패키지 다이어그램','컴포넌트 다이어그램'];
const names=['01_순서','02_상태','03_활동','04_클래스','05_패키지','06_컴포넌트'];
const base=(title,body,extra='')=>`digraph G { graph [fontname="Malgun Gothic",fontsize=23,bgcolor="white",pad=0.5,nodesep=0.55,ranksep=0.8,label=${q('HAVE | '+title+'\nUC06 최종 승인 및 반려 · UC10 승인 철회\n운영 서비스 설계안 · 현재 구현과 구분')},labelloc=t,${extra}]; node [fontname="Malgun Gothic",fontsize=17,shape=box,style="rounded,filled",fillcolor="#edf3ff",color="#526782",penwidth=1.3,margin="0.2,0.14"]; edge [fontname="Malgun Gothic",fontsize=14,color="#526782",arrowsize=0.8]; ${body} }`;
const cls=new Map(m.classes.map(c=>[c.id,c]));
const table=c=>`<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="10" COLOR="#526782"><TR><TD BGCOLOR="${c.package==='domain'?'#e9f4ef':'#edf0ff'}"><B>${esc(c.id)}</B><BR/>${esc(c.label)}</TD></TR><TR><TD ALIGN="LEFT">${c.attrs.length?c.attrs.map(a=>esc('- '+a)).join('<BR ALIGN="LEFT"/>'):' '}</TD></TR><TR><TD ALIGN="LEFT">${c.ops.length?c.ops.map(a=>esc('+ '+a)).join('<BR ALIGN="LEFT"/>'):' '}</TD></TR></TABLE>>`;
const classDot=base(titles[3],m.classes.map(c=>`${c.id} [shape=plain,style="",label=${table(c)}];`).join('\n')+m.relations.map(r=>`${r.from} -> ${r.to} [${r.dep?'style=dashed,arrowhead=open':'dir=none,headlabel='+q(r.tm)+',taillabel='+q(r.fm)+',labeldistance=2.1'},label=${q(r.label)}];`).join('\n')+`legend [shape=note,fillcolor="#fff8e8",label="연관: 실선 + 양 끝 다중도 / 사용 의존: 점선 + 열린 화살촉\n버전당 승인 최대 1건 · 철회 후에도 승인·증명서 보존\nReceipt는 서명 전에도 존재: PENDING / READY / FAILED\nApprovalCase는 최종 결정 단계의 모델; 반려 후 보완은 UC05 범위"];`,'rankdir=TB');
const stateDot=base(titles[1],`
subgraph cluster_case {label="ApprovalCase · 최종 결정 상태 (UC06)";color="#b9c8dc";margin=30;
s0 [shape=point,fillcolor="#20324b",width=0.15]; pending [label="최종 결정 대기\nPENDING"]; rejected [label="반려\nREJECTED",fillcolor="#fff1eb"]; approved [label="승인 결정 완료\nAPPROVED",fillcolor="#e5f4ec"]; f1 [shape=doublecircle,label="",width=0.23,fillcolor="#20324b"];
s0 -> pending [label="검토 완료된 결정 대상 생성"]; pending -> approved [label="approve(actor) [A ∧ commit 성공]\n/ 승인·증명서·감사·Outbox 기록"]; pending -> rejected [label="reject(actor, reason) [J ∧ commit 성공]\n/ 반려 사유·감사 기록"]; approved -> f1; rejected -> f1;
pending -> pending [label="조건 미충족·저장 실패 / 변경 없음\n충돌 / 최신 상태 조회 후 재판정"];
}
subgraph cluster_approval {label="Approval · 승인 효력 상태 (UC10)";color="#b9c8dc";margin=30;
a0 [shape=point,fillcolor="#20324b",width=0.15]; active [label="유효한 승인\nrevokedAt 없음",fillcolor="#e5f4ec"]; revoked [label="철회된 승인\nrevokedAt 있음",fillcolor="#fff1eb"]; f2 [shape=doublecircle,label="",width=0.23,fillcolor="#20324b"];
a0 -> active [label="승인 트랜잭션 commit으로 생성"]; active -> revoked [label="revoke(actor, reason) [R ∧ commit 성공]\n/ 철회자·시각·사유·감사 기록"]; active -> active [label="권한·사유 오류 또는 저장 실패\n/ 기존 승인 유지"]; revoked -> f2;
}
approved -> a0 [style=invis]; note [shape=note,fillcolor="#fff8e8",label="A: 담당 권한·자기 승인 금지·revision 일치 + 검토 통과 + 승인 없음\nJ: 담당 권한·revision 일치 + 반려 사유\nR: 철회 권한·revision 일치 + 미철회 승인 + 철회 사유\n검토 통과: 3개 제출·근거·5/6 이상·치명 오류 없음·수정 요청 해제·체크 4개·메모\n최종 노드는 해당 절차 종료이며 데이터 삭제가 아님\n후속 버전·증명서 서명 상태는 승인 효력과 별개 / 철회 취소 없음"]; f2 -> note [style=invis];`);
const activityDot=base(titles[2],`
start [shape=circle,label="",width=0.2,fillcolor="#20324b"]; end [shape=doublecircle,label="",width=0.25,fillcolor="#20324b"];
subgraph cluster_user {label="활동 파티션 | 최종 승인자";color="#b9c8dc";select [label="대상 버전·검토 결과 확인\n결정 또는 철회와 사유 입력"];}
subgraph cluster_service {label="활동 파티션 | 승인 서비스";color="#b9c8dc";auth [label="세션 권한·대상·revision 검사\n멱등 키 재요청 확인"]; authok [shape=diamond,label="처리 가능?",style=filled]; existing [shape=diamond,label="동일 키의\n완료 요청?",style=filled]; old [label="기존 결과 반환\n중복 기록 없음"]; choice [shape=diamond,label="요청 종류",style=filled]; ap [label="승인 조건 A 검사"]; gate [shape=diamond,label="조건 충족?",style=filled]; reject [label="반려 사유·대기 상태 검사 J"]; revoke [label="승인 ID·미철회·사유 검사 R"]; validj [shape=diamond,label="J 충족?",style=filled]; validr [shape=diamond,label="R 충족?",style=filled]; deny [label="차단 사유·최신 상태 안내\n승인 자동 재시도 금지",fillcolor="#fff1eb"]; success [label="commit 이후 결과 표시\n서명 대기와 승인 완료를 구분",fillcolor="#e5f4ec"];}
subgraph cluster_store {label="활동 파티션 | 트랜잭션 저장";color="#b9c8dc";savea [label="승인·Receipt(PENDING)\n감사·Outbox 함께 저장"]; savej [label="반려 상태·사유·감사 저장\n승인·증명서 생성 없음"]; saver [label="철회 기록·효력 변경·감사 저장\n원본 승인·증명서 보존"]; merge [shape=diamond,label="",width=0.3,height=0.3,style=filled]; commit [shape=diamond,label="commit 성공?",style=filled]; rollback [label="전체 변경 취소\n충돌이면 최신 상태 조회",fillcolor="#fff1eb"];}
start -> select -> auth -> authok; authok -> deny [label="[아니오]"]; authok -> existing [label="[예]"]; existing -> old [label="[예]"]; existing -> choice [label="[아니오]"]; choice -> ap [label="[승인 / UC06]"]; choice -> reject [label="[반려 / UC06]"]; choice -> revoke [label="[철회 / UC10]"]; ap -> gate; gate -> savea [label="[예]"]; gate -> deny [label="[아니오]"]; reject -> validj; validj -> savej [label="[예]"]; validj -> deny [label="[아니오]"]; revoke -> validr; validr -> saver [label="[예]"]; validr -> deny [label="[아니오]"]; savea -> merge; savej -> merge; saver -> merge; merge -> commit; commit -> success [label="[예]"]; commit -> rollback [label="[아니오]"]; rollback -> deny; success -> end; deny -> end; old -> end;
`);
const packageDot=base(titles[4],m.classes.reduce((a,c)=>{(a[c.package]??=[]).push(c);return a;},{})&&['application','domain','authorization','persistence'].map(id=>{const list=m.classes.filter(c=>c.package===id);const names={application:'업무 조정',domain:'승인 도메인',authorization:'접근 권한',persistence:'저장 계약'};return `${id} [shape=tab,style=filled,fillcolor="${id==='domain'?'#e9f4ef':'#edf0ff'}",label=${q(names[id]+'\n'+id+'\n\n'+list.map(c=>c.id).join('\n'))}];`}).join('\n')+`
presentation [shape=tab,label="사용자 접점\npresentation\n\n최종 결정 화면 · 철회 화면\n(별도 UI 클래스는 이 분석에서 생략)"];
presentation -> application [style=dashed,arrowhead=open,label="업무 요청"];
application -> domain [style=dashed,arrowhead=open,label="모델·상태 전이 사용"];
application -> authorization [style=dashed,arrowhead=open,label="authorize 사용"];
application -> persistence [style=dashed,arrowhead=open,label="loadForUpdate / commit 사용"];
persistence -> domain [style=dashed,arrowhead=open,label="Aggregate·Result 타입 참조"];
n [shape=note,label="패키지: 관련 클래스·책임의 논리 그룹\n점선 열린 화살표: 사용하는 쪽 → 사용되는 쪽\n전송 순서·서버 배치 구조를 뜻하지 않음",fillcolor="#fff8e8"];domain -> n [style=invis];`,'rankdir=TB');
const componentDot=base(titles[5],`
web [label="«component»\n최종 승인 웹 화면\n결정 입력 · 결과 표시"];
subgraph cluster_server {label="승인 API · 모듈형 단일 서버 (계획)";color="#b9c8dc";margin=30;
api [label="«component»\n승인 API\nApprovalService · 도메인 판단"];
auth [label="«component»\n권한 검사 모듈\nAuthorizationPolicy"];
adapter [label="«component»\n저장 어댑터\nApprovalRepository 구현"];
ia [shape=circle,label="IApprovalAPI",fontsize=13,width=1.3,style=filled,fillcolor="white"];
ip [shape=circle,label="IApprovalStore",fontsize=13,width=1.5,style=filled,fillcolor="white"];
iz [shape=circle,label="IAuthorization",fontsize=13,width=1.5,style=filled,fillcolor="white"];
ia -> api [dir=none]; iz -> auth [dir=none]; ip -> adapter [dir=none]; api -> iz [style=dashed,arrowhead=open,label="요구: authorize"];api -> ip [style=dashed,arrowhead=open,label="요구: loadForUpdate / commit"];
}
web -> ia [style=dashed,arrowhead=open,label="요구: decide / revoke\nHTTPS · session · revision · key"];
db [shape=cylinder,label="승인 DB (계획)\n결정·승인·증명서·철회\n감사·Outbox·멱등 결과"];
adapter -> db [label="원자적 트랜잭션"];
worker [style="dashed,filled",fillcolor="#fff8e8",label="«component»\n증명서 서명 작업자\n연계 범위 · 상세 구현 제외"];
worker -> db [style=dashed,arrowhead=open,label="Outbox 소비 / 서명 상태 갱신"];
note [shape=note,fillcolor="#fff8e8",label="원형: 제공 인터페이스 / 점선 열린 화살표: 사용 의존\n승인 완료 ≠ 서명 완료; 서명 실패로 승인 결정을 취소하지 않음\n철회와 서명 작업이 경합해도 최신 효력은 DB의 철회 기록으로 판정\n기존 프로토타입에는 이 서버·실제 인증·전자서명 미구현"];db -> note [style=invis];`,'rankdir=TB');
const participants=[{id:'actor',label:'최종 승인자'},{id:'service',label:'업무 조정\nApprovalService',classId:'ApprovalService'},{id:'auth',label:'권한 정책\nAuthorizationPolicy',classId:'AuthorizationPolicy'},{id:'entity',label:'결정 대상\nApprovalCase',classId:'ApprovalCase'},{id:'repo',label:'저장 계약\nApprovalRepository',classId:'ApprovalRepository'}];
const msg=(from,to,text,call)=>({from,to,text,call});
const note=text=>({type:'note',text});
const seq06={title:'UC06 · 최종 승인 및 반려',participants,events:[
note('UC06 · 최종 승인 및 반려 | 로그인한 담당 최종 승인자 / 특정 버전·검토 범위 고정'),
msg('actor','service','decide(결정, 사유, revision, key)','ApprovalService.decide'),
msg('service','auth','authorize(세션 사용자, 대상, action)','AuthorizationPolicy.authorize'),
msg('service','repo','loadForUpdate(caseId) + 기존 멱등 결과 확인','ApprovalRepository.loadForUpdate'),
note('권한 확인 후 같은 key·같은 요청의 기존 결과를 우선 반환한다. 새 요청만 자기 승인·revision·업무 조건 검사. 같은 key·다른 입력은 거부.'),
{type:'block',label:'alt [승인 선택 · 조건 A 충족]'},
msg('service','entity','approve(actor)','ApprovalCase.approve'),
note('A: 검토 결과 passes() 확인 · 3개 제출·근거·5/6 이상·치명 오류 없음·체크·메모·수정 요청 해제 · 기존 승인 없음'),
msg('service','repo','commit(승인 + Receipt(PENDING) + 감사 + Outbox, revision, key)','ApprovalRepository.commit'),
{type:'else',label:'[반려 선택 · 조건 J 충족]'},
msg('service','entity','reject(actor, reason)','ApprovalCase.reject'),
msg('service','repo','commit(반려 상태 + 사유 + 감사, revision, key)','ApprovalRepository.commit'),
{type:'else',label:'[条件 미충족]'},
{from:'service',to:'actor',text:'차단 사유 안내 · 승인/반려 기록 없음',reply:true},
{type:'end'},
note('commit 성공 → 결정 결과 표시. 실패 → 전체 롤백. 충돌 → 최신 상태 확인, 자동 승인 재시도 금지.\n승인 시 증명서 레코드는 생성되지만 전자서명 완료는 별도 비동기 처리다.')
]};
seq06.events.forEach(e=>{if(e.label)e.label=e.label.replace('条件','조건')});
const seq10={title:'UC10 · 승인 철회',participants:participants.map(p=>p.id==='entity'?{id:'entity',label:'승인 기록\nApproval',classId:'Approval'}:p),events:[
note('UC10 · 승인 철회 | 승인 ID를 명시하여 대상 선택 / 원본 승인·증명서를 삭제하지 않음'),
msg('actor','service','revoke(approvalId, reason, revision, key)','ApprovalService.revoke'),
msg('service','auth','authorize(세션 사용자, 대상, REVOKE)','AuthorizationPolicy.authorize'),
msg('service','repo','loadForUpdate(approvalId) + 기존 멱등 결과 확인','ApprovalRepository.loadForUpdate'),
note('R: 철회 권한 · 대상 revision 일치 · 기존 승인 존재 · 미철회 · 비어 있지 않은 사유'),
{type:'block',label:'alt [조건 R 충족]'},
msg('service','entity','revoke(actor, reason)','Approval.revoke'),
msg('service','repo','commit(철회 기록 + 승인 효력 변경 + 감사, revision, key)','ApprovalRepository.commit'),
{type:'else',label:'[동일 key · 동일 요청이 이미 완료]'},
{from:'service',to:'actor',text:'기존 철회 결과 반환 · 새 기록 없음',reply:true},
{type:'else',label:'[권한 없음 · 미승인 · 사유 누락 · 별도 중복 철회]'},
{from:'service',to:'actor',text:'오류 또는 기존 철회 상태 안내 · 변경 없음',reply:true},
{type:'end'},
note('commit 성공 → 철회 결과 표시. 실패 → 원본 효력 유지. 충돌 → 최신 상태 확인.\n철회 취소와 같은 버전 재승인 없음. 새 버전은 별도 검토·승인이 필요하다.')
]};
// Explicit replies keep commit outcomes visible on the lifelines, rather than
// presenting a write request as proof that persistence succeeded.
for (const seq of [seq06,seq10]) {
 seq.events=seq.events.flatMap(e=>e.call==='ApprovalRepository.commit'?[e,
  {from:'repo',to:'service',text:'Result: commit 완료 또는 실패·충돌',reply:true},
  {from:'service',to:'actor',text:'[commit 완료] 처리 결과 / [실패·충돌] 오류·최신 상태 안내',reply:true}
 ]:[e]);
}
async function main(){
 fs.mkdirSync(path.join(root,'images'),{recursive:true});fs.mkdirSync(path.join(root,'sources'),{recursive:true});
 const failures=[];
 for(const seq of [seq06,seq10])for(const e of seq.events)if(e.call){const [id,op]=e.call.split('.');if(!cls.get(id)?.ops.some(x=>x.startsWith(op+'(')))failures.push(e.call);if(seq.participants.find(p=>p.id===e.to)?.classId!==id)failures.push('receiver '+e.call)}
 if(failures.length)throw Error(failures.join('\n'));
 const {instance}=dep('@viz-js/viz'),viz=await instance();
 const svgs=[];
 const left=sequenceSVG(seq06),right=sequenceSVG(seq10);
 const h=s=>Number(s.match(/viewBox="0 0 \d+ (\d+)"/)[1]);const H=Math.max(h(left),h(right))+130;
 const inner=(s,id)=>s.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replaceAll('id="arrow"',`id="${id}"`).replaceAll('url(#arrow)',`url(#${id})`);
 svgs.push(`<svg xmlns="http://www.w3.org/2000/svg" width="2860" height="${H}" viewBox="0 0 2860 ${H}"><rect width="100%" height="100%" fill="white"/><g font-family="Malgun Gothic"><text x="40" y="45" font-size="30">HAVE | 순서 다이어그램</text><text x="40" y="80" font-size="20">UC06 최종 승인 및 반려 · UC10 승인 철회 | 운영 서비스 설계안 · 현재 구현과 구분</text></g><g transform="translate(20,115)">${inner(left,'a06')}</g><path d="M 1430 115 V ${H-20}" stroke="#cad5e3"/><g transform="translate(1440,115)">${inner(right,'a10')}</g></svg>`);
 const cleanActivity=activityDot.replaceAll('subgraph cluster_','subgraph group_')
  .replace('세션 권한·대상·revision 검사','세션·대상 접근 권한 검사')
  .replace('멱등 키 재요청 확인','멱등 키·요청 내용 확인')
  .replaceAll('-> deny','-> failmerge')
  .replace('start -> select','failmerge [shape=diamond,label="",width=0.3,height=0.3,style=filled]; failmerge -> deny; start -> select');
 const dots=[stateDot,cleanActivity,classDot,packageDot,componentDot];
 for(let i=0;i<dots.length;i++){
  fs.writeFileSync(path.join(root,'sources',names[i+1]+'.dot'),dots[i]);
  // Graphviz WASM lacks the Windows Korean font metrics. Keep its generous layout,
  // but fit actual Malgun glyphs into the computed cells and label line spacing.
  svgs.push(viz.renderString(dots[i],{format:'svg'}).replace(/font-size="([0-9.]+)"/g,(_,n)=>'font-size="'+(Number(n)*0.78).toFixed(2)+'"'));
 }
 fs.writeFileSync(path.join(root,'sources','01_순서.json'),JSON.stringify([seq06,seq10],null,2)+'\n');
 const {chromium}=dep('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
 try{const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1.6});
 for(let i=0;i<svgs.length;i++){
  let svg=svgs[i];fs.writeFileSync(path.join(root,'images',names[i]+'.svg'),svg);
  await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block;font-family:'Malgun Gothic'}</style>${svg}</html>`);await page.evaluate(()=>document.fonts.ready);
  const report=await page.locator('svg').evaluate(svg=>{const v=svg.viewBox.baseVal;return {width:v.width,height:v.height,clipped:[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBoundingClientRect(),s=svg.getBoundingClientRect();return b.left<s.left-2||b.top<s.top-2||b.right>s.right+2||b.bottom>s.bottom+2}).map(t=>t.textContent)}});
  if(report.clipped.length)throw Error(names[i]+' clipped: '+report.clipped.join(';'));
  await page.locator('svg').screenshot({path:path.join(root,'images',names[i]+'.png')});reports.push({id:names[i],...report});
 }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify({date:m.date,scope:['UC06','UC10'],sequenceReceiverOperations:'PASS',classes:m.classes.length,relations:m.relations.length,images:reports},null,2)+'\n');
 fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><title>HAVE UC06·UC10 UML</title><style>body{font-family:'Malgun Gothic';margin:32px;background:#f5f7fb;color:#20324b}section{padding:24px;background:white;margin:24px 0}img{width:100%;height:auto}a{color:#2351a2}</style><h1>HAVE · UC06 / UC10</h1><p>최종 승인·반려 / 승인 철회 · 운영 서비스 설계안</p><a href="README.md">명세·다중도·설계 근거</a>${names.map((n,i)=>`<section><h2>${titles[i]}</h2><a href="images/${n}.svg"><img src="images/${n}.svg"></a><a href="images/${n}.png">PNG</a> · <a href="images/${n}.svg">SVG</a></section>`).join('')}</html>`);
 console.log(JSON.stringify({images:reports.length,sequenceOperations:'PASS',reports}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
