/* HAVE 검토자·최종 승인자 화면 (1123) — UC04 검토, UC06 최종 승인·반려, UC07 발급 재시도, UC10 승인 철회 */
(function (root) {
  'use strict';
  const M = root.HaveModel;
  const R = root.HaveReviewModel;
  const MODES = Object.freeze({
    review: { label: '검토할 작업', action: '검토하기', empty: '검토할 작업이 없어요' },
    approval: { label: '승인할 작업', action: '최종 결정하기', empty: '승인할 작업이 없어요' }
  });

  function showQueue(state, mode, actor, h) {
    const { escapeHtml, showIcon, showLink, showBadge, getTimeText, getWorkRoute } = h;
    const rows = R.getPendingWorks(state, mode, actor);
    const approved = mode === 'approval' ? R.getApprovedWorks(state, actor) : [];
    const item = (work, version, label, tone, action, route) => `<li class="role-item panel panel-body">
        <div class="stack"><div class="row wrap">${showBadge(label, tone)}<small>v${version.n}</small></div>
        <div><h2>${escapeHtml(work.title)}</h2><p class="small muted">작성자 ${escapeHtml(work.owner)} · 검토자 ${escapeHtml(version.request?.reviewer || '')} · ${escapeHtml(getTimeText(work.events.at(-1)?.at || version.createdAt))}</p></div></div>
        ${showLink(route, action + showIcon('arrow'), 'btn primary')}</li>`;
    const pending = rows.length ? `<ul class="role-queue" aria-label="${MODES[mode].label}">${rows.map(work => {
      const v = M.getLatestVersion(work), s = M.getStatus(v);
      return item(work, v, s.label, s.tone, MODES[mode].action, getWorkRoute(work, mode));
    }).join('')}</ul>` : `<section class="panel empty">${showIcon('check')}<h2>${MODES[mode].empty}</h2><p>${escapeHtml(actor)}에게 배정된 작업이 생기면 이곳에 나타나요.</p></section>`;
    if (mode !== 'approval') return pending;
    const done = approved.flatMap(work => work.versions.filter(v => v.approval && v.request.approver === actor).map(v => {
      const e = M.getEffect(work, v), c = v.certificate;
      const label = (c?.signingState === 'FAILED' ? '증명서 발급 실패' : M.EFFECT[e].label) + (M.getLatestInfo(work, v).isLatest ? '' : ' · 후속 버전 있음');
      const tone = c?.signingState === 'FAILED' ? 'danger' : M.EFFECT[e].tone;
      return item(work, v, label, tone, '승인 기록 보기', getWorkRoute(work, 'approval') + '/' + v.n);
    })).join('');
    return pending + (done ? `<h2 class="space-top">내가 승인한 버전 <span class="small muted">발급 재시도 · 승인 철회</span></h2><ul class="role-queue">${done}</ul>` : '');
  }

  function showFileSummary(work, version, h) {
    const { escapeHtml, showIcon } = h;
    const level = M.getVersionLevel(version), rule = M.getGateRule(level);
    return `<section class="panel"><header class="panel-head"><h2>검토 대상</h2><span class="small muted">v${version.n}</span></header>
      <div class="panel-body stack">
        <dl class="definition"><dt>작성자</dt><dd>${escapeHtml(work.owner)}</dd><dt>검토자</dt><dd>${escapeHtml(version.request?.reviewer || '')}</dd>
          <dt>최종 승인자</dt><dd>${escapeHtml(version.request?.approver || '')}</dd><dt>파일</dt><dd>${escapeHtml(version.file.name)}</dd>
          <dt>AI 사용</dt><dd>${version.disclosure.aiUsed ? escapeHtml(version.disclosure.tool) + (version.disclosure.useTypes.length ? ' · ' + escapeHtml(version.disclosure.useTypes.join(', ')) : '') : 'AI 사용 안 함'}</dd>
          ${version.disclosure.aiUsed ? `<dt>AI 사용 범위</dt><dd>${escapeHtml(version.disclosure.scope)}</dd>` : ''}
          <dt>위험 분석</dt><dd>${M.getRiskTotal(version.risk.scores)}/10점 · ${M.LEVEL[level]} · 과제 ${rule.kinds.length}개 (통과 ${rule.minScore}/${rule.maxScore}점)${version.risk.copiedFrom ? ` · v${version.risk.copiedFrom}에서 승계` : ''}</dd>
          ${version.request?.message ? `<dt>요청 메시지</dt><dd>${escapeHtml(version.request.message)}</dd>` : ''}
          ${version.request?.dueDate ? `<dt>검토 기한</dt><dd>${escapeHtml(version.request.dueDate)}</dd>` : ''}</dl>
        ${h.showContributions(version)}
        <details class="hash-details"><summary>등록 PDF의 SHA-256 보기</summary><p class="mono">${escapeHtml(version.file.hash)}</p></details>
        <div class="pdf-actions">
          <button class="btn" data-action="view-file" data-version="${version.n}">${showIcon('file')}PDF 원문 보기</button>
          <button class="btn" data-action="download-file" data-version="${version.n}">${showIcon('download')}다운로드</button>
        </div>
      </div></section>`;
  }

  function showReviewSummary(version, h) {
    const { escapeHtml, showBadge, getTimeText } = h;
    const r = version.review;
    if (!r || r.state === 'IN_PROGRESS') return '';
    if (r.state === 'HALTED') return h.showNotice('검토를 중지했어요', `${escapeHtml(r.haltedReason)} 작성자에게 파일을 다시 확인해 달라고 알려 주세요.`, 'error');
    const rule = M.getGateRule(M.getVersionLevel(version));
    const total = r.evaluations.reduce((s, e) => s + (e?.score || 0), 0);
    return `<section class="panel"><header class="panel-head"><h2>검토 결과</h2>${r.decision === 'PASS' ? showBadge('검토 통과', 'success') : showBadge('수정 요청', 'warning')}</header>
      <div class="panel-body stack"><dl class="definition"><dt>검토자</dt><dd>${escapeHtml(r.actor)}</dd><dt>결정 시각</dt><dd>${escapeHtml(getTimeText(r.decidedAt))}</dd>
        <dt>평가 점수</dt><dd>${total} / ${rule.maxScore}점 (기준 ${rule.minScore}점)${r.evaluations.some(e => e?.critical) ? ' · 치명 오류 있음' : ''}</dd>
        <dt>체크리스트</dt><dd>${r.checks.filter(Boolean).length} / ${r.checks.length}</dd><dt>검토 메모</dt><dd class="review-answer">${escapeHtml(r.memo)}</dd>
        ${r.feedbackItems.map((f, i) => `<dt>보완 ${i + 1} · ${escapeHtml(f.section)}</dt><dd class="review-answer">${escapeHtml(f.content)}</dd>`).join('')}
        <dt>검토 기록 해시</dt><dd class="mono small">${escapeHtml(r.digest || '')}</dd></dl></div></section>`;
  }

  function showReviewForm(version, draft, h) {
    const { escapeHtml, showIcon } = h;
    const level = M.getVersionLevel(version), rule = M.getGateRule(level);
    const blockers = R.getReviewBlockers(version, draft);
    const total = draft.evaluations.reduce((s, e) => s + (e && Number.isInteger(e.score) ? e.score : 0), 0);
    return `<form class="review-workflow stack" id="role-review" data-role-mode="review" data-version-id="${escapeHtml(version.id)}" novalidate>
      <section class="panel"><header class="panel-head"><h2>이해 확인 답변 평가</h2><span class="small muted" data-review-score role="status">${total} / ${rule.maxScore}점 · ${rule.minScore}점 이상 통과 (위험 ${M.LEVEL[level]})</span></header>
        <div class="panel-body stack">${version.request.challenges.map((c, i) => {
          const k = M.CHALLENGE_KINDS[c.kind], e = draft.evaluations[i] || {};
          return `<fieldset class="review-evaluation"><legend>${i + 1}. ${escapeHtml(k.label)} <span class="small muted">${escapeHtml(k.type)}</span></legend>
            <p class="small muted">${escapeHtml(c.prompt)}</p>
            <p class="review-answer">${escapeHtml(c.answer)}</p><p class="small muted">작성자 확신 정도 · ${escapeHtml(M.CONFIDENCE[c.confidence] || '없음')}</p>
            <div class="review-evaluation-control row wrap"><label class="field">점수 <select name="score-${i}">
              <option value="">선택</option>${[['0', '0점 · 근거 부족'], ['1', '1점 · 일부 충족'], ['2', '2점 · 충분함']].map(([v, t]) => `<option value="${v}" ${String(e.score) === v ? 'selected' : ''}>${t}</option>`).join('')}
            </select></label><label class="row"><input type="checkbox" name="critical-${i}" ${e.critical ? 'checked' : ''}>치명 오류 발견</label></div>
            <label class="field"><span>평가 근거 <small class="required">필수</small></span><textarea name="reason-${i}" rows="2" maxlength="2000" placeholder="점수를 준 이유를 적어 주세요.">${escapeHtml(e.reason || '')}</textarea></label></fieldset>`;
        }).join('')}</div>
      </section>
      <section class="panel"><header class="panel-head"><h2>체크리스트</h2><span class="small muted" data-check-count>${draft.checks.filter(Boolean).length} / 4</span></header>
        <div class="panel-body"><fieldset class="review-checks"><legend class="sr-only">체크리스트</legend>
          ${M.CHECKLIST.map((check, i) => `<label class="row"><input type="checkbox" name="check-${i}" ${draft.checks[i] ? 'checked' : ''}>${escapeHtml(check)}</label>`).join('')}
        </fieldset></div></section>
      <section class="panel"><header class="panel-head"><h2>검토 메모와 보완 요청</h2></header>
        <div class="panel-body stack">
          <label class="field" for="review-memo"><span>검토 메모 <small class="required">필수</small></span>
            <textarea id="review-memo" name="memo" maxlength="2000" placeholder="확인한 내용과 판단 근거를 적어 주세요.">${escapeHtml(draft.memo)}</textarea></label>
          <div><b>보완 요청 항목</b> <span class="small muted">수정 요청일 때 한 개 이상</span>
            <div class="list-editor">${draft.feedbackItems.map((f, i) => `<div class="list-row" data-feedback-row="${i}">
              <label class="field"><span>대상 구간</span><input type="text" name="fb-section-${i}" maxlength="100" value="${escapeHtml(f.section)}" placeholder="예: 3장 실험 결과"></label>
              <label class="field grow"><span>보완할 내용</span><textarea name="fb-content-${i}" rows="2" maxlength="1000">${escapeHtml(f.content)}</textarea></label>
              <button type="button" class="btn text" data-action="remove-feedback" data-index="${i}" aria-label="보완 항목 ${i + 1} 삭제">삭제</button></div>`).join('')}</div>
            <button type="button" class="btn" data-action="add-feedback">${showIcon('plus')}보완 항목 추가</button></div>
          <label class="field" for="review-due"><span>보완 기한</span><input id="review-due" type="date" name="dueDate" value="${escapeHtml(draft.dueDate)}"></label>
        </div></section>
      <section class="panel panel-body stack">
        <ul class="review-blockers" data-review-blockers aria-live="polite" ${blockers.length ? '' : 'hidden'}>${blockers.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
        <p class="review-error" role="alert" tabindex="-1" hidden></p>
        <div class="review-actions row wrap"><button type="submit" class="btn primary" name="decision" value="PASS" data-review-pass ${blockers.length ? 'disabled' : ''}>${showIcon('check')}검토 통과</button>
          <button type="submit" class="btn" name="decision" value="REVISION_REQUIRED">수정 요청</button></div>
        <p class="small muted">검토 통과는 등급별 기준 점수 이상, 치명 오류 없음, 체크리스트 4/4일 때만 누를 수 있어요.</p>
      </section>
    </form>`;
  }

  function showConditions(conditions, h) {
    if (!conditions) return `<p class="small muted">승인 조건을 확인하는 중…</p>`;
    return `<ul class="condition-list">${conditions.map(c => `<li data-ok="${c.ok}">${c.ok ? h.showIcon('check') : h.showIcon('close')}<span>${h.escapeHtml(c.label)}</span></li>`).join('')}</ul>`;
  }

  function showApprovalForm(version, conditions, h) {
    const { escapeHtml, showIcon } = h;
    const ok = conditions && conditions.every(c => c.ok);
    return `<form class="review-workflow panel" id="role-approval" data-role-mode="approval" data-version-id="${escapeHtml(version.id)}" data-revision="${version.revision}" novalidate>
      <header class="panel-head"><h2>최종 승인 결정</h2></header><div class="panel-body stack">
        <h3>승인 조건</h3>${showConditions(conditions, h)}
        <div class="review-actions row wrap"><button type="submit" class="btn primary" name="decision" value="APPROVE" ${ok ? '' : 'disabled'}>${showIcon('check')}최종 승인</button></div>
        <p class="small muted">승인하면 증명서 발급이 자동으로 요청돼요. 발급에 실패하면 승인 기록에서 다시 시도할 수 있어요.</p>
        <hr>
        <label class="field" for="reject-reason"><span>반려 사유 <small class="required">반려 시 필수</small></span>
          <textarea id="reject-reason" name="reason" maxlength="2000" placeholder="작성자가 수정본에서 고칠 내용을 적어 주세요."></textarea></label>
        <p class="review-error" role="alert" tabindex="-1" hidden></p>
        <div class="review-actions row wrap"><button type="submit" class="btn danger" name="decision" value="REJECT">반려</button></div>
      </div></form>`;
  }

  function showApprovedRecord(work, version, actor, h) {
    const { escapeHtml, showIcon, showBadge, getTimeText, showLink, getWorkRoute } = h;
    const c = version.certificate, e = M.getEffect(work, version);
    const sign = M.SIGNING[c.signingState];
    return `<section class="panel"><header class="panel-head"><h2>승인 기록 · v${version.n}</h2><span>${showBadge(M.EFFECT[e].label, M.EFFECT[e].tone)}${M.getLatestInfo(work, version).isLatest ? '' : ' ' + showBadge(`후속 버전 v${M.getLatestInfo(work, version).latestN} 있음`)}</span></header>
      <div class="panel-body stack"><dl class="definition"><dt>최종 승인자</dt><dd>${escapeHtml(version.approval.approver)}</dd><dt>승인 시각</dt><dd>${escapeHtml(getTimeText(version.approval.approvedAt))}</dd>
        <dt>증명서</dt><dd>${showBadge(sign.label, sign.tone)} ${c.serial ? escapeHtml(c.serial) : ''}</dd>
        ${version.revocation ? `<dt>철회</dt><dd>${escapeHtml(getTimeText(version.revocation.revokedAt))} · ${escapeHtml(version.revocation.reason)}</dd>` : ''}</dl>
        ${c.signingState === 'FAILED' ? `<div class="notice error">${showIcon('info')}<div><strong>승인은 완료됐지만 증명서 발급에 실패했어요</strong>${escapeHtml(c.lastError)}</div></div>
          <div><button class="btn primary" data-action="retry-issue" data-version="${version.n}">${showIcon('refresh')}발급 다시 시도</button></div>` : ''}
        ${c.signingState === 'READY' ? showLink(getWorkRoute(work, 'certificate') + '/' + version.n, '증명서 보기' + showIcon('arrow'), 'btn') : ''}
      </div></section>
      ${version.revocation ? '' : `<form class="review-workflow panel" id="role-revoke" data-role-mode="revoke" data-version-n="${version.n}" novalidate>
        <header class="panel-head"><h2>승인 철회</h2></header><div class="panel-body stack">
          <p class="small muted">철회해도 작업 상태와 이력은 그대로 남고, 증명서와 공개 검증에 ‘승인 철회’로 표시돼요. 되돌릴 수 없어요.</p>
          <label class="field" for="revoke-reason"><span>철회 사유 <small class="required">필수</small></span><textarea id="revoke-reason" name="reason" maxlength="2000"></textarea></label>
          <p class="review-error" role="alert" tabindex="-1" hidden></p>
          <div class="review-actions"><button type="submit" class="btn danger" name="decision" value="REVOKE">승인 철회</button></div>
        </div></form>`}`;
  }

  function showDetail(state, work, mode, actor, ctx, h) {
    const { showNotice, escapeHtml } = h;
    const version = ctx.n ? M.getVersion(work, ctx.n) : M.getLatestVersion(work);
    if (!version) return showNotice('버전을 찾을 수 없어요', '목록에서 다시 선택해 주세요.', 'warning');
    const assigned = mode === 'review' ? version.request?.reviewer : version.request?.approver;
    if (actor !== assigned) return showNotice('지정된 참가자의 화면이에요', `${escapeHtml(assigned || '지정된 사람')}의 시연 역할로 전환해 주세요.`, 'warning');

    let actions = '';
    if (mode === 'review') {
      if (version.status === 'REVIEW_PENDING' && version.request.state === 'REQUESTED' && version.review?.state !== 'HALTED') {
        actions = `<section class="panel panel-body stack"><h2>검토 시작</h2><p class="small muted">시작하면 등록 PDF의 SHA-256을 다시 계산해 등록 당시 값과 비교해요. 일치하면 이 버전을 잠그고(검토 중) 평가할 수 있어요.</p>
          <div><button class="btn primary" data-action="start-review">${h.showIcon('check')}검토 시작</button></div></section>`;
      } else if (version.status === 'IN_REVIEW') actions = showReviewForm(version, ctx.reviewDraft, h);
      else if (version.status === 'CHALLENGE_PENDING') actions = showNotice('작성자 답변을 기다려요', '작성자가 이해 확인 답변을 제출하면 검토를 시작할 수 있어요.', 'neutral');
    } else {
      if (version.status === 'APPROVAL_PENDING') actions = showApprovalForm(version, ctx.conditions, h);
      else if (version.approval) actions = showApprovedRecord(work, version, actor, h);
      else actions = showNotice('진행 중인 결정이 없어요', '작업의 현재 상태를 확인해 주세요.', 'neutral');
    }
    return `<div class="review-grid split"><div class="stack">${showReviewSummary(version, h)}${actions}</div><aside>${showFileSummary(work, version, h)}</aside></div>`;
  }

  /** 검토 양식의 현재 입력을 읽는다. */
  function getReviewInput(form, count) {
    const data = new FormData(form);
    const rows = [...form.querySelectorAll('[data-feedback-row]')];
    return {
      evaluations: Array.from({ length: count }, (_, i) => {
        const v = data.get(`score-${i}`);
        return { score: v === null || v === '' ? null : Number(v), reason: data.get(`reason-${i}`) || '', critical: data.has(`critical-${i}`) };
      }),
      checks: M.CHECKLIST.map((_, i) => data.has(`check-${i}`)),
      memo: data.get('memo') || '',
      feedbackItems: rows.map((_, i) => ({ section: data.get(`fb-section-${i}`) || '', content: data.get(`fb-content-${i}`) || '' })),
      dueDate: data.get('dueDate') || ''
    };
  }

  function showError(form, message) {
    const error = form.querySelector('.review-error');
    if (!error) return;
    error.textContent = message; error.hidden = false; error.focus();
  }

  root.HaveReviewUI = { showQueue, showDetail, getReviewInput, showError };
})(globalThis);
