/* HAVE 화면 — 검토 (ReviewPanelView) — UC04
   담당: B
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function setReviewFromPage() {
  const form = $('#role-review');
  if (form && reviewDraft) Object.assign(reviewDraft, V.getReviewInput(form, reviewDraft.evaluations.length));
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler · role.js의 addRoleDecision) ──
addRoleDecision('review', async (form, decision, work) => {
  let next, message;
  setReviewFromPage();
  const v = M.getLatestVersion(work);
  const label = decision === 'PASS' ? '검토 통과' : '수정 요청';
  if (decision === 'REVISION_REQUIRED') { const b = R.getRevisionBlockers(reviewDraft); if (b.length) throw new Error(b.join(' ')); }
  if (!(await confirmDialog(label + '을 기록할까요?', `${work.title} · v${v.n} · ${reviewerActor}\n결정은 바꿀 수 없어요.`, label, '취소'))) return;
  next = decision === 'PASS' ? await R.submitReview(state, work.id, reviewerActor, reviewDraft) : await R.requestRevision(state, work.id, reviewerActor, reviewDraft);
  message = label + ' 기록을 저장했어요.';
  return { next, message };
});
addAction('start-review', async (button, work, action) => {
  const out = await R.startReview(state, work.id, reviewerActor);
  if (await persist(out.state)) { render(true); showToast(out.halted ? '파일 해시가 달라 검토를 중지했어요.' : '파일 해시가 일치해요. 검토를 시작했어요.'); }
});
addAction('add-feedback', async (button, work, action) => { setReviewFromPage(); reviewDraft.feedbackItems.push({ section: '', content: '' }); dirty = true; render(); });
addAction('remove-feedback', async (button, work, action) => { setReviewFromPage(); reviewDraft.feedbackItems.splice(Number(button.dataset.index), 1); dirty = true; render(); });
addHandler('input', event => { const review = event.target.closest('#role-review'); return !!(review && reviewDraft); }, event => {
  const review = event.target.closest('#role-review');
  setReviewFromPage(); dirty = true;
  const v = M.getLatestVersion(getCurrentWork()), rule = M.getGateRule(M.getVersionLevel(v));
  const blockers = R.getReviewBlockers(v, reviewDraft), list = review.querySelector('[data-review-blockers]');
  list.replaceChildren(...blockers.map(b => Object.assign(document.createElement('li'), { textContent: b }))); list.hidden = !blockers.length;
  review.querySelector('[data-review-pass]').disabled = !!blockers.length;
  review.querySelector('[data-check-count]').textContent = `${reviewDraft.checks.filter(Boolean).length} / 4`;
  review.querySelector('[data-review-score]').textContent = `${reviewDraft.evaluations.reduce((s, e) => s + (Number.isInteger(e?.score) ? e.score : 0), 0)} / ${rule.maxScore}점 · ${rule.minScore}점 이상 통과 (위험 ${M.LEVEL[rule.level]})`;
});
