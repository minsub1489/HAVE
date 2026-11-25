const icons={check:'<path d="m5 12 4 4 10-10"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>',brain:'<path d="M12 4a4 4 0 0 0-7-1 4 4 0 0 0-2 7 5 5 0 0 0 2 9 4 4 0 0 0 7 1V4Zm0 0a4 4 0 0 1 7-1 4 4 0 0 1 2 7 5 5 0 0 1-2 9 4 4 0 0 1-7 1M7 7l2 2m8-2-2 2M6 14l3-1m9 1-3-1"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',qr:'<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h-3zM21 15v6h-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',link:'<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',refresh:'<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>'};
const icon=n=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.file}</svg>`;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='humanproof-demo-v2';
let db, screen='overview', role='author', gateIndex=0, verifyId=null, verifyResult=null, busy=false;
const repository = new HumanProofStorage.Repository();
let revision=0, pending=Promise.resolve(), inTransaction=false, dirty=false, needsRender=false, effects=[], storageProblem='', pendingImport=null, unsavedDraft=null;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('humanproof-workspace'):null;
const gateNames=['Teach-back','Fault Injection','What-if'];
const gateTitles=['선택 이유를 자신의 말로 설명하기','복제 문단에 숨은 오류 찾기','조건이 달라지면 영향 설명하기'];
const gatePrompts=['파일 버전 ID와 SHA-256을 함께 기록하는 이유는 무엇인가요? 각각이 무엇을 확인하는지 설명해 주세요.','아래는 오류를 넣은 검증용 복제 문단입니다. 잘못된 설명을 찾고, 수정 방향과 그 이유를 적어 주세요.','승인자가 1명에서 2명으로 늘어난다면, 데이터 구조와 승인 상태 처리에 어떤 변화가 필요한가요?'];
const samples=[
 '버전 ID는 작업 안에서 승인 대상을 식별하고, SHA-256은 승인 시점의 파일 바이트가 전달된 파일과 같은지 확인합니다. v1을 승인한 뒤 파일이 바뀌면 새 v2를 만들어야 합니다. v1의 승인을 v2에 자동으로 적용하면 승인하지 않은 내용까지 승인된 것으로 오해할 수 있습니다.',
 '오류는 “파일 이름이 같으면 내용이 변경되어도 기존 승인이 유지된다”는 부분입니다. 파일명은 내용을 식별하지 못합니다. 새 파일의 SHA-256을 계산해 새 버전으로 등록하고 재검토해야 합니다. 기존 승인 기록은 v1에만 연결하고 v2는 미승인으로 표시합니다.',
 '버전별 승인자 기록을 여러 개 저장하도록 관계를 변경하고, 서로 다른 두 검토자의 승인이 모였는지 확인해야 합니다. 첫 승인 뒤에는 승인 대기 상태를 유지하고, 두 번째 승인 뒤에 최종 증명서를 발급합니다. 자기 승인과 중복 승인을 차단하고, 두 승인자의 시각과 대상 버전을 기록해야 합니다.'
];
const rubric=['버전 ID와 파일 해시의 역할 구분 · 변경 시 재승인 필요성','파일명 비교의 오류 발견 · 해시 비교와 새 버전 등록 제안','복수 승인 기록 구조 · 두 승인 완료 전까지 대기 상태 유지'];
const riskLabels=['AI 사용 비중','결과의 중요도','검증 근거 부족','과거 과제 실패'];
const riskMax=[3,3,2,2];
const checks=['문서의 주요 주장과 근거를 확인했습니다','AI 사용 범위와 인간 기여를 확인했습니다','이해 과제의 답변과 평가 근거를 확인했습니다','승인할 PDF의 버전 ID와 해시를 확인했습니다'];
const stamp=t=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(t));
const fmtSize=n=>n<1024*1024?(n/1024).toFixed(1)+' KB':(n/1024/1024).toFixed(1)+' MB';
const uid=p=>p+'-'+crypto.randomUUID();
const to64=bytes=>{let t='';for(let i=0;i<bytes.length;i+=8192)t+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(t)};
const from64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const {canonical,digest:hash,digestText:hashText,gatesPassed,publicRecord,verifyChain,MAX_PDF_BYTES}=HumanProof;
const current=()=>db.versions[db.versions.length-1];
const approvalFor=v=>db.approvals.find(a=>a.versionId===v.id);
const totalScore=v=>v.gates.reduce((s,g)=>s+(g.evaluation?.score??0),0);
const gatesSubmitted=v=>v.gates.every(g=>g.submitted);
const statusOf=v=>HumanProof.status(v,approvalFor(v),current().id);
const badge=v=>{const [text,color]=statusOf(v);return `<span class="badge ${color}">${text}</span>`};
function makePdf(){
 const lines=['HUMANPROOF / SYSTEM DESIGN','AI-assisted work and human approval','1. AI produced the design draft.','2. The author explains design choices.','3. A different reviewer evaluates the answers.','4. Approval is bound to one immutable version.','5. SHA-256 compares the delivered file bytes.','6. A changed file requires a new version.','7. Revocation is separate from file integrity.','Sample document for a presentation prototype.'];
 const stream='BT /F1 18 Tf 48 770 Td ('+lines[0]+') Tj /F1 11 Tf '+lines.slice(1).map(t=>'0 -32 Td ('+t+') Tj').join(' ')+' ET';
 const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let text='%PDF-1.4\n',offsets=[0];objs.forEach((o,i)=>{offsets.push(text.length);text+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});const xref=text.length;text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return new TextEncoder().encode(text);
}
function blankGates(){return gateNames.map(()=>({answer:'',confidence:80,submitted:false,evaluation:null}))}
async function makeVersion(n,name,bytes,tool,scope,risk,reason){return{id:uid('ver'),n,fileName:name,size:bytes.length,fileData:to64(bytes),hash:await hash(bytes),tool,scope,risk,policy:{...HumanProof.POLICY},contributions:[],reviewRounds:[],gates:blankGates(),checks:checks.map(()=>false),memo:'',reason,createdAt:new Date().toISOString(),returned:false}}
async function seed(){
 const bytes=makePdf();db={schema:2,workId:uid('work'),title:'AI 작업 승인 시스템 설계 보고서',versions:[await makeVersion(1,'system_design_v1.pdf',bytes,'ChatGPT','설계 초안 생성 및 요구사항 정리',[3,3,1,1],'최초 파일 등록')],approvals:[],events:[]};
 await audit('작업 · PDF v1 등록','작성자 A','AI 활용 초안과 검토 대상 파일을 등록했습니다.');
 await audit('인간 기여 기록','작성자 A','요구사항을 직접 정리하고 승인 범위와 버전 변경 규칙을 보완했습니다.');save();
}
async function audit(action,actor,note,target=current().id){const body={id:uid('evt'),action,actor,note,target,time:new Date().toISOString()};const prev=db.events.at(-1)?.eventHash||'0'.repeat(64);db.events.push({...body,prevHash:prev,eventHash:await hashText(prev+canonical(body))})}
function save(){dirty=true}
function storageStatus(){const node=$('#storageStatus');node.replaceChildren();if(!storageProblem)return;const message=document.createElement('p');message.textContent=storageProblem;const backup=document.createElement('button');backup.className='btn small';backup.textContent='기록과 저장 실패 입력 백업';backup.onclick=()=>download(JSON.stringify({persisted:db,unsavedDraft},null,2),'humanproof-workspace-backup.json','application/json');node.append(message,backup)}
function transaction(task){
 const result=pending.then(async()=>{
  const before=structuredClone(db),previousScreen=screen;busy=true;inTransaction=true;dirty=false;needsRender=false;effects=[];
  try{
   await task();
   if(dirty){HumanProof.validateTransition(before,db);revision=await repository.commit(db,revision);storageProblem='';unsavedDraft=null;channel?.postMessage({revision});}
   inTransaction=false;if(needsRender)render();storageStatus();for(const effect of effects)toast(effect);
  }catch(error){
   if(dirty)unsavedDraft=structuredClone(db);db=before;screen=previousScreen;inTransaction=false;
   if(error.name==='ConflictError'){const stored=await repository.load();if(stored){await HumanProof.verifyIntegrity(stored.data,from64);db=stored.data;revision=stored.revision;}storageProblem='';}
   else if(dirty)storageProblem='변경 내용을 저장하지 못해 이전 기록으로 되돌렸습니다. 입력한 내용은 다시 확인해 주세요. '+error.message;
   render();storageStatus();throw error;
  }finally{busy=false;inTransaction=false;effects=[];}
 });
 pending=result.catch(()=>{});return result;
}
let toastTimer;
function toast(t){if(inTransaction){effects.push(t);return}$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3700)}
function download(data,name,type='application/pdf'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
const workspacePages=[
 ['overview','grid','작업 상세'],['gate','brain','이해 과제'],['review','shield','검토·승인'],
 ['history','clock','버전·이력'],['certificate','qr','승인 증명서']
];
function brand(){return `<span class="brand"><span class="mark">${icon('link')}</span><span>HAVE</span></span>`}
function baseShell(content){
 const pageName=workspacePages.find(([name])=>name===screen)?.[2];
 return `<a class="skip-link" href="#mainContent">본문으로 이동</a>
 <div class="shell">
  <header class="topbar">
   <button class="brand-button" data-nav="overview" aria-label="HAVE 작업 상세">${brand()}</button>
   <div class="crumb"><span>팀 워크스페이스</span><span aria-hidden="true">/</span><b>${pageName}</b></div>
   <div class="top-actions"><span class="demo-pill">로컬 시연</span><label class="role-control"><span class="avatar" aria-hidden="true">${role==='author'?'A':'B'}</span><select id="role" aria-label="시연 역할"><option value="author" ${role==='author'?'selected':''}>작성자 A</option><option value="reviewer" ${role==='reviewer'?'selected':''}>검토자 B</option></select></label></div>
  </header>
  <aside class="sidebar">
   <div class="sidebar-main"><div class="side-label">워크스페이스</div>
    <nav class="nav" aria-label="작업 메뉴">${workspacePages.map(([name,symbol,label])=>`<button data-nav="${name}" ${screen===name?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></button>`).join('')}</nav>
   </div>
   <div class="sidebar-foot">
    <div class="local-note"><span class="local-dot" aria-hidden="true"></span><span>이 브라우저에 기록 저장</span></div>
    <button class="sidebar-reset" data-action="reset">${icon('refresh')} 시연 초기화</button>
   </div>
  </aside>
  <main id="mainContent" class="main" tabindex="-1">
   ${content}
   <footer class="footer-note">HAVE 로컬 프로토타입 <span>·</span> 작성자와 검토자는 시연 역할입니다.<button class="btn ghost small mobile-reset" data-action="reset">${icon('refresh')} 시연 초기화</button></footer>
  </main>
 </div>`;
}
function heading(title,description,actions=''){
 return `<div class="page-heading"><div><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${actions}</div>`;
}
function fileHead(v=current()){
 return `<div class="work-row"><div class="pdf-icon">PDF</div><div class="work-file-context"><div class="work-title">${esc(db.title)}</div><div class="flex wrap"><span class="badge">v${v.n}</span><span class="small muted">${esc(v.fileName)}</span></div></div><button class="btn small" data-action="previewPdf">PDF 원문 보기 <span aria-hidden="true">↗</span></button></div>`;
}
function nextWorkAction(v,approval){
 if(approval)return ['certificate',approval.revokedAt?'승인 기록 확인':'승인 증명서 보기'];
 if(gatesSubmitted(v))return ['review',role==='reviewer'?'검토 시작':'검토 상태 보기'];
 const label=role==='reviewer'?'과제 제출 상태 보기':v.returned?'답변 보완하기':v.gates.some(gate=>gate.submitted)?'답변 이어서 작성':'이해 과제 시작';
 return ['gate',label];
}
function nextWorkButton([target,label],classes){
 return `<button class="btn primary ${classes}" data-nav="${target}">${label} <span aria-hidden="true">→</span></button>`;
}
function workProgress(v,approval){
 const submitted=v.gates.filter(gate=>gate.submitted).length;
 const reviewStatus=approval?(approval.revokedAt?'철회':'승인 완료'):gatesPassed(v)?'평가 기준 충족':submitted===3?(v.gates.some(gate=>gate.evaluation)?'검토 중':'검토 대기'):'대기';
 const stages=[
  ['PDF 등록','완료',true],
  ['이해 과제',v.returned?'보완 요청':submitted+' / 3 제출',submitted===3],
  ['검토·승인',reviewStatus,!!approval],
  ['승인 증명서',approval?'발급 기록 있음':'미발급',!!approval]
 ];
 const currentStage=stages.findIndex(stage=>!stage[2]);
 return `<section class="panel">
  <div class="panel-head"><h2>작업 진행</h2><span class="badge">v${v.n}</span></div>
  <div class="panel-body">
   <ol class="work-progress">${stages.map(([label,status,done],index)=>`<li class="${done?'is-done':index===currentStage?'is-current':''}" ${index===currentStage?'aria-current="step"':''}>
    <span class="progress-marker" aria-hidden="true">${done?icon('check'):index+1}</span><span>${label}</span><span class="progress-status">${status}</span>
   </li>`).join('')}</ol>
   ${nextWorkButton(nextWorkAction(v,approval),'full-width progress-action')}
  </div>
 </section>`;
}
function riskPanel(v){
 const total=v.risk.reduce((sum,score)=>sum+score,0),level=total>=7?'높음':total>=4?'보통':'낮음';
 return `<details class="panel risk-details"><summary><b>검토 위험도</b><span class="badge ${total>=7?'orange':'purple'}">${level} · ${total}/10</span></summary>
  <div class="panel-body"><div class="risk-grid">${riskLabels.map((label,i)=>`<span>${label}</span><b>${v.risk[i]} / ${riskMax[i]}</b>`).join('')}</div>
  <p class="inline-note">작성자가 입력한 참고 정보입니다.</p></div></details>`;
}
function overview(){
 const v=current(),approval=approvalFor(v),recent=db.events.filter(event=>event.target===v.id).slice(-2).reverse();
 const previousApproval=!approval&&latestApproval();
 const lastRequest=v.returned&&v.reviewRounds?.at(-1);
 const contributionCount=v.contributions?.length??0;
 return `<div class="work-heading">
  <div><div class="flex wrap work-meta"><span class="version-label">v${v.n}</span>${badge(v)}</div>
   <h1 tabindex="-1">${esc(db.title)}</h1><p>작성자 A <span aria-hidden="true">·</span> 검토자 B <span aria-hidden="true">·</span> ${stamp(v.createdAt)} 등록</p></div>
  ${role==='author'?'<div class="flex wrap work-actions"><button class="btn" data-action="newWork">새 작업</button><button class="btn outline" data-action="newVersion">'+icon('plus')+'새 버전 등록</button></div>':''}
 </div>
 ${lastRequest?`<div class="callout warning gap">${icon('info')}<div><b>검토자가 답변 보완을 요청했습니다</b>${esc(lastRequest.reason)}</div></div>`:''}
 ${nextWorkButton(nextWorkAction(v,approval),'narrow-next')}
 <div class="split">
  <div class="content-stack">
   <section class="panel">
    <div class="panel-head"><h2>결과물</h2><button class="btn ghost small" data-action="downloadOriginal">${icon('download')} PDF 받기</button></div>
    <button class="document-preview" data-action="previewPdf" aria-label="PDF 원문 보기: ${esc(v.fileName)}">
     <span class="doc-sheet" aria-hidden="true"><span class="sheet-brand">HAVE</span><span class="sheet-label">PDF <span>v${v.n}</span></span><strong>${esc(db.title)}</strong><span class="document-lines"><i></i><i></i><i></i></span></span>
     <span class="preview-open">${icon('file')} PDF 원문 보기 <span aria-hidden="true">↗</span></span>
    </button>
    <div class="document-meta"><div class="file-label">${icon('file')}<span><strong>${esc(v.fileName)}</strong><span class="muted small">PDF · ${fmtSize(v.size)}</span></span></div>
     <details class="file-details"><summary>파일 식별 정보</summary><div><p class="muted small">버전 ID</p><p class="mono">${esc(v.id)}</p><p class="muted small mt">SHA-256</p><p class="mono">${v.hash}</p></div></details>
    </div>
   </section>
   <section class="panel">
    <div class="panel-head"><h2>작업 근거</h2><button class="btn ghost small" data-nav="history">이력에서 보기 <span aria-hidden="true">→</span></button></div>
    <div class="panel-body">
     <div class="detail-grid"><div class="detail-item"><span class="muted">AI 활용 도구</span>${esc(v.tool)}</div><div class="detail-item"><span class="muted">AI 사용 범위 · 작성자 신고</span>${esc(v.scope)}</div></div>
     <div class="evidence-row"><div><b>연결한 기여 기록</b><p class="small muted">${contributionCount?contributionCount+'개 기록이 이 버전의 검토 범위에 포함됩니다.':'Chrome 확장에서 내보낸 기록을 연결할 수 있어요.'}</p></div>
      ${role==='author'&&!approval?`<button class="btn small" data-action="importContributions">${icon('upload')} 기록 가져오기</button>`:''}</div>
    </div>
   </section>
  </div>
  <aside class="support-column">
   ${workProgress(v,approval)}
   ${previousApproval?`<section class="panel previous-record"><div class="panel-body"><h3>이전 버전 승인</h3><p class="inline-note">v${previousApproval.n} 승인 기록${previousApproval.revokedAt?' · 철회':''}</p><button class="btn small mt" data-nav="certificate">승인 기록 보기</button></div></section>`:''}
   ${recent.length?`<section class="panel"><div class="panel-head"><h2>최근 활동</h2><button class="btn ghost small" data-nav="history">전체 이력 <span aria-hidden="true">→</span></button></div>
    <ul class="recent-list">${recent.map(event=>`<li><span class="activity-dot" aria-hidden="true"></span><div><b>${esc(event.action)}</b><p>${esc(event.actor)} · ${stamp(event.time)}</p></div></li>`).join('')}</ul></section>`:''}
   ${riskPanel(v)}
  </aside>
 </div>`;
}
function gateScreen(){
 const v=current(),gate=v.gates[gateIndex],completed=v.gates.filter(item=>item.submitted).length;
 const editable=role==='author'&&!gate.submitted;
 const lastRequest=v.returned&&v.reviewRounds?.at(-1);
 return heading('이해 과제','v'+v.n+'의 핵심 판단을 설명하고 근거를 남기세요.',`<span class="badge purple">${completed} / 3 제출</span>`)+`
 <div class="split gate-layout">
  <section class="panel">
   ${fileHead()}
   <div class="gate-tabs" role="tablist" aria-label="이해 과제">${gateNames.map((name,i)=>`<button id="gate-tab-${i}" role="tab" aria-selected="${i===gateIndex}" aria-controls="gate-panel" tabindex="${i===gateIndex?'0':'-1'}" data-gate="${i}">${name}${v.gates[i].submitted?' <span aria-label="제출 완료">✓</span>':''}</button>`).join('')}</div>
   <div class="panel-body" id="gate-panel" role="tabpanel" aria-labelledby="gate-tab-${gateIndex}">
    ${lastRequest?`<div class="callout warning gap">${icon('info')}<div><b>검토자의 보완 요청</b>${esc(lastRequest.reason)}</div></div>`:''}
    <div class="flex between wrap"><h2>${gateTitles[gateIndex]}</h2><span class="badge ${gate.submitted?'green':''}">${gate.submitted?'제출 완료':'미제출'}</span></div>
    <div class="task-prompt"><p>${gatePrompts[gateIndex]}</p>${gateIndex===1?`<blockquote class="reference">“승인 여부는 파일 이름으로 확인한다. 파일 이름이 같으면 내용이 변경되어도 기존 승인이 유지된다.”</blockquote><p class="small muted">오류를 넣은 검증용 복제 문단입니다. 원본 PDF는 그대로 유지됩니다.</p>`:''}</div>
    <form id="gateForm">
     <label class="field"><span>답변</span><textarea id="answer" maxlength="10000" required placeholder="판단한 이유와 확인한 근거를 적어 주세요." ${editable?'':'readonly'}>${esc(gate.answer)}</textarea></label>
     <div class="field"><label for="confidence">답변에 대한 자기 확신</label><div class="confidence"><input id="confidence" type="range" min="0" max="100" step="5" value="${gate.confidence}" ${editable?'':'disabled'}><b id="confidenceValue">${gate.confidence}%</b></div><p class="inline-note">확신도는 검토에 참고합니다. 과제 점수는 검토자가 입력합니다.</p></div>
     ${gate.evaluation?`<div class="callout ${gate.evaluation.critical?'error':'success'}">${icon('info')}<div><b>검토자 평가 · ${gate.evaluation.score} / 2점</b>${esc(gate.evaluation.reason)}${gate.evaluation.critical?'<br>치명 오류가 있어 수정이 필요합니다.':''}</div></div>`:''}
     <div class="error-text" id="gateError" role="alert"></div>
     <div class="flex between wrap mt"><button type="button" class="btn small" data-action="sampleAnswer" ${editable?'':'disabled'}>샘플 답변 넣기</button><button class="btn primary" type="submit" ${editable?'':'disabled'}>${gate.submitted?'제출 완료':'답변 제출'}</button></div>
     ${role!=='author'?'<p class="inline-note">검토자 역할에서는 답변을 열람할 수 있습니다.</p>':''}
    </form>
   </div>
   <div class="panel-foot"><span class="small muted">임시 답변은 이 브라우저에 저장됩니다.</span><button class="btn ${completed===3?'primary':''}" data-nav="review" ${completed!==3?'disabled':''}>검토·승인으로 <span aria-hidden="true">→</span></button></div>
  </section>
  <aside class="support-column">
   <section class="panel"><div class="panel-head"><h2>제출 현황</h2><span class="badge">${completed}/3</span></div><div class="panel-body">
    <ul class="plain-list">${gateNames.map((name,i)=>`<li><span>${name}</span><span class="badge ${v.gates[i].submitted?'green':''}">${v.gates[i].submitted?'제출':'미제출'}</span></li>`).join('')}</ul>
    <button class="btn small full-width mt" data-action="sampleAll" ${role!=='author'||completed===3?'disabled':''}>샘플 답변 3개 채우기</button>
   </div></section>
   ${riskPanel(v)}
  </aside>
 </div>`;
}

function approvalReasons(v){const reasons=[];if(storageProblem)reasons.push('저장 오류를 해결한 뒤 승인하세요.');if(role!=='reviewer')reasons.push('검토자 B 역할로 전환해야 합니다. 자기 승인은 금지됩니다.');if(!gatesSubmitted(v))reasons.push('세 과제의 답변을 모두 제출해야 합니다.');if(!v.gates.every(g=>g.evaluation?.reason.trim()))reasons.push('모든 과제에 점수와 평가 근거가 필요합니다.');if(totalScore(v)<5)reasons.push('총점 5 / 6점 이상이 필요합니다.');if(v.gates.some(g=>g.evaluation?.critical))reasons.push('치명 오류가 있는 과제의 재검토가 필요합니다.');if(!v.checks.every(Boolean))reasons.push('필수 체크리스트 4개를 모두 확인해야 합니다.');if(!v.memo.trim())reasons.push('최종 검토 근거를 입력해야 합니다.');if(approvalFor(v))reasons.push('이미 승인 기록이 있는 버전입니다. 새 버전을 등록해 주세요.');if(v.returned)reasons.push('수정 요청 후 답변을 다시 제출해야 합니다.');return reasons}
function reviewScreen(){
 const v=current(),submitted=gatesSubmitted(v),approval=approvalFor(v),canReview=role==='reviewer'&&!approval;
 return heading('검토·승인','v'+v.n+'의 답변과 근거를 검토하고 승인 여부를 결정하세요.',
  `<button class="btn" data-action="sampleEvaluation" ${canReview&&submitted?'':'disabled'}>샘플 평가 채우기</button>`)+`
 <div class="split review-layout">
  <section class="panel">
   ${fileHead()}
   <div class="panel-body">
    ${role!=='reviewer'?`<div class="callout gap">${icon('info')}<div><b>작성자 열람 모드</b>평가와 승인은 상단의 검토자 B 역할에서 진행합니다.</div></div>`:''}
    ${!submitted?`<div class="callout warning gap">${icon('brain')}<div><b>답변 제출 대기</b>작성자가 세 과제의 답변을 제출하면 최종 검토를 진행할 수 있습니다.</div></div>`:''}
    <div class="gate-result"><div><h2>이해 과제 평가</h2><p class="small muted">5/6점 이상 · 치명 오류 없음 · 평가 근거 필요</p></div><div class="text-right"><div class="score">${totalScore(v)} <span class="small muted">/ 6</span></div><span class="badge ${gatesPassed(v)?'green':'orange'}">${gatesPassed(v)?'평가 기준 충족':'평가 기준 미충족'}</span></div></div>
    ${gateNames.map((name,i)=>{
     const gate=v.gates[i],evaluation=gate.evaluation,editable=canReview&&gate.submitted;
     return `<section class="eval-card"><div class="flex between wrap"><h3>${name}</h3><span class="small muted">자기 확신 ${gate.confidence}%</span></div>
      <div class="answer-quote">${gate.submitted?esc(gate.answer):'답변이 제출되지 않았습니다.'}</div>
      <p class="inline-note">평가 기준 · ${rubric[i]}</p>
      <div class="eval-row">
       <label class="field"><span>점수</span><select data-eval-score="${i}" ${editable?'':'disabled'}><option value="">평가 전</option>${[0,1,2].map(score=>`<option value="${score}" ${evaluation?.score===score?'selected':''}>${score}점 · ${['미충족','부분 충족','충족'][score]}</option>`).join('')}</select></label>
       <label class="field"><span>평가 근거</span><textarea maxlength="5000" data-eval-reason="${i}" placeholder="답변에서 확인한 근거를 적어 주세요." ${editable?'':'readonly'}>${esc(evaluation?.reason||'')}</textarea></label>
      </div>
      <label class="check-row"><input type="checkbox" data-critical="${i}" ${evaluation?.critical?'checked':''} ${editable?'':'disabled'}>${i===1?'주입 오류 미발견 또는 치명 오류 있음':'치명적 오개념 있음'}</label>
     </section>`;
    }).join('')}
   </div>
  </section>
  <aside class="support-column">
   <section class="panel"><div class="panel-head"><h2>최종 검토</h2><span class="badge">${v.checks.filter(Boolean).length}/4</span></div><div class="panel-body">
    ${checks.map((label,i)=>`<label class="check-row"><input type="checkbox" data-check="${i}" ${v.checks[i]?'checked':''} ${canReview?'':'disabled'}>${label}</label>`).join('')}
    <label class="field"><span>최종 검토 근거</span><textarea maxlength="5000" id="reviewMemo" placeholder="승인 판단의 근거를 남겨 주세요." ${canReview?'':'readonly'}>${esc(v.memo)}</textarea></label>
    <p class="inline-note">승인은 PDF v${v.n}과 해당 버전의 검토 근거에 고정됩니다.</p><div id="approvalControls">${approvalControls()}</div>
   </div></section>
  </aside>
 </div>`;
}
function approvalControls(){const v=current(),reasons=approvalReasons(v),a=approvalFor(v);if(a)return `<div class="callout ${a.revokedAt?'error':'success'}">${icon('shield')}<div><b>${a.revokedAt?'이 승인은 철회되었습니다':'승인 증명서가 발급되었습니다'}</b>이 버전은 다시 승인할 수 없습니다.</div></div><button class="btn primary mt" data-nav="certificate" style="width:100%">증명서 보기</button>`;return `<div class="block-reasons" id="blockReasons">${reasons.length?reasons.map(s=>`<div>· ${s}</div>`).join(''):'승인 조건을 모두 충족했습니다.'}</div><button class="btn primary" data-action="approve" style="width:100%" ${reasons.length?'disabled':''}>${icon('shield')}v${v.n} 승인 · 증명서 발급</button><button class="btn danger mt" data-action="return" style="width:100%" ${role!=='reviewer'||!gatesSubmitted(v)?'disabled':''}>수정 요청</button>`}
function latestApproval(){return db.approvals.at(-1)}
function certScreen(){
 const approval=latestApproval();
 if(!approval)return heading('승인 증명서','승인된 파일과 검토 내역을 확인할 수 있습니다.')+`
 <section class="panel empty">${icon('shield')}<h2>아직 발급된 증명서가 없습니다</h2><p>검토자 B가 승인을 완료하면 증명서가 발급됩니다.</p><button class="btn primary" data-nav="review">검토 화면으로</button></section>`;
 const v=db.versions.find(version=>version.id===approval.versionId);
 return heading('승인 증명서','승인 당시의 PDF와 검토 기록입니다.',
  `<div class="flex wrap"><button class="btn" data-action="print">${icon('file')} 인쇄 · PDF 저장</button><button class="btn" data-action="downloadReceipt">${icon('download')} JSON 받기</button></div>`)+`
 <div class="split">
  <article class="receipt panel">
   <div class="receipt-top"><div>${brand()}<h2>인간 승인 증명서</h2></div><span class="receipt-symbol">${icon('shield')}</span></div>
   <div class="receipt-body">
    <div class="flex between wrap"><span class="small mono">${esc(approval.serial)}</span><span class="badge ${approval.revokedAt?'red':'green'}">${approval.revokedAt?'승인 철회':'승인 기록 발급'}</span></div>
    <h3 class="receipt-title">${esc(approval.title)}</h3>
    ${v.id!==current().id?`<div class="callout warning gap">${icon('info')}<div><b>최신 버전 v${current().n} 있음</b>이 증명서의 승인 대상은 v${v.n}입니다.</div></div>`:''}
    ${approval.revokedAt?`<div class="callout error gap">${icon('close')}<div><b>승인 철회 · ${stamp(approval.revokedAt)}</b>${esc(approval.revocationReason)}</div></div>`:''}
    <div class="receipt-data detail-grid">
     <div class="detail-item"><span class="muted">승인 대상</span>v${v.n} · ${esc(v.fileName)}</div>
     <div class="detail-item"><span class="muted">검토·승인자</span>검토자 B</div>
     <div class="detail-item"><span class="muted">승인 시각 (한국)</span>${stamp(approval.approvedAt)}</div>
     <div class="detail-item"><span class="muted">이해 과제 결과</span>${approval.score} / 6점</div>
    </div>
    <div class="subsection"><h3>최종 검토 근거</h3><p class="review-note">${esc(approval.memo)}</p></div>
    <div class="subsection"><h3>파일 식별 정보</h3><div class="hash"><div><p class="small muted">SHA-256</p><p class="mono">${approval.fileHash}</p></div></div><p class="inline-note mono">${esc(v.id)}</p></div>
    <p class="inline-note receipt-scope">로컬 시연 기록 · 전자서명 미적용</p>
   </div>
  </article>
  <aside class="support-column">
   <section class="panel">
    <div class="panel-head"><h2>공개 검증</h2>${icon('qr')}</div>
    <div class="panel-body share-body"><div id="qrcode" aria-label="승인 검증 링크 QR"></div>
     <p class="small muted">다른 기기에서는 발급 당시 요약을 보고 가지고 있는 PDF를 비교할 수 있습니다.</p>
     <button class="btn primary full-width" data-action="verify" data-id="${esc(approval.id)}">검증 화면 열기 <span aria-hidden="true">↗</span></button>
     <button class="btn full-width" data-action="copyVerify">${icon('link')} 검증 링크 복사</button>
    </div>
   </section>
   ${role==='reviewer'&&!approval.revokedAt?'<section class="panel"><div class="panel-body"><button class="btn danger full-width" data-action="revoke">승인 철회</button></div></section>':''}
   ${role==='author'?'<button class="btn outline full-width" data-action="newVersion">'+icon('plus')+'새 버전 등록</button>':''}
  </aside>
 </div>`;
}
function verifyUrl(a){const base=location.protocol==='file:'?document.querySelector('meta[name=demo-site-url]').content:location.href.split('#')[0];return base+'#verify='+encodeURIComponent(to64(new TextEncoder().encode(JSON.stringify(publicRecord(a)))))}
function parseRecord(){try{const h=location.hash;if(!h.startsWith('#verify=')||h.length>12000)return null;return publicRecord(JSON.parse(new TextDecoder().decode(from64(decodeURIComponent(h.slice(8))))))}catch{return null}}
function activeVerifyApproval(snapshot=parseRecord()){
 const id=verifyId||snapshot?.id;
 return db.approvals.find(approval=>approval.id===id);
}
function verifyScreen(){
 const snapshot=parseRecord(),local=activeVerifyApproval(snapshot),record=local?publicRecord(local):snapshot;
 const header=`<header class="public-header">${brand()}<button class="btn small" data-action="workspace">작업 화면으로</button></header>`;
 if(!record)return header+`<main class="public-wrap"><section class="panel empty">${icon('info')}<h1>승인 기록을 찾을 수 없습니다</h1><p>증명서에서 발급한 검증 링크를 다시 열어 주세요.</p></section></main>`;
 const revoked=!!record.revokedAt,old=local&&record.n!==current().n;
 const title=!local?'발급 당시 승인 요약입니다':revoked?'승인이 철회되었습니다':old?'v'+record.n+'의 승인 기록입니다':'승인 기록이 유효합니다';
 const effectiveness=!local?'현재 효력 조회 불가':revoked?'철회됨':'이 브라우저 기록 기준 유효';
 return header+`<main class="public-wrap">
  ${heading('승인 기록 확인','대상 버전과 승인 상태를 확인하고, 가지고 있는 PDF를 비교하세요.')}
  <section class="panel">
   <div class="verify-status ${revoked?'is-revoked':!local?'is-snapshot':''}">
    <div class="status-symbol">${icon(revoked?'close':local?'shield':'info')}</div><div><h2>${title}</h2><p>v${record.n} · ${esc(record.title)}</p></div>
   </div>
   <div class="panel-body">
    <dl class="verify-facts"><div><dt>승인 효력</dt><dd>${effectiveness}</dd></div><div><dt>전자서명</dt><dd>미적용</dd></div>${old?`<div><dt>최신 버전</dt><dd>v${current().n} · 이 기록의 승인 대상은 v${record.n}</dd></div>`:''}</dl>
    <div class="subsection detail-grid">
     <div class="detail-item"><span class="muted">승인 대상 파일</span>${esc(record.fileName)}</div>
     <div class="detail-item"><span class="muted">승인자 · 시각 (한국)</span>검토자 B · ${stamp(record.approvedAt)}</div>
    </div>
    <details class="file-details public-hash mt"><summary>승인 당시 SHA-256</summary><div class="mono">${record.fileHash}</div></details>
    ${revoked?`<div class="callout error mt"><div><b>철회 사유 · ${stamp(record.revokedAt)}</b>${esc(record.revocationReason)}</div></div>`:''}
   </div>
  </section>
  <section class="panel verify-upload">
   <div class="panel-head"><h2>파일 비교</h2><span class="badge">SHA-256</span></div>
   <div class="panel-body">
    <label class="dropzone" for="verifyFile">${icon('upload')}<b>비교할 PDF 선택</b><span class="small muted">최대 20 MB · 이 기기에서 비교합니다.</span><input id="verifyFile" type="file" accept="application/pdf,.pdf"></label>
    <div id="verifyResult" role="status">${verifyResultHtml()}</div>
    ${local?`<div class="demo-tools mt"><h3>샘플 파일로 비교</h3><div class="flex wrap"><button class="btn small" data-action="compareOriginal">원본 파일 비교</button><button class="btn small" data-action="compareTampered">1바이트 변경 파일 비교</button><button class="btn small" data-action="downloadVerifyOriginal">${icon('download')} 원본 PDF 받기</button></div></div>`:''}
   </div>
  </section>
  <footer class="footer-note">HAVE 로컬 프로토타입 <span>·</span> 승인은 검토 절차와 대상 파일을 기록합니다.</footer>
 </main>`;
}
function verifyResultHtml(){if(!verifyResult)return `<div class="result-box"><b>파일 미확인</b><p>파일을 선택해야 일치 여부를 알 수 있습니다.</p></div>`;if(verifyResult.error)return `<div class="result-box red">${esc(verifyResult.error)}</div>`;return `<div class="result-box ${verifyResult.match?'green':'red'}"><div class="flex"><b>${icon(verifyResult.match?'check':'close')} ${verifyResult.match?'파일이 일치합니다':'파일이 일치하지 않습니다'}</b></div><p>${verifyResult.match?'승인된 파일과 바이트가 동일합니다.':'전달된 파일은 승인된 파일과 다릅니다. 기존 승인이 이 파일에 적용되지 않습니다.'}</p><div class="small" style="margin-top:10px">${esc(verifyResult.fileName)}</div><div class="mono" style="margin-top:5px">${verifyResult.hash}</div></div>`}
function historyScreen(){
 const active=current(),versionNumbers=new Map(db.versions.map(version=>[version.id,version.n]));
 const actions=role==='author'?`<div class="flex wrap"><button class="btn" data-action="importContributions" ${approvalFor(active)?'disabled':''}>기여 기록 가져오기</button><button class="btn primary" data-action="newVersion">${icon('plus')}새 버전 등록</button></div>`:'';
 return heading('버전·이력','등록한 파일과 검토 기록을 버전별로 확인하세요.',actions)+`
 <div class="split">
  <div class="content-stack">
   <section class="panel">
    <div class="panel-head"><h2>파일 버전</h2><span class="badge">${db.versions.length}개</span></div>
    ${[...db.versions].reverse().map(v=>{
     const approval=approvalFor(v),isLatest=v.id===active.id;
     const versionBadge=isLatest?'<span class="badge purple">최신 버전</span>':'<span class="badge">후속 버전 있음</span>';
     const reviewBadge=approval?`<span class="badge ${approval.revokedAt?'red':'green'}">${approval.revokedAt?'승인 철회':'승인 완료'}</span>`:badge(v);
     return `<div class="version-row">
     <div><div class="flex wrap"><h3 class="version-label">v${v.n}</h3>${versionBadge}${reviewBadge}</div>
      <p><strong>${esc(v.fileName)}</strong> · ${stamp(v.createdAt)}</p><p>${esc(v.reason)}</p><div class="mono muted">${v.hash.slice(0,36)}…</div></div>
     <div class="flex wrap"><button class="btn small" data-action="previewPdf" data-version-id="${esc(v.id)}">원문 보기</button><button class="btn small" data-download-version="${esc(v.id)}">${icon('download')} PDF</button></div>
    </div>`;
    }).join('')}
   </section>
   ${contributionPanel()}
   ${reviewHistoryPanel()}
  </div>
  <aside class="support-column">
   <section class="panel"><div class="panel-head"><h2>활동 이력</h2></div>
    <ol class="timeline">${[...db.events].reverse().map(event=>`<li class="event"><div class="event-icon">${icon(event.action.includes('승인')?'shield':event.action.includes('과제')?'brain':'file')}</div><div><h3>${esc(event.action)}</h3><p>v${versionNumbers.get(event.target)} · ${esc(event.actor)} · ${stamp(event.time)}</p><p>${esc(event.note)}</p></div></li>`).join('')}</ol>
    <div class="panel-foot"><button class="btn small" data-action="checkChain">${icon('link')} 기록 연결 확인</button></div><div id="chainResult" role="status"></div>
   </section>
  </aside>
 </div>`;
}
let focusAfterRender;
function render(){
 if(inTransaction){needsRender=true;return}
 if(!db)return;
 const active=document.activeElement;
 const control=['data-gate','data-eval-score','data-critical','data-check'].find(name=>active?.hasAttribute(name));
 const focusTarget=focusAfterRender||(control?`[${control}="${active.getAttribute(control)}"]`:active?.id==='role'?'#role':null);
 focusAfterRender=null;
 $('#app').innerHTML=screen==='verify'?verifyScreen():baseShell(({overview,gate:gateScreen,review:reviewScreen,certificate:certScreen,history:historyScreen}[screen]||overview)());
 if(screen==='certificate'&&latestApproval()&&typeof QRCode!=='undefined'){
  try{new QRCode($('#qrcode'),{text:verifyUrl(latestApproval()),width:176,height:176,colorDark:'#28222b',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.L})}
  catch{$('#qrcode').textContent='검증 화면 버튼을 이용하세요';}
 }
 if(focusTarget)$(focusTarget)?.focus({preventScroll:true});
}
function navigate(target){
 comparisonRequest++;
 screen=target;
 verifyResult=null;
 focusAfterRender='.main h1';
 render();
 window.scrollTo({top:0,behavior:'instant'});
}
function modal(title,body){
 const dialog=$('#modal');
 dialog.innerHTML=`<div class="modal-head"><h2 id="modalTitle">${title}</h2><button class="icon-button" data-action="closeModal" aria-label="닫기">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
 dialog.setAttribute('aria-labelledby','modalTitle');
 dialog.showModal();
 return dialog;
}
function previewPdf(version){
 if(!version)throw Error('이 버전의 PDF를 찾을 수 없습니다.');
 const url=URL.createObjectURL(new Blob([from64(version.fileData)],{type:'application/pdf'}));
 const dialog=modal('PDF 원문 · v'+version.n,`<div class="preview-toolbar"><span>${esc(version.fileName)}</span><a class="btn small" href="${url}" download="${esc(version.fileName)}">${icon('download')} PDF 받기</a></div><object class="pdf-viewer" type="application/pdf" data="${url}"><p>PDF 뷰어를 사용할 수 없습니다. 위의 PDF 받기로 원본을 확인해 주세요.</p></object>`);
 dialog.classList.add('pdf-dialog');
 dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.classList.remove('pdf-dialog');},{once:true});
}
function closeModal(){$('#modal').close()}
function riskFields(){return `<div class="form-row">${riskLabels.map((t,i)=>`<label class="field"><span>${t}</span><select name="risk${i}">${Array.from({length:riskMax[i]+1},(_,n)=>`<option value="${n}" ${n===[3,3,1,1][i]?'selected':''}>${n} / ${riskMax[i]}</option>`).join('')}</select></label>`).join('')}</div>`}
function registrationModal(isVersion=false){if(role!=='author'){toast('파일을 등록하려면 작성자 A로 전환하세요.');return}modal(isVersion?'새 버전 등록':'새 작업 등록',`<p>${isVersion?'이전 파일과 승인은 보존됩니다. 새 버전은 승인 전 상태로 시작합니다.':'현재 샘플 작업을 새 작업으로 바꿉니다. 시연용 작업은 한 번에 한 개를 체험합니다.'}</p><form id="registrationForm" data-version="${isVersion}">${!isVersion?'<label class="field"><span>작업 제목</span><input name="title" required maxlength="100" placeholder="예: AI 활용 프로젝트 보고서"></label>':''}<label class="field"><span>PDF 파일 · 최대 20 MB</span><input name="pdf" type="file" accept=".pdf,application/pdf"></label><label class="check-row"><input type="checkbox" name="useSample" checked>파일 없이 샘플 PDF로 시연하기</label>${isVersion?'<label class="field"><span>변경 사유</span><input name="reason" maxlength="2000" required value="검토 의견을 반영해 내용을 수정했습니다."></label>':''}<label class="field"><span>AI 활용 도구</span><input name="tool" required value="ChatGPT" maxlength="100"></label><label class="field"><span>AI 사용 범위 · 작성자 신고</span><textarea name="scope" maxlength="5000" required style="min-height:80px">설계 초안 생성 및 요구사항 정리</textarea></label><h3>위험 점수 입력</h3>${riskFields()}<p class="inline-note">검토자 B 배정 · 등록 후 세 종류의 이해 과제를 수행합니다.</p><div class="error-text" id="registrationError"></div><div class="modal-actions"><button type="button" class="btn" data-action="closeModal">취소</button><button type="submit" class="btn primary">${isVersion?'새 버전 등록':'등록 · 이해 과제 배정'}</button></div></form>`)}
async function validatePdf(file){if(file.size>MAX_PDF_BYTES)throw Error('PDF는 20 MB 이하만 등록할 수 있습니다.');if(!/\.pdf$/i.test(file.name)||file.type&&file.type!=='application/pdf')throw Error('PDF 파일을 선택해 주세요.');const bytes=new Uint8Array(await file.arrayBuffer());if(!bytes.length||bytes.length>MAX_PDF_BYTES)throw Error('PDF 파일 크기가 올바르지 않습니다.');const head=new TextDecoder().decode(bytes.subarray(0,5));if(head!=='%PDF-')throw Error('PDF 형식이 올바르지 않습니다. 확장자만 변경한 파일은 등록할 수 없습니다.');return bytes}
function ensureReviewer(){if(role!=='reviewer')throw Error('검토자 B 역할에서 진행하세요. 자기 승인은 금지됩니다.')}
function altered(bytes){const copy=new Uint8Array(bytes.length+1);copy.set(bytes);copy[copy.length-1]=10;return copy}
let comparisonRequest=0,fileSelectionRequest=0;
async function compare(bytes,fileName){
 const request=++comparisonRequest,recordKey=verifyId||location.hash;
 const snapshot=parseRecord(),approval=activeVerifyApproval(snapshot)||snapshot;
 if(!approval)throw Error('승인 기록이 없습니다.');
 const digest=await hash(bytes);
 if(request!==comparisonRequest||recordKey!==(verifyId||location.hash)||screen!=='verify')return;
 verifyResult={match:digest===approval.fileHash,hash:digest,fileName};
 $('#verifyResult').innerHTML=verifyResultHtml();
}
async function doAction(action,b){const v=current();switch(action){
 case 'importContributions':contributionImportModal();break;
 case 'confirmContributions':await confirmContributions();break;
 case 'sampleAnswer':if(role!=='author'||v.gates[gateIndex].submitted)return;v.gates[gateIndex].answer=samples[gateIndex];save();render();toast('샘플 답변을 채웠습니다. 내용을 확인하고 제출하세요.');break;
 case 'sampleAll':if(role!=='author')return;v.gates.forEach((g,i)=>{if(!g.submitted)g.answer=samples[i]});save();render();toast('각 과제 탭에서 답변 제출을 눌러 주세요.');break;
 case 'sampleEvaluation':ensureReviewer();if(!gatesSubmitted(v)||approvalFor(v))return;v.gates.forEach((g,i)=>g.evaluation={score:2,reason:['버전 식별과 바이트 무결성의 차이를 설명하고 재승인 조건을 확인했습니다.','파일명 비교의 오류를 발견하고 새 버전과 해시 비교를 제안했습니다.','승인 기록의 1:N 구조와 두 승인 완료 전 대기 상태를 설명했습니다.'][i],critical:false});v.memo='세 이해 과제의 설명과 판단 근거를 확인했습니다. 최종 PDF v'+v.n+'의 버전 ID와 해시, AI 사용 범위를 검토했습니다.';await audit('이해 과제 평가','검토자 B','세 과제 6 / 6점. 치명 오류 없음. 시연용 샘플 평가.');save();render();toast('평가를 채웠습니다. 체크리스트를 직접 확인하세요.');break;
 case 'approve':{ensureReviewer();const reasons=approvalReasons(v);if(reasons.length)throw Error(reasons[0]);const a={id:uid('receipt'),serial:'HP-2026-'+String(db.approvals.length+1).padStart(4,'0'),title:db.title,versionId:v.id,n:v.n,fileName:v.fileName,fileHash:v.hash,approvedAt:new Date().toISOString(),reviewer:'검토자 B',score:totalScore(v),memo:v.memo,aiDisclosureHash:await hashText(canonical({tool:v.tool,scope:v.scope})),checks:[...v.checks],evaluations:v.gates.map(g=>({...g.evaluation})),revokedAt:null};a.reviewDigest=await hashText(canonical(HumanProof.reviewSnapshot(v)));a.policyVersion=(v.policy||HumanProof.POLICY).version;a.payload=JSON.parse(JSON.stringify(a));a.payloadHash=await hashText(canonical(a.payload));db.approvals.push(a);await audit('v'+v.n+' 인간 승인 · 증명서 발급','검토자 B','과제와 체크리스트를 확인하고 승인 대상을 '+v.id+'에 고정했습니다.');save();navigate('certificate');toast('v'+v.n+'의 승인 증명서를 발급했습니다.');break}
 case 'verify':{const a=db.approvals.find(a=>a.id===b?.dataset.id)||latestApproval();if(!a)throw Error('증명서를 먼저 발급해 주세요.');verifyId=a.id;verifyResult=null;location.hash=verifyUrl(a).split('#')[1];screen='verify';render();window.scrollTo(0,0);break}
 case 'workspace':history.replaceState(null,'',location.href.split('#')[0]);verifyId=null;verifyResult=null;navigate('overview');break;
 case 'compareOriginal':{const a=activeVerifyApproval();if(!a)throw Error('원본은 증명서를 발급한 브라우저에서만 비교할 수 있습니다.');const t=db.versions.find(v=>v.id===a.versionId);await compare(from64(t.fileData),t.fileName);break}
 case 'compareTampered':{const a=activeVerifyApproval();if(!a)throw Error('샘플 비교는 발급한 브라우저에서 진행하세요.');const t=db.versions.find(v=>v.id===a.versionId);await compare(altered(from64(t.fileData)),t.fileName.replace(/\.pdf$/i,'_1byte_changed.pdf'));break}
 case 'downloadOriginal':download(from64(v.fileData),v.fileName);break;
 case 'previewPdf':previewPdf(b.dataset.versionId?db.versions.find(version=>version.id===b.dataset.versionId):v);break;
 case 'downloadVerifyOriginal':{const a=activeVerifyApproval(),t=db.versions.find(v=>v.id===a?.versionId);if(t)download(from64(t.fileData),t.fileName);break}
 case 'downloadReceipt':{const a=latestApproval();if(a)download(JSON.stringify({...a,signature:null,signatureStatus:'NOT_IMPLEMENTED_DEMO',demo:true},null,2),a.serial+'.json','application/json');break}
 case 'copyVerify':{
  const approval=latestApproval();
  if(!approval)return;
  const url=verifyUrl(approval);
  try{await navigator.clipboard.writeText(url);toast('검증 링크를 복사했습니다.')}
  catch{modal('검증 링크 복사',`<label class="field"><span>검증 링크</span><input id="shareUrl" readonly value="${esc(url)}"></label>`);$('#shareUrl').select()}
  break;
 }
 case 'print':window.print();break;
 case 'newWork':registrationModal(false);break;
 case 'newVersion':registrationModal(true);break;
 case 'closeModal':closeModal();break;
 case 'reset':modal('시연을 처음부터 시작할까요?',`<p>이 브라우저의 시연 답변, 승인, 버전 이력을 지우고 최초 샘플 작업을 준비합니다.</p><div class="modal-actions"><button class="btn" data-action="closeModal">취소</button><button class="btn primary" data-action="confirmReset">초기화 · 시연 시작</button></div>`);break;
 case 'confirmReset':await seed();role='author';gateIndex=0;verifyId=null;history.replaceState(null,'',location.href.split('#')[0]);closeModal();navigate('overview');toast('처음부터 시연할 준비가 되었습니다.');break;
 case 'return':ensureReviewer();if(approvalFor(v))throw Error('승인된 버전에는 수정 요청을 할 수 없습니다.');modal('작성자에게 수정 요청',`<p>수정 사유를 기록하면 과제 답변을 다시 작성하고 제출할 수 있습니다.</p><form id="returnForm"><label class="field"><span>수정 요청 근거</span><textarea name="reason" maxlength="2000" required placeholder="어떤 답변을 어떻게 보완해야 하나요?"></textarea></label><div class="modal-actions"><button type="button" class="btn" data-action="closeModal">취소</button><button class="btn danger" type="submit">수정 요청 기록</button></div></form>`);break;
 case 'revoke':{ensureReviewer();const a=latestApproval();if(!a||a.revokedAt)return;modal('인간 승인 철회',`<p>철회 이후 검증 화면에 승인 철회 상태와 사유가 표시됩니다. 기존 기록은 남습니다.</p><form id="revokeForm"><label class="field"><span>공개할 철회 사유</span><textarea name="reason" maxlength="2000" required placeholder="예: 승인 후 근거 자료의 오류를 발견했습니다."></textarea></label><div class="modal-actions"><button class="btn" type="button" data-action="closeModal">취소</button><button class="btn danger" type="submit">승인 철회 기록</button></div></form>`);break}
 case 'checkChain':{
  const ok=await verifyChain(db.events);
  $('#chainResult').innerHTML=`<div class="callout ${ok?'success':'error'}" style="margin:20px"><div><b>${ok?'해시 체인 연결 확인':'해시 체인 불일치'}</b>${db.events.length}개 이벤트 ${ok?'연결이 일치합니다.':'중 변경·누락·중복을 확인해야 합니다.'}<br><span class="small">이 브라우저에 저장된 이벤트의 연결만 확인합니다.</span></div></div>`;
  break;
 }
 }}
