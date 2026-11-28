/* HAVE 화면 — 검토 · 승인 화면의 공통 틀과 결정 제출 — 양식 그리기는 review-ui.js(HaveReviewUI)
   담당: B · C 공동
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function showRoleScreen(mode, work, n) {
  const isReview = mode === 'review', actor = isReview ? reviewerActor : approverActor;
  const label = isReview ? '검토할 작업' : '승인할 작업', queue = isReview ? '#review-queue' : '#approval-queue';
  const people = isReview ? M.USERS.reviewers : M.USERS.approvers;
  const picker = !work ? `<label class="field role-picker" for="role-actor"><span>${isReview ? '시연 검토자' : '시연 최종 승인자'}</span><select id="role-actor" data-mode="${mode}">${people.map(p => `<option ${actor === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}</select></label>` : '';
  const intro = work ? showHeading(isReview ? '작업 검토' : '최종 승인', work.title, showLink(queue, '대기 목록', 'btn')) : showHeading(label, `현재 시연 역할 · ${actor}`);
  let content;
  if (!work) content = V.showQueue(state, mode, actor, viewHelpers);
  else {
    const version = n ? M.getVersion(work, n) : M.getLatestVersion(work);
    if (isReview && version.status === 'IN_REVIEW' && (!reviewDraft || reviewDraft.versionId !== version.id)) {
      reviewDraft = { versionId: version.id, evaluations: version.request.challenges.map(() => null), checks: M.CHECKLIST.map(() => false), memo: '', feedbackItems: [{ section: '', content: '' }], dueDate: core.getDateAfter(3) };
    }
    const conditions = !isReview && version.status === 'APPROVAL_PENDING' ? getConditions(work, version) : null;
    content = V.showDetail(state, work, mode, actor, { n, reviewDraft, conditions }, viewHelpers);
  }
  return showShell(`<div class="review-demo">${intro}${picker}${work ? showContext(work) : ''}${content}</div>`, label);
}

/** 역할 화면 주소로 들어오면 그 버전의 지정 검토자·최종 승인자로 시연 역할을 맞춘다. */
function setActorFromRoute(hash) {
  const parts = hash.split('/');
  if (!hash.startsWith('#work/') || !['review', 'approval'].includes(parts[2])) return;
  const work = M.getWork(state, parts[1]), v = work && (parts[3] ? M.getVersion(work, parts[3]) : M.getLatestVersion(work));
  if (v?.request) { if (parts[2] === 'review') reviewerActor = v.request.reviewer; else approverActor = v.request.approver; }
}

// ── 역할 결정 (검토 · 승인 · 반려 · 철회) ──────────────────────────
// 결정별 처리는 review.js(검토)와 approval.js(승인 · 반려 · 철회)가 addRoleDecision으로 등록한다.
// 처리기는 { next, message }를 돌려주고, 사용자가 확인 창에서 취소하면 아무것도 돌려주지 않는다.
const roleDecisions = {};
function addRoleDecision(mode, run) { roleDecisions[mode] = run; }
async function runRoleDecision(event) {
  if (roleSubmitting || saving) return;
  const form = event.target, mode = form.dataset.roleMode, decision = event.submitter?.value, work = getCurrentWork();
  roleSubmitting = true;
  try {
    const out = await roleDecisions[mode]?.(form, decision, work);
    if (!out) return;
    const { next, message } = out;
    if (await persist(next)) { dirty = false; reviewDraft = null; render(true); showToast(message); if (mode === 'approval' && decision === 'APPROVE') scheduleOutbox(); }
    else V.showError(form, storageError);
  } catch (error) { V.showError(form, error.message); }
  finally { roleSubmitting = false; }
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addHandler('change', event => { const t = event.target; return !!(t.id === 'role-actor'); }, async event => { const t = event.target; if (t.dataset.mode === 'review') reviewerActor = t.value; else approverActor = t.value; render(); $('#role-actor')?.focus(); });
addHandler('submit', event => { const form = event.target; return !!(form.matches('[data-role-mode]')); }, async event => { const form = event.target; event.preventDefault(); await runRoleDecision(event); return; });
