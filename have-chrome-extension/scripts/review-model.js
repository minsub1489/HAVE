/* HAVE 검토자·최종 승인자 쪽 도메인 모델 (1123)
   UC04 결과물 검토(검토 시작 · 해시 대조 · 검토 통과 · 수정 요청), UC06 최종 승인·반려,
   UC07 증명서 자동 발급(Outbox)과 발급 재시도, UC10 승인 철회. 이름은 컴포넌트 v2의 인터페이스를 따른다. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = isNode ? factory(require('./model.js'), require('./core.js')) : factory(root.HaveModel, root.HaveCore);
  if (isNode) module.exports = api;
  else root.HaveReviewModel = api;
})(globalThis, function (model, core) {
  'use strict';
  const { record, notify, setVersionStatus, clone, requireThat, now } = model._internal;

  /** 검토·승인 대기 목록 (IReviewAPI.getAssignedRequests, IApprovalAPI.getApprovalTargets) */
  function getPendingWorks(state, mode, actor) {
    return state.works.filter(work => {
      const v = model.getLatestVersion(work);
      if (mode === 'review') return ['REVIEW_PENDING', 'IN_REVIEW'].includes(v.status) && v.request?.reviewer === actor;
      if (mode === 'approval') return v.status === 'APPROVAL_PENDING' && v.request?.approver === actor;
      return false;
    });
  }
  /** 최종 승인자가 처리할 승인 완료 작업 (철회 · 발급 재시도) */
  function getApprovedWorks(state, actor) {
    return state.works.filter(work => work.versions.some(v => v.approval && v.request?.approver === actor));
  }

  async function isFileIntact(version) {
    try { return (await core.getSha256(core.getBytes(version.file.data))) === version.file.hash; } catch { return false; }
  }

  // ── UC04 검토 ───────────────────────────────────────────────
  /** IReviewAPI.startReview — 등록 당시 해시와 대조해 일치하면 버전을 잠근다(IN_REVIEW). 불일치면 HALTED. */
  async function startReview(state, workId, actor, at = now()) {
    const next = clone(state), work = model.getWork(next, workId), version = model.getLatestVersion(work);
    requireThat(version.request?.reviewer === actor && actor !== work.owner, '이 버전의 지정 검토자로 전환해 주세요.');
    requireThat(version.status === 'REVIEW_PENDING' && version.request.state === 'REQUESTED', '검토를 시작할 수 있는 상태가 아니에요.');
    if (!(await isFileIntact(version))) {
      version.review = { state: 'HALTED', actor, startedAt: at, haltedReason: '등록된 파일의 해시가 등록 당시 값과 달라요.' };
      record(work, version.n, 'HALT_REVIEW', actor, at, '파일 해시 불일치');
      return { state: next, halted: true };
    }
    version.request.state = 'IN_REVIEW';
    version.review = {
      state: 'IN_PROGRESS', actor, startedAt: at, evaluations: version.request.challenges.map(() => null),
      checks: model.CHECKLIST.map(() => false), memo: '', feedbackItems: [], decision: null, decidedAt: null, digest: null
    };
    setVersionStatus(version, 'IN_REVIEW');
    record(work, version.n, 'START_REVIEW', actor, at);
    return { state: next, halted: false };
  }

  /** 검토 통과를 막는 이유 목록 (Review.isPassed가 거짓이 되는 이유) */
  function getReviewBlockers(version, payload) {
    const rule = model.getGateRule(model.getVersionLevel(version));
    const evaluations = payload.evaluations || [];
    const errors = [];
    if (evaluations.length !== rule.kinds.length || evaluations.some(e => !e || ![0, 1, 2].includes(e.score) || !core.isText(e.reason || '', 2000)))
      errors.push('모든 답변에 점수(0~2)와 근거를 입력해 주세요.');
    else {
      const total = evaluations.reduce((sum, e) => sum + e.score, 0);
      if (total < rule.minScore) errors.push(`통과하려면 ${rule.maxScore}점 중 ${rule.minScore}점 이상이어야 해요 (위험 ${model.LEVEL[rule.level]}).`);
      if (evaluations.some(e => e.critical)) errors.push('치명 오류가 있는 답변이 있으면 통과할 수 없어요. 수정을 요청해 주세요.');
    }
    if (!Array.isArray(payload.checks) || payload.checks.length !== model.CHECKLIST.length || payload.checks.some(c => c !== true))
      errors.push('체크리스트 4항목을 모두 확인해 주세요.');
    if (!core.isText(payload.memo || '', 2000)) errors.push('검토 메모를 2,000자 이내로 적어 주세요.');
    return errors;
  }
  const isPassed = (version, payload) => getReviewBlockers(version, payload).length === 0;

  function getRevisionBlockers(payload) {
    const errors = [];
    const items = payload.feedbackItems || [];
    if (!items.length || items.some(i => !core.isText(i.section || '', 100) || !core.isText(i.content || '', 1000))) errors.push('보완 요청 항목을 한 개 이상, 대상 구간과 내용을 함께 적어 주세요.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate || '') || payload.dueDate < now().slice(0, 10)) errors.push('보완 기한을 오늘 이후 날짜로 선택해 주세요.');
    if (!core.isText(payload.memo || '', 2000)) errors.push('검토 메모를 2,000자 이내로 적어 주세요.');
    return errors;
  }

  function prepareReview(version, payload, decision, at) {
    const r = version.review;
    r.evaluations = version.request.challenges.map((_, i) => {
      const e = payload.evaluations?.[i];
      return e && [0, 1, 2].includes(e.score) ? { score: e.score, reason: (e.reason || '').trim(), critical: e.critical === true } : null;
    });
    r.checks = model.CHECKLIST.map((_, i) => payload.checks?.[i] === true);
    r.memo = (payload.memo || '').trim();
    r.feedbackItems = decision === 'REVISION_REQUIRED'
      ? payload.feedbackItems.map(i => ({ id: core.createId('fbi'), section: i.section.trim(), content: i.content.trim() })) : [];
    r.decision = decision; r.decidedAt = at; r.state = 'COMPLETED';
  }
  async function setReviewDigest(version) {
    const r = version.review;
    r.digest = await core.getTextSha256(core.getCanonical({ versionId: version.id, fileHash: version.file.hash,
      answers: version.request.challenges.map(c => c.answer), evaluations: r.evaluations, checks: r.checks, memo: r.memo, decision: r.decision, feedbackItems: r.feedbackItems }));
  }
  function requireReviewer(work, version, actor) {
    requireThat(version.request?.reviewer === actor && actor !== work.owner, '이 버전의 지정 검토자로 전환해 주세요.');
    requireThat(version.status === 'IN_REVIEW' && version.review?.state === 'IN_PROGRESS', '검토를 시작한 버전만 결정할 수 있어요.');
  }

  /** IReviewAPI.submitReview — 검토 통과. IN_REVIEW → APPROVAL_PENDING, 최종 승인자·작성자 알림 */
  async function submitReview(state, workId, actor, payload, at = now()) {
    const next = clone(state), work = model.getWork(next, workId), version = model.getLatestVersion(work);
    requireReviewer(work, version, actor);
    const blockers = getReviewBlockers(version, payload);
    requireThat(!blockers.length, blockers.join(' '));
    prepareReview(version, payload, 'PASS', at);
    await setReviewDigest(version);
    version.request.state = 'CLOSED';
    version.approvalCase = { id: core.createId('case'), state: 'PENDING', decidedAt: null, decisionKey: null, rejectionReason: null, actor: null };
    setVersionStatus(version, 'APPROVAL_PENDING');
    const total = version.review.evaluations.reduce((s, e) => s + e.score, 0);
    record(work, version.n, 'PASS_REVIEW', actor, at, `${total}/${model.getGateRule(model.getVersionLevel(version)).maxScore}점 · ${version.review.memo}`);
    notify(next, version.request.approver, 'REVIEW_PASSED', work, version.n, at);
    notify(next, work.owner, 'REVIEW_PASSED', work, version.n, at);
    return next;
  }

  /** IReviewAPI.requestRevision — 수정 요청. IN_REVIEW → REVISION_REQUIRED, Revision OPEN, 작성자 알림 */
  async function requestRevision(state, workId, actor, payload, at = now()) {
    const next = clone(state), work = model.getWork(next, workId), version = model.getLatestVersion(work);
    requireReviewer(work, version, actor);
    const blockers = getRevisionBlockers(payload);
    requireThat(!blockers.length, blockers.join(' '));
    prepareReview(version, payload, 'REVISION_REQUIRED', at);
    await setReviewDigest(version);
    version.request.state = 'CLOSED';
    version.revisionRound = { id: core.createId('rev'), source: 'REVIEW', state: 'OPEN', dueDate: payload.dueDate, changeNote: '', responses: {}, submittedVersionId: null };
    setVersionStatus(version, 'REVISION_REQUIRED');
    record(work, version.n, 'REQUEST_REVISION', actor, at, `보완 항목 ${version.review.feedbackItems.length}건 · 기한 ${payload.dueDate}`);
    notify(next, work.owner, 'REVISION_REQUESTED', work, version.n, at);
    return next;
  }

  // ── UC06 최종 승인 · 반려 ─────────────────────────────────────
  /** 승인 가능 조건 (UC06 조건 A). 각 항목의 충족 여부를 돌려준다. */
  async function getApprovalConditions(work, version, actor, expectedRevision) {
    const rule = model.getGateRule(model.getVersionLevel(version));
    const r = version.review;
    const total = r?.evaluations?.reduce((s, e) => s + (e?.score || 0), 0) ?? 0;
    return [
      { key: 'actor', label: '지정 최종 승인자이고 작성자·검토자가 아님', ok: version.request?.approver === actor && actor !== work.owner && actor !== version.request?.reviewer },
      { key: 'review', label: `검토 통과 · ${rule ? `${total}/${rule.maxScore}점 (기준 ${rule.minScore}점)` : ''} · 치명 오류 없음 · 체크리스트 4/4`,
        ok: r?.state === 'COMPLETED' && r.decision === 'PASS' && !!rule && total >= rule.minScore && !r.evaluations.some(e => e?.critical) && r.checks.every(Boolean) },
      { key: 'revision', label: '검토한 버전과 승인 대상 버전이 같음 (최신 버전 · 잠금 번호 일치)', ok: version.n === model.getLatestVersion(work).n && (expectedRevision === undefined || expectedRevision === version.revision) },
      { key: 'file', label: '파일 해시가 등록 당시 값과 일치', ok: await isFileIntact(version) },
      { key: 'single', label: '이 버전에 기존 최종 결정이 없음', ok: version.status === 'APPROVAL_PENDING' && version.approvalCase?.state === 'PENDING' }
    ];
  }

  /** IApprovalAPI.approve(caseId, key) — 같은 key로 다시 요청하면 기존 결과를 그대로 돌려준다(멱등성). */
  async function approve(state, workId, actor, { expectedRevision, decisionKey }, at = now()) {
    const current = model.getLatestVersion(model.getWork(state, workId));
    if (decisionKey && current.approvalCase?.decisionKey === decisionKey) return state;
    const next = clone(state), work = model.getWork(next, workId), version = model.getLatestVersion(work);
    const failed = (await getApprovalConditions(work, version, actor, expectedRevision)).filter(c => !c.ok);
    requireThat(!failed.length, '승인 조건을 충족하지 않아요: ' + failed.map(c => c.label).join(', '));
    Object.assign(version.approvalCase, { state: 'APPROVED', decidedAt: at, decisionKey: decisionKey || core.createId('key'), actor });
    version.approval = { id: core.createId('apr'), approver: actor, approvedAt: at };
    version.certificate = { id: core.createId('cert'), serial: '', signingState: 'PENDING', payload: null, payloadHash: '', issuedAt: '', attempts: 0, lastError: '', links: [] };
    setVersionStatus(version, 'APPROVED');
    record(work, version.n, 'APPROVE', actor, at, '증명서 발급 요청 (Outbox)');
    notify(next, work.owner, 'APPROVED', work, version.n, at);
    notify(next, version.request.reviewer, 'APPROVED', work, version.n, at);
    return next;
  }

  /** IApprovalAPI.reject(caseId, reason, key) — APPROVAL_PENDING → REVISION_REQUIRED, 작성자·검토자 알림 (UC06 조건 J) */
  function reject(state, workId, actor, { expectedRevision, decisionKey, reason }, at = now()) {
    const current = model.getLatestVersion(model.getWork(state, workId));
    if (decisionKey && current.approvalCase?.decisionKey === decisionKey) return state;
    const next = clone(state), work = model.getWork(next, workId), version = model.getLatestVersion(work);
    requireThat(version.request?.approver === actor && actor !== work.owner && actor !== version.request.reviewer, '이 버전의 지정 최종 승인자로 전환해 주세요.');
    requireThat(expectedRevision === undefined || expectedRevision === version.revision, '다른 창에서 이 버전이 바뀌었어요. 다시 열어 주세요.');
    requireThat(version.status === 'APPROVAL_PENDING' && version.approvalCase?.state === 'PENDING', '반려할 수 있는 상태가 아니에요.');
    requireThat(core.isText(reason || '', 2000), '반려 사유를 2,000자 이내로 입력해 주세요.');
    Object.assign(version.approvalCase, { state: 'REJECTED', decidedAt: at, decisionKey: decisionKey || core.createId('key'), rejectionReason: reason.trim(), actor });
    version.revisionRound = { id: core.createId('rev'), source: 'REJECTION', state: 'OPEN', dueDate: core.getDateAfter(3, new Date(at)), changeNote: '', responses: {}, submittedVersionId: null };
    setVersionStatus(version, 'REVISION_REQUIRED');
    record(work, version.n, 'REJECT', actor, at, reason.trim());
    notify(next, work.owner, 'REJECTED', work, version.n, at);
    notify(next, version.request.reviewer, 'REJECTED', work, version.n, at);
    return next;
  }

  // ── UC07 증명서 발급 (CertificateIssueObserver → Outbox → CertificateService) ──
  /** 발급 대기 중인 증명서를 처리한다. 시연 설정 failNextIssue가 켜져 있으면 한 번 실패시킨다. */
  async function processOutbox(state, at = now()) {
    const next = clone(state);
    let changed = false;
    for (const work of next.works) for (const version of work.versions) {
      const c = version.certificate;
      if (!c || c.signingState !== 'PENDING') continue;
      changed = true;
      c.attempts += 1;
      if (next.demo?.failNextIssue) {
        next.demo.failNextIssue = false;
        c.signingState = 'FAILED'; c.lastError = '서명 서비스에 연결하지 못했어요 (시연 설정).';
        record(work, version.n, 'ISSUE_FAILED', null, at, c.lastError);
        continue;
      }
      c.payload = { certificateId: c.id, workId: work.id, title: work.title, versionId: version.id, n: version.n, fileName: version.file.name,
        fileHash: version.file.hash, approver: version.approval.approver, approvedAt: version.approval.approvedAt, reviewer: version.request.reviewer, reviewDigest: version.review.digest };
      c.payloadHash = await core.getTextSha256(core.getCanonical(c.payload));
      c.serial = `HAVE-${at.slice(2, 4)}${at.slice(5, 7)}-${c.payloadHash.slice(0, 6).toUpperCase()}`;
      c.signingState = 'READY'; c.issuedAt = at; c.lastError = '';
      record(work, version.n, 'ISSUE_CERTIFICATE', null, at, c.serial);
      notify(next, work.owner, 'CERTIFICATE_ISSUED', work, version.n, at);
    }
    return { state: next, changed };
  }
  /** ICertificateAPI.retryIssue(certId) — 발급 실패한 증명서를 다시 대기열에 넣는다. */
  function retryIssue(state, workId, n, actor, at = now()) {
    const next = clone(state), work = model.getWork(next, workId), version = model.getVersion(work, n);
    requireThat(version?.certificate?.signingState === 'FAILED', '발급에 실패한 증명서만 다시 시도할 수 있어요.');
    requireThat(actor === work.owner || actor === version.request.approver, '작성자 또는 최종 승인자만 다시 시도할 수 있어요.');
    version.certificate.signingState = 'PENDING';
    record(work, version.n, 'RETRY_ISSUE', actor, at, `${version.certificate.attempts + 1}번째 시도`);
    return next;
  }

  // ── UC10 승인 철회 ──────────────────────────────────────────
  /** IApprovalAPI.revoke(approvalId, reason, key) — 작업 상태는 바뀌지 않고 승인 효력만 REVOKED가 된다. */
  function revoke(state, workId, n, actor, { reason, requestKey }, at = now()) {
    const current = model.getVersion(model.getWork(state, workId), n);
    if (requestKey && current?.revocation?.requestKey === requestKey) return state;
    const next = clone(state), work = model.getWork(next, workId), version = model.getVersion(work, n);
    requireThat(version?.approval, '승인 기록이 있는 버전만 철회할 수 있어요.');
    requireThat(version.request.approver === actor, '이 버전을 승인한 최종 승인자만 철회할 수 있어요.');
    requireThat(!version.revocation, '이미 철회한 승인이에요.');
    requireThat(core.isText(reason || '', 2000), '철회 사유를 2,000자 이내로 입력해 주세요.');
    version.revocation = { id: core.createId('rvk'), actor, reason: reason.trim(), revokedAt: at, requestKey: requestKey || core.createId('key') };
    record(work, version.n, 'REVOKE', actor, at, reason.trim());
    notify(next, work.owner, 'APPROVAL_REVOKED', work, version.n, at);
    notify(next, version.request.reviewer, 'APPROVAL_REVOKED', work, version.n, at);
    return next;
  }

  return { getPendingWorks, getApprovedWorks, isFileIntact, startReview, getReviewBlockers, getRevisionBlockers, isPassed, submitReview, requestRevision,
    getApprovalConditions, approve, reject, processOutbox, retryIssue, revoke };
});
