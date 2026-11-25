(function (root, factory) {
  const api = typeof module === 'object' && module.exports
    ? factory(require('./model.js'), require('./domain.js'))
    : factory(root.HaveUserModel, root.HumanProof);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HaveUserReviewModel = api;
})(globalThis, function (model, shared) {
  'use strict';

  const APPROVER = '박서연';
  const MIN_SCORE = 5;
  const CHECKS = Object.freeze([
    '검토 대상의 버전과 PDF를 확인했어요.',
    'AI 사용 신고와 기록된 사용 범위를 확인했어요.',
    '작성자의 기여와 검증 근거를 확인했어요.',
    '세 답변에서 확인할 근거와 오류를 살펴봤어요.'
  ]);
  const approverFor = version => version.approver || APPROVER;

  function hasDistinctRoles(work, version) {
    return Boolean(work.owner) && model.REVIEWERS.includes(version.reviewer) &&
      approverFor(version) === APPROVER && new Set([work.owner, version.reviewer, approverFor(version)]).size === 3;
  }

  function versionFor(work, versionId) {
    const version = model.latest(work);
    if (!version || version.id !== versionId) throw new Error('검토 대상 버전이 바뀌었어요. 최신 작업을 열어 주세요.');
    return version;
  }

  function requireRole(work, version, mode, actor) {
    const assigned = mode === 'review' ? version.reviewer : approverFor(version);
    if (!hasDistinctRoles(work, version) || assigned !== actor) {
      throw new Error(mode === 'review' ? '이 버전의 지정 검토자로 전환해 주세요.' : '이 버전의 지정 최종 승인자로 전환해 주세요.');
    }
  }

  function pendingFor(works, mode, actor) {
    if (mode !== 'review' && mode !== 'approval') return [];
    return works.filter(work => {
      const version = model.latest(work);
      if (!hasDistinctRoles(work, version)) return false;
      if (mode === 'review') return version.status === 'REVIEW_PENDING' && actor === version.reviewer;
      return actor === approverFor(version) && (
        version.status === 'APPROVAL_PENDING' ||
        (version.status === 'APPROVED' && version.finalDecision?.decision === 'APPROVE' && !version.approval)
      );
    });
  }

  function normalizedReason(reason, hint) {
    const normalized = typeof reason === 'string' ? reason.trim() : '';
    if (!normalized || normalized.length > 2000) throw new Error(hint);
    return normalized;
  }

  function reviewBlockers(payload) {
    const errors = [];
    const scores = payload.scores;
    if (!Array.isArray(scores) || scores.length !== 3 || scores.some(score => ![0, 1, 2].includes(score))) {
      errors.push('세 답변에 각각 0~2점을 선택해 주세요.');
    } else if (scores.reduce((sum, score) => sum + score, 0) < MIN_SCORE) {
      errors.push('통과하려면 총점이 5점 이상이어야 해요.');
    }
    if (!Array.isArray(payload.critical) || payload.critical.length !== 3 || payload.critical.some(flag => flag !== false)) {
      errors.push('중대한 오류가 있는 답변은 보완을 요청해 주세요.');
    }
    if (!Array.isArray(payload.checks) || payload.checks.length !== CHECKS.length || payload.checks.some(checked => checked !== true)) {
      errors.push('검토 확인 항목을 모두 체크해 주세요.');
    }
    if (typeof payload.rationale !== 'string' || !payload.rationale.trim() || payload.rationale.trim().length > 2000) {
      errors.push('검토 근거를 2,000자 이내로 적어 주세요.');
    }
    return errors;
  }

  function record(work, version, action, actor, at, note) {
    work.events.push({ version: version.n, action, actor, at, ...(note ? { note } : {}) });
  }

  function reviewWork(work, actor, versionId, payload, at = new Date().toISOString()) {
    const current = versionFor(work, versionId);
    requireRole(work, current, 'review', actor);
    if (current.status !== 'REVIEW_PENDING' || current.review) throw new Error('이 버전은 검토를 제출할 수 있는 상태가 아니에요.');
    if (!Array.isArray(current.answers) || current.answers.length !== 3 || current.answers.some(answer => typeof answer !== 'string' || !answer.trim())) {
      throw new Error('작성자가 세 답변을 모두 제출하면 검토할 수 있어요.');
    }
    const { decision } = payload;
    if (!['PASS', 'REVISE'].includes(decision)) throw new Error('검토 결정을 선택해 주세요.');
    const rationale = normalizedReason(payload.rationale, '검토 근거나 수정 요청 사유를 2,000자 이내로 적어 주세요.');
    if (decision === 'PASS') {
      const blockers = reviewBlockers(payload);
      if (blockers.length) throw new Error(blockers.join(' '));
    }

    const next = structuredClone(work);
    const version = model.latest(next);
    const scores = Array.from({ length: 3 }, (_, index) => [0, 1, 2].includes(payload.scores?.[index]) ? payload.scores[index] : null);
    const comments = Array.from({ length: 3 }, (_, index) => {
      const comment = payload.comments?.[index];
      return typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';
    });
    version.review = {
      versionId, fileHash: version.file.hash, actor, at, decision, rationale, scores, comments,
      critical: Array.from({ length: 3 }, (_, index) => payload.critical?.[index] === true),
      checks: CHECKS.map((_, index) => payload.checks?.[index] === true),
      total: scores.every(score => score !== null) ? scores.reduce((sum, score) => sum + score, 0) : null
    };
    if (decision === 'REVISE') {
      version.status = 'REVISION_REQUIRED';
      version.feedback = rationale;
      version.feedbackItems = [{ section: '검토 의견', content: rationale }, ...comments.flatMap((content, index) =>
        content ? [{ section: `문항 ${index + 1}`, content }] : [])];
      record(next, version, '검토자 수정 요청', actor, at, rationale);
    } else {
      version.status = 'APPROVAL_PENDING';
      record(next, version, '검토 통과 · 최종 승인 요청', actor, at, rationale);
    }
    return next;
  }

  async function requireFileIntegrity(version) {
    let actual;
    try {
      if (!version.file?.data || !version.file.hash) throw new Error('missing file');
      actual = await shared.digest(model.decode(version.file.data));
    } catch {
      throw new Error('등록 PDF를 읽을 수 없어요. 이 버전의 파일을 확인해 주세요.');
    }
    if (actual !== version.file.hash) throw new Error('등록 PDF의 해시가 달라요. 파일을 다시 확인해 주세요.');
  }

  function requireReview(version) {
    const review = version.review;
    if (!review || review.decision !== 'PASS' || review.versionId !== version.id || review.fileHash !== version.file.hash ||
        review.actor !== version.reviewer || reviewBlockers(review).length) {
      throw new Error('이 버전의 검토 통과 기록을 확인할 수 없어요.');
    }
  }

  async function decideApproval(work, actor, versionId, payload, at = new Date().toISOString()) {
    const current = versionFor(work, versionId);
    requireRole(work, current, 'approval', actor);
    if (current.status !== 'APPROVAL_PENDING' || current.finalDecision) throw new Error('이 버전은 승인 결정을 제출할 수 있는 상태가 아니에요.');
    requireReview(current);
    if (!['APPROVE', 'REVISE'].includes(payload.decision)) throw new Error('최종 결정을 선택해 주세요.');
    const rationale = normalizedReason(payload.rationale, '승인 근거나 수정 요청 사유를 2,000자 이내로 적어 주세요.');
    if (payload.decision === 'APPROVE') await requireFileIntegrity(current);

    const next = structuredClone(work);
    const version = model.latest(next);
    version.finalDecision = { versionId, fileHash: version.file.hash, actor, at, decision: payload.decision, rationale };
    if (payload.decision === 'REVISE') {
      version.status = 'REVISION_REQUIRED';
      version.feedback = rationale;
      version.feedbackItems = [{ section: '최종 승인자 의견', content: rationale }];
      record(next, version, '최종 승인자 수정 요청', actor, at, rationale);
    } else {
      version.status = 'APPROVED';
      version.issuance = { status: 'PENDING' };
      record(next, version, '최종 승인 · 증명서 발급 대기', actor, at, rationale);
    }
    return next;
  }

  async function issueCertificate(work, actor, versionId, at = new Date().toISOString()) {
    const current = versionFor(work, versionId);
    requireRole(work, current, 'approval', actor);
    const decision = current.finalDecision;
    if (current.status !== 'APPROVED' || !decision || decision.decision !== 'APPROVE' || decision.actor !== actor ||
        decision.versionId !== versionId || decision.fileHash !== current.file.hash) {
      throw new Error('이 버전의 최종 승인 기록을 확인할 수 없어요.');
    }
    if (current.approval) throw new Error('이미 증명서가 발급됐어요. 증명서에서 확인해 주세요.');
    requireReview(current);
    await requireFileIntegrity(current);

    const next = structuredClone(work);
    const version = model.latest(next);
    version.approval = { serial: 'HAVE-' + crypto.randomUUID().toUpperCase(), at: decision.at, actor: decision.actor, issuedAt: at };
    version.issuance = { status: 'ISSUED', at };
    record(next, version, '시연 증명서 발급', actor, at);
    return next;
  }

  return { APPROVER, MIN_SCORE, CHECKS, approverFor, pendingFor, reviewBlockers, reviewWork, decideApproval, issueCertificate };
});
