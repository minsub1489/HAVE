// HAVE 확장 프로그램 — 업무 규칙 테스트 (1.1.0의 model.js · review-model.js · seed.js 기준)
// 실행: have-chrome-extension 폴더에서  node --test tests/model.test.js   (Node.js 18 이상)
// 쓰임: 이 규칙들을 서버(Java)로 옮길 때 같은 시나리오를 서버 테스트로 다시 씁니다(가이드라인 6.3).
//       규칙을 서버로 옮기고 model.js에서 그 함수를 지우면, 여기서도 해당 테스트를 지웁니다.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const S = path.join(__dirname, '..', 'scripts');
const core = require(path.join(S, 'core.js'));
const M = require(path.join(S, 'model.js'));
const R = require(path.join(S, 'review-model.js'));
const { createSeed } = require(path.join(S, 'seed.js'));

const due = core.getDateAfter(3);
async function form(o = {}) {
  return { title: '테스트 보고서', file: await M.prepareFile('t.pdf', M.createSamplePdf('T', o.tag || 'a')), aiUsed: true, tool: 'Claude', useTypes: ['초안 작성'], scope: '초안 작성',
    contributions: [{ stage: 'DRAFT', actorType: 'AI', note: '초안' }], evidence: [], riskScores: [3, 3, 1, 1], rationale: '중요 문서', reviewer: '김지은', approver: '박서연',
    message: '', dueDate: due, ...o };
}
const ans = n => Array.from({ length: n }, (_, i) => `답변 ${i + 1}: 핵심 근거를 자신의 말로 충분히 길게 설명합니다.`);
const conf = n => Array(n).fill('MEDIUM');

test('위험 등급별 과제 수와 통과 기준 (통일표 5절)', () => {
  assert.equal(M.getRiskLevel([1, 1, 1, 0]), 'LOW');
  assert.equal(M.getRiskLevel([2, 1, 1, 0]), 'MEDIUM');
  assert.equal(M.getRiskLevel([3, 3, 1, 0]), 'HIGH');
  assert.deepEqual(M.getGateRule('LOW').kinds, ['TEACH_BACK']);
  assert.equal(M.getGateRule('MEDIUM').minScore, 3); assert.equal(M.getGateRule('MEDIUM').maxScore, 4);
  assert.equal(M.getGateRule('HIGH').minScore, 5); assert.equal(M.getGateRule('HIGH').maxScore, 6);
});

