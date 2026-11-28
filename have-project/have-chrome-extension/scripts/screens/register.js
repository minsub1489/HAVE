/* HAVE 화면 — 등록 마법사 · 검토 다시 요청 (RegisterWizardView) — UC01 · UC02 · UC03. 양식 그리기는 registration.js(HaveRegistration)
   담당: A
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

const getRegContext = () => ({ showIcon, getSizeText, showField, showNotice, fileChecking });

function showEditor() {
  if (!editor) editor = state.draft ? structuredClone(state.draft) : REG.getEmptyForm();
  const steps = REG.STEPS;
  const errors = Object.keys(editorErrors).length ? `<div class="notice error" role="alert" style="margin-bottom:24px">${showIcon('info')}<div><strong>입력 내용을 확인해 주세요</strong>${Object.values(editorErrors).map(e => `<div>${escapeHtml(e)}</div>`).join('')}</div></div>` : '';
  return showHeading(editor.isVersion ? '새 버전 등록' : '작업 등록', '파일과 AI 사용 내역, 기여, 위험 분석을 정리하고 검토를 요청하세요.') +
    `<div style="max-width:760px;margin:auto"><nav class="form-progress journey" aria-label="등록 단계">${steps.map((text, i) => `<div class="journey-item ${i < editorStep ? 'done' : i === editorStep ? 'current' : ''}" ${i === editorStep ? 'aria-current="step"' : ''}><span class="journey-number">${i < editorStep ? '✓' : i + 1}</span>${text}</div>`).join('')}</nav>
    <form id="registration" novalidate><section class="panel"><div class="panel-head"><h2>${String(editorStep + 1).padStart(2, '0')} · ${steps[editorStep]}</h2><span class="small muted">${editorStep + 1} / ${steps.length}</span></div><div class="panel-body">${errors}${REG.showStep(editorStep, editor, editorErrors, getRegContext())}</div></section>
    <div class="space-top"><div class="saved-at" role="status">${escapeHtml(savedAt)}</div><div class="wizard-actions"><button type="button" class="btn" data-action="save-draft" ${saving || fileChecking || editor.isVersion ? 'disabled' : ''}>${saving ? '저장 중…' : '임시 저장'}</button><div><button type="button" class="btn" data-action="${editorStep ? 'previous-step' : 'cancel-editor'}">${editorStep ? '이전 단계' : '취소'}</button><button type="submit" class="btn primary" ${saving || fileChecking ? 'disabled' : ''}>${saving ? '제출 중…' : editorStep === steps.length - 1 ? '검토 요청' : '다음 단계'}${showIcon('arrow')}</button></div></div></div></form></div>`;
}

function showRequestAgain(work) {
  const v = M.getLatestVersion(work);
  if (v.status !== 'SUBMITTED') return showNotice('검토를 다시 요청할 수 있는 상태가 아니에요', '검토 요청을 취소한 작업에서만 쓸 수 있어요.', 'neutral');
  if (!requestDraft || requestDraft.workId !== work.id) requestDraft = { ...REG.getEmptyForm(work), workId: work.id, riskScores: [...v.risk.scores], rationale: v.risk.rationale, reviewer: v.canceledRequests.at(-1)?.reviewer || '', approver: v.canceledRequests.at(-1)?.approver || '' };
  return `<form id="request-form" class="stack" novalidate style="max-width:760px">
    <section class="panel"><div class="panel-head"><h2>위험 분석</h2></div><div class="panel-body">${REG.showRiskStep(requestDraft, editorErrors, getRegContext())}</div></section>
    <section class="panel"><div class="panel-head"><h2>검토 요청</h2></div><div class="panel-body">${REG.showRequestStep(requestDraft, editorErrors, getRegContext())}</div></section>
    <div class="row wrap"><button type="submit" class="btn primary">검토 요청${showIcon('arrow')}</button>${showLink(getWorkRoute(work), '취소', 'btn')}</div></form>`;
}

function setEditorFromPage() { if (editor) REG.setFormFromPage(document, editor); }

/** 근거자료 편집기를 쓰는 화면의 입력값 — 등록 마법사(editor) 또는 수정본 재제출(revisionDraft.basis, 11-23) */
function getEvidenceForm(el) {
  if (el.closest('#revise-form')) { setRevisionFromPage(); revisionDraft.basisOpen = true; return revisionDraft.basis; }
  setEditorFromPage(); return editor;
}

async function saveDraft() {
  setEditorFromPage();
  const next = structuredClone(state); next.draft = { ...structuredClone(editor), savedAt: new Date().toISOString() };
  if (await persist(next)) { dirty = false; savedAt = '임시 저장됨 · ' + getTimeText(new Date().toISOString()); render(); showToast('작성 중인 작업을 저장했어요.'); } else render();
}

