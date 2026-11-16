const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const model = require('./model.json');
const runtime = process.env.DIAGRAM_NODE_MODULES;
const load = runtime ? createRequire(path.join(runtime, '__diagram__.cjs')) : require;

const subsystems = {
  work: ['S01 작업·버전 관리', 'UC01·02', ['artifact'],
    ['WorkService', 'ContributionService', 'VersionService', 'EvidenceService']],
  review: ['S02 검토·재제출', 'UC03·04·05', ['review'],
    ['RiskService', 'GatePolicy', 'ReviewRequestService', 'ReviewService', 'RevisionService']],
  approval: ['S03 최종 결정·철회', 'UC06·10', ['approval'], ['ApprovalService']],
  read: ['S04 공유·검증·이력', 'UC07·08·09', ['public'],
    ['CertificateService', 'VerificationService', 'HistoryService']],
  shared: ['S05 권한·감사', '공통', ['identity', 'history'],
    ['AuthorizationPolicy', 'AuditLogService']],
};
const memberships = Object.fromEntries(Object.entries(subsystems).map(([id, [, , groups, services]]) => [
  id, model.classes.filter(item => groups.includes(item.group) || services.includes(item.id)),
]));
for (const item of model.classes) {
  const owners = Object.values(memberships).filter(items => items.includes(item)).length;
  if (owners + Number(['boundary', 'ports'].includes(item.group)) !== 1) {
    throw new Error('클래스 분류 오류: ' + item.id);
  }
}
const label = (id, examples) => {
  const [name, ucs] = subsystems[id];
  return JSON.stringify(examples
    ? name + ' (' + memberships[id].length + ')\n' + ucs + '\n' + examples
    : name + '\n' + ucs);
};
const title = name => JSON.stringify('HAVE | 통합 ' + name + '\nUC01–UC10 · 운영 MVP 설계 · 2026-11-09');
const style = `
  graph [fontname="Malgun Gothic", fontsize=27, labelloc=t, pad=0.42,
         bgcolor=white, nodesep=0.45, ranksep=0.75];
  node [fontname="Malgun Gothic", fontsize=17, shape=box, style=filled,
        fillcolor="#edf3fb", color="#677e98", margin="0.28,0.20"];
  edge [fontname="Malgun Gothic", fontsize=14, color="#536a83",
        arrowsize=0.85, penwidth=1.2];
`;
const pkg = `digraph G {
  ${style}
  label=${title('패키지 다이어그램 · 레벨 2')};
  node [shape=tab]; edge [style=dashed, arrowhead=open];
  boundary [label="사용자 접점 · 화면 / API"];
  work [label=${label('work', 'WorkVersion · AiDisclosure')}];
  review [label=${label('review', 'ReviewRequest · Review · Revision')}];
  approval [label=${label('approval', 'ApprovalCase · Approval · Certificate')}];
  read [label=${label('read', 'ShareLink · VerificationResult · HistoryService')}];
  shared [label=${label('shared', 'WorkMember · AuditEvent')},fillcolor="#eaf5ed"];
  ports [label="공통 포트 · 저장 / 파일 / 알림",fillcolor="#fff4dc"];
  infra [label="인프라 어댑터 · 계약 구현",fillcolor="#f2ebfa"];
  boundary -> {work review approval read};
  read -> approval [label="증명서·효력 조회"];
  read -> work [label="버전 이력 조회"];
  approval -> review [label="확정 검토 조회"];
  review -> work [label="버전 조회·재제출"];
  {work review approval read} -> shared;
  {work review approval read shared infra} -> ports;
  legend [shape=note,label="점선 화살표 · 사용하는 패키지 → 사용되는 패키지\nS01~S05는 컴포넌트 뷰의 서브시스템 번호와 대응",fillcolor="#faf8ee"];
  ports -> legend [style=invis];
}`;
const detailedPackages = Object.entries(subsystems).map(([id, [name, ucs]]) => {
  const types = memberships[id];
  const services = types.filter(type => type.group === 'application');
  const entities = types.filter(type => type.group !== 'application');
  const list = (heading, items) => JSON.stringify([heading, '', ...items.map(type => type.id)].join('\n'));
  return `
  subgraph cluster_${id} {
    label=${JSON.stringify(name + ' · ' + ucs)};
    color="#aec2d6"; style=rounded; margin=24; fontsize=18;
    ${id}_app [label=${list('응용 패키지', services)}];
    ${id}_domain [label=${list('도메인 패키지', entities)},fillcolor="#eaf5ed"];
    ${id}_app -> ${id}_domain;
  }`;
}).join('\n');
const level3 = `digraph G {
  ${style}
  newrank=true;
  label=${title('패키지 다이어그램 · 레벨 3')};
  node [shape=tab]; edge [style=dashed, arrowhead=open];
  ${detailedPackages}
  boundary [label=${JSON.stringify(['사용자 접점', ...model.classes.filter(type => type.group === 'boundary').map(type => type.id)].join('\n'))}];
  ports [label=${JSON.stringify(['공통 포트', ...model.classes.filter(type => type.group === 'ports').map(type => type.id)].join('\n'))},fillcolor="#fff4dc"];
  infra [label="인프라 어댑터\n공통 포트 구현",fillcolor="#f2ebfa"];
  {rank=same; work_app; review_app; approval_app; read_app; shared_app;}
  boundary -> {work_app review_app};
  {work_app review_app approval_app read_app shared_app} -> ports [minlen=3];
  infra -> ports;
  note [shape=note,label="서브시스템 간 업무 의존은 레벨 2에 표시\n사용자 접점 화살표는 통합 클래스 모델에 있는 호출만 표시\nS03·S04의 운영 API 계약은 컴포넌트 뷰에 표시",fillcolor="#faf8ee"];
  ports -> note [style=invis];
}`;
const component = `digraph G {
  ${style}
  label=${title('컴포넌트 다이어그램')};
  node [shape=component];
  edge [style=dashed, arrowhead=open];
  web [label="HAVE 웹\n작성·검토·승인·공개 조회"];
  subgraph cluster_api {
    label="HAVE 운영 API · 모듈형 모놀리스";
    fontname="Malgun Gothic"; fontsize=20; labeljust=l; color="#a8bfd6"; style=rounded; margin=26;
    api [label="API 진입점\n세션 확인 · 요청 라우팅",fillcolor="#e0edff"];
    work [label=${label('work')}];
    review [label=${label('review')}];
    approval [label=${label('approval')}];
    read [label=${label('read')}];
    shared [label=${label('shared')}];
    storage [label="영속성 어댑터\n저장 계약 구현 · 트랜잭션",fillcolor="#fff4dc"];
    api -> work [label="IWork"];
    api -> review [label="IReview"];
    api -> approval [label="IApproval"];
    api -> read [label="IQuery"];
    read -> approval [label="IApprovalEvidence",weight=8];
    approval -> review [label="IReviewSnapshot",weight=8];
    review -> work [label="IWorkVersion",weight=8];
    read -> work [label="IWorkHistory",constraint=false];
    {work review approval read} -> shared [label="IAccessAudit"];
    shared -> storage;
    work -> storage;
    review -> storage;
    approval -> storage [label="승인·감사·Outbox 원자 저장"];
    read -> storage [label="공개 범위·최신 효력 조회"];
  }
  worker [label="서명 작업자 · S03 후속 실행\nOutbox 처리 · 동일 증명서로 재시도",fillcolor="#eaf5ed"];
  db [shape=cylinder, label="업무 DB\n버전·검토·승인·감사·Outbox",fillcolor="#fff4dc"];
  files [shape=cylinder, label="비공개 파일 저장소\nPDF·근거 파일",fillcolor="#fff4dc"];
  keys [label="서명키 관리\n개인키 사용 · 공개키 제공",fillcolor="#f2ebfa"];
  web -> api [label="HTTPS · 명령 / 조회"];
  storage -> db [label="저장·조회"];
  storage -> files [label="파일 읽기·쓰기"];
  worker -> db [label="Outbox·서명 결과"];
  worker -> keys [label="서명 요청"];
  read -> keys [label="공개키 조회",constraint=false];
  {rank=same; files; db; keys;}
  note [shape=note,label="점선 화살표 · 요구 컴포넌트 → 제공 컴포넌트\n간선 이름은 제공·요구 인터페이스의 공통 식별자",fillcolor="#faf8ee"];
  db -> note [style=invis];
}`;