test('등록 → 이해 확인 → 검토 → 승인 → 자동 발급 → 공유 → 검증 → 철회 전체 흐름', async () => {
  let s = M.createEmptyState();
  const r = M.registerWork(s, await form(), '2026-11-23T01:00:00Z'); s = r.state; const id = r.workId;
  let v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'CHALLENGE_PENDING'); assert.equal(v.request.challenges.length, 3); assert.equal(v.request.state, 'REQUESTED');
  assert.deepEqual(M.getWork(s, id).events.map(e => e.action), ['CREATE_WORK', 'UPLOAD_VERSION', 'ASSESS_RISK', 'REQUEST_REVIEW']);
  assert.equal(M.getNotifications(s, '김지은')[0].type, 'REVIEW_REQUESTED');
  assert.throws(() => M.submitAnswers(s, id, ['짧음', '', ''], conf(3)), /20자/);
  assert.throws(() => M.submitAnswers(s, id, ans(3), [null, null, null]), /확신/);
  s = M.submitAnswers(s, id, ans(3), conf(3));
  assert.equal(M.getLatestVersion(M.getWork(s, id)).status, 'REVIEW_PENDING');
  await assert.rejects(R.startReview(s, id, '이도현'), /지정 검토자/);
  s = (await R.startReview(s, id, '김지은')).state;
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'IN_REVIEW'); assert.equal(v.request.state, 'IN_REVIEW'); assert.equal(v.review.state, 'IN_PROGRESS');
  const ev = sc => sc.map(x => ({ score: x, reason: '근거', critical: false }));
  await assert.rejects(R.submitReview(s, id, '김지은', { evaluations: ev([2, 1, 1]), checks: [true, true, true, true], memo: 'm' }), /5점 이상/);
  await assert.rejects(R.submitReview(s, id, '김지은', { evaluations: ev([2, 2, 2]), checks: [true, true, false, true], memo: 'm' }), /체크리스트/);
  s = await R.submitReview(s, id, '김지은', { evaluations: ev([2, 2, 1]), checks: [true, true, true, true], memo: '좋아요' });
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'APPROVAL_PENDING'); assert.equal(v.review.decision, 'PASS'); assert.equal(v.request.state, 'CLOSED'); assert.ok(v.review.digest);
  assert.deepEqual(s.notifications.filter(n => n.type === 'REVIEW_PASSED').map(n => n.to).sort(), ['김하늘', '박서연'].sort());
  const conds = await R.getApprovalConditions(M.getWork(s, id), v, '박서연', v.revision);
  assert.ok(conds.every(c => c.ok), JSON.stringify(conds));
  await assert.rejects(R.approve(s, id, '박서연', { expectedRevision: v.revision - 1 }), /잠금 번호/);
  const key = 'k-1';
  s = await R.approve(s, id, '박서연', { expectedRevision: v.revision, decisionKey: key });
  const again = await R.approve(s, id, '박서연', { expectedRevision: 0, decisionKey: key });
  assert.equal(again, s, '같은 key는 같은 결과 (멱등)');
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'APPROVED'); assert.equal(v.certificate.signingState, 'PENDING'); assert.equal(M.getEffect(M.getWork(s, id), v), 'VALID');
  s.demo.failNextIssue = true;
  s = (await R.processOutbox(s)).state;
  assert.equal(M.getLatestVersion(M.getWork(s, id)).certificate.signingState, 'FAILED');
  s = R.retryIssue(s, id, 1, '김하늘');
  s = (await R.processOutbox(s)).state;
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.certificate.signingState, 'READY'); assert.match(v.certificate.serial, /^HAVE-\d{4}-[0-9A-F]{6}$/);
  assert.equal(v.certificate.attempts, 2);
  const link = await M.createShareLink(s, id, 1, '김하늘', 7); s = link.state;
  const found = await M.getShareLink(s, link.token);
  assert.equal(found.link.id, link.linkId); assert.equal(M.getLinkState(found.link), 'ACTIVE');
  assert.ok(!JSON.stringify(s).includes(link.token), '토큰 원문은 저장하지 않음');
  assert.equal(M.getLinkState(found.link, new Date(Date.now() + 8 * 86400000).toISOString()), 'EXPIRED');
  s = M.recordVerification(s, id, 1, link.linkId);
  assert.equal(M.getWork(s, id).events.at(-1).actor, null);
  s = M.disableShareLink(s, id, 1, link.linkId, '김하늘');
  assert.equal(M.getLinkState((await M.getShareLink(s, link.token)).link), 'DISABLED');
  assert.throws(() => R.revoke(s, id, 1, '정우진', { reason: '이유' }), /최종 승인자만/);
  s = R.revoke(s, id, 1, '박서연', { reason: '출처 오류', requestKey: 'r-1' });
  assert.equal(R.revoke(s, id, 1, '박서연', { reason: '출처 오류', requestKey: 'r-1' }), s);
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'APPROVED', '철회해도 작업 상태는 그대로'); assert.equal(M.getEffect(M.getWork(s, id), v), 'REVOKED');
  await M.sealEvents(s);
  assert.equal(await M.isChainValid(M.getWork(s, id)), true);
  M.getWork(s, id).events[2].note = '조작';
  assert.equal(await M.isChainValid(M.getWork(s, id)), false, '이력을 고치면 체인이 깨짐');
});

