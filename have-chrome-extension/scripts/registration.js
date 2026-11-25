/* HAVE 등록 마법사 화면 (1123) — UC01 AI 사용 신고, UC02 결과물·근거자료, UC03 위험 분석·검토 요청.
   단계: 1 결과물 파일 → 2 AI 사용 신고 → 3 기여 기록·근거자료 → 4 위험 분석 → 5 검토 요청 (1118 프로토타입과 같은 순서) */
(function (root) {
  'use strict';
  const M = root.HaveModel;
  const core = root.HaveCore;
  const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot'];
  const STEPS = ['결과물 파일', 'AI 사용 신고', '기여 기록 · 근거자료', '위험 분석', '검토 요청'];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const showFieldError = (id, e) => e[id] ? `<small class="reg-error" id="${id}-error" role="alert">${escapeHtml(e[id])}</small>` : '';
  const getInvalidAttr = (id, e) => e[id] ? `aria-invalid="true" aria-describedby="${id}-error"` : '';
  const showOptions = (entries, selected) => entries.map(([v, t]) => `<option value="${escapeHtml(v)}" ${String(selected ?? '') === String(v) ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');

  function getEmptyForm(work = null) {
    const last = work ? M.getLatestVersion(work) : null;
    return {
      isVersion: !!work, workId: work?.id || null, title: work?.title || '', file: null, changeReason: '',
      aiUsed: last ? last.disclosure.aiUsed : true, tool: last?.disclosure.tool || '', useTypes: [...(last?.disclosure.useTypes || [])], scope: last?.disclosure.scope || '',
      contributions: last ? last.contributions.map(c => ({ stage: c.stage, actorType: c.actorType, note: c.note })) : [{ stage: 'DRAFT', actorType: 'HUMAN', note: '' }],
      evidence: last ? last.evidence.map(e => ({ ...e })) : [], riskScores: [null, null, null, null], rationale: '',
      reviewer: last?.request?.reviewer || '', approver: last?.request?.approver || '', message: '', dueDate: core.getDateAfter(3)
    };
  }

  function showFileStep(form, e, ctx) {
    const { showIcon, getSizeText, showField } = ctx;
    return showField('title', '작업명', form.title, { readonly: form.isVersion, placeholder: '예: HAVE 서비스 요구사항 정의서', errors: e }) +
      `<div class="field"><label for="pdf">검토할 파일 <small class="required">필수</small></label>
      <label for="pdf" class="upload-drop" style="display:block;border:1px dashed var(--color-muted);border-radius:8px;padding:28px 20px;text-align:center;cursor:pointer">
        <span style="color:var(--color-primary)">${showIcon('upload')}</span><b style="display:block;font-size:14px;margin:8px 0">PDF를 끌어 놓거나 파일을 선택하세요</b><small class="muted">PDF · 최대 20 MB · SHA-256으로 버전을 식별해요</small>
        <input id="pdf" type="file" accept=".pdf,application/pdf" style="display:block;margin:16px auto 0;max-width:100%;font-size:12px" ${getInvalidAttr('file', e)}></label>
      ${form.file ? `<div class="selected-file">${showIcon('check')}<div class="grow"><b>${escapeHtml(form.file.name)}</b>${getSizeText(form.file.size)} · SHA-256 ${escapeHtml(form.file.hash.slice(0, 16))}…</div></div>` : ''}
      <div id="file-status" class="upload-feedback" role="status" aria-live="polite">${ctx.fileChecking ? '파일을 확인하는 중…' : ''}</div>${showFieldError('file', e)}
      <button type="button" class="btn text" data-action="sample-pdf">시연용 PDF 사용</button></div>` +
      (form.isVersion ? showField('changeReason', '변경 사유', form.changeReason, { multiline: true, placeholder: '이전 승인 버전에서 무엇을 바꿨는지 적어 주세요.', errors: e }) : '');
  }

  function showAiStep(form, e, ctx) {
    const { showField } = ctx;
    return `<section class="reg-ai" aria-label="AI 사용 여부">
      <fieldset class="reg-fieldset"><legend>AI를 사용했나요?</legend><div class="reg-choices">
        <label><input type="radio" name="reg-ai-used" value="yes" ${form.aiUsed !== false ? 'checked' : ''}><span>사용했어요</span></label>
        <label><input type="radio" name="reg-ai-used" value="no" ${form.aiUsed === false ? 'checked' : ''}><span>사용하지 않았어요</span></label></div></fieldset>
      ${form.aiUsed === false ? '<p class="reg-hint">AI 미사용으로 신고합니다. 기여 기록의 수행 주체는 모두 ‘사람’이어야 해요.</p>' : `
      <div class="reg-control"><span>자주 쓰는 AI 도구 <small class="reg-optional">선택</small></span><div class="reg-choices reg-presets">${TOOLS.map(t => `<button class="reg-preset" type="button" data-action="pick-tool" data-tool="${t}">${t}</button>`).join('')}</div></div>
      ${showField('tool', 'AI 도구 · 모델', form.tool, { placeholder: '예: ChatGPT · GPT-4o', errors: e })}
      <fieldset class="reg-fieldset"><legend>사용 방식 <span class="reg-optional">선택</span></legend><div class="reg-choices">${M.USE_TYPES.map(t => `<label><input type="checkbox" name="reg-use-type" value="${t}" ${form.useTypes.includes(t) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
      ${showField('scope', 'AI 사용 범위', form.scope, { multiline: true, max: 5000, placeholder: 'AI가 도운 작업과 적용한 범위를 구체적으로 적어 주세요.', errors: e })}`}
    </section>`;
  }

  function showContributionStep(form, e, ctx) {
    const { showIcon } = ctx;
    const actorChoices = Object.entries(M.ACTOR_TYPES).filter(([k]) => form.aiUsed !== false || k === 'HUMAN');
    return `<section class="reg-extra" aria-label="기여 기록"><h3>기여 기록 <small class="required">한 건 이상</small></h3>
      <p class="reg-hint">단계마다 누가 무엇을 했는지 남겨요. AI가 한 일과 사람이 한 일을 나눠 적으면 검토자가 확인할 부분을 쉽게 찾아요.</p>
      ${showFieldError('contributions', e)}
      <div class="list-editor">${form.contributions.map((row, i) => `<div class="list-row" data-contribution-row="${i}">
        <label class="reg-control"><span>단계</span><select data-field="stage">${showOptions(Object.entries(M.STAGES), row.stage)}</select></label>
        <label class="reg-control"><span>수행 주체</span><select data-field="actorType">${showOptions(actorChoices, row.actorType)}</select></label>
        <label class="reg-control grow"><span>한 일</span><textarea data-field="note" rows="2" maxlength="2000" placeholder="예: 출처 세 곳을 확인하고 표 2의 수치를 고쳤어요." ${getInvalidAttr('contribution-' + i, e)}>${escapeHtml(row.note)}</textarea></label>
        <button type="button" class="btn text" data-action="remove-contribution" data-index="${i}" ${form.contributions.length < 2 ? 'disabled' : ''} aria-label="기여 기록 ${i + 1} 삭제">삭제</button>
        ${showFieldError('contribution-' + i, e)}</div>`).join('')}</div>
      <button type="button" class="btn" data-action="add-contribution">${showIcon('plus')}기여 기록 추가</button></section>
      ${showEvidenceEditor(form, e, ctx)}`;
  }

  /** 근거자료 목록 편집기 — 등록 마법사 3단계와 수정본 재제출 화면(11-23)이 함께 쓴다. */
  function showEvidenceEditor(form, e, ctx) {
    const { showIcon } = ctx;
    return `<section class="reg-extra" aria-label="근거자료"><h3>근거자료 <small class="reg-optional">선택</small></h3>
      <p class="reg-hint">검토자가 확인할 수 있는 출처·기록을 붙여요. 파일은 이 브라우저에 해시만 저장해요.</p>
      <div class="list-editor">${form.evidence.map((row, i) => `<div class="list-row" data-evidence-row="${i}">
        <label class="reg-control"><span>유형</span><select data-field="type">${showOptions(Object.entries(M.EVIDENCE_TYPES), row.type)}</select></label>
        <label class="reg-control grow"><span>제목</span><input type="text" data-field="title" maxlength="200" value="${escapeHtml(row.title)}" ${getInvalidAttr('evidence-' + i, e)}></label>
        ${row.type === 'SUPPORT_FILE'
          ? `<label class="reg-control"><span>파일</span><input type="file" data-evidence-file="${i}">${row.fileHash ? `<small class="reg-hint">${escapeHtml(row.fileName)} · ${escapeHtml(row.fileHash.slice(0, 12))}…</small>` : ''}</label>`
          : `<label class="reg-control grow"><span>${row.type === 'WEB_SOURCE' ? '주소 (http/https)' : '위치 · 설명'}</span><input type="text" data-field="uri" maxlength="2000" value="${escapeHtml(row.uri)}"></label>`}
        <button type="button" class="btn text" data-action="remove-evidence" data-index="${i}" aria-label="근거자료 ${i + 1} 삭제">삭제</button>
        ${showFieldError('evidence-' + i, e)}</div>`).join('')}</div>
      <button type="button" class="btn" data-action="add-evidence">${showIcon('plus')}근거자료 추가</button></section>`;
  }

  function showRiskResult(form) {
    const scores = form.riskScores.map((s, i) => (i === 0 && form.aiUsed === false) ? 0 : s);
    const level = M.getRiskLevel(scores);
    if (!level) return `<p class="reg-risk-result" data-risk-result role="status">${scores.filter(Number.isInteger).length}/4개 선택 · 네 지표를 모두 고르면 등급과 이해 과제가 정해져요.</p>`;
    const rule = M.getGateRule(level);
    return `<div class="reg-risk-result" data-risk-result role="status"><b>${M.getRiskTotal(scores)}/10점 · 위험 ${M.LEVEL[level]}</b> (${rule.name})
      <br>이해 과제 ${rule.kinds.length}개: ${rule.kinds.map(k => M.CHALLENGE_KINDS[k].label).join(' · ')} · 통과 기준 ${rule.minScore}/${rule.maxScore}점, 치명 오류 없음</div>`;
  }

  function showRiskStep(form, e, ctx) {
    return `<section class="reg-extra" aria-label="위험 분석"><p class="reg-hint">4개 지표의 합(0~10)으로 위험 등급을 정하고, 등급에 따라 이해 과제 수와 통과 기준이 달라져요. 낮음 0~3 · 보통 4~6 · 높음 7~10 (정책 ${M.GATE_POLICY.version}).</p>
      <div class="reg-two-columns">${M.RISK_FACTORS.map((f, i) => {
        const locked = i === 0 && form.aiUsed === false;
        return `<label class="reg-control" for="risk-${i}"><span>${f.label} (0~${f.options.length - 1})</span><select id="risk-${i}" data-risk="${i}" ${locked ? 'disabled' : ''} ${getInvalidAttr('risk', e)}>
          ${showOptions([['', '선택'], ...f.options.map((t, n) => [n, `${n}점 · ${t}`])], locked ? 0 : form.riskScores[i])}</select></label>`;
      }).join('')}</div>${showFieldError('risk', e)}
      ${showRiskResult(form)}
      ${ctx.showField('rationale', '점수를 매긴 근거', form.rationale, { multiline: true, placeholder: '예: 3장 초안을 AI가 썼고, 팀 제출 문서라 중요도가 높아요.', errors: e })}</section>`;
  }

  function showRequestStep(form, e, ctx) {
    const person = (name, role, list, key) => list.map((n, i) => `<label class="reviewer-choice"><input type="radio" name="${key}" value="${n}" ${form[key] === n ? 'checked' : ''} ${i === 0 ? `id="${key}"` : ''} ${getInvalidAttr(key, e)}><span class="avatar">${n[0]}</span><span><b>${n}</b><small>${role}</small></span></label>`).join('');
    return `<fieldset style="border:0;margin:0;padding:0"><legend style="font-size:14px;font-weight:550;margin-bottom:12px">검토자 <small class="required">필수</small></legend>${person('', '프로젝트 팀원 · 시연 검토자', M.USERS.reviewers, 'reviewer')}${showFieldError('reviewer', e)}</fieldset>
      <fieldset style="border:0;margin:16px 0 0;padding:0"><legend style="font-size:14px;font-weight:550;margin-bottom:12px">최종 승인자 <small class="required">필수</small></legend>${person('', '시연 최종 승인자', M.USERS.approvers, 'approver')}${showFieldError('approver', e)}</fieldset>
      ${ctx.showField('message', '검토자에게 보낼 메시지', form.message, { multiline: true, max: 1000, required: false, placeholder: '먼저 봐 줬으면 하는 부분을 적어 주세요.', errors: e })}
      <label class="field" for="dueDate"><span>검토 기한 <small class="required">필수</small></span><input id="dueDate" type="date" value="${escapeHtml(form.dueDate)}" ${getInvalidAttr('dueDate', e)}>${showFieldError('dueDate', e)}</label>`;
  }

  function showSummary(form) {
    const level = M.getRiskLevel(form.riskScores.map((s, i) => (i === 0 && form.aiUsed === false) ? 0 : s));
    return `<div class="registration-summary"><h3>제출 전 확인</h3><dl class="definition">
      ${form.title ? `<dt>작업명</dt><dd>${escapeHtml(form.title)}</dd>` : ''}${form.file ? `<dt>대상 파일</dt><dd>${escapeHtml(form.file.name)}</dd>` : ''}
      <dt>AI 사용</dt><dd>${form.aiUsed === false ? '사용 안 함' : escapeHtml(form.tool)}</dd>
      <dt>기여 기록</dt><dd>${form.contributions.length}건</dd><dt>근거자료</dt><dd>${form.evidence.length}건</dd>
      <dt>위험 등급</dt><dd>${level ? `${M.LEVEL[level]} · 과제 ${M.getGateRule(level).kinds.length}개` : '미입력'}</dd></dl></div>`;
  }

  function showStep(step, form, errors, ctx) {
    if (step === 0) return showFileStep(form, errors, ctx);
    if (step === 1) return showAiStep(form, errors, ctx);
    if (step === 2) return showContributionStep(form, errors, ctx);
    if (step === 3) return showRiskStep(form, errors, ctx);
    if (step === 4) return showRequestStep(form, errors, ctx) + showSummary(form) +
      ctx.showNotice('제출하면 이해 확인이 시작돼요', '현재 버전의 파일과 신고 내용이 고정되고, 검토자에게 알림이 가요. 검토가 시작되기 전에는 요청을 취소할 수 있어요.');
    return '';
  }

  /** 화면의 입력값을 form에 옮긴다. */
  function setFormFromPage(page, form) {
    for (const name of ['title', 'tool', 'scope', 'changeReason', 'rationale', 'message', 'dueDate']) {
      const node = page.querySelector('#' + name);
      if (node && !node.readOnly) form[name] = node.value;
    }
    const mode = page.querySelector('[name="reg-ai-used"]:checked');
    if (mode) form.aiUsed = mode.value === 'yes';
    if (page.querySelector('[name="reg-use-type"]')) form.useTypes = [...page.querySelectorAll('[name="reg-use-type"]:checked')].map(i => i.value);
    page.querySelectorAll('[data-contribution-row]').forEach(row => {
      const i = Number(row.dataset.contributionRow);
      for (const f of ['stage', 'actorType', 'note']) { const n = row.querySelector(`[data-field="${f}"]`); if (n) form.contributions[i][f] = n.value; }
    });
    page.querySelectorAll('[data-evidence-row]').forEach(row => {
      const i = Number(row.dataset.evidenceRow);
      for (const f of ['type', 'title', 'uri']) { const n = row.querySelector(`[data-field="${f}"]`); if (n) form.evidence[i][f] = n.value; }
    });
    page.querySelectorAll('[data-risk]').forEach(select => { form.riskScores[Number(select.dataset.risk)] = select.value === '' ? null : Number(select.value); });
    for (const key of ['reviewer', 'approver']) { const n = page.querySelector(`[name="${key}"]:checked`); if (n) form[key] = n.value; }
    if (form.aiUsed === false) form.contributions.forEach(c => { c.actorType = 'HUMAN'; });
  }

  root.HaveRegistration = { STEPS, getEmptyForm, showStep, showAiStep, showEvidenceEditor, showRiskStep, showRequestStep, showRiskResult, setFormFromPage };
})(globalThis);