const fileStore = model.classes.find(type => type.id === 'FileStore');
const fileStoreClients = model.relations
  .filter(relation => relation.kind === 'dependency' && relation.b === fileStore.id)
  .map(relation => relation.a);
const adapter = `digraph G {
  ${style}
  label="HAVE | 어댑터 설계 패턴\n파일 저장 · UC02 / UC05 · 운영 MVP 설계";
  ${fileStoreClients.map(id => id + ' [label=' + JSON.stringify(id) + '];').join('\n')}
  port [shape=record,fillcolor="#eaf5ed",
    label="{«interface»\\nFileStore|${fileStore.ops.map(op => '+ ' + op).join('\\l')}\\l}"];
  adapter [shape=record,fillcolor="#fff4dc",
    label="{ObjectStorageAdapter\\n설계 타입|저장 요청을 SDK 호출로 변환\\l임시 객체 정리\\l}"];
  sdk [label="비공개 객체 저장소 SDK\n공급자 API"];
  edge [style=dashed,arrowhead=open];
  {${fileStoreClients.join('; ')}} -> port;
  adapter -> port [arrowhead=empty,label="인터페이스 실체화"];
  adapter -> sdk [style=solid,arrowhead=vee,label="저장·삭제 위임"];
  note [shape=note,fillcolor="#faf8ee",label="응용 서비스는 FileStore 계약을 사용\\n공급자별 호출 방식은 ObjectStorageAdapter에서 변환"];
  port -> note [style=invis];
}`;

