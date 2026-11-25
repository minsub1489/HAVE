(function (root, factory) {
  const registration = factory();
  if (typeof module === 'object' && module.exports) module.exports = registration;
  else root.HaveRegistration = registration;
})(globalThis, function () {
  'use strict';

  const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot'];
  const USE_TYPES = ['초안 작성', '자료 조사·요약', '코드 작성', '교정·번역'];
  const STAGES = ['기획', '초안', '수정', '검증'];
  const RESPONSE_STATUS = ['반영함', '일부 반영', '보류'];
  const RISK = [
    { label: 'AI 사용 비중', options: ['없음', '일부', '절반 정도', '대부분'] },
    { label: '오류 시 영향', options: ['낮음', '보통', '높음', '매우 높음'] },
    { label: '검증 근거 부족', options: ['충분함', '일부 부족함', '부족함'] },
    { label: '유사 작업의 오류·수정 요청', options: ['없음', '1회', '2회 이상'] }
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function usedAI(item) {
    if (typeof item.aiUsed === 'boolean') return item.aiUsed;
    return !['사용 안 함', '미사용'].includes(item.tool?.trim());
  }

  function describeRisk(scores) {
    if (!Array.isArray(scores) || scores.length !== RISK.length) return null;
    if (RISK.some((item, index) => !Number.isInteger(scores[index]) || scores[index] < 0 || scores[index] >= item.options.length)) return null;
    const total = scores.reduce((sum, score) => sum + score, 0);
    if (total >= 7) return { total, level: 'high', label: '높음' };
    if (total >= 4) return { total, level: 'medium', label: '보통' };
    return { total, level: 'low', label: '낮음' };
  }

  function riskScores(editor) {
    if (!Array.isArray(editor.riskScores)) return [];
    return RISK.map((item, index) => {
      const score = editor.riskScores[index];
      if (index === 0 && !usedAI(editor)) return 0;
      return Number.isInteger(score) && score >= 0 && score < item.options.length ? score : null;
    });
  }

  function feedbackItems(editor, work) {
    if (!editor.isVersion || !work?.versions?.length) return [];
    const version = work.versions.at(-1);
    const items = version.feedbackItems ?? version.review?.feedbacks ?? version.review?.feedback ?? version.feedback;
    return (Array.isArray(items) ? items : [items]).flatMap((item, index) => {
      const feedback = typeof item === 'string' ? item : item?.content ?? item?.text ?? item?.feedback;
      if (typeof feedback !== 'string' || !feedback.trim()) return [];
      return [{ id: index + 1, version: version.n, section: typeof item?.section === 'string' ? item.section : `피드백 ${index + 1}`, feedback }];
    });
  }

  function metadata(editor) {
    const scores = riskScores(editor);
    const risk = describeRisk(scores);
    const responseNotes = Array.isArray(editor.responseNotes) ? editor.responseNotes.filter(item => RESPONSE_STATUS.includes(item?.status) && typeof item.note === 'string' && item.note.trim()).map(item => ({
      id: item.id,
      version: item.version,
      section: item.section,
      feedback: item.feedback,
      status: item.status,
      note: item.note.trim()
    })) : [];
    return {
      aiUsed: usedAI(editor),
      aiUseTypes: usedAI(editor) && Array.isArray(editor.aiUseTypes) ? USE_TYPES.filter(type => editor.aiUseTypes.includes(type)) : [],
      contributionStage: STAGES.includes(editor.contributionStage) ? editor.contributionStage : '',
      evidenceSource: typeof editor.evidenceSource === 'string' ? editor.evidenceSource.trim() : '',
      verificationNote: typeof editor.verificationNote === 'string' ? editor.verificationNote.trim() : '',
      riskScores: scores,
      riskLevel: risk?.level ?? '',
      responseNotes
    };
  }

  function validate(editor, step = -1) {
    const errors = {};
    if (step === -1 || step === 0) {
      for (const item of Array.isArray(editor.responseNotes) ? editor.responseNotes : []) {
        if (!item) continue;
        if ((item.note?.trim() || item.status) && (!RESPONSE_STATUS.includes(item.status) || !item.note?.trim())) {
          errors[`reg-response-${item.id}`] = `${item.section}의 반영 여부와 답변을 함께 입력해 주세요.`;
        } else if (item.note?.length > 1000) {
          errors[`reg-response-${item.id}`] = '피드백 답변은 1,000자 이내로 입력해 주세요.';
        }
      }
    }
    if (step === -1 || step === 2) {
      const source = editor.evidenceSource?.trim();
      const scheme = source?.match(/^([a-z][a-z\d+.-]*):(?=\S)/i)?.[1].toLowerCase();
      if (source?.length > 500) errors['reg-evidence-source'] = '근거 위치는 500자 이내로 입력해 주세요.';
      else if (scheme && !['http', 'https'].includes(scheme)) errors['reg-evidence-source'] = '웹 주소는 http 또는 https로 입력해 주세요. 파일 위치나 문헌명도 적을 수 있어요.';
      if (editor.verificationNote?.length > 1000) errors['reg-verification-note'] = '검증 메모는 1,000자 이내로 입력해 주세요.';
    }
    return errors;
  }

  function attrError(id, errors) {
    return errors[id] ? `aria-invalid="true" aria-describedby="${id}-error"` : '';
  }

  function fieldError(id, errors) {
    return errors[id] ? `<small class="reg-error" id="${id}-error">${esc(errors[id])}</small>` : '';
  }

  function options(entries, selected) {
    return entries.map(([value, label]) => `<option value="${esc(value)}"${String(selected ?? '') === String(value) ? ' selected' : ''}>${esc(label)}</option>`).join('');
  }

  function feedbackFields(editor, work, errors) {
    const items = feedbackItems(editor, work);
    if (!items.length) return '';
    const active = items.some(item => editor.responseNotes?.some(note => note.id === item.id && (note.status || note.note)) || errors[`reg-response-${item.id}`]);
    return `<details class="reg-disclosure reg-feedback"${active ? ' open' : ''}>
      <summary>v${esc(items[0].version)} 피드백 ${items.length}건에 답변 <span class="reg-optional">선택</span></summary>
      <div class="reg-disclosure-body">
        <p class="reg-hint">피드백에 어떻게 답했는지 새 버전에 남길 수 있어요.</p>
        ${items.map(item => {
          const saved = editor.responseNotes?.find(note => note.id === item.id && note.version === item.version);
          const id = `reg-response-${item.id}`;
          return `<fieldset class="reg-feedback-item" data-reg-feedback data-feedback-id="${item.id}" data-feedback-version="${esc(item.version)}">
            <legend>${esc(item.section)}</legend>
            <p class="reg-feedback-text">${esc(item.feedback)}</p>
            <div class="reg-two-columns">
              <label class="reg-control" for="${id}-status"><span>반영 여부</span><select id="${id}-status" data-reg-response-status>${options([['', '선택 안 함'], ...RESPONSE_STATUS.map(value => [value, value])], saved?.status)}</select></label>
              <label class="reg-control" for="${id}"><span>반영 내용 또는 보류 이유</span><textarea id="${id}" data-reg-response-note rows="2" maxlength="1000" ${attrError(id, errors)}>${esc(saved?.note)}</textarea>${fieldError(id, errors)}</label>
            </div>
          </fieldset>`;
        }).join('')}
      </div>
    </details>`;
  }

  function aiFields(editor) {
    const aiUsed = usedAI(editor);
    return `<section class="reg-ai" aria-label="AI 사용 여부 및 용도">
      <fieldset class="reg-fieldset">
        <legend>AI를 사용했나요?</legend>
        <div class="reg-choices">
          <label><input type="radio" name="reg-ai-used" value="yes" ${aiUsed ? 'checked' : ''}><span>사용했어요</span></label>
          <label><input type="radio" name="reg-ai-used" value="no" ${!aiUsed ? 'checked' : ''}><span>사용하지 않았어요</span></label>
        </div>
      </fieldset>
      <div data-reg-ai-options ${!aiUsed ? 'hidden' : ''}>
        <div class="reg-control"><span>자주 쓰는 AI 도구 <small class="reg-optional">선택</small></span><div class="reg-choices reg-presets">${TOOLS.map(tool => `<button class="reg-preset" type="button" data-reg-tool="${tool}">${tool}</button>`).join('')}</div></div>
        <fieldset class="reg-fieldset">
          <legend>사용 방식 <span class="reg-optional">선택</span></legend>
          <div class="reg-choices">${USE_TYPES.map(type => `<label><input type="checkbox" name="reg-ai-type" value="${type}"${editor.aiUseTypes?.includes(type) ? ' checked' : ''}><span>${type}</span></label>`).join('')}</div>
        </fieldset>
      </div>
      <p data-reg-no-ai class="reg-hint" ${aiUsed ? 'hidden' : ''}>AI 미사용으로 기록합니다. 직접 수행한 일과 검증 근거를 다음 단계에서 정리해 주세요.</p>
    </section>`;
  }

  function riskText(scores) {
    const risk = describeRisk(scores);
    if (risk) return `${risk.total}/10점 · 검토 우선순위 ${risk.label}`;
    const completed = scores.filter(Number.isInteger).length;
    return completed ? `${completed}/4개 입력 · 네 항목을 입력하면 우선순위를 볼 수 있어요.` : '입력하면 검토 우선순위를 확인할 수 있어요.';
  }

  function contributionFields(editor, errors) {
    const scores = riskScores(editor);
    return `<section class="reg-extra" aria-label="기여와 검증 근거">
      <label class="reg-control" for="reg-stage"><span>기여한 단계 <small class="reg-optional">선택</small></span><select id="reg-stage">${options([['', '단계 선택'], ...STAGES.map(stage => [stage, stage])], editor.contributionStage)}</select></label>
      <label class="reg-control" for="reg-evidence-source"><span>근거 위치 <small class="reg-optional">선택</small></span><input id="reg-evidence-source" type="text" maxlength="500" value="${esc(editor.evidenceSource)}" placeholder="예: 원본 PDF 3쪽, 실험 결과, 출처 주소" ${attrError('reg-evidence-source', errors)}>${fieldError('reg-evidence-source', errors)}</label>
      <label class="reg-control" for="reg-verification-note"><span>직접 확인한 방법과 결과 <small class="reg-optional">선택</small></span><textarea id="reg-verification-note" rows="2" maxlength="1000" placeholder="예: 표 2의 합계를 원자료에서 다시 계산했어요." ${attrError('reg-verification-note', errors)}>${esc(editor.verificationNote)}</textarea>${fieldError('reg-verification-note', errors)}</label>
      <details class="reg-disclosure"${scores.some(Number.isInteger) ? ' open' : ''}>
        <summary>검토 우선순위 입력 <span class="reg-optional">선택</span></summary>
        <div class="reg-disclosure-body">
          <p class="reg-hint">영향이 커서 먼저 확인해야 할 부분을 검토자에게 알려 주세요. 질문 수와 승인 결과는 그대로예요.</p>
          <div class="reg-two-columns">
            ${RISK.map((item, index) => `<label class="reg-control" for="reg-risk-${index}"><span>${item.label}</span><select id="reg-risk-${index}" data-reg-risk="${index}" ${index === 0 && !usedAI(editor) ? 'disabled' : ''}>${options([['', '선택 안 함'], ...item.options.map((label, number) => [number, `${number}점 · ${label}`])], index === 0 && !usedAI(editor) ? 0 : scores[index])}</select></label>`).join('')}
          </div>
          <p class="reg-risk-result" data-reg-risk-result role="status">${esc(riskText(scores))}</p>
        </div>
      </details>
    </section>`;
  }

  function renderDetails(item) {
    const data = metadata(item);
    const risk = describeRisk(data.riskScores);
    const details = [
      data.aiUseTypes.length ? ['AI 사용 방식', data.aiUseTypes.join(' · ')] : null,
      data.contributionStage ? ['기여 단계', data.contributionStage] : null,
      data.evidenceSource ? ['근거 위치', data.evidenceSource] : null,
      data.verificationNote ? ['검증 메모', data.verificationNote] : null,
      risk ? ['검토 우선순위', `${risk.label} · ${risk.total}/10점`] : null
    ].filter(Boolean);
    if (!details.length && !data.responseNotes.length) return '';
    return `<section class="reg-extra" aria-label="기여·검증 상세">
      ${details.length ? `<dl class="definition reg-definition">${details.map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>` : ''}
      ${data.responseNotes.length ? `<ul class="reg-response-list">${data.responseNotes.map(note => `<li><strong>v${esc(note.version)} · ${esc(note.section)}</strong><span>${esc(note.status)} · ${esc(note.note)}</span></li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function render(step, editor, work = null, errors = {}) {
    if (step === 0) return feedbackFields(editor, work, errors);
    if (step === 1) return aiFields(editor);
    if (step === 2) return contributionFields(editor, errors);
    if (step === 3) return renderDetails(editor);
    return '';
  }

  function capture(root, editor) {
    const mode = root.querySelector('[name="reg-ai-used"]:checked');
    if (mode) {
      editor.aiUsed = mode.value === 'yes';
      editor.aiUseTypes = [...root.querySelectorAll('[name="reg-ai-type"]:checked')].map(input => input.value);
    }
    const fields = { contributionStage: '#reg-stage', evidenceSource: '#reg-evidence-source', verificationNote: '#reg-verification-note' };
    for (const [key, selector] of Object.entries(fields)) {
      const input = root.querySelector(selector);
      if (input) editor[key] = input.value;
    }
    const risk = [...root.querySelectorAll('[data-reg-risk]')];
    if (risk.length) editor.riskScores = risk.map(select => select.value === '' ? null : Number(select.value));
    const responses = [...root.querySelectorAll('[data-reg-feedback]')];
    if (responses.length) editor.responseNotes = responses.map(group => ({
      id: Number(group.dataset.feedbackId),
      version: Number(group.dataset.feedbackVersion),
      section: group.querySelector('legend').textContent,
      feedback: group.querySelector('.reg-feedback-text').textContent,
      status: group.querySelector('[data-reg-response-status]').value,
      note: group.querySelector('[data-reg-response-note]').value
    }));
  }

  function syncRisk(root) {
    const output = root.querySelector('[data-reg-risk-result]');
    if (output) {
      const selected = [...root.querySelectorAll('[data-reg-risk]')];
      output.textContent = riskText(selected.map(select => select.value === '' ? null : Number(select.value)));
    }

    const mode = root.querySelector('[name="reg-ai-used"]:checked');
    if (!mode) return;
    const aiUsed = mode.value === 'yes';
    root.querySelector('[data-reg-ai-options]').hidden = !aiUsed;
    root.querySelector('[data-reg-no-ai]').hidden = aiUsed;
    for (const id of ['tool', 'scope']) {
      const field = root.querySelector(`#${id}`);
      if (field) field.closest('.field').hidden = !aiUsed;
    }
  }

  function handleClick(event) {
    const button = event.target.closest('[data-reg-tool]');
    if (!button) return false;
    const input = button.closest('form').querySelector('#tool');
    if (input && TOOLS.includes(button.dataset.regTool)) {
      input.value = button.dataset.regTool;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
    return true;
  }

  return { capture, describeRisk, handleClick, metadata, render, renderDetails, syncRisk, usedAI, validate };
});
