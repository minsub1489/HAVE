/* HAVE 화면 — 작업 목록 · 작업 상세 개요 (WorkListView · WorkDetailView) — UC09 목록, 공통
   담당: A
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function showWorkList() {
  const attentionOnly = route === '#attention';
  const counts = { all: state.works.length, attention: M.getWorks(state, '', 'attention').length, ongoing: M.getWorks(state, '', 'ongoing').length, approved: M.getWorks(state, '', 'approved').length };
  const metrics = [['전체 작업', counts.all, 'file', '버전별 기록을 한곳에서'], ['내 확인 필요', counts.attention, 'edit', '이해 확인 · 수정 요청 · 재요청'], ['검토 진행 중', counts.ongoing, 'clock', '검토 또는 최종 승인 대기'], ['승인 완료', counts.approved, 'shield', '승인된 버전의 증명서 확인']];
  const next = M.getWorks(state, '', 'attention')[0];
  const strip = state.draft
    ? `<div class="attention-strip"><div class="attention-copy">${showIcon('file')}<div><b>작성 중인 작업이 있어요 ${showBadge(M.STATUS.DRAFT.label)}</b><p>${escapeHtml(state.draft.title || '제목 없는 작업')} · 임시 저장한 입력을 불러올 수 있어요.</p></div></div>${showLink('#new', '이어서 작성하기' + showIcon('arrow'), 'btn')}</div>`
    : next ? `<div class="attention-strip"><div class="attention-copy">${showIcon('clock')}<div><b>지금 확인할 작업</b><p>${escapeHtml(next.title)} · ${escapeHtml(M.getStatus(M.getLatestVersion(next)).label)} · v${M.getLatestVersion(next).n}</p></div></div>${showLink(getNextRoute(next), getNextLabel(next) + showIcon('arrow'), 'btn')}</div>` : '';
  return showHeading(attentionOnly ? '내 확인이 필요한 작업' : '내 작업', 'AI와 만든 결과물, 사람의 검토와 승인까지 한곳에서 관리하세요.', showLink('#new', showIcon('plus') + '작업 등록', 'btn primary')) +
    `<div class="metrics">${metrics.map(([label, count, glyph, note]) => `<div class="metric"><div class="metric-label">${label}${showIcon(glyph)}</div><div class="metric-value">${count}<span>건</span></div><div class="metric-note">${note}</div></div>`).join('')}</div>` + strip +
    `<section aria-label="작업 목록"><div class="section-header"><h2>작업 목록 <span class="muted small">${counts.all}</span></h2><label class="sr-only" for="sort">정렬</label><select id="sort" aria-label="작업 정렬" style="width:auto;min-height:44px;font-size:12px;background:transparent;border:0"><option value="newest" ${sort === 'newest' ? 'selected' : ''}>최근 변경순</option><option value="title" ${sort === 'title' ? 'selected' : ''}>작업명순</option></select></div>
    <div class="work-list"><div class="list-toolbar"><div class="tabs" role="tablist" aria-label="작업 상태">${[['all', '전체'], ['attention', '내 확인 필요'], ['ongoing', '검토 진행 중'], ['approved', '승인 완료']].map(([key, text]) => `<button class="tab ${filter === key ? 'active' : ''}" role="tab" id="filter-${key}" aria-selected="${filter === key}" aria-controls="work-results" tabindex="${filter === key ? '0' : '-1'}" data-filter="${key}">${text}<span>${counts[key]}</span></button>`).join('')}</div>
    <div class="search-wrap">${showIcon('search')}<label for="search" class="sr-only">작업 검색</label><input id="search" type="text" placeholder="작업명, 파일명, 검토자 검색" value="${escapeHtml(query)}" autocomplete="off"></div></div>
    <div id="work-results" role="tabpanel" aria-labelledby="filter-${filter}" tabindex="0">${showWorkRows()}</div></div></section>`;
}

function showEffectBadge(work, v) {
  const e = M.getEffect(work, v), li = M.getLatestInfo(work, v);
  return (e === 'REVOKED' ? ' ' + showBadge(M.EFFECT[e].label, M.EFFECT[e].tone) : '') + (v.approval && !li.isLatest ? ' ' + showBadge(`후속 버전 v${li.latestN} 있음`) : '');
}

function showWorkRows() {
  const rows = M.getWorks(state, query, filter).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : getChangedAt(b).localeCompare(getChangedAt(a)));
  if (!rows.length) return `<div class="empty">${showIcon('search')}<h2>${state.works.length ? '조건에 맞는 작업이 없어요' : '아직 등록한 작업이 없어요'}</h2><p>${state.works.length ? '검색어나 상태 필터를 바꿔 다시 찾아보세요.' : '첫 작업을 등록하고 검토 과정을 시작해 보세요.'}</p>${state.works.length ? '<button class="btn" data-action="clear-filter">필터 초기화</button>' : showLink('#new', '작업 등록', 'btn primary')}</div>`;
  const titleCell = w => `<div class="row"><span style="color:var(--color-muted)">${showIcon('file')}</span><div class="grow">${showLink(getWorkRoute(w), escapeHtml(w.title), 'work-title')}<div class="file-meta"><span>v${M.getLatestVersion(w).n}</span><span>PDF</span><span>${w.demo ? '시연 자료' : '내가 등록한 작업'}</span></div></div></div>`;
  return `<div class="table-container"><table style="width:100%;border-collapse:collapse"><caption class="sr-only">내 작업 ${rows.length}건</caption><thead><tr>${['작업명 / 버전', '현재 상태', '검토자', '최근 변경 시각', '상세'].map(t => `<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(w => { const v = M.getLatestVersion(w); return `<tr><td>${titleCell(w)}</td><td>${showStatusBadge(v)}${showEffectBadge(w, v)}</td><td>${escapeHtml(v.request?.reviewer || '—')}</td><td class="muted" style="font-size:11px">${getTimeText(getChangedAt(w))}</td><td>${showLink(getWorkRoute(w), showIcon('chevron'), 'btn text icon-only', `aria-label="${escapeHtml(w.title)} 상세 보기"`)}</td></tr>`; }).join('')}</tbody></table></div>
  <div class="work-cards">${rows.map(w => { const v = M.getLatestVersion(w); return `<article class="work-card">${titleCell(w)}<dl class="work-card-meta"><div><dt>현재 상태</dt><dd>${showStatusBadge(v)}${showEffectBadge(w, v)}</dd></div><div><dt>검토자</dt><dd>${escapeHtml(v.request?.reviewer || '—')}</dd></div><div style="grid-column:1/-1"><dt>최근 변경 시각</dt><dd>${getTimeText(getChangedAt(w))}</dd></div></dl></article>`; }).join('')}</div>
  <div class="table-footer"><span>총 ${rows.length}개 작업</span><span>승인은 표시된 버전에만 적용됩니다.</span></div>`;
}

function getNextRoute(work) {
  const v = M.getLatestVersion(work);
  return { CHALLENGE_PENDING: getWorkRoute(work, 'challenge'), REVISION_REQUIRED: getWorkRoute(work, 'revise'), SUBMITTED: getWorkRoute(work, 'request') }[v.status] || getWorkRoute(work);
}

function getNextLabel(work) {
  return { CHALLENGE_PENDING: '이해 확인하기', REVISION_REQUIRED: '수정본 재제출', SUBMITTED: '검토 다시 요청' }[M.getLatestVersion(work).status] || '상세 보기';
}

function showContext(work) {
  const v = M.getLatestVersion(work), req = v.request;
  const next = {
    SUBMITTED: '작성자 · 검토 요청이 취소됐어요. 위험 분석과 검토 요청을 다시 해 주세요.',
    CHALLENGE_PENDING: `작성자 · 이해 확인 ${req?.challenges.length || 0}문항에 답해 주세요.`,
    REVIEW_PENDING: `검토자 ${req?.reviewer} · 검토를 시작할 차례예요.`,
    IN_REVIEW: `검토자 ${req?.reviewer} · 검토 중이에요.`,
    APPROVAL_PENDING: `최종 승인자 ${req?.approver} · 승인 여부를 결정할 차례예요.`,
    REVISION_REQUIRED: '작성자 · 피드백에 답하고 수정본을 재제출해 주세요.',
    APPROVED: v.certificate?.signingState === 'READY' ? '승인된 버전의 증명서를 열 수 있어요.' : v.certificate?.signingState === 'FAILED' ? '증명서 발급에 실패했어요. 증명서 탭에서 다시 시도해 주세요.' : '증명서를 발급하는 중이에요.'
  }[v.status] || '상태를 확인해 주세요.';
  return `<section class="work-context" aria-label="작업 요약">${showIcon('file')}
    <div class="grow"><h2>${escapeHtml(work.title)}</h2><div class="context-meta"><span>대상 버전 v${v.n}</span>${showStatusBadge(v)}${showEffectBadge(work, v)}${req ? `<span>검토자 ${escapeHtml(req.reviewer)} · 최종 승인자 ${escapeHtml(req.approver)}</span>` : ''}</div></div>
    <div class="next-action"><b>다음 행동</b>${escapeHtml(next)}</div></section>`;
}

function showDetailTabs(work, tab) {
  const tabs = [['overview', '작업 정보'], ['challenge', '이해 확인'], ['certificate', '증명서'], ['history', '버전 · 이력']];
  return `<nav class="detail-tabs" aria-label="작업 상세">${tabs.map(([key, label]) => showLink(getWorkRoute(work, key), label, '', tab === key ? 'aria-current="page"' : '')).join('')}</nav>`;
}

function showJourney(v) {
  const s = v.status;
  const order = ['SUBMITTED', 'CHALLENGE_PENDING', 'REVIEW_PENDING', 'IN_REVIEW', 'APPROVAL_PENDING', 'APPROVED'];
  const at = order.indexOf(s);
  const byReviewer = s === 'REVISION_REQUIRED' && v.revisionRound?.source === 'REVIEW';
  const byApprover = s === 'REVISION_REQUIRED' && v.revisionRound?.source === 'REJECTION';
  const steps = [
    ['작업 등록', '완료', 'done'],
    ['이해 확인', s === 'CHALLENGE_PENDING' ? '답변 작성' : s === 'SUBMITTED' ? '요청 취소됨' : '답변 제출', s === 'CHALLENGE_PENDING' || s === 'SUBMITTED' ? 'current' : 'done'],
    ['사람의 검토', byReviewer ? '수정 요청' : s === 'IN_REVIEW' ? '검토 중' : at >= 4 || byApprover ? '통과' : '대기', byReviewer ? 'revision' : at >= 4 || byApprover ? 'done' : ['REVIEW_PENDING', 'IN_REVIEW'].includes(s) ? 'current' : ''],
    ['최종 승인', byApprover ? '반려' : s === 'APPROVED' ? '승인 완료' : '대기', byApprover ? 'revision' : s === 'APPROVED' ? 'done' : s === 'APPROVAL_PENDING' ? 'current' : ''],
    ['증명서', v.certificate ? M.SIGNING[v.certificate.signingState].label : '미발급', v.certificate?.signingState === 'READY' ? 'done' : v.certificate ? (v.certificate.signingState === 'FAILED' ? 'revision' : 'current') : '']
  ];
  return `<ol class="progress-steps">${steps.map(([label, st, type], i) => `<li class="progress-item" data-state="${type}" ${type === 'current' ? 'aria-current="step"' : ''}><span class="progress-marker" aria-hidden="true">${type === 'done' ? showIcon('check') : i + 1}</span><span class="progress-label">${label}</span><span class="progress-state">${st}</span></li>`).join('')}</ol>`;
}

function showFileInfo(v) {
  return `<dl class="definition"><dt>대상 버전</dt><dd>v${v.n}</dd><dt>등록 파일</dt><dd>${escapeHtml(v.file.name)}</dd><dt>파일 크기</dt><dd>${getSizeText(v.file.size)}</dd><dt>등록 시각</dt><dd>${getTimeText(v.createdAt)}</dd>${v.changeReason ? `<dt>변경 사유</dt><dd>${escapeHtml(v.changeReason)}</dd>` : ''}</dl>
    <div class="pdf-actions"><button class="btn" data-action="view-file" data-version="${v.n}">${showIcon('file')}PDF 원문 보기</button><button class="btn" data-action="download-file" data-version="${v.n}">${showIcon('download')}다운로드</button></div>
    <details class="hash-details"><summary>파일 식별 정보 · SHA-256</summary><p class="mono">${escapeHtml(v.file.hash)}</p><button class="btn text" data-action="copy-hash" data-version="${v.n}">전체 해시 복사</button></details>`;
}

function showRecentActivity(work) {
  return `<section class="panel recent-activity"><div class="panel-head"><h2>최근 활동</h2>${showLink(getWorkRoute(work, 'history'), '전체 이력', 'btn text')}</div>
    <div class="panel-body"><ul>${work.events.slice(-3).reverse().map(e => `<li><div class="grow"><b>${escapeHtml(M.ACTIONS[e.action][0])}</b><p class="small muted">${escapeHtml(e.actor || '시스템 · 익명')}${e.n ? ' · v' + e.n : ''}</p></div><time datetime="${escapeHtml(e.at)}">${getTimeText(e.at)}</time></li>`).join('')}</ul></div></section>`;
}

function showOverview(work) {
  const v = M.getLatestVersion(work), level = M.getVersionLevel(v), rule = level && M.getGateRule(level);
  const items = M.getRevisionItems(v);
  const info = ({
    SUBMITTED: () => ['검토 요청이 취소됐어요', `취소 사유: ${escapeHtml(v.canceledRequests.at(-1)?.cancelReason || '')}`, 'warning'],
    CHALLENGE_PENDING: () => ['이해 확인을 작성해 주세요', `위험 ${M.LEVEL[level]} · 과제 ${rule.kinds.length}개 · 통과 기준 ${rule.minScore}/${rule.maxScore}점. 답변은 이 PDF 버전에 연결돼요.`],
    REVIEW_PENDING: () => ['답변을 제출했어요', `검토자 ${escapeHtml(v.request.reviewer)}가 검토를 시작하기 전까지는 요청을 취소할 수 있어요.`],
    IN_REVIEW: () => ['검토 중이에요', '검토자가 파일 해시를 확인하고 버전을 잠갔어요. 이 버전은 더 바꿀 수 없어요.'],
    APPROVAL_PENDING: () => ['검토를 통과했어요', `최종 승인자 ${escapeHtml(v.request.approver)}의 결정을 기다리고 있어요.`],
    REVISION_REQUIRED: () => [v.revisionRound?.source === 'REJECTION' ? '최종 승인자가 반려했어요' : '수정 요청이 도착했어요', `${items.map(i => `<br>· <b>${escapeHtml(i.section)}</b> ${escapeHtml(i.content)}`).join('')}<br>보완 기한 ${escapeHtml(v.revisionRound?.dueDate || '')}${M.getRevisionState(v.revisionRound) === 'EXPIRED' ? ' (기한 지남)' : ''}`, 'warning'],
    APPROVED: () => v.revocation ? ['승인이 철회됐어요', `${getTimeText(v.revocation.revokedAt)} · ${escapeHtml(v.revocation.reason)}`, 'error'] : v.certificate?.signingState === 'READY' ? ['승인 증명서가 발급됐어요', `v${v.n} 파일에 연결된 승인 기록을 확인하세요.`] : v.certificate?.signingState === 'FAILED' ? ['승인은 완료됐지만 증명서 발급에 실패했어요', '증명서 탭에서 다시 시도할 수 있어요.', 'error'] : ['최종 승인이 기록됐어요', '증명서를 발급하는 중이에요.']
  })[v.status]?.();
  const canCancel = ['CHALLENGE_PENDING', 'REVIEW_PENDING'].includes(v.status) && v.request?.state === 'REQUESTED';
  const actions = {
    SUBMITTED: showLink(getWorkRoute(work, 'request'), '검토 다시 요청' + showIcon('arrow'), 'btn primary'),
    CHALLENGE_PENDING: showLink(getWorkRoute(work, 'challenge'), '이해 확인하기' + showIcon('arrow'), 'btn primary'),
    REVISION_REQUIRED: showLink(getWorkRoute(work, 'revise'), '수정본 재제출' + showIcon('arrow'), 'btn primary'),
    APPROVED: v.certificate?.signingState === 'READY' ? showLink(getWorkRoute(work, 'certificate') + '/' + v.n, '증명서 보기' + showIcon('arrow'), 'btn primary') : ''
  }[v.status] || '';
  return `<div class="split"><div class="stack">
    <section class="panel"><div class="panel-head"><h2>진행 상황</h2>${showStatusBadge(v)}</div>
      <div class="panel-body">${info ? showNotice(...info) : ''}<div class="space-top row wrap">${actions}${canCancel ? '<button class="btn" data-action="cancel-request">검토 요청 취소</button>' : ''}</div></div>${showJourney(v)}</section>
    <section class="panel"><div class="panel-head"><h2>AI 사용 신고 · 기여 · 위험 분석</h2>${showBadge('작성자 신고')}</div><div class="panel-body details">
      <div><div class="detail-label">AI 도구 · 모델</div><div class="detail-value">${v.disclosure.aiUsed ? escapeHtml(v.disclosure.tool) : 'AI 사용 안 함'}</div></div>
      ${v.disclosure.aiUsed ? `<div><div class="detail-label">사용 방식 · 범위</div><div class="detail-value">${escapeHtml(v.disclosure.useTypes.join(' · '))}${v.disclosure.useTypes.length ? '<br>' : ''}${escapeHtml(v.disclosure.scope)}</div></div>` : ''}
      ${showContributions(v)}
      ${v.risk ? `<div><div class="detail-label">위험 분석</div><div class="detail-value">${M.RISK_FACTORS.map((f, i) => `${f.label} ${v.risk.scores[i]}`).join(' · ')} = ${M.getRiskTotal(v.risk.scores)}/10점 · <b>${M.LEVEL[level]}</b><br>${escapeHtml(v.risk.rationale)}${v.risk.copiedFrom ? `<br><small class="muted">v${v.risk.copiedFrom}의 평가를 승계했어요.</small>` : ''}</div></div>` : ''}
    </div></section>
    ${showRecentActivity(work)}
  </div><aside class="stack" style="align-content:start">
    <section class="panel"><div class="panel-head"><h2>등록 파일</h2>${showIcon('file')}</div><div class="panel-body">${showFileInfo(v)}${v.status === 'APPROVED' && v.certificate?.signingState !== 'PENDING' ? '<button class="btn full space-top" data-action="new-version">새 버전 등록</button>' : ''}</div></section>
  </aside></div>`;
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('clear-filter', async (button, work, action) => { query = ''; filter = 'all'; render(); $('#search')?.focus(); });
addAction('new-version', async (button, work, action) => {
  if (state.draft && !(await confirmDialog('임시 저장한 작업이 있어요', '새 버전을 작성해도 임시 저장한 작업은 그대로 남아요.', '새 버전 작성'))) return;
  await go('#new'); editor = REG.getEmptyForm(work); editorStep = 0; render(true);
});
addAction(['view-file', 'download-file', 'copy-hash'], async (button, work, action) => {
  const v = M.getVersion(work, button.dataset.version) || M.getLatestVersion(work);
  if (action === 'view-file') openPdf(v);
  if (action === 'download-file') download(core.getBytes(v.file.data), v.file.name);
  if (action === 'copy-hash') await copy(v.file.hash);
});
addHandler('click', event => !!event.target.closest('[data-filter]'), event => { const filterButton = event.target.closest('[data-filter]'); filter = filterButton.dataset.filter; render(); $(`#filter-${filter}`)?.focus(); return; });
addHandler('input', event => { return !!(event.target.id === 'search'); }, event => { query = event.target.value; $('#work-results').innerHTML = showWorkRows(); announce(M.getWorks(state, query, filter).length + '개 작업'); return; });
addHandler('change', event => { const t = event.target; return !!(t.id === 'sort'); }, async event => { const t = event.target; sort = t.value; $('#work-results').innerHTML = showWorkRows(); });