// Proposed ports cover responsibilities whose storage contract was implicit in the class model.
const proposedPorts = {
  work: ['WorkStore*'],
  shared: ['MembershipStore*', 'AuditStore*'],
};
const adapterNames = {
  work: '작업 DB 어댑터\n파일 저장 어댑터',
  review: '검토·재제출 DB 어댑터\n파일·알림 어댑터',
  approval: '승인 트랜잭션 어댑터\n승인·감사·Outbox 함께 저장',
  read: '증명서·이력 조회 어댑터\n조회 결과 매핑',
  shared: '멤버십·감사 DB 어댑터',
};
const overviewRows = Object.entries(subsystems).map(([id, [name, ucs]]) => {
  const serviceIds = new Set(memberships[id].filter(type => type.group === 'application').map(type => type.id));
  const modelPorts = model.relations
    .filter(relation => relation.kind === 'dependency' && serviceIds.has(relation.a))
    .map(relation => relation.b)
    .filter(target => model.classes.some(type => type.id === target && type.group === 'ports'));
  return {
    id,
    client: name + '\n' + ucs,
    contract: [...new Set([...modelPorts, ...(proposedPorts[id] || [])])].join('\n'),
    implementation: adapterNames[id],
  };
});
const column = (heading, field, width, fill) => `<<TABLE BORDER="0" CELLBORDER="1"
  CELLSPACING="0" CELLPADDING="10" COLOR="#9ab0c5">
  <TR><TD WIDTH="${width}" HEIGHT="42" BGCOLOR="#e0ebf7"><B>${heading}</B></TD></TR>
  ${overviewRows.map(row => `<TR><TD PORT="${row.id}" HEIGHT="83" BGCOLOR="${fill}">${row[field].replaceAll('\n', '<BR/>')}</TD></TR>`).join('\n')}
  </TABLE>>`;
const patternOverview = `digraph G {
  ${style}
  rankdir=LR;
  label="HAVE | 설계 패턴 적용도 · UC01–UC10\n모듈형 모놀리스의 서브시스템 내부 · 포트와 어댑터";
  node [shape=plain,style=""];
  clients [label=${column('응용 서브시스템', 'client', 225, '#edf3fb')}];
  contracts [label=${column('업무가 사용하는 계약', 'contract', 250, '#eaf5ed')}];
  implementations [label=${column('계약을 구현하는 어댑터', 'implementation', 280, '#fff4dc')}];
  ${overviewRows.map(({ id }) => `clients:${id}:e -> contracts:${id}:w [style=dashed,arrowhead=open];
  contracts:${id}:e -> implementations:${id}:w [style=dashed,dir=back,arrowtail=empty];`).join('\n')}
  guide [shape=note,style=filled,fillcolor="#faf8ee",label="열린 화살촉 · 계약 사용\n빈 삼각형 · 계약 실체화\n* 통합 클래스 모델 이후\n추가로 제안한 포트\n\nS03 서명 연계 · Outbox\n승인·감사·요청 커밋\n→ 작업자가 서명 재시도\n→ S04는 현재 효력 별도 조회"];
  implementations -> guide [style=invis];
}`;

