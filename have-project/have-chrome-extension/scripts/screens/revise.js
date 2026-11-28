/* HAVE 화면 — 수정본 재제출 (RevisionView) — UC05
   담당: A
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function showRevise(work) {
  const v = M.getLatestVersion(work);
  if (v.status !== 'REVISION_REQUIRED') return showNotice('재제출할 수정 요청이 없어요', '수정 요청을 받은 버전에서만 재제출할 수 있어요.', 'neutral');
  const items = M.getRevisionItems(v);
  if (!revisionDraft || revisionDraft.versionId !== v.id) revisionDraft = { versionId: v.id, file: null, changeNote: '', responses: {}, basis: M.getBasisDraft(v), basisErrors: {}, basisOpen: false };
  const d = revisionDraft, rs = M.getRevisionState(v.revisionRound), changed = M.isBasisChanged(v, d.basis);
  return `<form id="revise-form" class="stack" novalidate style="max-width:820px">
    ${showNotice(v.revisionRound.source === 'REJECTION' ? '최종 승인자의 반려 사유에 답해 주세요' : '검토자의 보완 요청에 답해 주세요', `보완 기한 ${escapeHtml(v.revisionRound.dueDate)}${rs === 'EXPIRED' ? ' · 기한이 지났어요' : ''} · 재제출한 파일은 v${v.n + 1}로 등록돼요. 근거자료와 AI 사용 신고를 그대로 두면 위험 분석과 이해 확인 답변이 이어지고, 바꾸면 이해 확인 답변을 새로 받아요. 검토자가 다시 평가해요.`, rs === 'EXPIRED' ? 'warning' : 'neutral')}
    <section class="panel"><div class="panel-head"><h2>피드백별 반영 여부</h2><span class="small muted">${items.length}건 · 모두 답해야 재제출할 수 있어요</span></div><div class="panel-body stack">
      ${items.map(item => { const r = d.responses[item.id] || {}; return `<fieldset class="reg-feedback-item" data-response-id="${escapeHtml(item.id)}"><legend>${escapeHtml(item.section)}</legend><p class="reg-feedback-text">${escapeHtml(item.content)}</p>
        <div class="reg-choices"><label><input type="radio" name="applied-${escapeHtml(item.id)}" value="yes" ${r.applied === true ? 'checked' : ''}><span>반영함</span></label><label><input type="radio" name="applied-${escapeHtml(item.id)}" value="no" ${r.applied === false ? 'checked' : ''}><span>반영 안 함</span></label></div>
        <label class="field"><span>답변 (반영 내용 또는 반영하지 않은 이유)</span><textarea name="response-${escapeHtml(item.id)}" rows="2" maxlength="1000">${escapeHtml(r.response || '')}</textarea></label></fieldset>`; }).join('')}
    </div></section>
    <section class="panel"><div class="panel-head"><h2>근거자료 · AI 사용 신고</h2><span class="small muted">선택 · 바꾸면 이해 확인을 다시 받아요</span></div><div class="panel-body stack">
      <div id="basis-state">${showBasisState(v, changed)}</div>
      <details id="basis-details" ${changed || d.basisOpen ? 'open' : ''}><summary>근거자료 · AI 사용 신고 고치기</summary><div class="stack space-top">
        ${REG.showAiStep(d.basis, d.basisErrors, getRegContext())}${REG.showEvidenceEditor(d.basis, d.basisErrors, getRegContext())}</div></details>
    </div></section>
    <section class="panel"><div class="panel-head"><h2>수정 파일</h2></div><div class="panel-body stack">
      <label class="field" for="revise-pdf"><span>수정한 PDF <small class="required">필수</small></span><input id="revise-pdf" type="file" accept=".pdf,application/pdf"></label>
      ${d.file ? `<div class="selected-file">${showIcon('check')}<div class="grow"><b>${escapeHtml(d.file.name)}</b>${getSizeText(d.file.size)} · SHA-256 ${escapeHtml(d.file.hash.slice(0, 16))}…</div></div>` : ''}
      <button type="button" class="btn text" data-action="sample-revise-pdf">시연용 수정 PDF 사용</button>
      ${showField('changeNote', '변경 요약', d.changeNote, { multiline: true, placeholder: '이번 수정에서 바꾼 내용을 요약해 주세요.' })}
    </div></section>
    <p class="review-error" role="alert" tabindex="-1" hidden></p>
    <div class="row wrap"><button type="submit" class="btn primary">재제출${showIcon('arrow')}</button>${showLink(getWorkRoute(work), '취소', 'btn')}</div></form>`;
}

/** 재제출 화면의 근거 변경 안내 (RevisionService.isBasisChanged, 11-23) */
function showBasisState(v, changed) {
  return changed
    ? showNotice('근거가 바뀌었어요', `재제출하면 v${v.n + 1}은 ‘이해 확인 대기’에서 시작해요. 이해 확인 답변을 다시 제출해야 검토자에게 알림이 가요. v${v.n} 답변은 참고로 보여 줘요.`, 'warning')
    : `<p class="small muted">직전 버전 v${v.n}과 같아요. 그대로 재제출하면 이해 확인 답변이 이어지고 검토자에게 바로 알림이 가요.</p>`;
}