test('수정 요청 → 재제출: 새 버전은 검토 대기, 답변·위험 평가 사본, 평가 초기화 (UC05)', async () => {
  let s = M.createEmptyState();
  const r = M.registerWork(s, await form({ riskScores: [2, 1, 1, 0] }), '2026-11-23T01:00:00Z'); s = r.state; const id = r.workId;
  s = M.submitAnswers(s, id, ans(2), conf(2));
  s = (await R.startReview(s, id, '김지은')).state;
  await assert.rejects(R.requestRevision(s, id, '김지은', { evaluations: [], checks: [], memo: 'm', feedbackItems: [], dueDate: due }), /보완 요청 항목/);
  s = await R.requestRevision(s, id, '김지은', { evaluations: [{ score: 1, reason: 'r', critical: false }], checks: [true, false, false, false], memo: '보완 필요',
    feedbackItems: [{ section: '2장', content: '출처 추가' }, { section: '3장', content: '표 정리' }], dueDate: due });
  let v1 = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v1.status, 'REVISION_REQUIRED'); assert.equal(v1.revisionRound.state, 'OPEN'); assert.equal(v1.review.decision, 'REVISION_REQUIRED');
  s = M.openRevision(s, id); assert.equal(M.getLatestVersion(M.getWork(s, id)).revisionRound.state, 'IN_PROGRESS');
  const items = M.getRevisionItems(M.getLatestVersion(M.getWork(s, id)));
  const sameFile = M.getLatestVersion(M.getWork(s, id)).file;
  const responses = { [items[0].id]: { applied: true, response: '출처 2곳 추가' } };
  const newFile = await M.prepareFile('t2.pdf', M.createSamplePdf('T', 'b'));
  assert.throws(() => M.resubmit(s, id, { file: sameFile, changeNote: 'x', responses }), /같은 파일/);
  assert.throws(() => M.resubmit(s, id, { file: newFile, changeNote: 'x', responses }), /모든 피드백/);
  responses[items[1].id] = { applied: false, response: '표 대신 목록 유지 — 이유 설명' };
  s = M.resubmit(s, id, { file: newFile, changeNote: '출처 보강', responses });
  const w = M.getWork(s, id), v2 = M.getLatestVersion(w);
  v1 = M.getVersion(w, 1);
  assert.equal(v2.n, 2); assert.equal(v2.status, 'REVIEW_PENDING'); assert.equal(v1.revisionRound.state, 'SUBMITTED'); assert.equal(v1.revisionRound.submittedVersionId, v2.id);
  assert.deepEqual(v2.risk.scores, v1.risk.scores); assert.equal(v2.risk.copiedFrom, 1);
  assert.deepEqual(v2.request.challenges.map(c => c.answer), v1.request.challenges.map(c => c.answer));
  assert.equal(v2.review, null, '평가는 승계하지 않음'); assert.equal(v2.request.state, 'REQUESTED');
  assert.equal(M.getNotifications(s, '김지은')[0].type, 'RESUBMITTED');
});

test('최종 승인자 반려 → 수정 요청, 검토 요청 취소 → 제출 완료 → 다시 요청', async () => {
  let s = M.createEmptyState();
  const r = M.registerWork(s, await form({ riskScores: [1, 1, 0, 0] }), '2026-11-23T01:00:00Z'); s = r.state; const id = r.workId;
  s = M.cancelRequest(s, id, '검토자 변경');
  let v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'SUBMITTED'); assert.equal(v.canceledRequests[0].state, 'CANCELED');
  assert.equal(M.getNotifications(s, '김지은')[0].type, 'REQUEST_CANCELED');
  s = M.requestReviewAgain(s, id, { riskScores: [1, 1, 0, 0], rationale: '다시', reviewer: '이도현', approver: '정우진', message: '', dueDate: due });
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'CHALLENGE_PENDING'); assert.equal(v.risk.seq, 2); assert.equal(v.request.reviewer, '이도현');
  s = M.submitAnswers(s, id, ans(1), conf(1));
  s = (await R.startReview(s, id, '이도현')).state;
  assert.throws(() => M.cancelRequest(s, id, 'x'), /검토가 시작되기 전/);
  s = await R.submitReview(s, id, '이도현', { evaluations: [{ score: 2, reason: 'r', critical: false }], checks: [true, true, true, true], memo: 'ok' });
  v = M.getLatestVersion(M.getWork(s, id));
  assert.throws(() => R.reject(s, id, '정우진', { expectedRevision: v.revision, reason: '' }), /반려 사유/);
  s = R.reject(s, id, '정우진', { expectedRevision: v.revision, reason: '근거 부족' });
  v = M.getLatestVersion(M.getWork(s, id));
  assert.equal(v.status, 'REVISION_REQUIRED'); assert.equal(v.approvalCase.state, 'REJECTED'); assert.equal(v.revisionRound.source, 'REJECTION');
  assert.equal(M.getRevisionItems(v)[0].content, '근거 부족');
  assert.deepEqual(s.notifications.filter(n => n.type === 'REJECTED').map(n => n.to).sort(), ['김하늘', '이도현'].sort());
});