const serverPackage = `digraph G {
  ${style}
  graph [compound=true];
  label="HAVE 서버 | UML 패키지 다이어그램\n레벨 2 · 확정 서브시스템 8개 · UC01–UC10";
  node [shape=tab]; edge [style=dashed,arrowhead=open];
  subgraph cluster_business {
    label="핵심 업무 패키지"; labeljust=l; color="#afc1d5"; style=rounded; margin=24;
    work [label="02  작업·결과물 관리\\nWork · UC01 / UC02 / UC05\\nAI 사용 내역 · 결과물 · 버전·수정본"];
    review [label="03  검토 관리\\nReview · UC03 / UC04\\n검토 요청 · 피드백 · 보완 판정"];
    approval [label="04  승인 관리\\nApproval · UC06 / UC10\\n최종 승인·반려 · 철회"];
    certificate [label="05  증명서 관리\\nCertificate · UC07 / UC06 후속 발급\\n발급 레코드 · 조회 · 링크·QR"];
    verification [label="06  진위 검증\\nVerification · UC08\\n서명·해시·현재 효력 검증"];
    verification -> certificate [label="증명서·서명 데이터"];
    certificate -> approval [label="승인 결과·고정 버전 조회"];
    verification -> approval [label="현재 승인 효력"];
    approval -> review [label="확정 검토 결과"];
    approval -> work [label="버전·파일 해시"];
    review -> work [label="검토 대상 버전"];
  }
  subgraph cluster_support {
    label="공통 지원 패키지"; labeljust=l; color="#afc1d5"; style=rounded; margin=24;
    node [fillcolor="#eaf5ed"];
    auth [label="01  사용자·권한 관리\\nAuth · 공통\\n인증 · 작업별 역할 · 접근 제어"];
    audit [label="07  이력 관리\\nAudit · UC09 및 공통\\n이벤트 · 이력·상태 조회 · 알림"];
    persistence [label="08  데이터 저장\\nPersistence · 공통\\n데이터·파일 저장 계약 · 일관성"];
    {rank=same; auth; audit; persistence;}
  }
  work -> auth [ltail=cluster_business,label="권한 확인"];
  work -> audit [ltail=cluster_business,label="이력 기록 · 알림 요청"];
  work -> persistence [ltail=cluster_business,label="저장·조회 계약 사용"];
  auth -> persistence [label="계정 조회"];
  audit -> persistence [label="이력·현재 상태 조회"];
  legend [shape=note,fillcolor="#faf8ee",label="점선 열린 화살표 · 의존하는 패키지 → 제공 패키지\\n업무 묶음에서 나가는 화살표는 공통 의존의 요약\\nUC05는 Work의 새 버전 생성과 Review의 재검토 요청을 조정"];
  persistence -> legend [style=invis];
}`;

const serverDetails = [
  ['auth', '01 사용자·권한 관리', '인증·권한 정책', ['AuthorizationPolicy'],
    '사용자·멤버십', ['User', 'WorkMember']],
  ['work', '02 작업·결과물 관리', '등록·재제출 응용', [
    'WorkController', 'ContributionController', 'VersionController', 'EvidenceController',
    'WorkService', 'ContributionService', 'VersionService', 'EvidenceService', 'RevisionService',
  ], '작업·버전 모델', ['Work', 'WorkVersion', 'AiDisclosure', 'AiToolUsage', 'Contribution', 'EvidenceItem', 'Revision']],
  ['review', '03 검토 관리', '검토 요청·처리 응용', [
    'RiskController', 'ReviewRequestController', 'RiskService', 'GatePolicy', 'ReviewRequestService', 'ReviewService',
  ], '검토·평가 모델', ['RiskAssessment', 'ReviewRequest', 'Challenge', 'ChallengeResponse', 'Evaluation', 'Review', 'Feedback']],
  ['approval', '04 승인 관리', '승인·철회 응용', ['ApprovalService'],
    '결정·효력·발급 요청', ['ApprovalCase', 'Approval', 'Revocation', 'OutboxEvent']],
  ['certificate', '05 증명서 관리', '발급·공유 응용', ['CertificateService'],
    '발급 기록·공유 모델', ['Certificate', 'ShareLink', 'QRCode']],
  ['verification', '06 진위 검증', '서명·해시·효력 검사', ['VerificationService'],
    '검증 결과 모델', ['VerificationResult']],
  ['audit', '07 이력 관리', '기록·조회·알림 연계', ['AuditLogService', 'HistoryService', 'NotificationGateway'],
    '감사 기록 모델', ['AuditEvent']],
  ['persistence', '08 데이터 저장', 'DB·파일 어댑터 (설계)', [],
    '저장·조회 계약', ['ReviewRepository', 'RevisionRepository', 'ApprovalRepository', 'FileStore',
      'CertificateRepository', 'HistoryRepository']],
];
const serverTypeIds = new Set(model.classes
  .filter(type => !['ReviewPage', 'RevisionPage'].includes(type.id)).map(type => type.id));
