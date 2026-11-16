const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../user/model.js');
const pdf = () => new TextEncoder().encode('%PDF-1.4\nHAVE sample\n%%EOF');
async function form() { return { title: '사용자 테스트', file: await M.prepareFile('test.pdf', pdf()), tool: 'ChatGPT', scope: '구조 초안 작성', contribution: '출처를 확인하고 결론을 수정했습니다.', reviewer: '김지은' }; }

test('rejects invalid PDF bytes, extension and oversized files', async () => {
  await assert.rejects(M.prepareFile('test.pdf', new Uint8Array([1, 2])), /PDF/);
  await assert.rejects(M.prepareFile('test.txt', pdf()), /PDF/);
  await assert.rejects(M.prepareFile('test.pdf', new Uint8Array(20 * 1024 * 1024 + 1)), /20 MB/);
});
test('hashes the actual uploaded bytes', async () => {
  const f = await M.prepareFile('test.pdf', pdf());
  assert.equal(f.hash, await require('../prototype/dist/domain.js').digest(pdf()));
  assert.deepEqual(M.decode(f.data), pdf());
});
test('validates each registration step with field-specific errors', async () => {
  assert.deepEqual(Object.keys(M.validateRegistration({}, 0)).sort(), ['file', 'title']);
  assert.ok(M.validateRegistration({ tool: ' ', scope: '' }, 1).tool);
  assert.ok(M.validateRegistration({}, 2).contribution);
  assert.ok(M.validateRegistration({}, 3).reviewer);
  assert.deepEqual(M.validateRegistration(await form()), {});
});
test('a new submission has its own version, three unanswered tasks and no approval', async () => {
  const w = M.createWork(await form());
  assert.equal(w.versions[0].n, 1);
  assert.equal(w.versions[0].status, 'CHALLENGE_PENDING');
  assert.equal(w.versions[0].answers.length, 3);
  assert.equal(M.certificateFor(w), null);
});
test('answers require all questions and never grant author approval', async () => {
  const w = M.createWork(await form());
  assert.throws(() => M.submitAnswers(w, ['설명', '', '대안'], [70, 80, 90]), /모든/);
  const next = M.submitAnswers(w, ['설명', '오류 수정', '대안'], [70, 80, 90]);
  assert.equal(next.versions[0].status, 'REVIEW_PENDING');
  assert.equal(w.versions[0].status, 'CHALLENGE_PENDING');
  assert.equal(M.certificateFor(next), null);
  assert.throws(() => M.submitAnswers(next, ['a', 'b', 'c'], [80, 80, 80]), /제출/);
});
test('a new version preserves the earlier approval and requires another review', async () => {
  const w = M.createWork(await form());
  w.versions[0].status = 'APPROVED';
  w.versions[0].approval = { serial: 'HAVE-DEMO-01', at: '2026-11-16T01:00:00Z', actor: '김지은' };
  const f = await form(); f.reason = '오류 수정';
  const next = M.appendVersion(w, f);
  assert.equal(next.versions[1].n, 2);
  assert.equal(next.versions[1].status, 'CHALLENGE_PENDING');
  assert.equal(next.versions[0].approval.serial, 'HAVE-DEMO-01');
  assert.equal(M.statusOf(next, next.versions[0]).label, '이전 버전 승인');
  assert.equal(M.certificateFor(next), null);
  assert.ok(M.certificateFor(next, 1));
  assert.equal(w.versions.length, 1);
});
test('revision reasons are mandatory and pending versions cannot be replaced', async () => {
  const w = M.createWork(await form());
  const f = await form();
  assert.throws(() => M.appendVersion(w, f), /변경 사유/);
  f.reason = '수정';
  assert.throws(() => M.appendVersion(w, f), /수정 요청|승인/);
});
test('search, attention and approved filters use the latest version only', async () => {
  const a = M.createWork(await form()), b = structuredClone(a);
  b.id = 'second'; b.title = '경제적 타당성'; b.versions[0].status = 'APPROVED';
  assert.equal(M.filterWorks([a, b], '경제', 'all').length, 1);
  assert.equal(M.filterWorks([a, b], '', 'attention')[0].id, a.id);
  assert.equal(M.filterWorks([a, b], '', 'approved')[0].id, b.id);
  assert.equal(M.statusOf({ versions: [{ n: 1, status: 'NEW_STATUS' }] }).label, '상태 확인 필요');
});
test('public certificate data excludes answers, contribution and file bytes', async () => {
  const w = M.createWork(await form());
  w.versions[0].status = 'APPROVED';
  w.versions[0].approval = { serial: 'HAVE-DEMO-01', at: '2026-11-16T01:00:00Z', actor: '김지은' };
  const p = M.publicRecord(w, 1);
  assert.equal(p.fileHash, w.versions[0].file.hash);
  for (const key of ['answers', 'contribution', 'fileData', 'data', 'scope']) assert.equal(key in p, false);
});
test('seeded examples have valid PDF hashes and separate approval records', async () => {
  const s = await M.seed();
  assert.equal(s.works.length, 5);
  for (const w of s.works) for (const v of w.versions) {
    assert.equal(v.file.hash, await require('../prototype/dist/domain.js').digest(M.decode(v.file.data)));
    if (v.status !== 'APPROVED') assert.equal(v.approval, null);
  }
});