test('검토 시작 때 파일 해시가 다르면 검토 중지 (HALTED)', async () => {
  let s = M.createEmptyState();
  const r = M.registerWork(s, await form({ riskScores: [1, 1, 0, 0] })); s = r.state; const id = r.workId;
  s = M.submitAnswers(s, id, ans(1), conf(1));
  const v = M.getLatestVersion(M.getWork(s, id));
  const bytes = core.getBytes(v.file.data); bytes[bytes.length - 10] ^= 1; v.file.data = core.getBase64(bytes);
  const out = await R.startReview(s, id, '김지은');
  assert.equal(out.halted, true);
  const v2 = M.getLatestVersion(M.getWork(out.state, id));
  assert.equal(v2.review.state, 'HALTED'); assert.equal(v2.status, 'REVIEW_PENDING');
  assert.equal(M.getWork(out.state, id).events.at(-1).action, 'HALT_REVIEW');
});

test('등록 입력 검사: AI 미사용이면 기여 주체는 사람, URL 형식, 승인자 지정', async () => {
  const f = await form({ aiUsed: false, contributions: [{ stage: 'DRAFT', actorType: 'AI', note: 'x' }], evidence: [{ type: 'WEB_SOURCE', title: 't', uri: 'file:///x' }], approver: '' });
  const e = M.getRegistrationErrors(f);
  assert.match(e['contribution-0'], /사람/); assert.match(e['evidence-0'], /http/); assert.match(e.approver, /최종 승인자/);
});

test('시연 데이터: 상태 분포, 효력, 체인, 알림', async () => {
  const s = await createSeed();
  const byTitle = t => s.works.find(w => w.title === t);
  const st = t => M.getLatestVersion(byTitle(t)).status;
  assert.equal(st('AI 협업 서비스 요구사항 명세서'), 'CHALLENGE_PENDING');
  assert.equal(st('HAVE 프로젝트 기획서'), 'APPROVAL_PENDING');
  // 승인 효력은 철회 여부만 본다(1123 수정). 후속 버전이 생겨도 v1의 효력은 VALID이고, 최신 버전인지는 getLatestInfo로 따로 알린다.
  assert.equal(M.getEffect(byTitle('HAVE 프로젝트 기획서'), M.getVersion(byTitle('HAVE 프로젝트 기획서'), 1)), 'VALID');
  assert.equal(M.getLatestInfo(byTitle('HAVE 프로젝트 기획서'), M.getVersion(byTitle('HAVE 프로젝트 기획서'), 1)).isLatest, false);
  assert.equal(st('HAVE 시스템 아키텍처 설계'), 'APPROVED');
  assert.equal(M.getLatestVersion(byTitle('HAVE 시스템 아키텍처 설계')).certificate.signingState, 'READY');
  assert.equal(M.getLatestVersion(byTitle('HAVE 시스템 아키텍처 설계')).approval.approver, '박서연', '승인자는 검토자가 아님');
  assert.equal(st('AI 사용 가이드라인 및 운영 정책'), 'REVISION_REQUIRED');
  assert.equal(st('캠퍼스 서비스 사용자 조사 보고서'), 'REVIEW_PENDING');
  // v1 승인을 철회한 뒤 v2를 등록한 작업: v1의 효력은 REVOKED이고 후속 버전 v2가 따로 있다(철회와 후속 버전은 함께 성립).
  const essay = byTitle('인공지능 윤리 에세이');
  assert.equal(M.getEffect(essay, M.getVersion(essay, 1)), 'REVOKED');
  assert.equal(M.getLatestInfo(essay, M.getVersion(essay, 1)).latestN, 2);
  for (const w of s.works) assert.equal(await M.isChainValid(w), true, w.title);
  assert.ok(R.getPendingWorks(s, 'review', '이도현').length === 1);
  assert.ok(R.getPendingWorks(s, 'approval', '정우진').length === 1);
  assert.equal(M.getUnreadCount(s, '김하늘'), 3);
  const token = M.getLatestVersion(byTitle('HAVE 시스템 아키텍처 설계')).certificate.links[0].demoToken;
  assert.ok((await M.getShareLink(s, token)).link);
  for (const n of s.notifications) assert.ok(M.getNotificationText(s, n).length > 5);
});