const allocated = serverDetails.flatMap(([, , , upper, , lower]) => [...upper, ...lower]);
if (new Set(allocated).size !== allocated.length || allocated.length !== serverTypeIds.size ||
  allocated.some(id => !serverTypeIds.has(id))) {
  throw new Error('레벨 3의 서버 타입 배치가 통합 클래스 모델과 일치하지 않습니다.');
}
const detailsLabel = (heading, types) => JSON.stringify([heading, ...types].join('\n'));
const detailClusters = serverDetails.map(([id, name, upperName, upper, lowerName, lower]) => `
  subgraph cluster_${id} {
    label=${JSON.stringify(name)}; color="#aec2d6"; style=rounded; margin=23; fontsize=19;
    ${id}_upper [label=${detailsLabel(upperName, upper)}];
    ${id}_lower [label=${detailsLabel(lowerName, lower)},fillcolor="#eaf5ed"];
    ${id}_upper -> ${id}_lower;
  }`).join('\n');
const serverLevel3 = `digraph G {
  ${style}
  graph [newrank=true,nodesep=0.35,ranksep=0.58];
  label=${JSON.stringify('HAVE 서버 | UML 패키지 다이어그램\n레벨 3 · 확정 8개 패키지의 내부 구조 · 서버 타입 ' + allocated.length + '개')};
  node [shape=tab]; edge [style=dashed,arrowhead=open];
  ${detailClusters}
  {rank=same; auth_upper; work_upper; review_upper; approval_upper;}
  {rank=same; auth_lower; work_lower; review_lower; approval_lower;}
  {rank=same; certificate_upper; verification_upper; audit_upper; persistence_upper;}
  {rank=same; certificate_lower; verification_lower; audit_lower; persistence_lower;}
  auth_upper -> work_upper -> review_upper -> approval_upper [style=invis];
  certificate_upper -> verification_upper -> audit_upper -> persistence_upper [style=invis];
  auth_lower -> certificate_upper [style=invis];
  work_lower -> verification_upper [style=invis];
  review_lower -> audit_upper [style=invis];
  approval_lower -> persistence_upper [style=invis];
  legend [shape=note,fillcolor="#faf8ee",label="외곽 구획 · 상위 서브시스템     탭 상자 · 내부 패키지\\n점선 열린 화살표 · 내부 사용 의존     서브시스템 간 의존은 레벨 2 참조"];
  audit_lower -> legend [style=invis];
}`;

async function main() {
  const { instance } = load('@viz-js/viz');
  const { chromium } = load('playwright');
  const viz = await instance();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1.6 });
    const diagrams = [
      ['HAVE_통합패키지', pkg],
      ['HAVE_통합패키지_레벨3', level3],
      ['HAVE_통합컴포넌트', component],
      ['HAVE_설계패턴_파일저장어댑터', adapter],
      ['HAVE_설계패턴_전체UC', patternOverview],
      ['HAVE_서버_패키지_8개', serverPackage],
      ['HAVE_서버_패키지_8개_레벨3', serverLevel3],
    ];
    const requested = process.argv[2];
    const selected = requested ? diagrams.filter(([name]) => name === requested) : diagrams;
    if (selected.length === 0) throw new Error('알 수 없는 다이어그램: ' + requested);
    for (const [name, source] of selected) {
      const svg = viz.renderString(source, { format: 'svg' })
        .replace(/font-size="([0-9.]+)"/g, (_, size) => 'font-size="' + (Number(size) * 0.80).toFixed(2) + '"');
      await page.setContent('<meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>' + svg);
      await page.evaluate(() => document.fonts.ready);
      const diagram = page.locator('svg');
      const overflow = await diagram.evaluate(svg => {
        const bounds = svg.getBoundingClientRect();
        return [...svg.querySelectorAll('text')].filter(node => {
          const text = node.getBoundingClientRect();
          return text.left < bounds.left || text.top < bounds.top ||
            text.right > bounds.right || text.bottom > bounds.bottom;
        }).map(node => node.textContent);
      });
      if (overflow.length) throw new Error(name + ' 글자 넘침: ' + overflow.join(', '));
      fs.writeFileSync(path.join(__dirname, 'sources', name + '.dot'), source);
      fs.writeFileSync(path.join(__dirname, 'images', name + '.svg'), svg);
      await diagram.screenshot({ path: path.join(__dirname, 'images', name + '.png') });
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