function contributionPanel(){const items=current().contributions||[];return `<section class="panel gap"><div class="panel-head"><h2>AI/Human 기여 근거</h2><span class="small muted">${items.length}개 · 작성자 신고</span></div><div class="panel-body">${items.length?items.map(item=>`<div class="eval-card"><b>${esc(item.actorType)} · ${esc(item.stage)}</b><p>${esc(item.note)}</p><p class="small muted">${esc(item.pageTitle)} · ${stamp(item.createdAt)}</p>${item.sourceUrl?`<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">근거 페이지</a>`:''}${item.selectedText?`<div class="answer-quote">${esc(item.selectedText)}</div>`:''}</div>`).join(''):'확장 프로그램에서 JSON을 내보낸 뒤 가져오세요. 저장된 기록은 이 버전의 검토 범위에 포함됩니다.'}</div></section>`}
function reviewHistoryPanel(){const rounds=db.versions.flatMap(version=>(version.reviewRounds||[]).map(round=>({...round,n:version.n})));if(!rounds.length)return '';return `<section class="panel gap"><div class="panel-head"><h2>이전 검토 회차</h2><span class="small muted">${rounds.length}개</span></div><div class="panel-body">${rounds.reverse().map(round=>`<details class="review-round"><summary>v${round.n} · ${stamp(round.at)} · ${esc(round.reason)}</summary>${round.gates.map((gate,index)=>`<div class="eval-card"><b>${gateNames[index]}</b><div class="answer-quote">${esc(gate.answer)}</div><p>이전 점수: ${gate.evaluation?gate.evaluation.score+' / 2점':'평가 전'} · 확신 ${gate.confidence}%</p><p>${esc(gate.evaluation?.reason||'')}</p></div>`).join('')}<p>이전 검토 메모: ${esc(round.memo)}</p></details>`).join('')}</div></section>`}
function contributionImportModal(){
 if(role!=='author'||approvalFor(current()))throw Error('미승인 버전에서 작성자만 기록을 가져올 수 있습니다. 승인 후에는 새 버전을 등록하세요.');
 pendingImport=null;
 modal('확장 기여 기록 가져오기',`<p>기록은 작성자 신고이며 AI 사용 여부나 인간 승인의 증명이 아닙니다. 현재 v${current().n}에 연결할 내용을 확인하세요.</p><label class="field"><span>확장 프로그램 JSON · 최대 1 MB</span><input id="contributionFile" type="file" accept=".json,application/json"></label><div id="contributionPreview"></div><div class="modal-actions"><button class="btn" data-action="closeModal">취소</button><button id="confirmImport" class="btn primary" data-action="confirmContributions" disabled>확인한 기록 연결</button></div>`);
}
async function confirmContributions(){
 if(role!=='author'||approvalFor(current())||!pendingImport||pendingImport.versionId!==current().id)throw Error('대상 버전이 변경되었습니다. 다시 가져오세요.');
 const version=current(),existing=new Set((version.contributions||[]).map(item=>item.id));
 const records=HumanProof.parseContributionExport({format:'humanproof-contributions',schema:1,records:pendingImport.records});
 const unique=new Map(records.filter(item=>!existing.has(item.id)).map(item=>[item.id,item]));
 if(!unique.size)throw Error('모두 이미 연결된 기록입니다.');
 if((version.contributions||[]).length+unique.size>100)throw Error('버전별 기여 기록은 최대 100개입니다.');
 version.reviewRounds??=[];version.reviewRounds.push({at:new Date().toISOString(),reason:'기여 근거 추가로 검토 범위 변경',gates:structuredClone(version.gates),checks:[...version.checks],memo:version.memo});
 version.contributions??=[];version.contributions.push(...unique.values());
 version.gates.forEach(gate=>gate.evaluation=null);version.checks=checks.map(()=>false);version.memo='';
 await audit('기여 근거 연결 · 평가 초기화','작성자 A',unique.size+'개 기록을 확인해 연결했습니다. 검토 범위가 바뀌어 기존 평가와 체크리스트를 초기화했습니다.');
 save();pendingImport=null;closeModal();render();toast('기여 기록을 연결했습니다. 검토자가 다시 평가해야 합니다.');
}
document.addEventListener('click',async event=>{
 if(!db)return;const target=event.target;
 const nav=target.closest('[data-nav]'),tab=target.closest('[data-gate]'),downloadButton=target.closest('[data-download-version]'),button=target.closest('[data-action]');
 if((nav?.disabled)||(tab?.disabled)||(button?.disabled)||(!nav&&!tab&&!downloadButton&&!button))return;
 const actionVersionId=current().id;
 try{await transaction(async()=>{
  if(nav){navigate(nav.dataset.nav);return}
  if(tab){gateIndex=Number(tab.dataset.gate);focusAfterRender='#gate-tab-'+gateIndex;render();return}
  if(downloadButton){const version=db.versions.find(item=>item.id===downloadButton.dataset.downloadVersion);if(version)download(from64(version.fileData),version.fileName);return}
  if(['approve','sampleEvaluation','sampleAnswer','sampleAll','confirmContributions'].includes(button.dataset.action)&&current().id!==actionVersionId)throw Error('대상 버전이 변경되었습니다. 다시 확인하세요.');await doAction(button.dataset.action,button);
 })}catch(error){toast(error.message||'다시 시도해 주세요.')}
});
document.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-gate]');
 if(!tab||screen!=='gate')return;
 const count=gateNames.length,index=Number(tab.dataset.gate);
 const targets={ArrowLeft:(index-1+count)%count,ArrowRight:(index+1)%count,Home:0,End:count-1};
 if(!Object.hasOwn(targets,event.key))return;
 event.preventDefault();
 $('#gate-tab-'+targets[event.key])?.click();
});
document.addEventListener('input',async event=>{
 if(!db)return;const node=event.target,versionId=current().id,index=gateIndex,value=node.value,actor=role;
 const reasonIndex=node.dataset.evalReason;
 if(!['answer','confidence','reviewMemo'].includes(node.id)&&reasonIndex===undefined)return;
 try{await transaction(async()=>{
  if(current().id!==versionId)return;const version=current(),gate=version.gates[index];
  if(node.id==='answer'&&actor==='author'&&!gate.submitted){gate.answer=value;save()}
  if(node.id==='confidence'&&actor==='author'&&!gate.submitted){gate.confidence=Number(value);if($('#confidenceValue'))$('#confidenceValue').textContent=gate.confidence+'%';save()}
  if(reasonIndex!==undefined&&actor==='reviewer'&&!approvalFor(version)&&version.gates[reasonIndex]?.submitted){const selected=version.gates[reasonIndex];selected.evaluation??={score:0,reason:'',critical:false};selected.evaluation.reason=value;save();if($('#approvalControls'))$('#approvalControls').innerHTML=approvalControls()}
  if(node.id==='reviewMemo'&&actor==='reviewer'&&!approvalFor(version)){version.memo=value;save();if($('#approvalControls'))$('#approvalControls').innerHTML=approvalControls()}
 })}catch(error){toast(error.message)}
});
document.addEventListener('change',async event=>{
 if(!db)return;const node=event.target;
 if(node.id==='verifyFile'){const file=node.files[0],request=++fileSelectionRequest,key=verifyId||location.hash;try{if(file){const bytes=await validatePdf(file);if(request===fileSelectionRequest&&key===(verifyId||location.hash)&&screen==='verify')await compare(bytes,file.name)}}catch(error){if(request===fileSelectionRequest&&key===(verifyId||location.hash)&&screen==='verify'){verifyResult={error:error.message};if($('#verifyResult'))$('#verifyResult').innerHTML=verifyResultHtml()}}return}
 if(node.id==='contributionFile'){
  pendingImport=null;$('#confirmImport').disabled=true;const file=node.files[0],versionId=current().id;
  try{if(!file||file.size>1024*1024)throw Error('1 MB 이하의 JSON 파일을 선택하세요.');const records=HumanProof.parseContributionExport(JSON.parse(await file.text()));if(!$('#contributionPreview')||current().id!==versionId)return;pendingImport={versionId,records};$('#contributionPreview').innerHTML=`<p>${records.length}개 기록을 가져옵니다. 이미 연결된 ID는 제외합니다.</p>${records.map(item=>`<div class="eval-card"><b>${esc(item.actorType)} · ${esc(item.stage)}</b><p>${esc(item.note)}</p><p class="mono">${esc(item.sourceUrl)}</p><div class="answer-quote">${esc(item.selectedText)}</div></div>`).join('')}<p>평가와 체크리스트가 초기화됩니다. 이 버전의 근거로 사용해도 되는지 확인하세요.</p>`;$('#confirmImport').disabled=false;}catch(error){if($('#contributionPreview'))$('#contributionPreview').textContent=error.message;}return;
 }
 const score=node.dataset.evalScore,critical=node.dataset.critical,check=node.dataset.check,value=node.value,checked=node.checked,versionId=current().id,actor=role;
 try{await transaction(async()=>{
  if(node.id==='role'){role=value==='reviewer'?'reviewer':'author';render();return}
  const version=current();if(version.id!==versionId||actor!=='reviewer'||approvalFor(version))return;
  if(score!==undefined&&version.gates[score]?.submitted){if(value==='')version.gates[score].evaluation=null;else{version.gates[score].evaluation??={score:0,reason:'',critical:false};version.gates[score].evaluation.score=Number(value)}save();render()}
  if(critical!==undefined&&version.gates[critical]?.submitted){version.gates[critical].evaluation??={score:0,reason:'',critical:false};version.gates[critical].evaluation.critical=checked;save();render()}
  if(check!==undefined){version.checks[check]=checked;save();render()}
 })}catch(error){toast(error.message)}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!['gateForm','registrationForm','revokeForm','returnForm'].includes(form.id))return;event.preventDefault();
 const values=new FormData(form),versionId=current().id,index=gateIndex,answer=form.id==='gateForm'?$('#answer').value.trim():null;
 try{await transaction(async()=>{
  if(current().id!==versionId)throw Error('대상 버전이 변경되었습니다. 다시 진행하세요.');
  if(form.id==='gateForm'){
   const version=current(),gate=version.gates[index];if(role!=='author'||gate.submitted)return;
   if(!answer)throw Error('답변을 입력해 주세요.');gate.answer=answer;gate.submitted=true;gate.evaluation=null;
   if(gatesSubmitted(version))version.returned=false;
   await audit(gateNames[index]+' 답변 제출','작성자 A','자기 확신 '+gate.confidence+'%. answer_sha256: '+await hashText(answer));save();if(index<2)gateIndex=index+1;focusAfterRender='#gate-tab-'+gateIndex;render();toast(gatesSubmitted(version)?'세 과제가 제출되었습니다. 검토자 B로 전환하세요.':'답변을 제출했습니다. 다음 과제를 확인하세요.');
  }
  if(form.id==='registrationForm'){
   const isVersion=form.dataset.version==='true';if(role!=='author')throw Error('작성자 역할에서만 등록할 수 있습니다.');let bytes,name;const file=values.get('pdf');
   if(file?.name){bytes=await validatePdf(file);name=file.name}else if(values.get('useSample')){bytes=isVersion?altered(from64(current().fileData)):makePdf();name='system_design_v'+(isVersion?current().n+1:1)+'.pdf'}else throw Error('PDF를 선택하거나 샘플 PDF를 선택하세요.');
   const title=isVersion?db.title:String(values.get('title')).trim(),tool=String(values.get('tool')).trim(),scope=String(values.get('scope')).trim(),reason=isVersion?String(values.get('reason')).trim():'최초 파일 등록';
   if(!title||!tool||!scope||!reason)throw Error('필수 항목을 모두 입력해 주세요.');const risk=riskLabels.map((_,i)=>Number(values.get('risk'+i)));
   if(risk.some((n,i)=>!Number.isInteger(n)||n<0||n>riskMax[i]))throw Error('위험 점수가 올바르지 않습니다.');
   const number=isVersion?current().n+1:1,version=await makeVersion(number,name,bytes,tool,scope,risk,reason);
   if(isVersion){if(version.hash===current().hash&&tool===current().tool&&scope===current().scope&&canonical(risk)===canonical(current().risk))throw Error('파일·AI 신고·위험도가 같습니다. 변경한 내용을 확인하세요.');db.versions.push(version)}else db={schema:2,workId:uid('work'),title,versions:[version],approvals:[],events:[]};
   await audit('PDF v'+number+' 등록 · 과제 배정','작성자 A',reason+(isVersion?' 이전 버전의 승인은 새 버전에 적용되지 않습니다.':''));save();gateIndex=0;closeModal();navigate('overview');toast('v'+number+' 버전을 등록했습니다. 이해 과제를 시작하세요.');
  }
  if(form.id==='revokeForm'){
   ensureReviewer();const reason=String(values.get('reason')).trim(),approval=latestApproval();if(!reason)throw Error('철회 사유를 입력해 주세요.');if(!approval||approval.revokedAt)throw Error('철회할 승인이 없습니다.');approval.revokedAt=new Date().toISOString();approval.revocationReason=reason;await audit('v'+approval.n+' 승인 철회','검토자 B',reason,approval.versionId);save();closeModal();navigate('certificate');toast('승인이 철회되었습니다.');
  }
  if(form.id==='returnForm'){
   ensureReviewer();const reason=String(values.get('reason')).trim(),version=current();if(!reason)throw Error('수정 요청 근거를 입력해 주세요.');if(approvalFor(version)||!gatesSubmitted(version))throw Error('미승인 버전의 제출된 답변만 수정 요청할 수 있습니다.');
   version.reviewRounds??=[];version.reviewRounds.push({at:new Date().toISOString(),reason,gates:structuredClone(version.gates),checks:[...version.checks],memo:version.memo});
   version.gates.forEach(gate=>{gate.submitted=false;gate.evaluation=null});version.returned=true;version.checks=checks.map(()=>false);version.memo='';
   await audit('과제 수정 요청','검토자 B',reason);save();closeModal();navigate('gate');toast('이전 평가를 보존하고 현재 평가를 초기화했습니다. 답변을 보완해 다시 제출하세요.');
  }
 })}catch(error){const target=form.id==='registrationForm'?$('#registrationError'):form.id==='gateForm'?$('#gateError'):null;if(target)target.textContent=error.message;else toast(error.message)}
});
window.addEventListener('hashchange',()=>{verifyId=null;comparisonRequest++;if(location.hash.startsWith('#verify=')){screen='verify';verifyResult=null;render()}else if(screen==='verify')navigate('overview')});
channel?.addEventListener('message',()=>{
 pending=pending.then(async()=>{try{const stored=await repository.load();if(stored&&stored.revision>revision){await HumanProof.verifyIntegrity(stored.data,from64);db=stored.data;revision=stored.revision;closeModal();pendingImport=null;render();toast('다른 탭의 변경 내용을 불러왔습니다.');}}catch(error){storageProblem=error.message;storageStatus();}});
});
async function init(){
 let recovery=null;
 try{
  if(!crypto.subtle)throw Error('파일 해시 계산을 위해 로컬 서버 또는 HTTPS 주소로 열어 주세요.');
  await repository.open();const stored=await repository.load();revision=stored?.revision||0;recovery=stored?.data||null;
  if(stored)db=await HumanProof.verifyIntegrity(stored.data,from64);
  else{let legacy=null;try{legacy=localStorage.getItem(STORAGE)}catch{}if(legacy){recovery=legacy;db=await HumanProof.verifyIntegrity(JSON.parse(legacy),from64)}else await seed();revision=await repository.commit(db,0);}
  // Keep the old localStorage copy for explicit recovery; never silently erase user records.
  dirty=false;if(location.hash.startsWith('#verify='))screen='verify';render();registerAgentTools();
 }catch(error){
  $('#app').innerHTML=`<main class="public-wrap"><section class="panel empty"><h1>저장된 작업을 열 수 없습니다</h1><p>${esc(error.message)}</p><p>기존 기록은 자동 삭제하지 않았습니다. 백업을 먼저 저장한 뒤 초기화를 선택하세요.</p><button id="recoveryBackup" class="btn">기존 기록 백업</button><label class="check-row"><input id="resetConsent" type="checkbox">기존 기록을 새 샘플로 바꾸는 데 동의합니다</label><button id="recoveryReset" class="btn primary" disabled>새 샘플로 초기화</button></section></main>`;
  $('#recoveryBackup').onclick=()=>download(typeof recovery==='string'?recovery:JSON.stringify(recovery,null,2),'humanproof-recovery.json','application/json');
  $('#resetConsent').onchange=()=>$('#recoveryReset').disabled=!$('#resetConsent').checked;
  $('#recoveryReset').onclick=async()=>{try{await seed();revision=await repository.commit(db,revision);dirty=false;render();registerAgentTools()}catch(resetError){toast(resetError.message)}};
 }
}
function registerAgentTools(){if(!document.modelContext?.registerTool)return;const ctl=new AbortController();window.addEventListener('pagehide',()=>ctl.abort(),{once:true});const specs=[{name:'read_demo_work_status',title:'시연 작업 상태 조회',description:'현재 시연 작업의 버전, 과제 제출 상태, 승인 상태를 조회합니다. 비공개 답변은 반환하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('빈 객체를 전달하세요.');const v=current();return {version:v.n,status:statusOf(v)[0],submitted:v.gates.filter(g=>g.submitted).length,approvalAvailable:!!approvalFor(v)}}},{name:'navigate_demo_workflow',title:'시연 화면 이동',description:'HumanProof의 기존 화면으로 이동합니다. 답변 제출 또는 승인은 실행하지 않습니다.',inputSchema:{type:'object',properties:{screen:{type:'string',enum:['overview','gate','review','certificate','history']}},required:['screen'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).length!==1||!['overview','gate','review','certificate','history'].includes(input.screen))throw Error('올바른 screen을 전달하세요.');if(location.hash.startsWith('#verify='))history.replaceState(null,'',location.href.split('#')[0]);navigate(input.screen);return{screen}}}];for(const spec of specs){try{Promise.resolve(document.modelContext.registerTool(spec,{signal:ctl.signal})).catch(()=>{})}catch{}}}
init();
