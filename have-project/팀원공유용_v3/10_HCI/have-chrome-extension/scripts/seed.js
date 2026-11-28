/* HAVE 시연 데이터 (1123) — 실제 모델 함수(registerWork → submitAnswers → startReview → submitReview → approve → processOutbox …)를
   차례로 불러 만든다. 그래서 상태 전이, 감사 이력 해시 체인, 알림이 실제 동작과 똑같이 쌓인다.
   이름·작업·시각은 모두 지어낸 값이다. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = isNode ? factory(require('./model.js'), require('./review-model.js'), require('./core.js')) : factory(root.HaveModel, root.HaveReviewModel, root.HaveCore);
  if (isNode) module.exports = api;
  else root.HaveSeed = api;
})(globalThis, function (M, R, core) {
  'use strict';

  async function createSeed() {
    let state = M.createEmptyState();
    let t = Date.parse('2026-11-13T00:10:00Z');
    const at = (minutes = 37) => { t += minutes * 60000; return new Date(t).toISOString(); };
    const due = core.getDateAfter(4);
    const file = (title, extra = '') => M.prepareFile(title.replaceAll(' ', '_') + (extra ? `_${extra}` : '') + '.pdf', M.createSamplePdf(title, extra));
    const base = async (title, o) => ({
      title, file: await file(title, o.fileTag || 'v1'), aiUsed: true, tool: 'ChatGPT · GPT-4o', useTypes: ['초안 작성', '자료 조사·요약'],
      scope: '문서 구조와 초안 작성에 사용했습니다. 사실 확인과 최종 수정은 직접 수행했습니다.',
      contributions: [{ stage: 'DRAFT', actorType: 'AI', note: '목차와 1차 초안을 생성했어요.' }, { stage: 'SOURCE_VERIFICATION', actorType: 'HUMAN', note: '출처 세 곳을 확인하고 수치를 직접 고쳤어요.' }],
      evidence: [{ type: 'WEB_SOURCE', title: 'Chrome 확장 프로그램 공식 문서', uri: 'https://developer.chrome.com/docs/extensions' }, { type: 'PROMPT_LOG', title: '초안 작성 프롬프트 기록', uri: '' }],
      rationale: '핵심 장의 초안을 AI가 작성했고, 팀 제출 문서라 중요도가 높아요.', message: '3장 근거를 중심으로 봐 주세요.', dueDate: due, ...o
    });
    const answer = i => ['버전 ID는 승인 대상을 식별하고, SHA-256은 파일 바이트가 같은지 비교해요. 그래서 파일 이름이 같아도 내용이 바뀌면 다른 버전으로 봐요.',
      '초안에는 승인 여부를 파일 이름으로 판단한다고 적혀 있었는데, 이름은 바꿀 수 있어 근거가 될 수 없어요. 해시 비교로 고쳤어요.',
      '승인자가 두 명이 되면 승인 기록이 버전당 여러 건이 되므로, 최종 결정 조건과 증명서 발급 시점을 함께 바꿔야 해요.'][i];
    const register = async (title, o) => { const r = M.registerWork(state, await base(title, o), at()); state = r.state; return r.workId; };
    const latest = id => M.getLatestVersion(M.getWork(state, id));
    const answerAll = id => { const n = latest(id).request.challenges.length; state = M.submitAnswers(state, id, Array.from({ length: n }, (_, i) => answer(i)), Array.from({ length: n }, (_, i) => ['HIGH', 'MEDIUM', 'MEDIUM'][i]), at()); };
    const evaluations = (id, scores) => latest(id).request.challenges.map((_, i) => ({ score: scores[i], reason: ['핵심 개념을 정확히 설명함', '오류와 수정 근거가 구체적임', '변경 범위를 대체로 짚음'][i], critical: false }));
    const pass = async (id, actor, scores) => {
      state = (await R.startReview(state, id, actor, at())).state;
      state = await R.submitReview(state, id, actor, { evaluations: evaluations(id, scores), checks: [true, true, true, true], memo: '신고 범위와 본문이 일치하고 인용 출처를 확인했어요.' }, at(52));
    };
    const approveAndIssue = async (id, actor) => {
      const v = latest(id);
      state = await R.approve(state, id, actor, { expectedRevision: v.revision, decisionKey: core.createId('key') }, at());
      state = (await R.processOutbox(state, at(2))).state;
    };

    // 1. 이해 확인 대기 (위험 보통 → 과제 2개)
    const design = await register('AI 협업 서비스 요구사항 명세서', { riskScores: [2, 2, 1, 0], reviewer: '김지은', approver: '박서연' });

    // 2. 승인 완료 v1 → v2 등록 후 승인 대기 (v1은 이전 버전 승인)
    const plan = await register('HAVE 프로젝트 기획서', { riskScores: [1, 1, 0, 0], reviewer: '이도현', approver: '정우진', rationale: 'AI는 맞춤법 교정에만 썼어요.' });
    answerAll(plan); await pass(plan, '이도현', [2]); await approveAndIssue(plan, '정우진');
    state = M.registerWork(state, { ...(await base('HAVE 프로젝트 기획서', { fileTag: 'v2', riskScores: [1, 2, 1, 0], reviewer: '이도현', approver: '정우진' })),
      isVersion: true, workId: plan, changeReason: '일정표와 역할 분담을 최신 회의 결과로 고쳤어요.' }, at()).state;
    answerAll(plan); await pass(plan, '이도현', [2, 1]);

    // 3. 승인 완료 + 증명서 발급 + 공유 링크 (위험 높음 → 과제 3개, 5/6)
    const arch = await register('HAVE 시스템 아키텍처 설계', { riskScores: [3, 3, 1, 1], reviewer: '김지은', approver: '박서연' });
    answerAll(arch); await pass(arch, '김지은', [2, 2, 1]); await approveAndIssue(arch, '박서연');
    const shared = await M.createShareLink(state, arch, 1, M.USERS.author, 30, at());
    state = shared.state;
    // 시연 전용: 공유 링크 토큰은 원래 생성 직후에만 보여 주고 저장하지 않는다. 시연에서 공개 검증을 바로 열 수 있게 이 링크만 토큰을 남긴다.
    M.getLatestVersion(M.getWork(state, arch)).certificate.links[0].demoToken = shared.token;

    // 4. 수정 요청 (보완 항목 2개)
    const policy = await register('AI 사용 가이드라인 및 운영 정책', { riskScores: [2, 1, 1, 1], reviewer: '이도현', approver: '박서연' });
    answerAll(policy);
    state = (await R.startReview(state, policy, '이도현', at())).state;
    state = await R.requestRevision(state, policy, '이도현', {
      evaluations: evaluations(policy, [1, 1]), checks: [true, true, false, true], memo: '운영 정책 3절의 근거가 부족해 보완이 필요해요.', dueDate: core.getDateAfter(3),
      feedbackItems: [{ section: '3절 운영 정책', content: 'AI가 작성한 문장과 직접 수정한 부분을 구분하고, 출처를 추가해 주세요.' },
        { section: '부록 체크리스트', content: '검토자가 확인할 항목을 표로 정리해 주세요.' }]
    }, at(45));

    // 5. 검토 대기 (위험 낮음 → 과제 1개)
    const research = await register('캠퍼스 서비스 사용자 조사 보고서', { riskScores: [1, 1, 1, 0], reviewer: '이도현', approver: '정우진', rationale: '설문 요약만 AI가 도왔어요.' });
    answerAll(research);

    // 6. 승인 후 공유 → 철회 → 후속 버전 v2 등록 (11-23: 철회와 후속 버전이 함께 보이는 경우)
    const ethics = await register('인공지능 윤리 에세이', { riskScores: [1, 2, 1, 0], reviewer: '김지은', approver: '박서연' });
    answerAll(ethics); await pass(ethics, '김지은', [2, 2]); await approveAndIssue(ethics, '박서연');
    const ethicsLink = await M.createShareLink(state, ethics, 1, M.USERS.author, 30, at());
    state = ethicsLink.state;
    M.getVersion(M.getWork(state, ethics), 1).certificate.links[0].demoToken = ethicsLink.token;   // 시연 전용 (위 3번과 같은 이유)
    state = R.revoke(state, ethics, 1, '박서연', { reason: '인용 출처 한 곳이 원문과 달라 승인을 철회해요.', requestKey: core.createId('key') }, at());
    state = M.registerWork(state, { ...(await base('인공지능 윤리 에세이', { fileTag: 'v2', riskScores: [1, 2, 1, 0], reviewer: '김지은', approver: '박서연' })),
      isVersion: true, workId: ethics, changeReason: '철회 사유였던 인용 출처를 원문과 맞게 고쳤어요.' }, at()).state;
    answerAll(ethics);

    for (const w of state.works) w.demo = true;
    // 시연 시작 시점의 알림: 사용자별로 최근 3건만 읽지 않음으로 둔다.
    for (const user of [M.USERS.author, ...M.USERS.reviewers, ...M.USERS.approvers]) {
      M.getNotifications(state, user).slice(3).forEach(n => { n.readAt = n.createdAt; });
    }
    state.draft = { isVersion: false, title: '캡스톤 회의록 정리', file: null, changeReason: '', aiUsed: true, tool: '', useTypes: [], scope: '',
      contributions: [{ stage: 'IDEA', actorType: 'HUMAN', note: '' }], evidence: [], riskScores: [null, null, null, null], rationale: '',
      reviewer: '', approver: '', message: '', dueDate: core.getDateAfter(3), savedAt: at() };
    await M.sealEvents(state);
    return state;
  }
  return { createSeed };
});