function setRevisionFromPage() {
  if (!revisionDraft) return;
  const note = $('#changeNote'); if (note) revisionDraft.changeNote = note.value;
  document.querySelectorAll('[data-response-id]').forEach(fs => {
    const id = fs.dataset.responseId, applied = fs.querySelector(`[name="applied-${CSS.escape(id)}"]:checked`);
    revisionDraft.responses[id] = { applied: applied ? applied.value === 'yes' : undefined, response: fs.querySelector(`[name="response-${CSS.escape(id)}"]`).value };
  });
  const rf = $('#revise-form');
  if (rf && revisionDraft.basis) { REG.setFormFromPage(rf, revisionDraft.basis); revisionDraft.basisOpen = !!rf.querySelector('#basis-details')?.open; }
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('sample-revise-pdf', async (button, work, action) => { setRevisionFromPage(); revisionDraft.file = await M.prepareFile(`${work.title.replaceAll(' ', '_')}_v${M.getLatestVersion(work).n + 1}.pdf`, M.createSamplePdf(work.title, 'revised ' + Date.now())); dirty = true; render(); });
addHandler('input', event => { return !!(event.target.closest('#revise-form')); }, event => {
  setRevisionFromPage(); dirty = true;
  const box = $('#basis-state'), v = revisionDraft && M.getLatestVersion(getCurrentWork());
  if (box && v) box.innerHTML = showBasisState(v, M.isBasisChanged(v, revisionDraft.basis));
});
addHandler('change', event => { const t = event.target; return !!(t.id === 'revise-pdf' && t.files[0]); }, async event => { const t = event.target; setRevisionFromPage(); try { revisionDraft.file = await readPdf(t.files[0]); dirty = true; } catch (e) { showToast(e.message); } render(); });
addHandler('change', event => { const t = event.target; return !!(t.closest('#revise-form') && t.closest('#basis-details') && (t.name === 'reg-ai-used' || t.dataset.field === 'type')); }, async event => { const t = event.target; setRevisionFromPage(); render(); });
addHandler('submit', event => { const form = event.target; return !!(form.id === 'revise-form'); }, async event => {
  const form = event.target;
  event.preventDefault(); setRevisionFromPage();
  const work = getCurrentWork();
  try {
    const base = M.getLatestVersion(work), be = M.getBasisErrors(revisionDraft.basis);
    revisionDraft.basisErrors = be;
    if (Object.keys(be).length) { revisionDraft.basisOpen = true; render(); V.showError($('#revise-form'), Object.values(be)[0]); return; }
    const changed = M.isBasisChanged(base, revisionDraft.basis);
    if (!(await confirmDialog('수정본을 재제출할까요?', changed
      ? `새 버전 v${base.n + 1}로 등록돼요. 근거자료·AI 사용 신고가 바뀌어 이해 확인 답변을 다시 제출해야 하고, 검토자 알림은 답변 제출 뒤에 가요.`
      : `새 버전 v${base.n + 1}로 등록되고 검토자에게 알림이 가요.`, '재제출', '취소'))) return;
    const next = M.resubmit(state, work.id, revisionDraft);
    if (await persist(next)) {
      dirty = false; revisionDraft = null;
      if (changed) { answerDraft = null; questionIndex = 0; await go(getWorkRoute(work, 'challenge'), true); showToast('수정본을 재제출했어요. 근거가 바뀌어 이해 확인 답변을 다시 받아요.'); }
      else { await go(getWorkRoute(work), true); showToast('수정본을 재제출했어요. 다시 검토를 기다려 주세요.'); }
    }
  } catch (error) { V.showError(form, error.message); }
  return;
});
