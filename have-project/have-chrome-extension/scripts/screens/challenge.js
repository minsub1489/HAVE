/* HAVE 화면 — 이해 확인 (GateAnswerView) — UC03
   담당: B
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function showChallenge(work) {
  const v = M.getLatestVersion(work);
  if (!v.request) return showNotice('진행 중인 검토 요청이 없어요', v.status === 'SUBMITTED' ? '검토를 다시 요청하면 이해 확인 과제가 배정돼요.' : '작업 정보를 확인해 주세요.', 'neutral', v.status === 'SUBMITTED' ? `<div class="space-top">${showLink(getWorkRoute(work, 'request'), '검토 다시 요청', 'btn primary')}</div>` : '');
  const challenges = v.request.challenges, editable = v.status === 'CHALLENGE_PENDING';
  const level = M.getVersionLevel(v), rule = M.getGateRule(level);
  if (!answerDraft || answerDraft.versionId !== v.id) answerDraft = { versionId: v.id, answers: challenges.map(c => c.answer), confidence: challenges.map(c => c.confidence) };
  questionIndex = Math.min(questionIndex, challenges.length - 1);
  const c = challenges[questionIndex], k = M.CHALLENGE_KINDS[c.kind];
  const done = answerDraft.answers.filter(a => (a || '').trim().length >= M.MIN_ANSWER_LENGTH).length;
  const last = questionIndex === challenges.length - 1;
  const canCancel = ['CHALLENGE_PENDING', 'REVIEW_PENDING'].includes(v.status) && v.request.state === 'REQUESTED';
  return `<div class="split"><section class="panel"><div class="panel-head"><h2>나의 이해 확인</h2><span class="small muted">${done} / ${challenges.length} 작성</span></div><div class="panel-body">
    <div class="tabs" role="tablist" aria-label="이해 확인 문항">${challenges.map((x, i) => `<button id="question-${i}" role="tab" aria-selected="${i === questionIndex}" aria-controls="question-panel" tabindex="${i === questionIndex ? '0' : '-1'}" class="tab ${i === questionIndex ? 'active' : ''}" data-question="${i}">${i + 1}. ${M.CHALLENGE_KINDS[x.kind].label}${(answerDraft.answers[i] || '').trim().length >= M.MIN_ANSWER_LENGTH ? ' ✓' : ''}</button>`).join('')}</div>
    <div id="question-panel" role="tabpanel" aria-labelledby="question-${questionIndex}" class="question"><div class="eyebrow">QUESTION ${String(questionIndex + 1).padStart(2, '0')} · ${k.type.toUpperCase()}</div><h2>${escapeHtml(k.label)}</h2><div class="question-text">${escapeHtml(c.prompt)}</div>
    ${c.previous && editable ? `<details class="hash-details" open><summary>v${c.previous.n} 답변 · 참고</summary><p class="small">${escapeHtml(c.previous.answer)}</p><p class="small muted">확신 정도 ${escapeHtml(M.CONFIDENCE[c.previous.confidence] || '-')} · 근거가 바뀌어 그대로 쓸 수 없어요. 바뀐 근거에 맞춰 다시 써 주세요.</p></details>` : ''}
    <form id="answers" novalidate><label class="field" for="answer"><span>나의 답변 <small class="required">${M.MIN_ANSWER_LENGTH}자 이상</small></span><textarea id="answer" maxlength="10000" ${editable ? '' : 'readonly'} aria-describedby="answer-hint answer-error" placeholder="결과물의 내용을 근거와 함께 자신의 말로 적어 주세요.">${escapeHtml(answerDraft.answers[questionIndex] || '')}</textarea>
      <small id="answer-hint" class="muted">${editable ? '다른 문항으로 이동해도 입력은 유지돼요.' : '제출한 답변은 읽기 전용이에요.'}</small><small id="answer-error" role="alert" style="display:block;color:var(--color-danger);margin-top:8px"></small></label>
      <fieldset class="reg-fieldset"><legend>확신 정도 <small class="required">필수</small></legend><div class="reg-choices">${Object.entries(M.CONFIDENCE).map(([key, label]) => `<label><input type="radio" name="confidence" value="${key}" ${answerDraft.confidence[questionIndex] === key ? 'checked' : ''} ${editable ? '' : 'disabled'}><span>${label}</span></label>`).join('')}</div><small class="muted">검토 참고 정보이며 점수와 따로 기록돼요.</small></fieldset>
      <div class="row between wrap space-top"><button class="btn" type="button" data-action="save-answers" ${!editable || saving ? 'disabled' : ''}>임시 저장</button>${!last ? `<button class="btn primary" type="button" data-question="${questionIndex + 1}">다음 문항${showIcon('arrow')}</button>` : `<button class="btn primary" type="submit" ${!editable || saving ? 'disabled' : ''}>${editable ? '전체 답변 제출' : '답변 제출 완료'}</button>`}</div>
      <div class="saved-at space-top" role="status">${escapeHtml(savedAt)}</div></form></div></div></section>
    <aside class="stack" style="align-content:start"><section class="panel"><div class="panel-head"><h2>이해 확인 안내</h2>${showIcon('book')}</div><div class="panel-body"><p class="small">위험 <b>${M.LEVEL[level]}</b> (${M.getRiskTotal(v.risk.scores)}/10점) · ${rule.name}<br>과제 ${rule.kinds.length}개 · 과제당 0~2점 · 통과 ${rule.minScore}/${rule.maxScore}점 · 치명 오류 없음</p>
      <ol class="task-list">${challenges.map((x, i) => `<li><span class="journey-number" style="flex:none">${(answerDraft.answers[i] || '').trim().length >= M.MIN_ANSWER_LENGTH ? '✓' : i + 1}</span><div><h3>${M.CHALLENGE_KINDS[x.kind].label}</h3><p class="small muted">${M.CHALLENGE_KINDS[x.kind].type}</p></div></li>`).join('')}</ol></div></section>
      ${v.request.answersReset ? showNotice('근거가 바뀌어 답변을 다시 받아요', `v${v.request.copiedFrom}에서 근거자료·AI 사용 신고가 바뀌었어요. 문항마다 v${v.request.copiedFrom} 답변을 참고로 보여 주지만, 답변은 새로 제출해야 해요. 제출하면 검토자에게 재제출 알림이 가요.`, 'warning')
        : v.request.copiedFrom ? showNotice('이전 버전의 답변을 승계했어요', `v${v.request.copiedFrom}에서 제출한 답변이에요. 근거가 바뀌지 않아 그대로 이어졌고, 검토자가 이 버전에서 다시 평가해요.`, 'neutral') : ''}
      ${showNotice('최종 판단은 검토자가 해요', '답변을 제출하면 검토 대기로 바뀌고 검토자에게 알림이 가요. 자동 채점은 하지 않아요.', 'neutral')}
      ${canCancel ? '<button class="btn" data-action="cancel-request">검토 요청 취소</button>' : ''}</aside></div>`;
}

function setAnswersFromPage() {
  if (!answerDraft) return;
  if ($('#answer')) answerDraft.answers[questionIndex] = $('#answer').value;
  const c = document.querySelector('[name="confidence"]:checked');
  if (c) answerDraft.confidence[questionIndex] = c.value;
}

async function saveAnswers(submit = false) {
  setAnswersFromPage();
  const work = getCurrentWork(); if (!work || !answerDraft) return;
  if (M.getLatestVersion(work).id !== answerDraft.versionId) { showToast('대상 버전이 바뀌었어요. 최신 버전을 열어 주세요.'); return; }
  let next;
  try {
    if (submit) {
      const errors = M.getAnswerErrors(M.getLatestVersion(work), answerDraft.answers, answerDraft.confidence);
      if (errors.length) { questionIndex = errors[0].index; render(); $('#answer-error').textContent = errors[0].message; $('#answer').setAttribute('aria-invalid', 'true'); $('#answer').focus(); return; }
      if (!(await confirmDialog('답변을 제출할까요?', '제출하면 답변을 고칠 수 없고, 검토자에게 알림이 가요.', '제출', '취소'))) return;
      next = M.submitAnswers(state, work.id, answerDraft.answers, answerDraft.confidence);
    } else next = M.saveAnswers(state, work.id, answerDraft.answers, answerDraft.confidence);
  } catch (error) { showToast(error.message); return; }
  if (await persist(next)) { dirty = false; savedAt = '저장됨 · ' + getTimeText(new Date().toISOString()); if (submit) answerDraft = null; render(); showToast(submit ? '답변을 제출했어요. 검토자의 확인을 기다려 주세요.' : '답변을 임시 저장했어요.'); } else render();
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('save-answers', async (button, work, action) => { await saveAnswers(); });
addAction('cancel-request', async (button, work, action) => {
  const reason = await promptDialog('검토 요청을 취소할까요?', '검토가 시작되기 전까지만 취소할 수 있어요. 검토자에게 알림이 가고, 작업은 ‘제출 완료’로 돌아가요.', '취소 사유', '요청 취소');
  if (reason === null) return;
  const next = M.cancelRequest(state, work.id, reason);
  if (await persist(next)) { answerDraft = null; await go(getWorkRoute(work), true); showToast('검토 요청을 취소했어요.'); }
});
addHandler('click', event => !!event.target.closest('[data-question]'), event => { const questionButton = event.target.closest('[data-question]'); setAnswersFromPage(); questionIndex = Number(questionButton.dataset.question); render(); $('#question-' + questionIndex)?.focus(); return; });
addHandler('input', event => { return !!(event.target.closest('#answers')); }, event => { setAnswersFromPage(); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; const s = document.querySelector('.saved-at'); if (s) s.textContent = savedAt; });
addHandler('submit', event => { const form = event.target; return !!(form.id === 'answers'); }, async event => { const form = event.target; event.preventDefault(); await saveAnswers(true); return; });