async function chooseFile(file) {
  if (!file || !editor || fileChecking) return;
  setEditorFromPage(); fileChecking = true; delete editorErrors.file; render();
  try { editor.file = await readPdf(file); dirty = true; announce('파일 확인 완료'); }
  catch (error) { editorErrors.file = error.message; }
  finally { fileChecking = false; render(); }
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('save-draft', async (button, work, action) => { await saveDraft(); });
addAction('previous-step', async (button, work, action) => { setEditorFromPage(); editorStep = Math.max(0, editorStep - 1); editorErrors = {}; render(); $('#main h1')?.focus(); });
addAction('cancel-editor', async (button, work, action) => { await go('#works'); });
addAction('sample-pdf', async (button, work, action) => { setEditorFromPage(); editor.file = await M.prepareFile(`HAVE_sample_${Date.now() % 100000}.pdf`, M.createSamplePdf(editor.title || 'HAVE sample', String(Date.now()))); dirty = true; delete editorErrors.file; render(); });
addAction('pick-tool', async (button, work, action) => { const input = $('#tool'); if (input) { input.value = button.dataset.tool; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); } });
addAction('add-contribution', async (button, work, action) => { setEditorFromPage(); editor.contributions.push({ stage: 'DRAFT', actorType: editor.aiUsed === false ? 'HUMAN' : 'AI', note: '' }); dirty = true; render(); });
addAction('remove-contribution', async (button, work, action) => { setEditorFromPage(); editor.contributions.splice(Number(button.dataset.index), 1); dirty = true; render(); });
addAction('add-evidence', async (button, work, action) => { getEvidenceForm(button).evidence.push({ type: 'WEB_SOURCE', title: '', uri: '', fileName: '', fileHash: '' }); dirty = true; render(); });
addAction('remove-evidence', async (button, work, action) => { getEvidenceForm(button).evidence.splice(Number(button.dataset.index), 1); dirty = true; render(); });
addHandler('input', event => { return !!(event.target.closest('#registration') || event.target.closest('#request-form')); }, event => {
  const form = event.target.closest('#registration') ? editor : requestDraft;
  if (form) { REG.setFormFromPage(document, form); const box = document.querySelector('[data-risk-result]'); if (box && event.target.matches('[data-risk]')) box.outerHTML = REG.showRiskResult(form); }
  dirty = true; savedAt = '저장하지 않은 변경이 있어요'; const s = document.querySelector('.saved-at'); if (s) s.textContent = savedAt;
});
addHandler('change', event => { const t = event.target; return !!(t.id === 'pdf'); }, async event => { const t = event.target; await chooseFile(t.files[0]); });
addHandler('change', event => { const t = event.target; return !!(t.dataset.evidenceFile !== undefined && t.files[0]); }, async event => {
  const t = event.target;
  const target = getEvidenceForm(t);
  const f = t.files[0];
  if (f.size > core.MAX_PDF_BYTES) { showToast('20 MB 이하의 파일을 선택해 주세요.'); return; }
  Object.assign(target.evidence[Number(t.dataset.evidenceFile)], { fileName: f.name, fileHash: await core.getSha256(new Uint8Array(await f.arrayBuffer())), uri: '' });
  dirty = true; render();
});
addHandler('change', event => { const t = event.target; return !!((t.closest('#registration') || t.closest('#request-form')) && (t.name === 'reg-ai-used' || t.dataset.field === 'type')); }, async event => { const t = event.target; const form = t.closest('#registration') ? editor : requestDraft; REG.setFormFromPage(document, form); render(); });
addHandler('drop', event => { return !!(event.target.closest('.upload-drop')); }, async event => { event.preventDefault(); await chooseFile(event.dataTransfer.files[0]); });
addHandler('submit', event => { const form = event.target; return !!(form.id === 'request-form'); }, async event => {
  const form = event.target;
  event.preventDefault(); REG.setFormFromPage(document, requestDraft);
  const work = getCurrentWork();
  editorErrors = { ...M.getRegistrationErrors({ ...requestDraft, aiUsed: M.getLatestVersion(work).disclosure.aiUsed }, 3), ...M.getRegistrationErrors(requestDraft, 4) };
  if (Object.keys(editorErrors).length) { render(); return; }
  const next = M.requestReviewAgain(state, work.id, requestDraft);
  if (await persist(next)) { dirty = false; await go(getWorkRoute(work, 'challenge'), true); showToast('검토를 다시 요청했어요. 이해 확인을 진행해 주세요.'); }
  return;
});
addHandler('submit', event => { const form = event.target; return !!(form.id === 'registration'); }, async event => {
  const form = event.target;
  event.preventDefault(); if (saving || fileChecking) return;
  setEditorFromPage(); editorErrors = M.getRegistrationErrors(editor, editorStep);
  if (Object.keys(editorErrors).length) { render(); document.querySelector('[aria-invalid="true"]')?.focus(); return; }
  if (editorStep < REG.STEPS.length - 1) { editorStep++; render(); $('#main h1')?.focus(); return; }
  editorErrors = M.getRegistrationErrors(editor);
  if (Object.keys(editorErrors).length) { editorStep = [0, 1, 2, 3, 4].find(s => Object.keys(M.getRegistrationErrors(editor, s)).length) ?? 0; render(); return; }
  try {
    const out = M.registerWork(state, editor);
    if (!editor.isVersion) out.state.draft = null;
    if (await persist(out.state)) { dirty = false; const work = M.getWork(state, out.workId); await go(getWorkRoute(work, 'challenge'), true); showToast('검토를 요청했어요. 이해 확인을 진행해 주세요.'); } else render();
  } catch (error) { editorErrors = { submit: error.message }; render(); }
});
