/* HAVE 작성자 쪽 도메인 모델 (1123)
   1118 산출물(용어·상태 통일표, 통합 상태 다이어그램, UC01~UC10 순서 다이어그램, 컴포넌트 v2, DB 설계 1123)의 규칙을 따른다.
   - 작업 버전 상태 8개, 위험 등급별 이해 과제(GatePolicy·GateStrategy), 재제출 시 답변·위험 평가 사본 승계
   - 알림 10종(통일표 6절), 감사 이력 해시 체인, 공유 링크(토큰 해시만 저장), 승인 효력 계산
   - 오퍼레이션 이름은 강의 명명 규칙(조건 is · 읽기 get · 쓰기 set, 업무 동작은 동사)과 컴포넌트 v2의 인터페이스 이름을 따른다.
   모든 변경 함수는 state를 고치지 않고 새 state를 돌려준다. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./core.js') : root.HaveCore);
  if (isNode) module.exports = api;
  else root.HaveModel = api;
})(globalThis, function (core) {
  'use strict';

  // ── 코드 값 (통일표 3·4절) ─────────────────────────────────────
  const USERS = Object.freeze({ author: '김하늘', reviewers: ['김지은', '이도현'], approvers: ['박서연', '정우진'] });
  const STATUS = Object.freeze({
    DRAFT: { label: '작성 중', tone: 'neutral' },
    SUBMITTED: { label: '제출 완료', tone: 'neutral' },
    CHALLENGE_PENDING: { label: '이해 확인 대기', tone: 'progress' },
    REVIEW_PENDING: { label: '검토 대기', tone: 'progress' },
    IN_REVIEW: { label: '검토 중', tone: 'progress' },
    REVISION_REQUIRED: { label: '수정 요청', tone: 'warning' },
    APPROVAL_PENDING: { label: '승인 대기', tone: 'progress' },
    APPROVED: { label: '승인 완료', tone: 'success' }
  });
  const EFFECT = Object.freeze({
    VALID: { label: '승인 유효', tone: 'success' }, REVOKED: { label: '승인 철회', tone: 'danger' },
    NONE: { label: '승인 기록 없음', tone: 'neutral' }
  });
  const SIGNING = Object.freeze({ PENDING: { label: '발급 중', tone: 'progress' }, READY: { label: '발급 완료', tone: 'success' }, FAILED: { label: '발급 실패', tone: 'danger' } });
  const STAGES = Object.freeze({ IDEA: '기획', DRAFT: '초안', REVISION: '수정', SOURCE_VERIFICATION: '검증' });
  const ACTOR_TYPES = Object.freeze({ AI: 'AI', HUMAN: '사람', MIXED: 'AI+사람' });
  const EVIDENCE_TYPES = Object.freeze({ WEB_SOURCE: 'URL', REFERENCE: '참고 문헌', PROMPT_LOG: '프롬프트 기록', SUPPORT_FILE: '파일' });
  const CONFIDENCE = Object.freeze({ LOW: '낮음', MEDIUM: '보통', HIGH: '높음' });
  const USE_TYPES = Object.freeze(['초안 작성', '자료 조사·요약', '코드 작성', '교정·번역']);
  const LEVEL = Object.freeze({ LOW: '낮음', MEDIUM: '보통', HIGH: '높음' });

  // ── 위험 분석과 이해 과제 (통일표 5절, 디자인 패턴 8장) ─────────────
  const RISK_FACTORS = Object.freeze([
    { label: 'AI 사용 비중', options: ['없음', '일부', '절반 정도', '대부분'] },
    { label: '중요도', options: ['낮음', '보통', '높음', '매우 높음'] },
    { label: '검증 근거 부족', options: ['충분함', '일부 부족함', '부족함'] },
    { label: '과거 실패', options: ['없음', '1회', '2회 이상'] }
  ]);
  const GATE_POLICY = Object.freeze({ version: 'GP-2026-1', mediumMinTotal: 4, highMinTotal: 7 });
  const GATE_STRATEGY = Object.freeze({
    LOW: { name: 'LowRiskGate', kinds: ['TEACH_BACK'], minScore: 2 },
    MEDIUM: { name: 'MediumRiskGate', kinds: ['TEACH_BACK', 'WHAT_IF'], minScore: 3 },
    HIGH: { name: 'HighRiskGate', kinds: ['TEACH_BACK', 'FAULT_INJECTION', 'WHAT_IF'], minScore: 5 }
  });
  const CHALLENGE_KINDS = Object.freeze({
    TEACH_BACK: { label: '설명하기', type: 'Teach-back', prompt: '이 결과물의 핵심 주장과 근거를, 결과물을 보지 않은 팀원에게 설명하듯 적어 주세요.' },
    FAULT_INJECTION: { label: '오류 찾기', type: 'Fault Injection', prompt: '결과물에서 AI가 틀리게 작성했거나 틀릴 수 있었던 부분 한 곳을 골라, 무엇이 문제였고 어떤 근거로 바로잡았는지 적어 주세요.' },
    WHAT_IF: { label: '조건 바꾸기', type: 'What-if', prompt: '핵심 가정이나 입력 조건 하나가 달라진다면 결론이 어떻게 바뀌는지 설명해 주세요.' }
  });
  const MIN_ANSWER_LENGTH = 20;
  const CHECKLIST = Object.freeze([
    '등록된 버전의 파일을 직접 열어 확인했어요',
    'AI 사용 신고 범위와 결과물 내용을 대조했어요',
    '근거자료(출처·기록)를 확인했어요',
    '이해 확인 답변이 결과물 내용과 맞는지 확인했어요'
  ]);

  // ── 알림 (통일표 6절) ─────────────────────────────────────────
  const NOTIFICATION = Object.freeze({
    REVIEW_REQUESTED: (t, n) => `‘${t}’ v${n}의 검토 요청이 왔어요. 작성자가 답변을 제출하면 검토할 수 있어요.`,
    REQUEST_CANCELED: (t, n) => `‘${t}’ v${n}의 검토 요청이 취소됐어요.`,
    ANSWERS_SUBMITTED: (t, n) => `‘${t}’ v${n}의 답변이 제출됐어요. 검토해 주세요.`,
    REVISION_REQUESTED: (t, n) => `‘${t}’ v${n}에 수정 요청이 왔어요. 피드백을 확인해 주세요.`,
    RESUBMITTED: (t, n) => `‘${t}’ v${n} 수정본이 재제출됐어요. 다시 검토해 주세요.`,
    REVIEW_PASSED: (t, n, to, v) => to === v?.request?.approver ? `‘${t}’ v${n}이 검토를 통과했어요. 최종 승인을 결정해 주세요.` : `‘${t}’ v${n}이 검토를 통과했어요. 최종 승인을 기다리고 있어요.`,
    APPROVED: (t, n) => `‘${t}’ v${n}이 최종 승인됐어요.`,
    REJECTED: (t, n, to, v, w) => to === w?.owner ? `‘${t}’ v${n}이 반려됐어요. 사유를 확인하고 수정본을 재제출해 주세요.` : `‘${t}’ v${n}이 최종 승인 단계에서 반려됐어요.`,
    CERTIFICATE_ISSUED: (t, n) => `‘${t}’ v${n}의 증명서가 발급됐어요.`,
    APPROVAL_REVOKED: (t, n) => `‘${t}’ v${n}의 승인이 철회됐어요.`
  });

  // ── 감사 이력 행위 (UC09) ─────────────────────────────────────
  const ACTIONS = Object.freeze({
    CREATE_WORK: ['작업 생성', 'work'], UPLOAD_VERSION: ['결과물 등록', 'work'], ASSESS_RISK: ['위험 분석', 'work'],
    REQUEST_REVIEW: ['검토 요청', 'work'], CANCEL_REQUEST: ['검토 요청 취소', 'work'], SUBMIT_ANSWERS: ['이해 확인 답변 제출', 'work'],
    START_REVIEW: ['검토 시작 (파일 해시 일치)', 'review'], HALT_REVIEW: ['검토 중지 (파일 해시 불일치)', 'review'],
    PASS_REVIEW: ['검토 통과', 'review'], REQUEST_REVISION: ['수정 요청', 'review'], RESUBMIT: ['수정본 재제출', 'work'],
    APPROVE: ['최종 승인', 'approval'], REJECT: ['반려', 'approval'], ISSUE_CERTIFICATE: ['증명서 발급', 'approval'],
    ISSUE_FAILED: ['증명서 발급 실패', 'approval'], RETRY_ISSUE: ['증명서 발급 재시도', 'approval'],
    SHARE_LINK_CREATED: ['공유 링크 생성', 'approval'], SHARE_LINK_DISABLED: ['공유 링크 중지', 'approval'],
    REVOKE: ['승인 철회', 'approval'], VERIFY: ['공개 검증 조회', 'verify']
  });

  const now = () => new Date().toISOString();
  const clone = value => structuredClone(value);
  function requireThat(valid, message) { if (!valid) throw new Error(message); }

  // ── 조회 (get · is) ───────────────────────────────────────────
  const getLatestVersion = work => work.versions.at(-1);
  const getVersion = (work, n) => work.versions.find(v => v.n === Number(n)) || null;
  const getWork = (state, workId) => state.works.find(w => w.id === workId) || null;
  function getStatus(version) { return { code: version.status, ...(STATUS[version.status] || { label: '상태 확인 필요', tone: 'neutral' }) }; }

  /** 승인 효력: 저장하지 않고 계산한다 (통일표 3.2, 11-23 수정). 철회 여부만 본다.
      후속 버전이 있는지는 효력이 아니라 getLatestInfo로 따로 계산한다 — 철회와 후속 버전은 동시에 성립한다. */
  function getEffect(work, version) {
    if (!version.approval) return 'NONE';
    if (version.revocation) return 'REVOKED';
    return 'VALID';
  }
  /** 최신 버전 여부 (IApprovalStatus.getCurrentValidity의 latestVersionNo). */
  function getLatestInfo(work, version) {
    const latestN = getLatestVersion(work).n;
    return { latestN, isLatest: version.n === latestN };
  }

  // ── UC05 근거 변경 판정 (RevisionService.isBasisChanged, 11-23) ──────────
  /** 비교에 쓰는 근거: AI 사용 신고(사용 여부·도구·사용 방식·범위)와 근거자료(유형·주소·파일 해시). 제목과 순서는 보지 않는다. */
  function getBasisKey(disclosure, evidence) {
    const d = disclosure?.aiUsed === false ? { aiUsed: false } : { aiUsed: true, tool: (disclosure?.tool || '').trim(), useTypes: [...(disclosure?.useTypes || [])].sort(), scope: (disclosure?.scope || '').trim() };
    const ev = (evidence || []).map(e => [e.type, (e.uri || '').trim(), e.fileHash || ''].join('|')).sort();
    return JSON.stringify({ d, ev });
  }
  function isBasisChanged(base, basis) {
    if (!basis) return false;
    return getBasisKey(base.disclosure, base.evidence) !== getBasisKey(basis, basis.evidence);
  }
  /** 수정본 화면의 근거 입력 초기값 — 직전 버전의 AI 신고와 근거자료 사본 */
  function getBasisDraft(version) {
    const d = version.disclosure;
    return { aiUsed: d.aiUsed, tool: d.tool || '', useTypes: [...(d.useTypes || [])], scope: d.scope || '', contributions: [],
      evidence: version.evidence.map(e => ({ type: e.type, title: e.title, uri: e.uri || '', fileName: e.fileName || '', fileHash: e.fileHash || '' })) };
  }
  function getBasisErrors(basis) {
    if (!basis) return {};
    const e = getRegistrationErrors({ ...basis, contributions: [{ stage: 'DRAFT', actorType: 'HUMAN', note: '-' }] }, 1);
    return Object.assign(e, getRegistrationErrors({ ...basis, contributions: [{ stage: 'DRAFT', actorType: 'HUMAN', note: '-' }] }, 2));
  }

  const getRiskTotal = scores => scores.reduce((sum, score) => sum + score, 0);
  function isRiskComplete(scores) {
    return Array.isArray(scores) && scores.length === RISK_FACTORS.length &&
      scores.every((score, i) => Number.isInteger(score) && score >= 0 && score < RISK_FACTORS[i].options.length);
  }
  /** GatePolicy.selectFor — 합계와 정책 경계로 등급을 정한다. */
  function getRiskLevel(scores, policy = GATE_POLICY) {
    if (!isRiskComplete(scores)) return null;
    const total = getRiskTotal(scores);
    return total >= policy.highMinTotal ? 'HIGH' : total >= policy.mediumMinTotal ? 'MEDIUM' : 'LOW';
  }
  function getGateRule(level) {
    const strategy = GATE_STRATEGY[level];
    return strategy ? { level, ...strategy, maxScore: strategy.kinds.length * 2 } : null;
  }
  const getVersionLevel = version => getRiskLevel(version.risk.scores, { ...GATE_POLICY, version: version.risk.policyVersion });

  function getRevisionItems(version) {
    const r = version.revisionRound;
    if (!r) return [];
    if (r.source === 'REJECTION') return [{ id: 'rejection', section: '최종 승인자 반려 사유', content: version.approvalCase?.rejectionReason || '' }];
    return version.review?.feedbackItems || [];
  }
  /** Revision.state — 기한이 지나고 제출하지 않았으면 EXPIRED로 본다. */
  function getRevisionState(revision, at = now()) {
    if (!revision) return null;
    if (revision.state !== 'SUBMITTED' && revision.dueDate && revision.dueDate < at.slice(0, 10)) return 'EXPIRED';
    return revision.state;
  }
  /** RevisionService.isAllResolved — 모든 피드백 항목에 반영 여부와 답변이 있는지. */
  function isAllResolved(version, responses) {
    return getRevisionItems(version).every(item => {
      const r = responses?.[item.id];
      return r && typeof r.applied === 'boolean' && core.isText(r.response, 1000);
    });
  }

  function getLinkState(link, at = now()) {
    if (link.disabledAt) return 'DISABLED';
    if (link.expiresAt && link.expiresAt < at) return 'EXPIRED';
    return 'ACTIVE';
  }

  const ATTENTION = ['CHALLENGE_PENDING', 'REVISION_REQUIRED', 'SUBMITTED'];
  const ONGOING = ['REVIEW_PENDING', 'IN_REVIEW', 'APPROVAL_PENDING'];
  /** IWorkAPI.getWorks(filter) */
  function getWorks(state, query = '', filter = 'all') {
    const q = query.trim().toLocaleLowerCase();
    return state.works.filter(w => {
      const v = getLatestVersion(w);
      const text = [w.title, v.file.name, v.request?.reviewer || ''].join(' ').toLocaleLowerCase();
      return (!q || text.includes(q)) && (filter === 'all' ||
        (filter === 'attention' && ATTENTION.includes(v.status)) ||
        (filter === 'ongoing' && ONGOING.includes(v.status)) ||
        (filter === 'approved' && v.status === 'APPROVED'));
    });
  }

  /** INotificationQuery.getNotifications(userId) */
  const getNotifications = (state, user) => state.notifications.filter(n => n.to === user).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const getUnreadCount = (state, user) => state.notifications.filter(n => n.to === user && !n.readAt).length;
  function getNotificationText(state, item) {
    const work = getWork(state, item.workId);
    const version = work && getVersion(work, item.n);
    return NOTIFICATION[item.type](work?.title || '삭제된 작업', item.n, item.to, version, work);
  }

  /** 증명서 공개 요약 (Certificate.getPublicSummary) */
  function getPublicSummary(work, version) {
    const c = version.certificate;
    return { title: work.title, n: version.n, fileName: version.file.name, fileHash: version.file.hash, serial: c?.serial || '',
      approver: version.approval?.approver || '', approvedAt: version.approval?.approvedAt || '', issuedAt: c?.issuedAt || '',
      reviewer: version.request?.reviewer || '', payloadHash: c?.payloadHash || '', effect: getEffect(work, version),
      latestN: getLatestInfo(work, version).latestN, isLatest: getLatestInfo(work, version).isLatest,
      revokedAt: version.revocation?.revokedAt || '', revocationReason: version.revocation?.reason || '' };
  }

  // ── 등록 검사 (UC01·02·03 입력) ────────────────────────────────
  function isHttpUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
  }
  /** 등록 마법사의 단계별 입력 오류. step = -1이면 전체. */
  function getRegistrationErrors(form, step = -1) {
    const e = {}, at = i => step === -1 || step === i;
    if (at(0)) {
      if (!form.isVersion && !core.isText(form.title?.trim() || '', 100)) e.title = '작업명을 1~100자로 입력해 주세요.';
      if (!form.file) e.file = '검토할 PDF 파일을 선택해 주세요.';
      if (form.isVersion && !core.isText(form.changeReason || '', 2000)) e.changeReason = '변경 사유를 2,000자 이내로 입력해 주세요.';
    }
    if (at(1) && form.aiUsed !== false) {
      if (!core.isText(form.tool || '', 100)) e.tool = 'AI 도구·모델을 100자 이내로 입력해 주세요.';
      if (!core.isText(form.scope || '', 5000)) e.scope = 'AI 사용 범위를 5,000자 이내로 입력해 주세요.';
    }
    if (at(2)) {
      const rows = form.contributions || [];
      if (!rows.length) e.contributions = '기여 기록을 한 건 이상 남겨 주세요.';
      rows.forEach((row, i) => {
        if (!STAGES[row.stage] || !ACTOR_TYPES[row.actorType] || !core.isText(row.note || '', 2000)) e[`contribution-${i}`] = `기여 기록 ${i + 1}의 단계·수행 주체·내용을 모두 입력해 주세요.`;
        else if (form.aiUsed === false && row.actorType !== 'HUMAN') e[`contribution-${i}`] = `AI를 사용하지 않았다면 기여 기록 ${i + 1}의 수행 주체는 ‘사람’이어야 해요.`;
      });
      (form.evidence || []).forEach((row, i) => {
        if (!EVIDENCE_TYPES[row.type] || !core.isText(row.title || '', 200)) e[`evidence-${i}`] = `근거자료 ${i + 1}의 유형과 제목을 입력해 주세요.`;
        else if (row.type === 'WEB_SOURCE' && !isHttpUrl(row.uri || '')) e[`evidence-${i}`] = `근거자료 ${i + 1}의 주소는 http 또는 https로 시작해야 해요.`;
        else if (row.type === 'SUPPORT_FILE' && !row.fileHash) e[`evidence-${i}`] = `근거자료 ${i + 1}의 파일을 선택해 주세요.`;
      });
    }
    if (at(3)) {
      const scores = (form.riskScores || []).map((s, i) => (i === 0 && form.aiUsed === false) ? 0 : s);
      if (!isRiskComplete(scores)) e.risk = '위험 분석 4개 지표를 모두 선택해 주세요.';
      if (!core.isText(form.rationale || '', 2000)) e.rationale = '점수를 매긴 근거를 2,000자 이내로 적어 주세요.';
    }
    if (at(4)) {
      if (!USERS.reviewers.includes(form.reviewer)) e.reviewer = '검토자 한 명을 선택해 주세요.';
      if (!USERS.approvers.includes(form.approver)) e.approver = '최종 승인자 한 명을 선택해 주세요.';
      if ((form.message || '').length > 1000) e.message = '메시지는 1,000자 이내로 입력해 주세요.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate || '') || form.dueDate < now().slice(0, 10)) e.dueDate = '검토 기한은 오늘 이후 날짜로 선택해 주세요.';
    }
    return e;
  }

  // ── 파일 ───────────────────────────────────────────────────
  async function prepareFile(name, bytes) {
    requireThat(bytes.length <= core.MAX_PDF_BYTES, '20 MB 이하의 PDF를 선택해 주세요.');
    requireThat(/\.pdf$/i.test(name) && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-', 'PDF 파일만 등록할 수 있어요. 파일 형식을 확인해 주세요.');
    requireThat(name.length <= 255, '파일 이름을 255자 이내로 줄여 주세요.');
    return { name, size: bytes.length, data: core.getBase64(bytes), hash: await core.getSha256(bytes) };
  }

  // ── 내부 도구: 이력·알림·잠금 번호 ───────────────────────────────
  function record(work, n, action, actor, at, note = '') {
    work.events.push({ id: core.createId('evt'), n, action, actor, at, note, prevHash: null, eventHash: null });
  }
  function notify(state, to, type, work, n, at) {
    if (!to) return;
    state.notifications.push({ id: core.createId('ntf'), to, type, workId: work.id, n, createdAt: at, readAt: null });
  }
  /** WorkVersion.revision(낙관적 잠금 번호)을 올리고 상태를 바꾼다. */
  function setVersionStatus(version, status) { version.status = status; version.revision = (version.revision || 0) + 1; }

  function createRequest(version, form, level, at) {
    return {
      id: core.createId('req'), reviewer: form.reviewer, approver: form.approver, message: (form.message || '').trim(), dueDate: form.dueDate,
      state: 'REQUESTED', requestedAt: at, riskSeq: version.risk.seq,
      challenges: getGateRule(level).kinds.map(kind => ({ id: core.createId('chl'), kind, prompt: CHALLENGE_KINDS[kind].prompt, answer: '', confidence: null, submittedAt: null }))
    };
  }
  function getRiskFromForm(form, seq) {
    return { seq, scores: form.riskScores.map((s, i) => (i === 0 && form.aiUsed === false) ? 0 : s), rationale: form.rationale.trim(), policyVersion: GATE_POLICY.version };
  }

  // ── UC01·02·03: 작업 생성 → 결과물 등록 → 위험 분석 → 검토 요청 ─────────
  /** 등록 마법사 제출. createWork → uploadVersion → assessRisk → requestReview를 차례로 수행한다.
      form.isVersion이면 승인된 작업에 새 버전을 추가한다(UC02). */
  function registerWork(state, form, at = now()) {
    const errors = getRegistrationErrors(form);
    requireThat(!Object.keys(errors).length, Object.values(errors)[0]);
    const next = clone(state);
    let work;
    if (form.isVersion) {
      work = getWork(next, form.workId);
      requireThat(work, '원래 작업을 찾을 수 없어요.');
      const last = getLatestVersion(work);
      requireThat(last.status === 'APPROVED', '승인 완료된 작업에만 새 버전을 등록할 수 있어요. 수정 요청은 수정본 재제출로 진행해 주세요.');
      requireThat(last.certificate?.signingState !== 'PENDING', '이전 승인의 증명서 발급이 끝난 뒤 새 버전을 등록해 주세요.');
      requireThat(last.file.hash !== form.file.hash, '직전 버전과 같은 파일이에요. 수정한 파일을 선택해 주세요.');
    } else {
      work = { id: core.createId('work'), title: form.title.trim(), owner: USERS.author, aiDisclosureDraft: null, versions: [], events: [] };
      next.works.unshift(work);
      record(work, null, 'CREATE_WORK', work.owner, at);
    }
    const n = work.versions.length + 1;
    const version = {
      id: core.createId('ver'), n, file: clone(form.file), createdAt: at, changeReason: form.isVersion ? form.changeReason.trim() : null,
      status: 'DRAFT', revision: 0,
      disclosure: form.aiUsed === false ? { aiUsed: false, tool: '', useTypes: [], scope: '' }
        : { aiUsed: true, tool: form.tool.trim(), useTypes: USE_TYPES.filter(t => (form.useTypes || []).includes(t)), scope: form.scope.trim() },
      contributions: form.contributions.map(row => ({ id: core.createId('ctb'), stage: row.stage, actorType: row.actorType, note: row.note.trim() })),
      evidence: (form.evidence || []).map(row => ({ id: core.createId('evd'), type: row.type, title: row.title.trim(), uri: (row.uri || '').trim(), fileName: row.fileName || '', fileHash: row.fileHash || '' })),
      risk: null, request: null, canceledRequests: [], review: null, revisionRound: null, approvalCase: null, approval: null, certificate: null, revocation: null
    };
    work.versions.push(version);
    setVersionStatus(version, 'SUBMITTED');
    record(work, n, 'UPLOAD_VERSION', work.owner, at, form.isVersion ? form.changeReason.trim() : version.file.name);
    assessAndRequest(next, work, version, form, at);
    return { state: next, workId: work.id };
  }

  function assessAndRequest(state, work, version, form, at) {
    const seq = (version.riskHistory?.length || 0) + 1;
    version.risk = getRiskFromForm(form, seq);
    version.riskHistory = [...(version.riskHistory || []), version.risk];
    const level = getVersionLevel(version);
    record(work, version.n, 'ASSESS_RISK', work.owner, at, `${getRiskTotal(version.risk.scores)}/10점 · ${LEVEL[level]}`);
    version.request = createRequest(version, form, level, at);
    setVersionStatus(version, 'CHALLENGE_PENDING');
    record(work, version.n, 'REQUEST_REVIEW', work.owner, at, `검토자 ${form.reviewer} · 최종 승인자 ${form.approver} · 과제 ${version.request.challenges.length}개`);
    notify(state, form.reviewer, 'REVIEW_REQUESTED', work, version.n, at);
  }

  /** 검토 요청 취소 뒤(SUBMITTED) 위험 분석과 검토 요청을 다시 한다. */
  function requestReviewAgain(state, workId, form, at = now()) {
    const errors = { ...getRegistrationErrors(form, 3), ...getRegistrationErrors(form, 4) };
    requireThat(!Object.keys(errors).length, Object.values(errors)[0]);
    const next = clone(state), work = getWork(next, workId), version = getLatestVersion(work);
    requireThat(version.status === 'SUBMITTED', '제출 완료 상태에서만 검토를 다시 요청할 수 있어요.');
    assessAndRequest(next, work, version, { ...form, aiUsed: version.disclosure.aiUsed }, at);
    return next;
  }

  /** IReviewAPI.cancelRequest — 검토 시작 전까지 작성자가 취소한다. 버전은 SUBMITTED로 돌아간다. */
  function cancelRequest(state, workId, reason, at = now()) {
    const next = clone(state), work = getWork(next, workId), version = getLatestVersion(work);
    requireThat(['CHALLENGE_PENDING', 'REVIEW_PENDING'].includes(version.status) && version.request?.state === 'REQUESTED', '검토가 시작되기 전에만 요청을 취소할 수 있어요.');
    requireThat(core.isText(reason || '', 500), '취소 사유를 500자 이내로 입력해 주세요.');
    const reviewer = version.request.reviewer;
    version.request.state = 'CANCELED';
    version.request.canceledAt = at;
    version.request.cancelReason = reason.trim();
    version.canceledRequests.push(version.request);
    version.request = null;
    setVersionStatus(version, 'SUBMITTED');
    record(work, version.n, 'CANCEL_REQUEST', work.owner, at, reason.trim());
    notify(next, reviewer, 'REQUEST_CANCELED', work, version.n, at);
    return next;
  }

  // ── UC03 이해 확인 답변 ───────────────────────────────────────
  function getAnswerErrors(version, answers, confidence) {
    const challenges = version.request?.challenges || [];
    const errors = [];
    challenges.forEach((c, i) => {
      if (!core.isText(answers[i] || '', 10000) || answers[i].trim().length < MIN_ANSWER_LENGTH) errors.push({ index: i, message: `${i + 1}번 답변을 ${MIN_ANSWER_LENGTH}자 이상 입력해 주세요.` });
      else if (!CONFIDENCE[confidence[i]]) errors.push({ index: i, message: `${i + 1}번 답변의 확신 정도를 선택해 주세요.` });
    });
    return errors;
  }
  /** IReviewAPI.saveAnswers */
  function saveAnswers(state, workId, answers, confidence) {
    const next = clone(state), version = getLatestVersion(getWork(next, workId));
    requireThat(version.status === 'CHALLENGE_PENDING', '이미 제출한 답변은 수정할 수 없어요.');
    version.request.challenges.forEach((c, i) => { c.answer = answers[i] || ''; c.confidence = CONFIDENCE[confidence[i]] ? confidence[i] : null; });
    return next;
  }
  /** IReviewAPI.submitAnswers — CHALLENGE_PENDING → REVIEW_PENDING, 검토자 알림 */
  function submitAnswers(state, workId, answers, confidence, at = now()) {
    const next = clone(state), work = getWork(next, workId), version = getLatestVersion(work);
    requireThat(version.status === 'CHALLENGE_PENDING', '이미 제출한 답변은 수정할 수 없어요. 검토 결과를 기다려 주세요.');
    const errors = getAnswerErrors(version, answers, confidence);
    requireThat(!errors.length, errors[0]?.message);
    version.request.challenges.forEach((c, i) => { c.answer = answers[i].trim(); c.confidence = confidence[i]; c.submittedAt = at; });
    setVersionStatus(version, 'REVIEW_PENDING');
    record(work, version.n, 'SUBMIT_ANSWERS', work.owner, at, `답변 ${version.request.challenges.length}개`);
    // 근거 변경으로 답변을 다시 받은 재제출 버전이면 검토자에게 '재제출'로 알린다 (11-23)
    notify(next, version.request.reviewer, version.request.answersReset ? 'RESUBMITTED' : 'ANSWERS_SUBMITTED', work, version.n, at);
    return next;
  }

  // ── UC05 수정본 재제출 ────────────────────────────────────────
  /** 작성자가 수정 요청을 처음 열면 Revision OPEN → IN_PROGRESS */
  function openRevision(state, workId) {
    const next = clone(state), version = getLatestVersion(getWork(next, workId));
    if (version.status === 'REVISION_REQUIRED' && version.revisionRound?.state === 'OPEN') version.revisionRound.state = 'IN_PROGRESS';
    return next;
  }
  /** IWorkAPI.resubmit(workId, file, responses, basis) — 새 버전 v(N+1)을 만든다.
      ReReviewObserver 규칙: 위험 평가·이해 과제는 사본 승계, 평가 점수는 초기화, 승인은 승계하지 않음.
      11-23: isBasisChanged — 근거자료·AI 사용 신고가 그대로면 답변도 사본 승계하고 REVIEW_PENDING(검토자 알림),
      바뀌었으면 답변은 비우고(이전 답변은 출처 버전과 함께 참고로 보존) CHALLENGE_PENDING. 검토자 알림은 답변 제출 뒤. */
  function resubmit(state, workId, { file, changeNote, responses, basis }, at = now()) {
    const next = clone(state), work = getWork(next, workId), base = getLatestVersion(work);
    requireThat(base.status === 'REVISION_REQUIRED', '수정 요청을 받은 버전만 재제출할 수 있어요.');
    requireThat(file, '수정한 PDF 파일을 선택해 주세요.');
    requireThat(file.hash !== base.file.hash, '직전 버전과 같은 파일이에요. 수정한 파일을 선택해 주세요.');
    requireThat(core.isText(changeNote || '', 2000), '변경 요약을 2,000자 이내로 입력해 주세요.');
    requireThat(isAllResolved(base, responses), '모든 피드백 항목에 반영 여부와 답변을 입력해 주세요.');
    const basisErrors = getBasisErrors(basis);
    requireThat(!Object.keys(basisErrors).length, Object.values(basisErrors)[0]);
    const changed = isBasisChanged(base, basis);
    const n = base.n + 1;
    base.revisionRound.state = 'SUBMITTED';
    base.revisionRound.changeNote = changeNote.trim();
    base.revisionRound.responses = Object.fromEntries(getRevisionItems(base).map(item => [item.id, { applied: responses[item.id].applied, response: responses[item.id].response.trim(), respondedAt: at }]));
    const version = {
      id: core.createId('ver'), n, file: clone(file), createdAt: at, changeReason: null, status: 'DRAFT', revision: 0,
      disclosure: !basis ? clone(base.disclosure) : basis.aiUsed === false ? { aiUsed: false, tool: '', useTypes: [], scope: '' }
        : { aiUsed: true, tool: basis.tool.trim(), useTypes: USE_TYPES.filter(t => (basis.useTypes || []).includes(t)), scope: basis.scope.trim() },
      contributions: clone(base.contributions),
      evidence: !basis ? clone(base.evidence) : basis.evidence.map(row => ({ id: core.createId('evd'), type: row.type, title: row.title.trim(), uri: (row.uri || '').trim(), fileName: row.fileName || '', fileHash: row.fileHash || '' })),
      risk: { ...clone(base.risk), seq: 1, copiedFrom: base.n }, riskHistory: [], request: null, canceledRequests: [],
      review: null, revisionRound: null, approvalCase: null, approval: null, certificate: null, revocation: null
    };
    version.riskHistory = [version.risk];
    version.request = {
      ...clone(base.request), id: core.createId('req'), state: 'REQUESTED', requestedAt: at, riskSeq: 1, copiedFrom: base.n, answersReset: changed,
      challenges: base.request.challenges.map(c => changed
        ? { id: core.createId('chl'), kind: c.kind, prompt: c.prompt, answer: '', confidence: null, submittedAt: null,
            previous: { n: base.n, answer: c.answer, confidence: c.confidence } }
        : { ...clone(c), id: core.createId('chl') })
    };
    base.revisionRound.submittedVersionId = version.id;
    work.versions.push(version);
    setVersionStatus(version, changed ? 'CHALLENGE_PENDING' : 'REVIEW_PENDING');
    record(work, n, 'RESUBMIT', work.owner, at, `v${base.n} 피드백 ${getRevisionItems(base).length}건 답변 · ${changeNote.trim()}` + (changed ? ' · 근거 변경 → 이해 확인 다시' : ''));
    if (!changed) notify(next, version.request.reviewer, 'RESUBMITTED', work, n, at);
    return next;
  }

  // ── UC07 공유 링크 ───────────────────────────────────────────
  /** ICertificateAPI.createShareLink — 토큰은 이때 한 번만 돌려주고 해시만 저장한다. */
  async function createShareLink(state, workId, n, actor, days, at = now()) {
    const next = clone(state), work = getWork(next, workId), version = getVersion(work, n);
    requireThat(version?.certificate?.signingState === 'READY', '발급이 끝난 증명서만 공유할 수 있어요.');
    requireThat(actor === work.owner || actor === version.request.approver, '작업 구성원만 공유 링크를 만들 수 있어요.');
    const token = crypto.randomUUID().replaceAll('-', '');
    const link = { id: core.createId('lnk'), tokenHash: await core.getTextSha256(token), createdAt: at,
      expiresAt: days ? new Date(Date.parse(at) + days * 86400000).toISOString() : null, disabledAt: null };
    version.certificate.links.push(link);
    record(work, version.n, 'SHARE_LINK_CREATED', actor, at, days ? `${days}일 뒤 만료` : '만료 없음');
    return { state: next, token, linkId: link.id };
  }
  function disableShareLink(state, workId, n, linkId, actor, at = now()) {
    const next = clone(state), work = getWork(next, workId), version = getVersion(work, n);
    const link = version?.certificate?.links.find(l => l.id === linkId);
    requireThat(link && !link.disabledAt, '이미 중지했거나 없는 링크예요.');
    requireThat(actor === work.owner || actor === version.request.approver, '작업 구성원만 공유 링크를 중지할 수 있어요.');
    link.disabledAt = at;
    record(work, version.n, 'SHARE_LINK_DISABLED', actor, at, link.id);
    return next;
  }
  /** 토큰으로 공유 링크를 찾는다 (해시 비교). */
  async function getShareLink(state, token) {
    const tokenHash = await core.getTextSha256(token || '');
    for (const work of state.works) for (const version of work.versions) {
      const link = version.certificate?.links.find(l => l.tokenHash === tokenHash);
      if (link) return { work, version, link };
    }
    return null;
  }
  /** UC08 공개 검증 조회 기록 — 검증자는 로그인하지 않으므로 행위자 없음. */
  function recordVerification(state, workId, n, linkId, at = now()) {
    const next = clone(state), work = getWork(next, workId);
    record(work, Number(n), 'VERIFY', null, at, linkId);
    return next;
  }

  // ── UC09 감사 이력 해시 체인 ─────────────────────────────────────
  const getEventBody = e => ({ id: e.id, n: e.n, action: e.action, actor: e.actor, at: e.at, note: e.note });
  /** 아직 해시가 없는 이벤트에 prevHash·eventHash를 채운다 (append-only). */
  async function sealEvents(state) {
    for (const work of state.works) {
      let prev = core.ZERO_HASH;
      for (const e of work.events) {
        if (!e.eventHash) { e.prevHash = prev; e.eventHash = await core.getTextSha256(prev + core.getCanonical(getEventBody(e))); }
        prev = e.eventHash;
      }
    }
    return state;
  }
  async function isChainValid(work) {
    let prev = core.ZERO_HASH;
    for (const e of work.events) {
      if (e.prevHash !== prev || e.eventHash !== await core.getTextSha256(prev + core.getCanonical(getEventBody(e)))) return false;
      prev = e.eventHash;
    }
    return true;
  }

  // ── 알림 읽음 (INotificationQuery.setRead) ──────────────────────
  function setRead(state, notificationId, at = now()) {
    const next = clone(state), item = next.notifications.find(n => n.id === notificationId);
    if (item && !item.readAt) item.readAt = at;
    return next;
  }
  function setAllRead(state, user, at = now()) {
    const next = clone(state);
    next.notifications.forEach(n => { if (n.to === user && !n.readAt) n.readAt = at; });
    return next;
  }

  /** 승인 직후 같은 작업의 버전 목록이 바뀌지 않도록 막는 검사 등에 쓰는 빈 작업 공간 */
  const createEmptyState = () => ({ schema: 2, works: [], draft: null, notifications: [], demo: { failNextIssue: false } });

  function createSamplePdf(title = 'HAVE / User GUI', extra = '') {
    const safe = s => s.replace(/[()\\]/g, '');
    const stream = `BT /F1 20 Tf 48 760 Td (${safe(title)}) Tj /F1 12 Tf 0 -40 Td (Human approval is bound to one file version.) Tj 0 -24 Td (This is a local demonstration PDF. ${safe(extra)}) Tj ET`;
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let out = '%PDF-1.4\n'; const offsets = [0];
    objects.forEach((object, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = out.length;
    out += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    return new TextEncoder().encode(out + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  }

  return {
    USERS, STATUS, EFFECT, SIGNING, STAGES, ACTOR_TYPES, EVIDENCE_TYPES, CONFIDENCE, USE_TYPES, LEVEL, RISK_FACTORS, GATE_POLICY, GATE_STRATEGY,
    CHALLENGE_KINDS, MIN_ANSWER_LENGTH, CHECKLIST, NOTIFICATION, ACTIONS,
    getLatestVersion, getVersion, getWork, getStatus, getEffect, getLatestInfo, isBasisChanged, getBasisDraft, getBasisErrors, getRiskTotal, getRiskLevel, getGateRule, getVersionLevel, isRiskComplete,
    getRevisionItems, getRevisionState, isAllResolved, getLinkState, getWorks, getNotifications, getUnreadCount, getNotificationText,
    getPublicSummary, getRegistrationErrors, getAnswerErrors, isHttpUrl, prepareFile, registerWork, requestReviewAgain, cancelRequest,
    saveAnswers, submitAnswers, openRevision, resubmit, createShareLink, disableShareLink, getShareLink, recordVerification,
    sealEvents, isChainValid, setRead, setAllRead, createEmptyState, createSamplePdf,
    // review-model.js가 쓰는 내부 도구
    _internal: { record, notify, setVersionStatus, clone, requireThat, now }
  };
});
