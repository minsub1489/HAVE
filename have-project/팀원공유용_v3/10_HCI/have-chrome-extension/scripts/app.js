/* HAVE 사용자 화면 (1123) — 사이드 패널·전체 탭 공통.
   팀원의 확장 프로그램(11-23) 화면 구성과 스타일을 유지하고, 1118 산출물의 규칙과 빠진 기능(검토 시작·철회·알림·요청 취소·공유 링크·이력 해시)을 넣었다. */
'use strict';
const core = HaveCore;
const M = HaveModel;
const R = HaveReviewModel;
const V = HaveReviewUI;
const REG = HaveRegistration;
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4 10-10"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z"/>',
  link: '<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/>', award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 10 6-3 6 3-2-10"/>',
  refresh: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>',
  external: '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>'
};
const showIcon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const store = new HaveStorage.WorkspaceStore();
const syncChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('have-extension-sync-1123') : null;

let state, storeRevision = 0, route = location.hash || '#works', query = '', filter = 'all', sort = 'newest';
let editor = null, editorStep = 0, editorErrors = {}, dirty = false, saving = false, storageError = '', savedAt = '';
let questionIndex = 0, answerDraft = null, comparison = null, compareRequest = 0, toastTimer, fileChecking = false, conflictSnapshot = null;
let reviewerActor = M.USERS.reviewers[0], approverActor = M.USERS.approvers[0], notifUser = M.USERS.author, roleSubmitting = false;
let reviewDraft = null, revisionDraft = null, requestDraft = null;
const conditionsCache = new Map(), chainCache = new Map();
let verifyView = null, verifiedRoutes = new Set();

const getTimeText = value => value ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(new Date(value)).replace(/\. /g, '.').replace(/\.$/, '') + ' KST' : '';
const getChangedAt = work => work.events.at(-1)?.at || M.getLatestVersion(work).createdAt;
const getSizeText = bytes => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
const showBadge = (label, tone = 'neutral') => `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
const showStatusBadge = version => { const s = M.getStatus(version); return showBadge(s.label, s.tone); };
const showLink = (hash, text, className = '', extra = '') => `<a href="${escapeHtml(hash)}" data-route="${escapeHtml(hash)}" class="${className}" ${extra}>${text}</a>`;
const getWorkRoute = (work, tab = 'overview') => `#work/${work.id}/${tab}`;
const showLogo = className => `<img class="${className}" src="icons/icon-128.png" alt="">`;
const showBrand = () => `<a class="brand" href="#works" data-route="#works" aria-label="HAVE 내 작업">${showLogo('brand-mark')}<span class="brand-name">HAVE</span></a>`;
const isRoleRoute = hash => /(?:^#(?:review-queue|approval-queue)$|\/(?:review|approval)(?:\/\d+)?$)/.test(hash);
const isAuthorWork = hash => hash.startsWith('#work/') && !isRoleRoute(hash);
const getCurrentWork = () => M.getWork(state, route.split('/')[1]);
const getRoleActor = () => route.includes('approval') ? approverActor : reviewerActor;
const getCurrentUser = () => isRoleRoute(route) ? getRoleActor() : route === '#notifications' ? notifUser : M.USERS.author;

function showToast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500); }
function announce(message) { $('#announcer').textContent = message; }
function showHeading(title, description, action = '', eyebrow = '') { return `<div class="heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1 tabindex="-1">${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</div>`; }
function showNotice(title, text, tone = '', extra = '') { return `<div class="notice ${tone}">${showIcon('info')}<div><strong>${escapeHtml(title)}</strong>${text}${extra}</div></div>`; }
function showField(name, label, value, o = {}) {
  const e = (o.errors || {})[name];
  const attributes = `id="${name}" name="${name}" ${o.required === false ? '' : 'required'} ${e ? `aria-invalid="true" aria-describedby="${name}-error"` : ''} ${o.readonly ? 'readonly' : ''}`;
  return `<label class="field" for="${name}"><span>${label}${o.required === false ? ' <small class="reg-optional">선택</small>' : ' <small class="required">필수</small>'}</span>${o.multiline
    ? `<textarea ${attributes} maxlength="${o.max || 2000}" placeholder="${escapeHtml(o.placeholder || '')}">${escapeHtml(value || '')}</textarea>`
    : `<input type="text" ${attributes} value="${escapeHtml(value || '')}" maxlength="${o.max || 100}" placeholder="${escapeHtml(o.placeholder || '')}">`}${o.hint ? `<small class="muted" style="display:block;margin-top:8px">${escapeHtml(o.hint)}</small>` : ''}${e ? `<small id="${name}-error" class="field-error" role="alert" style="color:var(--color-danger);display:block;margin-top:8px">${escapeHtml(e)}</small>` : ''}</label>`;
}
function showContributions(version) {
  const c = version.contributions.map(x => `<li><b>${escapeHtml(M.STAGES[x.stage])} · ${escapeHtml(M.ACTOR_TYPES[x.actorType])}</b> ${escapeHtml(x.note)}</li>`).join('');
  const e = version.evidence.map(x => `<li><b>${escapeHtml(M.EVIDENCE_TYPES[x.type])}</b> ${escapeHtml(x.title)}${x.uri ? ` · <span class="mono small">${escapeHtml(x.uri)}</span>` : ''}${x.fileHash ? ` · <span class="mono small">${escapeHtml(x.fileHash.slice(0, 12))}…</span>` : ''}</li>`).join('');
  return `<div class="stack"><div><div class="detail-label">기여 기록</div><ul class="plain-list">${c}</ul></div>${e ? `<div><div class="detail-label">근거자료</div><ul class="plain-list">${e}</ul></div>` : ''}</div>`;
}
const viewHelpers = { escapeHtml, showIcon, showLink, showNotice, showBadge, getTimeText, getWorkRoute, showContributions };
function showFootnote() { return `<footer class="footnote">${showIcon('info')}<span>로컬 시연 · 이 브라우저의 확장 프로그램 저장소에만 저장됩니다. 계정 전환은 시연용이며 서버 계정·전자서명은 연결되어 있지 않습니다.</span></footer>`; }

// ── 배지·동기화 ───────────────────────────────────────────────
function setExtensionBadge() {
  if (!state?.works || !globalThis.chrome?.runtime?.sendMessage) return;
  try { chrome.runtime.sendMessage({ type: 'HAVE_BADGE_UPDATE', count: M.getWorks(state, '', 'attention').length }).catch(() => {}); } catch {}
}
function openCurrentRouteInTab() {
  const hash = route || '#works';
  if (globalThis.chrome?.runtime?.sendMessage) chrome.runtime.sendMessage({ type: 'HAVE_OPEN_TAB', hash }).catch(() => {});
  else window.open(location.href.split('#')[0] + hash, '_blank', 'noopener');
}
if (syncChannel) {
  syncChannel.onmessage = async event => {
    if (!event?.data || event.data.revision === storeRevision || dirty || saving || fileChecking || roleSubmitting) return;
    try {
      const stored = await store.getStored();
      if (stored && stored.revision !== storeRevision && stored.data?.schema === 2) { state = stored.data; storeRevision = stored.revision; render(); setExtensionBadge(); }
    } catch {}
  };
}

// ── 공통 틀 ──────────────────────────────────────────────────
function showNav() {
  const attention = M.getWorks(state, '', 'attention').length;
  const reviewCount = M.USERS.reviewers.reduce((t, a) => t + R.getPendingWorks(state, 'review', a).length, 0);
  const approvalCount = M.USERS.approvers.reduce((t, a) => t + R.getPendingWorks(state, 'approval', a).length, 0);
  const unread = M.getUnreadCount(state, notifUser);
  return `<nav class="navigation" aria-label="주 메뉴">${[
    ['#works', 'grid', '내 작업', state.works.length], ['#attention', 'clock', '내 확인 필요', attention], ['#notifications', 'bell', '알림', unread], ['#certificates', 'award', '승인 증명서', '']
  ].map(([hash, glyph, label, count]) => showNavLink(hash, glyph, label, count, route === hash || (hash === '#works' && isAuthorWork(route)))).join('')}<div class="nav-group-label">역할 시연</div>
  ${showNavLink('#review-queue', 'edit', '검토할 작업', reviewCount, route === '#review-queue' || /\/review$/.test(route))}
  ${showNavLink('#approval-queue', 'shield', '승인할 작업', approvalCount, route === '#approval-queue' || /\/approval(\/\d+)?$/.test(route))}</nav>`;
}
function showNavLink(hash, glyph, label, count, current) {
  return showLink(hash, `${showIcon(glyph)}${label}${count === '' ? '' : `<span class="count">${count}</span>`}`, `nav-link ${current ? 'active' : ''}`, current ? 'aria-current="page"' : '');
}
function showMobileDock() {
  return `<nav class="mobile-dock" aria-label="작업 메뉴">
    ${showLink('#works', showIcon('grid') + '내 작업', 'dock-link', route === '#works' || isAuthorWork(route) ? 'aria-current="page"' : '')}
    ${showLink('#notifications', showIcon('bell') + '알림', 'dock-link', route === '#notifications' ? 'aria-current="page"' : '')}
    ${showLink('#certificates', showIcon('award') + '증명서', 'dock-link', route === '#certificates' ? 'aria-current="page"' : '')}
    <button type="button" class="dock-link" data-action="menu" aria-haspopup="dialog">${showIcon('menu')}메뉴</button></nav>`;
}
function showShell(body, label = '내 작업') {
  const user = getCurrentUser();
  const role = isRoleRoute(route) ? (route.includes('approval') ? '최종 승인자 · 역할 시연' : '검토자 · 역할 시연') : user === M.USERS.author ? '작성자' : '알림 보기';
  return `<div class="shell"><aside class="sidebar">${showBrand()}<div style="margin-top:48px"><div class="side-label">작업 공간</div>${showNav()}</div><div class="sidebar-bottom"><button class="side-guide" data-action="guide">${showIcon('book')}HAVE 사용 가이드${showIcon('chevron')}</button><div class="side-footer">HAVE · EXTENSION 1123</div></div></aside>
  <div class="content-shell"><header class="topbar"><button class="btn icon-only mobile-menu" data-action="menu" aria-label="주 메뉴 열기" aria-haspopup="dialog">${showIcon('menu')}</button><div class="breadcrumb"><span>HAVE</span>${showIcon('chevron')}<strong>${escapeHtml(label)}</strong></div>
  <div class="top-actions"><button type="button" class="btn icon-only ext-popout-btn" data-action="open-tab" title="새 탭에서 크게 보기" aria-label="새 탭에서 크게 보기">${showIcon('external')}</button><span class="demo-tag">LOCAL EXTENSION</span><div class="profile"><span class="avatar">${escapeHtml(user[0])}</span><span>${escapeHtml(user)}<small>${role}</small></span></div></div></header>
  ${storageError ? `<div role="alert" class="storage-alert">${escapeHtml(storageError)} <button class="btn" data-action="retry-save">다시 저장</button></div>` : ''}<main id="main" class="main">${body}${showFootnote()}</main></div>${showMobileDock()}</div>`;
}

// ── 작업 목록 ────────────────────────────────────────────────
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

// ── 작업 상세 ────────────────────────────────────────────────
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

// ── 등록 마법사 (UC01·02·03) ──────────────────────────────────
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

// ── 검토 다시 요청 (SUBMITTED) ─────────────────────────────────
function showRequestAgain(work) {
  const v = M.getLatestVersion(work);
  if (v.status !== 'SUBMITTED') return showNotice('검토를 다시 요청할 수 있는 상태가 아니에요', '검토 요청을 취소한 작업에서만 쓸 수 있어요.', 'neutral');
  if (!requestDraft || requestDraft.workId !== work.id) requestDraft = { ...REG.getEmptyForm(work), workId: work.id, riskScores: [...v.risk.scores], rationale: v.risk.rationale, reviewer: v.canceledRequests.at(-1)?.reviewer || '', approver: v.canceledRequests.at(-1)?.approver || '' };
  return `<form id="request-form" class="stack" novalidate style="max-width:760px">
    <section class="panel"><div class="panel-head"><h2>위험 분석</h2></div><div class="panel-body">${REG.showRiskStep(requestDraft, editorErrors, getRegContext())}</div></section>
    <section class="panel"><div class="panel-head"><h2>검토 요청</h2></div><div class="panel-body">${REG.showRequestStep(requestDraft, editorErrors, getRegContext())}</div></section>
    <div class="row wrap"><button type="submit" class="btn primary">검토 요청${showIcon('arrow')}</button>${showLink(getWorkRoute(work), '취소', 'btn')}</div></form>`;
}

// ── 이해 확인 (UC03) ─────────────────────────────────────────
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

// ── 수정본 재제출 (UC05) ─────────────────────────────────────
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

// ── 증명서 (UC07) ─────────────────────────────────────────────
function showCertificate(work, selected) {
  const approved = work.versions.filter(v => v.certificate);
  if (!approved.length) return `<section class="panel empty">${showIcon('award')}<h2>아직 발급된 증명서가 없어요</h2><p>검토 통과와 최종 승인이 끝나면 증명서가 자동으로 발급돼요.</p>${showLink(getWorkRoute(work, 'overview'), '진행 상황 보기', 'btn primary')}</section>`;
  const v = approved.find(x => x.n === Number(selected)) || approved.at(-1), c = v.certificate;
  const picker = approved.length > 1 ? `<label class="field" for="certificate-version"><span>증명서 버전</span><select id="certificate-version">${approved.map(x => `<option value="${x.n}" ${x.n === v.n ? 'selected' : ''}>v${x.n} · ${M.EFFECT[M.getEffect(work, x)].label}${M.getLatestInfo(work, x).isLatest ? '' : ' · 후속 버전 있음'}</option>`).join('')}</select></label>` : '';
  if (c.signingState === 'PENDING') return picker + showNotice('증명서를 발급하는 중이에요', '최종 승인 뒤 발급 요청이 처리되고 있어요. 잠시 뒤 자동으로 바뀌어요.', 'neutral');
  if (c.signingState === 'FAILED') return picker + `<div class="notice error">${showIcon('info')}<div><strong>승인은 완료됐지만 증명서 발급에 실패했어요</strong>${escapeHtml(c.lastError)} (시도 ${c.attempts}회)</div></div><div class="space-top"><button class="btn primary" data-action="retry-issue" data-version="${v.n}">${showIcon('refresh')}발급 다시 시도</button></div>`;
  const p = M.getPublicSummary(work, v), e = M.EFFECT[p.effect];
  return `<article class="receipt panel" style="max-width:820px;margin:auto"><div class="panel-body">${picker}<div class="receipt-header row between"><div><h2>인간 승인 증명서</h2></div>${showLogo('receipt-brand')}</div>
    <div class="row between wrap space-top">${showBadge(e.label, e.tone)} ${showBadge('발급 완료 · 시연', 'success')}<span class="small muted">${escapeHtml(p.serial)}</span></div><h3 class="receipt-title">${escapeHtml(work.title)}</h3>
    <dl class="definition"><dt>승인 대상</dt><dd>v${v.n} · ${escapeHtml(p.fileName)}</dd><dt>검토자</dt><dd>${escapeHtml(p.reviewer)}</dd><dt>최종 승인자</dt><dd>${escapeHtml(p.approver)}</dd><dt>승인 시각</dt><dd>${getTimeText(p.approvedAt)}</dd><dt>발급 시각</dt><dd>${getTimeText(p.issuedAt)}</dd><dt>승인 효력</dt><dd>${e.label}${p.revokedAt ? ` · ${getTimeText(p.revokedAt)} · ${escapeHtml(p.revocationReason)}` : ''}</dd><dt>최신 버전</dt><dd>${p.isLatest ? '이 버전이 최신이에요' : `후속 버전 v${p.latestN} 있음`}</dd></dl>
    ${!p.isLatest ? `<div class="space-top">${showNotice('이 버전 뒤에 새 버전이 있어요', `최신 버전은 v${p.latestN}입니다. 이 승인 기록은 v${v.n}에만 연결되고 새 버전으로 이어지지 않아요${p.effect === 'REVOKED' ? '. v' + v.n + '의 승인은 철회됐어요' : ''}.`, 'warning')}</div>` : ''}
    <div class="hash-details"><h3>승인 파일의 SHA-256</h3><p class="mono">${escapeHtml(p.fileHash)}</p><h3>증명서 내용 해시 (payload)</h3><p class="mono">${escapeHtml(p.payloadHash)}</p></div>
    ${showNotice('기록된 승인과 파일의 연결', '내용의 정확성이나 실제 이해 수준을 보증하지 않습니다. 전자서명과 서버는 연결되지 않은 시연 증명서입니다.', 'neutral')}
    <div class="receipt-bottom row wrap space-top"><button class="btn" data-action="download-certificate" data-version="${v.n}">${showIcon('download')}증명서 받기</button><button class="btn" data-action="print-certificate">인쇄 · PDF 저장</button></div></div></article>
    ${showShareLinks(work, v)}`;
}
function showShareLinks(work, v) {
  const links = v.certificate.links;
  return `<section class="panel" style="max-width:820px;margin:16px auto 0"><div class="panel-head"><h2>공유 링크</h2>${showIcon('link')}</div><div class="panel-body stack">
    <p class="small muted">링크를 받은 사람은 로그인 없이 승인 효력과 파일 일치를 확인해요. 링크 주소는 만든 직후에만 보이고, 이 브라우저에는 해시만 남아요. 시연에서는 같은 브라우저에서만 열려요.</p>
    <form id="link-form" class="row wrap" data-version="${v.n}"><label class="field"><span>만료</span><select name="days"><option value="7">7일 뒤</option><option value="30" selected>30일 뒤</option><option value="0">만료 없음</option></select></label><button type="submit" class="btn primary">${showIcon('plus')}공유 링크 만들기</button></form>
    ${links.length ? `<table style="width:100%;border-collapse:collapse"><thead><tr><th scope="col">링크</th><th scope="col">만든 시각</th><th scope="col">만료</th><th scope="col">상태</th><th scope="col"></th></tr></thead><tbody>${links.map(l => { const st = M.getLinkState(l); return `<tr><td class="mono small">${escapeHtml(l.id)}</td><td class="small">${getTimeText(l.createdAt)}</td><td class="small">${l.expiresAt ? getTimeText(l.expiresAt) : '없음'}</td><td>${showBadge({ ACTIVE: '사용 중', EXPIRED: '만료', DISABLED: '중지' }[st], st === 'ACTIVE' ? 'success' : 'neutral')}</td><td class="row">${l.demoToken && st === 'ACTIVE' ? showLink('#verify/' + l.demoToken, '공개 검증 열기', 'btn text') : ''}${st === 'ACTIVE' ? `<button class="btn text" data-action="disable-link" data-version="${v.n}" data-link="${escapeHtml(l.id)}">중지</button>` : ''}</td></tr>`; }).join('')}</tbody></table>` : '<p class="small muted">아직 만든 링크가 없어요.</p>'}
  </div></section>`;
}

// ── 버전 · 이력 (UC09) ────────────────────────────────────────
function getChainKey(work) { return work.id + ':' + work.events.length + ':' + (work.events.at(-1)?.eventHash || ''); }
function showHistory(work) {
  const versions = [...work.versions].reverse();
  const key = getChainKey(work);
  if (!chainCache.has(key)) M.isChainValid(work).then(ok => { chainCache.set(key, ok); if (route.endsWith('/history')) render(); });
  const chain = chainCache.get(key);
  return `<div class="split"><section class="panel"><div class="panel-head"><h2>버전별 기록</h2><span class="small muted">${versions.length}개 버전</span></div>
    <div class="panel-body stack">${versions.map(v => `<section class="version-record"><div class="row between wrap"><h3>v${v.n}${v.n === M.getLatestVersion(work).n ? ' · 현재 버전' : ''}</h3><span>${showStatusBadge(v)}${showEffectBadge(work, v)}</span></div>
      <p class="detail-value space-top">${escapeHtml(v.changeReason || (v.n > 1 && work.versions[v.n - 2].revisionRound?.changeNote) || '최초 등록')}</p><p class="small muted">${escapeHtml(v.file.name)}<br>${getTimeText(v.createdAt)}</p>
      ${v.review?.feedbackItems?.length ? `<p class="small space-top"><strong>보완 요청</strong><br>${v.review.feedbackItems.map(f => `· ${escapeHtml(f.section)}: ${escapeHtml(f.content)}`).join('<br>')}</p>` : ''}
      <div class="pdf-actions"><button class="btn" data-action="view-file" data-version="${v.n}">PDF 원문 보기</button>${v.certificate?.signingState === 'READY' ? showLink(getWorkRoute(work, 'certificate') + '/' + v.n, '이 버전의 증명서', 'btn') : ''}</div>
      <details class="hash-details"><summary>파일 해시 보기</summary><p class="mono">${escapeHtml(v.file.hash)}</p></details></section>`).join('')}</div></section>
    <section class="panel"><div class="panel-head"><h2>활동 이력</h2>${chain === undefined ? showBadge('해시 체인 확인 중') : chain ? showBadge('기록 해시 체인 정상', 'success') : showBadge('기록 해시 체인 불일치', 'danger')}</div>
      <div class="panel-body"><p class="small muted">이력은 추가만 할 수 있고, 각 기록은 직전 기록의 해시를 담아요. 중간 기록이 바뀌거나 지워지면 체인이 깨져요.</p><div class="row wrap history-controls">
        <label class="field"><span>버전</span><select id="history-version"><option value="">모든 버전</option>${versions.map(v => `<option value="${v.n}">v${v.n}</option>`).join('')}</select></label>
        <label class="field"><span>기록 유형</span><select id="history-type"><option value="">모든 유형</option><option value="work">등록 · 이해 확인</option><option value="review">검토</option><option value="approval">승인 · 발급 · 철회</option><option value="verify">공개 검증</option></select></label>
      </div><div id="history-events">${showEvents(work.events)}</div></div></section></div>`;
}
function showEvents(events) {
  if (!events.length) return '<p class="small muted">선택한 조건의 활동이 없어요.</p>';
  return `<ol class="timeline">${events.slice().reverse().map(e => `<li><b>${escapeHtml(M.ACTIONS[e.action][0])}</b><p>${e.n ? 'v' + e.n + ' · ' : ''}${escapeHtml(e.actor || (e.action === 'VERIFY' ? '외부 검증자 (익명)' : '시스템'))}<br>${getTimeText(e.at)}</p>${e.note ? `<p class="detail-value">${escapeHtml(e.note)}</p>` : ''}<p class="mono small muted" title="기록 해시">#${escapeHtml((e.eventHash || '').slice(0, 16))}</p></li>`).join('')}</ol>`;
}
function setHistoryFilter() {
  const version = $('#history-version').value, type = $('#history-type').value;
  const events = getCurrentWork().events.filter(e => (!version || Number(version) === e.n) && (!type || M.ACTIONS[e.action][1] === type));
  $('#history-events').innerHTML = showEvents(events);
  announce(`활동 ${events.length}건`);
}

// ── 승인 증명서 목록 · 알림 ────────────────────────────────────
function showCertificates() {
  const rows = state.works.flatMap(w => w.versions.filter(v => v.certificate).map(v => ({ w, v })));
  return showHeading('승인 증명서', '어떤 파일 버전이 승인됐는지, 지금도 유효한지 확인하세요.', '', 'APPROVAL RECORDS') + `<section class="panel">${rows.length ? rows.map(({ w, v }) => { const e = M.EFFECT[M.getEffect(w, v)], s = M.SIGNING[v.certificate.signingState]; return `<div class="panel-body row between wrap" style="border-bottom:1px solid var(--color-border)"><div class="grow"><div class="row wrap"><h2 style="font-size:16px">${escapeHtml(w.title)}</h2>${showBadge('v' + v.n)}${showBadge(s.label, s.tone)}${showBadge(e.label, e.tone)}</div><p class="small muted" style="margin-top:8px">${escapeHtml(v.certificate.serial || '발급 전')} · 승인 ${getTimeText(v.approval.approvedAt)}</p></div>${showLink(getWorkRoute(w, 'certificate') + '/' + v.n, '증명서 보기' + showIcon('arrow'), 'btn')}</div>`; }).join('') : `<div class="empty">${showIcon('award')}<h2>아직 승인된 버전이 없어요</h2><p>최종 승인 후 이곳에서 확인할 수 있어요.</p>${showLink('#works', '내 작업 보기', 'btn')}</div>`}</section>`;
}
function showNotifications() {
  const users = [[M.USERS.author, '작성자'], ...M.USERS.reviewers.map(u => [u, '검토자']), ...M.USERS.approvers.map(u => [u, '최종 승인자'])];
  const list = M.getNotifications(state, notifUser);
  return showHeading('알림', '검토 요청, 수정 요청, 승인, 철회 같은 일을 받는 사람에게 알려요.', `<button class="btn" data-action="read-all" ${M.getUnreadCount(state, notifUser) ? '' : 'disabled'}>모두 읽음</button>`) +
    `<label class="field role-picker" for="notif-user"><span>시연 계정</span><select id="notif-user">${users.map(([u, r]) => `<option value="${u}" ${u === notifUser ? 'selected' : ''}>${u} · ${r} (${M.getUnreadCount(state, u)})</option>`).join('')}</select></label>
    <section class="panel">${list.length ? `<ul class="notif-list">${list.map(n => `<li data-unread="${!n.readAt}"><button type="button" data-action="read-notification" data-id="${escapeHtml(n.id)}"><span class="notif-dot" aria-hidden="true"></span><span class="grow"><span class="notif-text">${escapeHtml(M.getNotificationText(state, n))}</span><small class="muted">${getTimeText(n.createdAt)}${n.readAt ? '' : ' · 읽지 않음'}</small></span>${showIcon('chevron')}</button></li>`).join('')}</ul>` : `<div class="empty">${showIcon('bell')}<h2>알림이 없어요</h2></div>`}</section>`;
}

// ── 공개 검증 (UC08) ─────────────────────────────────────────
function showVerify(token) {
  if (!verifyView || verifyView.token !== token) {
    verifyView = { token, loading: true };
    M.getShareLink(state, token).then(async found => {
      verifyView = { token, found };
      if (found && M.getLinkState(found.link) === 'ACTIVE' && !verifiedRoutes.has(route)) {
        verifiedRoutes.add(route);
        await persist(M.recordVerification(state, found.work.id, found.version.n, found.link.id));
        verifyView.found = await M.getShareLink(state, token);
      }
      render();
    });
  }
  const top = `<header class="public-header row between">${showBrand()}${showLink('#works', '내 작업으로', 'btn')}</header>`;
  if (verifyView.loading) return top + `<main id="main" class="public-main">${showHeading('승인 기록 확인', '링크를 확인하는 중이에요.')}</main>`;
  const f = verifyView.found;
  if (!f) return top + `<main id="main" class="public-main">${showHeading('승인 기록을 찾을 수 없어요', '링크 주소가 맞는지 확인해 주세요. 시연에서는 링크를 만든 브라우저에서만 열려요.')}</main>`;
  const st = M.getLinkState(f.link);
  if (st !== 'ACTIVE') return top + `<main id="main" class="public-main">${showHeading(st === 'EXPIRED' ? '만료된 링크예요' : '공유가 중지된 링크예요', '증명서를 공유한 사람에게 새 링크를 요청해 주세요.')}</main>`;
  const p = M.getPublicSummary(f.work, f.version), e = M.EFFECT[p.effect];
  const fileState = comparison?.loading ? 'checking' : comparison?.error ? 'error' : comparison ? (comparison.match ? 'match' : 'mismatch') : 'idle';
  const fileSummary = { checking: '파일 비교 중', error: '파일 확인 불가', idle: '파일 미확인', match: `선택 파일은 v${p.n}과 일치`, mismatch: `선택 파일은 v${p.n}과 다름` }[fileState];
  const result = { checking: ['비교 중', 'progress', '파일의 SHA-256을 계산하고 있어요.'], error: ['확인 불가', 'danger', comparison?.error], idle: ['파일 미확인', 'neutral', '전달받은 PDF를 선택하면 승인 기록의 파일과 비교해요.'], match: ['파일 일치', 'success', '선택한 PDF와 승인된 파일의 해시가 같아요.'], mismatch: ['파일 불일치', 'danger', '선택한 PDF는 승인된 파일과 달라요.'] }[fileState];
  return top + `<main id="main" class="public-main">${showHeading('승인 기록 확인', '로그인 없이 승인 효력과 받은 PDF가 같은 파일인지 확인하세요.')}
    <section class="panel"><div class="panel-head"><h2>${escapeHtml(p.title)}</h2>${showBadge('v' + p.n)}</div><div class="panel-body">
      <p class="verify-summary" role="status"><strong>${escapeHtml([`v${p.n} ${e.label}`, p.isLatest ? '최신 버전' : `후속 버전 v${p.latestN} 있음`, fileSummary].join(' · '))}</strong></p>
      <div class="result-row"><div><h3>승인 효력</h3><p class="small muted">${p.effect === 'REVOKED' ? `${getTimeText(p.revokedAt)}에 철회됐어요. 사유: ${escapeHtml(p.revocationReason)}` : '이 버전의 승인이 유효해요.'} (이 브라우저의 기록 기준)</p></div>${showBadge(e.label, e.tone)}</div>
      <div class="result-row"><div><h3>최신 버전</h3><p class="small muted">${p.isLatest ? '이 증명서의 버전이 작업의 최신 버전이에요.' : `이 증명서는 v${p.n}의 기록이고, 같은 작업에 후속 버전 v${p.latestN}이 있어요. 승인은 버전을 넘어 이어지지 않아요.`} (이 브라우저의 기록 기준)</p></div>${showBadge(p.isLatest ? '최신 버전' : `후속 버전 v${p.latestN} 있음`)}</div>
      <div class="result-row"><div><h3>전자서명</h3><p class="small muted">시연 증명서는 전자서명이 없어 확인할 수 없어요. 증명서 내용 해시는 ${escapeHtml(p.payloadHash.slice(0, 16))}…예요.</p></div>${showBadge('확인 불가')}</div>
      <dl class="definition"><dt>승인 대상</dt><dd>v${p.n} · ${escapeHtml(p.fileName)}</dd><dt>최종 승인자</dt><dd>${escapeHtml(p.approver)} (시연)</dd><dt>승인 시각</dt><dd>${getTimeText(p.approvedAt)}</dd><dt>증명서 번호</dt><dd>${escapeHtml(p.serial)}</dd><dt>확인 시각</dt><dd>${getTimeText(new Date().toISOString())}</dd></dl>
      <details class="hash-details"><summary>승인된 파일 해시 보기</summary><p class="mono">${escapeHtml(p.fileHash)}</p></details></div></section>
    <section class="panel proof-card"><div class="panel-head"><h2>파일 비교</h2></div><div class="panel-body">
      <label class="proof-drop" for="compare-file">${showIcon('file')}<b>전달받은 PDF 비교하기</b><span id="compare-hint" class="muted">PDF · 최대 20 MB · 이 기기에서 해시만 계산해요</span><input id="compare-file" type="file" accept=".pdf,application/pdf" aria-describedby="compare-hint" ${comparison?.loading ? 'disabled' : ''}></label>
      <div class="proof-result" data-state="${fileState}">${showBadge(result[0], result[1])}<p>${escapeHtml(result[2])}</p>${comparison?.name ? `<p class="small muted">${escapeHtml(comparison.name)}</p>` : ''}</div>
      <div class="row wrap"><button class="btn" data-action="sample-compare-original">시연: 승인된 원본으로 비교</button><button class="btn" data-action="sample-compare-changed">시연: 1바이트 바꾼 파일로 비교</button>${comparison && !comparison.loading ? '<button class="btn text" data-action="reset-compare">비교 초기화</button>' : ''}</div></div></section>
    <p class="footnote">HAVE는 기록된 승인과 파일의 일치 여부를 보여줍니다. 내용의 정확성과 실제 이해 수준은 별도로 판단해야 합니다. 조회 사실은 작업 이력에 익명으로 남아요.<br>시연: 이 브라우저에 저장된 기록으로 판정해요. 다른 기기에서 최신 승인 효력을 조회하고 전자서명을 확인하는 것은 운영 서비스 설계예요.</p></main>`;
}

// ── 역할 시연 화면 ────────────────────────────────────────────
function getConditions(work, version) {
  const key = `${work.id}:${version.n}:${version.revision}:${approverActor}`;
  if (!conditionsCache.has(key)) {
    conditionsCache.set(key, null);
    R.getApprovalConditions(work, version, approverActor, version.revision).then(list => { conditionsCache.set(key, list); if (isRoleRoute(route)) render(); });
  }
  return conditionsCache.get(key);
}
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

// ── 화면 그리기 ───────────────────────────────────────────────
function render(focus = false) {
  if (!state) return;
  const parts = route.split('/');
  if (route.startsWith('#verify/')) $('#app').innerHTML = showVerify(parts[1]);
  else if (route === '#new') $('#app').innerHTML = showShell(showEditor(), '작업 등록');
  else if (route === '#certificates') $('#app').innerHTML = showShell(showCertificates(), '승인 증명서');
  else if (route === '#notifications') $('#app').innerHTML = showShell(showNotifications(), '알림');
  else if (route === '#review-queue' || route === '#approval-queue') $('#app').innerHTML = showRoleScreen(route === '#review-queue' ? 'review' : 'approval');
  else if (route.startsWith('#work/')) {
    const work = getCurrentWork(), tab = parts[2] || 'overview';
    if (!work) $('#app').innerHTML = showShell(showHeading('작업을 찾을 수 없어요', '내 작업 목록에서 다시 선택해 주세요.') + showLink('#works', '내 작업으로', 'btn'));
    else if (tab === 'review' || tab === 'approval') $('#app').innerHTML = showRoleScreen(tab, work, parts[3]);
    else {
      const labels = { overview: '작업 상세', challenge: '이해 확인', certificate: '증명서', history: '버전 · 이력', revise: '수정본 재제출', request: '검토 다시 요청' };
      const content = { challenge: () => showChallenge(work), certificate: () => showCertificate(work, parts[3]), history: () => showHistory(work), revise: () => showRevise(work), request: () => showRequestAgain(work) }[tab]?.() ?? showOverview(work);
      const tabs = ['overview', 'challenge', 'certificate', 'history'].includes(tab) ? showDetailTabs(work, tab) : '';
      $('#app').innerHTML = showShell(showHeading(labels[tab] || '작업 상세', work.title, showLink(tab === 'revise' || tab === 'request' ? getWorkRoute(work) : '#works', tab === 'revise' || tab === 'request' ? '작업으로' : '목록으로', 'btn')) + showContext(work) + tabs + content, labels[tab]);
    }
  } else $('#app').innerHTML = showShell(showWorkList(), route === '#attention' ? '내 확인 필요' : '내 작업');
  document.title = 'HAVE · ' + ($('#app h1')?.textContent || '내 작업');
  if (focus) { $('#main h1')?.focus(); window.scrollTo(0, 0); }
}

async function confirmDialog(title, text, confirmLabel = '이동하기', cancelLabel = '계속 작성') {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = ''; dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><div class="dialog-head"><h2 id="dialog-title">${escapeHtml(title)}</h2><button class="btn icon-only" value="cancel" aria-label="닫기">${showIcon('close')}</button></div><div class="dialog-body"><p style="white-space:pre-line">${escapeHtml(text)}</p></div><div class="dialog-actions"><button class="btn" value="cancel" autofocus>${escapeHtml(cancelLabel)}</button><button class="btn primary" value="confirm">${escapeHtml(confirmLabel)}</button></div></form>`;
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => { previous?.isConnected && previous.focus(); resolve(dialog.returnValue === 'confirm'); }, { once: true }));
}
async function promptDialog(title, text, label, confirmLabel) {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = ''; dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><div class="dialog-head"><h2 id="dialog-title">${escapeHtml(title)}</h2><button class="btn icon-only" value="cancel" aria-label="닫기">${showIcon('close')}</button></div><div class="dialog-body"><p>${escapeHtml(text)}</p><label class="field"><span>${escapeHtml(label)}</span><textarea id="prompt-value" maxlength="500"></textarea></label></div><div class="dialog-actions"><button class="btn" value="cancel">취소</button><button class="btn primary" value="confirm">${escapeHtml(confirmLabel)}</button></div></form>`;
  dialog.showModal(); $('#prompt-value').focus();
  return new Promise(resolve => dialog.addEventListener('close', () => { const v = $('#prompt-value')?.value || ''; previous?.isConnected && previous.focus(); resolve(dialog.returnValue === 'confirm' ? v : null); }, { once: true }));
}
function showLinkDialog(url) {
  const dialog = $('#dialog');
  dialog.className = '';
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">공유 링크를 만들었어요</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${showIcon('close')}</button></div><div class="dialog-body"><p>이 주소는 지금만 볼 수 있어요. 복사해 두세요.</p><p class="mono" style="word-break:break-all">${escapeHtml(url)}</p></div><div class="dialog-actions"><button class="btn" data-action="copy-text" data-text="${escapeHtml(url)}">${showIcon('link')}복사</button>${showLink('#verify/' + url.split('#verify/')[1], '공개 검증 열기', 'btn primary')}</div>`;
  dialog.showModal();
}

/** 역할 화면 주소로 들어오면 그 버전의 지정 검토자·최종 승인자로 시연 역할을 맞춘다. */
function setActorFromRoute(hash) {
  const parts = hash.split('/');
  if (!hash.startsWith('#work/') || !['review', 'approval'].includes(parts[2])) return;
  const work = M.getWork(state, parts[1]), v = work && (parts[3] ? M.getVersion(work, parts[3]) : M.getLatestVersion(work));
  if (v?.request) { if (parts[2] === 'review') reviewerActor = v.request.reviewer; else approverActor = v.request.approver; }
}
async function go(hash, skipGuard = false) {
  if (saving || fileChecking || roleSubmitting) { showToast('처리가 끝난 뒤 이동해 주세요.'); return; }
  if (dirty && !skipGuard && !(await confirmDialog('저장하지 않은 내용이 있어요', '이동하면 마지막 저장 이후의 입력은 사라져요. 계속 이동할까요?'))) return;
  dirty = false; storageError = ''; savedAt = ''; compareRequest++; comparison = null; conflictSnapshot = null; editorErrors = {};
  if (hash !== '#new') { editor = null; editorStep = 0; }
  answerDraft = null; questionIndex = 0; reviewDraft = null; revisionDraft = null; requestDraft = null; verifyView = null;
  route = hash;
  if (hash === '#attention') filter = 'attention'; else if (hash === '#works') filter = 'all';
  if (hash === '#review-queue' && !R.getPendingWorks(state, 'review', reviewerActor).length) reviewerActor = M.USERS.reviewers.find(a => R.getPendingWorks(state, 'review', a).length) || reviewerActor;
  if (hash === '#approval-queue' && !R.getPendingWorks(state, 'approval', approverActor).length) approverActor = M.USERS.approvers.find(a => R.getPendingWorks(state, 'approval', a).length) || approverActor;
  setActorFromRoute(hash);
  const parts = hash.split('/');
  if (hash.endsWith('/revise')) {
    const work = M.getWork(state, parts[1]);
    if (work && M.getLatestVersion(work).revisionRound?.state === 'OPEN') await persist(M.openRevision(state, work.id));
  }
  history.pushState(null, '', hash); render(true);
}

async function persist(next) {
  if (saving) return false;
  saving = true; announce('기록을 저장하는 중');
  try {
    await M.sealEvents(next);
    storeRevision = await store.save(next, storeRevision);
    state = next; storageError = '';
    announce('저장 완료'); setExtensionBadge();
    syncChannel?.postMessage({ revision: storeRevision, route });
    return true;
  } catch (error) {
    storageError = error.name === 'ConflictError' ? '다른 창에서 변경한 기록이 있어요. 현재 입력은 보존됐어요. 최신 기록을 불러온 뒤 다시 저장해 주세요.' : '기록을 저장하지 못했어요. 입력은 유지됐어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
    if (error.name === 'ConflictError') conflictSnapshot = await store.getStored();
    announce(storageError); showToast(storageError); return false;
  } finally { saving = false; }
}

/** 최종 승인·발급 재시도 뒤 발급 요청을 처리한다 (CertificateIssueObserver → Outbox). */
function scheduleOutbox(delay = 1500) {
  setTimeout(async () => {
    if (saving) { scheduleOutbox(500); return; }
    const { state: next, changed } = await R.processOutbox(state);
    if (changed && await persist(next)) {
      const failed = next.works.some(w => w.versions.some(v => v.certificate?.signingState === 'FAILED' && v.certificate.lastError));
      render(); showToast(failed ? '증명서 발급에 실패했어요. 증명서 탭에서 다시 시도해 주세요.' : '증명서가 발급됐어요.');
    }
  }, delay);
}

// ── 입력 읽기 ────────────────────────────────────────────────
function setEditorFromPage() { if (editor) REG.setFormFromPage(document, editor); }
function setAnswersFromPage() {
  if (!answerDraft) return;
  if ($('#answer')) answerDraft.answers[questionIndex] = $('#answer').value;
  const c = document.querySelector('[name="confidence"]:checked');
  if (c) answerDraft.confidence[questionIndex] = c.value;
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
/** 근거자료 편집기를 쓰는 화면의 입력값 — 등록 마법사(editor) 또는 수정본 재제출(revisionDraft.basis, 11-23) */
function getEvidenceForm(el) {
  if (el.closest('#revise-form')) { setRevisionFromPage(); revisionDraft.basisOpen = true; return revisionDraft.basis; }
  setEditorFromPage(); return editor;
}
function setReviewFromPage() {
  const form = $('#role-review');
  if (form && reviewDraft) Object.assign(reviewDraft, V.getReviewInput(form, reviewDraft.evaluations.length));
}

async function saveDraft() {
  setEditorFromPage();
  const next = structuredClone(state); next.draft = { ...structuredClone(editor), savedAt: new Date().toISOString() };
  if (await persist(next)) { dirty = false; savedAt = '임시 저장됨 · ' + getTimeText(new Date().toISOString()); render(); showToast('작성 중인 작업을 저장했어요.'); } else render();
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

function showGuide(menu = false) {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = menu ? 'menu-dialog' : '';
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${menu ? 'HAVE 메뉴' : 'HAVE 사용 가이드'}</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${showIcon('close')}</button></div><div class="dialog-body">${menu ? showNav() + `<button class="btn" data-action="open-tab">${showIcon('external')}새 탭에서 크게 보기</button>` : `<ol>
    <li><b>작업 등록</b>PDF → AI 사용 신고 → 기여 기록·근거자료 → 위험 분석 → 검토 요청(검토자·최종 승인자 지정) 순서로 입력해요.</li>
    <li><b>이해 확인</b>위험 등급에 따라 1~3문항이 배정돼요. 답변과 확신 정도를 입력하고 제출해요. 검토 시작 전에는 요청을 취소할 수 있어요.</li>
    <li><b>검토</b>검토자는 ‘검토 시작’으로 파일 해시를 대조한 뒤 점수·근거·체크리스트·보완 요청을 입력해요.</li>
    <li><b>수정본 재제출</b>피드백마다 반영 여부와 답변을 적고 새 파일을 올리면 다음 버전이 바로 검토 대기가 돼요.</li>
    <li><b>최종 승인 · 반려 · 철회</b>최종 승인자가 승인하면 증명서가 자동 발급돼요. 승인 뒤에도 철회할 수 있어요.</li>
    <li><b>공유와 검증</b>증명서 탭에서 공유 링크를 만들면, 받은 사람이 승인 효력과 파일 일치를 확인해요.</li></ol>
    <h3 class="space-top">시연 설정</h3><label class="row"><input type="checkbox" data-action="toggle-fail-demo" ${state.demo?.failNextIssue ? 'checked' : ''}>다음 증명서 발급을 한 번 실패시키기</label>
    <p class="small muted">발급 실패와 재시도(UC07)를 볼 때 켜요.</p><button class="btn space-top" data-action="reset-demo">시연 데이터 처음으로</button>`}</div>`;
  dialog.showModal(); dialog.addEventListener('close', () => previous?.isConnected && previous.focus(), { once: true });
}
function download(data, name, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function openPdf(version) {
  const url = URL.createObjectURL(new Blob([core.getBytes(version.file.data)], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); showToast('복사했어요.'); }
  catch { showToast('복사하지 못했어요. 주소를 직접 선택해 복사해 주세요.'); }
}
async function readPdf(file) {
  if (file.size > core.MAX_PDF_BYTES) throw new Error('20 MB 이하의 PDF를 선택해 주세요.');
  return M.prepareFile(file.name, new Uint8Array(await file.arrayBuffer()));
}
async function chooseFile(file) {
  if (!file || !editor || fileChecking) return;
  setEditorFromPage(); fileChecking = true; delete editorErrors.file; render();
  try { editor.file = await readPdf(file); dirty = true; announce('파일 확인 완료'); }
  catch (error) { editorErrors.file = error.message; }
  finally { fileChecking = false; render(); }
}
async function compareFile(file) {
  if (!file || !verifyView?.found) return;
  const request = ++compareRequest, p = M.getPublicSummary(verifyView.found.work, verifyView.found.version);
  comparison = { loading: true }; render();
  try { const f = await readPdf(file); if (request !== compareRequest) return; comparison = { match: f.hash === p.fileHash, name: f.name }; }
  catch (error) { if (request !== compareRequest) return; comparison = { error: error.message }; }
  if (request === compareRequest) { render(); announce(comparison.error || (comparison.match ? '파일 일치' : '파일 불일치')); }
}

// ── 역할 결정 (검토 · 승인 · 반려 · 철회) ──────────────────────────
async function runRoleDecision(event) {
  if (roleSubmitting || saving) return;
  const form = event.target, mode = form.dataset.roleMode, decision = event.submitter?.value, work = getCurrentWork();
  roleSubmitting = true;
  try {
    let next, message;
    if (mode === 'review') {
      setReviewFromPage();
      const v = M.getLatestVersion(work);
      const label = decision === 'PASS' ? '검토 통과' : '수정 요청';
      if (decision === 'REVISION_REQUIRED') { const b = R.getRevisionBlockers(reviewDraft); if (b.length) throw new Error(b.join(' ')); }
      if (!(await confirmDialog(label + '을 기록할까요?', `${work.title} · v${v.n} · ${reviewerActor}\n결정은 바꿀 수 없어요.`, label, '취소'))) return;
      next = decision === 'PASS' ? await R.submitReview(state, work.id, reviewerActor, reviewDraft) : await R.requestRevision(state, work.id, reviewerActor, reviewDraft);
      message = label + ' 기록을 저장했어요.';
    } else if (mode === 'approval') {
      const v = M.getLatestVersion(work), expectedRevision = Number(form.dataset.revision);
      if (decision === 'APPROVE') {
        if (!(await confirmDialog('최종 승인할까요?', `${work.title} · v${v.n} · ${v.file.name}\n승인하면 증명서 발급이 요청되고, 승인 뒤에는 철회만 할 수 있어요.`, '최종 승인', '취소'))) return;
        next = await R.approve(state, work.id, approverActor, { expectedRevision, decisionKey: core.createId('key') });
        message = '최종 승인을 기록했어요. 증명서를 발급하는 중이에요.';
      } else {
        const reason = new FormData(form).get('reason') || '';
        if (!reason.trim()) throw new Error('반려 사유를 입력해 주세요.');
        if (!(await confirmDialog('반려할까요?', `${work.title} · v${v.n}\n작성자에게 수정 요청으로 돌아가요.`, '반려', '취소'))) return;
        next = R.reject(state, work.id, approverActor, { expectedRevision, decisionKey: core.createId('key'), reason });
        message = '반려를 기록했어요.';
      }
    } else if (mode === 'revoke') {
      const n = Number(form.dataset.versionN), reason = new FormData(form).get('reason') || '';
      if (!reason.trim()) throw new Error('철회 사유를 입력해 주세요.');
      if (!(await confirmDialog('승인을 철회할까요?', `${work.title} · v${n}\n철회는 되돌릴 수 없고, 공개 검증에 ‘승인 철회’로 표시돼요.`, '승인 철회', '취소'))) return;
      next = R.revoke(state, work.id, n, approverActor, { reason, requestKey: core.createId('key') });
      message = '승인을 철회했어요.';
    }
    if (await persist(next)) { dirty = false; reviewDraft = null; render(true); showToast(message); if (mode === 'approval' && decision === 'APPROVE') scheduleOutbox(); }
    else V.showError(form, storageError);
  } catch (error) { V.showError(form, error.message); }
  finally { roleSubmitting = false; }
}

// ── 이벤트 ───────────────────────────────────────────────────
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main')?.setAttribute('tabindex', '-1'); $('#main')?.focus(); return; }
  const routeLink = event.target.closest('[data-route]'), button = event.target.closest('[data-action]');
  if (routeLink) { event.preventDefault(); if (roleSubmitting) return; if ($('#dialog').open) $('#dialog').close(); await go(routeLink.dataset.route); return; }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { filter = filterButton.dataset.filter; render(); $(`#filter-${filter}`)?.focus(); return; }
  const questionButton = event.target.closest('[data-question]');
  if (questionButton) { setAnswersFromPage(); questionIndex = Number(questionButton.dataset.question); render(); $('#question-' + questionIndex)?.focus(); return; }
  if (!button || button.disabled) return;
  const action = button.dataset.action, work = getCurrentWork();
  try {
    if (action === 'guide' || action === 'menu') showGuide(action === 'menu');
    if (action === 'close-dialog') $('#dialog').close();
    if (action === 'open-tab') { if ($('#dialog').open) $('#dialog').close(); openCurrentRouteInTab(); }
    if (action === 'clear-filter') { query = ''; filter = 'all'; render(); $('#search')?.focus(); }
    if (action === 'save-draft') await saveDraft();
    if (action === 'previous-step') { setEditorFromPage(); editorStep = Math.max(0, editorStep - 1); editorErrors = {}; render(); $('#main h1')?.focus(); }
    if (action === 'cancel-editor') await go('#works');
    if (action === 'sample-pdf') { setEditorFromPage(); editor.file = await M.prepareFile(`HAVE_sample_${Date.now() % 100000}.pdf`, M.createSamplePdf(editor.title || 'HAVE sample', String(Date.now()))); dirty = true; delete editorErrors.file; render(); }
    if (action === 'pick-tool') { const input = $('#tool'); if (input) { input.value = button.dataset.tool; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); } }
    if (action === 'add-contribution') { setEditorFromPage(); editor.contributions.push({ stage: 'DRAFT', actorType: editor.aiUsed === false ? 'HUMAN' : 'AI', note: '' }); dirty = true; render(); }
    if (action === 'remove-contribution') { setEditorFromPage(); editor.contributions.splice(Number(button.dataset.index), 1); dirty = true; render(); }
    if (action === 'add-evidence') { getEvidenceForm(button).evidence.push({ type: 'WEB_SOURCE', title: '', uri: '', fileName: '', fileHash: '' }); dirty = true; render(); }
    if (action === 'remove-evidence') { getEvidenceForm(button).evidence.splice(Number(button.dataset.index), 1); dirty = true; render(); }
    if (action === 'save-answers') await saveAnswers();
    if (action === 'cancel-request') {
      const reason = await promptDialog('검토 요청을 취소할까요?', '검토가 시작되기 전까지만 취소할 수 있어요. 검토자에게 알림이 가고, 작업은 ‘제출 완료’로 돌아가요.', '취소 사유', '요청 취소');
      if (reason === null) return;
      const next = M.cancelRequest(state, work.id, reason);
      if (await persist(next)) { answerDraft = null; await go(getWorkRoute(work), true); showToast('검토 요청을 취소했어요.'); }
    }
    if (action === 'new-version') {
      if (state.draft && !(await confirmDialog('임시 저장한 작업이 있어요', '새 버전을 작성해도 임시 저장한 작업은 그대로 남아요.', '새 버전 작성'))) return;
      await go('#new'); editor = REG.getEmptyForm(work); editorStep = 0; render(true);
    }
    if (['view-file', 'download-file', 'copy-hash'].includes(action)) {
      const v = M.getVersion(work, button.dataset.version) || M.getLatestVersion(work);
      if (action === 'view-file') openPdf(v);
      if (action === 'download-file') download(core.getBytes(v.file.data), v.file.name);
      if (action === 'copy-hash') await copy(v.file.hash);
    }
    if (action === 'print-certificate') window.print();
    if (action === 'download-certificate') { const v = M.getVersion(work, button.dataset.version); download(JSON.stringify({ demo: true, signature: null, payload: v.certificate.payload, payloadHash: v.certificate.payloadHash, effect: M.getEffect(work, v) }, null, 2), `HAVE_증명서_v${v.n}.json`, 'application/json'); }
    if (action === 'retry-issue') { const next = R.retryIssue(state, work.id, Number(button.dataset.version), getCurrentUser() === M.USERS.author ? M.USERS.author : approverActor); if (await persist(next)) { render(); showToast('발급을 다시 요청했어요.'); scheduleOutbox(); } }
    if (action === 'disable-link') {
      if (!(await confirmDialog('공유 링크를 중지할까요?', '이 링크로는 더 이상 승인 기록을 볼 수 없어요.', '중지', '취소'))) return;
      const next = M.disableShareLink(state, work.id, Number(button.dataset.version), button.dataset.link, M.USERS.author);
      if (await persist(next)) { render(); showToast('공유 링크를 중지했어요.'); }
    }
    if (action === 'copy-text') await copy(button.dataset.text);
    if (action === 'start-review') {
      const out = await R.startReview(state, work.id, reviewerActor);
      if (await persist(out.state)) { render(true); showToast(out.halted ? '파일 해시가 달라 검토를 중지했어요.' : '파일 해시가 일치해요. 검토를 시작했어요.'); }
    }
    if (action === 'add-feedback') { setReviewFromPage(); reviewDraft.feedbackItems.push({ section: '', content: '' }); dirty = true; render(); }
    if (action === 'remove-feedback') { setReviewFromPage(); reviewDraft.feedbackItems.splice(Number(button.dataset.index), 1); dirty = true; render(); }
    if (action === 'read-notification') {
      const n = state.notifications.find(x => x.id === button.dataset.id);
      if (n && await persist(M.setRead(state, n.id))) {
        const target = M.getWork(state, n.workId);
        if (!target) { render(); return; }
        const v = M.getVersion(target, n.n);
        const to = n.to === M.USERS.author ? (n.type === 'CERTIFICATE_ISSUED' ? getWorkRoute(target, 'certificate') + '/' + n.n : getWorkRoute(target))
          : M.USERS.reviewers.includes(n.to) ? (['REVIEW_REQUESTED', 'ANSWERS_SUBMITTED', 'RESUBMITTED'].includes(n.type) && v === M.getLatestVersion(target) ? getWorkRoute(target, 'review') : getWorkRoute(target))
          : (n.type === 'REVIEW_PASSED' ? getWorkRoute(target, 'approval') : getWorkRoute(target));
        await go(to, true);
      }
    }
    if (action === 'read-all') { if (await persist(M.setAllRead(state, notifUser))) render(); }
    if (action === 'toggle-fail-demo') { const next = structuredClone(state); next.demo.failNextIssue = button.checked; if (await persist(next)) showToast(button.checked ? '다음 증명서 발급이 한 번 실패해요.' : '발급 실패 시연을 껐어요.'); }
    if (action === 'reset-demo') {
      if (!(await confirmDialog('시연 데이터를 처음으로 되돌릴까요?', '이 브라우저에 저장된 작업과 알림이 모두 시연 초기 상태로 바뀌어요.', '되돌리기', '취소'))) return;
      $('#dialog').close();
      if (await persist(await HaveSeed.createSeed())) { chainCache.clear(); conditionsCache.clear(); verifiedRoutes.clear(); await go('#works', true); showToast('시연 데이터를 처음으로 되돌렸어요.'); }
    }
    if (action === 'sample-revise-pdf') { setRevisionFromPage(); revisionDraft.file = await M.prepareFile(`${work.title.replaceAll(' ', '_')}_v${M.getLatestVersion(work).n + 1}.pdf`, M.createSamplePdf(work.title, 'revised ' + Date.now())); dirty = true; render(); }
    if (action.startsWith('sample-compare-')) {
      const original = core.getBytes(verifyView.found.version.file.data);
      const bytes = action === 'sample-compare-changed' ? (() => { const b = original.slice(); b[b.length - 40] ^= 1; return b; })() : original;
      await compareFile(new File([bytes], action === 'sample-compare-changed' ? 'HAVE_1바이트_수정_예시.pdf' : verifyView.found.version.file.name, { type: 'application/pdf' }));
    }
    if (action === 'reset-compare') { compareRequest++; comparison = null; render(); $('#compare-file')?.focus(); }
    if (action === 'retry-save') {
      if (conflictSnapshot) { state = conflictSnapshot.data; storeRevision = conflictSnapshot.revision; conflictSnapshot = null; storageError = ''; dirty = false; await go(route, true); showToast('최신 기록을 불러왔어요. 입력을 다시 확인해 주세요.'); }
      else render();
    }
  } catch (error) { showToast(error.message); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'search') { query = event.target.value; $('#work-results').innerHTML = showWorkRows(); announce(M.getWorks(state, query, filter).length + '개 작업'); return; }
  if (event.target.closest('#registration') || event.target.closest('#request-form')) {
    const form = event.target.closest('#registration') ? editor : requestDraft;
    if (form) { REG.setFormFromPage(document, form); const box = document.querySelector('[data-risk-result]'); if (box && event.target.matches('[data-risk]')) box.outerHTML = REG.showRiskResult(form); }
    dirty = true; savedAt = '저장하지 않은 변경이 있어요'; const s = document.querySelector('.saved-at'); if (s) s.textContent = savedAt;
  }
  if (event.target.closest('#revise-form')) {
    setRevisionFromPage(); dirty = true;
    const box = $('#basis-state'), v = revisionDraft && M.getLatestVersion(getCurrentWork());
    if (box && v) box.innerHTML = showBasisState(v, M.isBasisChanged(v, revisionDraft.basis));
  }
  if (event.target.closest('#answers')) { setAnswersFromPage(); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; const s = document.querySelector('.saved-at'); if (s) s.textContent = savedAt; }
  const review = event.target.closest('#role-review');
  if (review && reviewDraft) {
    setReviewFromPage(); dirty = true;
    const v = M.getLatestVersion(getCurrentWork()), rule = M.getGateRule(M.getVersionLevel(v));
    const blockers = R.getReviewBlockers(v, reviewDraft), list = review.querySelector('[data-review-blockers]');
    list.replaceChildren(...blockers.map(b => Object.assign(document.createElement('li'), { textContent: b }))); list.hidden = !blockers.length;
    review.querySelector('[data-review-pass]').disabled = !!blockers.length;
    review.querySelector('[data-check-count]').textContent = `${reviewDraft.checks.filter(Boolean).length} / 4`;
    review.querySelector('[data-review-score]').textContent = `${reviewDraft.evaluations.reduce((s, e) => s + (Number.isInteger(e?.score) ? e.score : 0), 0)} / ${rule.maxScore}점 · ${rule.minScore}점 이상 통과 (위험 ${M.LEVEL[rule.level]})`;
  }
  if (event.target.closest('#role-approval') || event.target.closest('#role-revoke')) dirty = true;
});

document.addEventListener('change', async event => {
  const t = event.target;
  if (t.id === 'pdf') await chooseFile(t.files[0]);
  if (t.id === 'revise-pdf' && t.files[0]) { setRevisionFromPage(); try { revisionDraft.file = await readPdf(t.files[0]); dirty = true; } catch (e) { showToast(e.message); } render(); }
  if (t.dataset.evidenceFile !== undefined && t.files[0]) {
    const target = getEvidenceForm(t);
    const f = t.files[0];
    if (f.size > core.MAX_PDF_BYTES) { showToast('20 MB 이하의 파일을 선택해 주세요.'); return; }
    Object.assign(target.evidence[Number(t.dataset.evidenceFile)], { fileName: f.name, fileHash: await core.getSha256(new Uint8Array(await f.arrayBuffer())), uri: '' });
    dirty = true; render();
  }
  if ((t.closest('#registration') || t.closest('#request-form')) && (t.name === 'reg-ai-used' || t.dataset.field === 'type')) { const form = t.closest('#registration') ? editor : requestDraft; REG.setFormFromPage(document, form); render(); }
  if (t.closest('#revise-form') && t.closest('#basis-details') && (t.name === 'reg-ai-used' || t.dataset.field === 'type')) { setRevisionFromPage(); render(); }
  if (t.id === 'compare-file') await compareFile(t.files[0]);
  if (t.id === 'sort') { sort = t.value; $('#work-results').innerHTML = showWorkRows(); }
  if (t.id === 'role-actor') { if (t.dataset.mode === 'review') reviewerActor = t.value; else approverActor = t.value; render(); $('#role-actor')?.focus(); }
  if (t.id === 'notif-user') { notifUser = t.value; render(); $('#notif-user')?.focus(); }
  if (t.id === 'certificate-version') await go(getWorkRoute(getCurrentWork(), 'certificate') + '/' + t.value);
  if (['history-version', 'history-type'].includes(t.id)) setHistoryFilter();
});
document.addEventListener('dragover', event => { if (event.target.closest('.upload-drop, .proof-drop')) event.preventDefault(); });
document.addEventListener('drop', async event => {
  if (event.target.closest('.upload-drop')) { event.preventDefault(); await chooseFile(event.dataTransfer.files[0]); }
  if (event.target.closest('.proof-drop')) { event.preventDefault(); await compareFile(event.dataTransfer.files[0]); }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (form.matches('[data-role-mode]')) { event.preventDefault(); await runRoleDecision(event); return; }
  if (form.id === 'answers') { event.preventDefault(); await saveAnswers(true); return; }
  if (form.id === 'link-form') {
    event.preventDefault();
    const work = getCurrentWork(), days = Number(new FormData(form).get('days'));
    try { const out = await M.createShareLink(state, work.id, Number(form.dataset.version), M.USERS.author, days); if (await persist(out.state)) { render(); showLinkDialog(location.href.split('#')[0] + '#verify/' + out.token); } }
    catch (error) { showToast(error.message); }
    return;
  }
  if (form.id === 'revise-form') {
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
  }
  if (form.id === 'request-form') {
    event.preventDefault(); REG.setFormFromPage(document, requestDraft);
    const work = getCurrentWork();
    editorErrors = { ...M.getRegistrationErrors({ ...requestDraft, aiUsed: M.getLatestVersion(work).disclosure.aiUsed }, 3), ...M.getRegistrationErrors(requestDraft, 4) };
    if (Object.keys(editorErrors).length) { render(); return; }
    const next = M.requestReviewAgain(state, work.id, requestDraft);
    if (await persist(next)) { dirty = false; await go(getWorkRoute(work, 'challenge'), true); showToast('검토를 다시 요청했어요. 이해 확인을 진행해 주세요.'); }
    return;
  }
  if (form.id !== 'registration') return;
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
document.addEventListener('keydown', event => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')], index = tabs.indexOf(tab);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault(); tabs[next].click();
});
window.addEventListener('beforeunload', event => { if (dirty || saving || fileChecking) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('popstate', async () => { const next = location.hash || '#works'; if (next === route) return; history.replaceState(null, '', route); await go(next); });

async function init() {
  try {
    if (!crypto.subtle) throw new Error('파일 해시 계산을 위해 Chrome에서 다시 열어 주세요.');
    await store.open();
    const stored = await store.getStored();
    if (stored) {
      if (stored.data?.schema !== 2 || !Array.isArray(stored.data.works)) throw new Error('저장 기록의 형식을 확인할 수 없어요.');
      state = stored.data; storeRevision = stored.revision;
    } else { state = await HaveSeed.createSeed(); storeRevision = await store.save(state, 0); }
    if (route === '#attention') filter = 'attention';
    setActorFromRoute(route);
    render(); setExtensionBadge();
    if (state.works.some(w => w.versions.some(v => v.certificate?.signingState === 'PENDING'))) scheduleOutbox(300);
  } catch (error) {
    if (error.name === 'ConflictError') { location.reload(); return; }
    $('#app').innerHTML = `<main id="main" class="loading-screen"><h1>작업을 불러올 수 없어요</h1><p>${escapeHtml(error.message)}</p><p>기존 브라우저 기록은 삭제하지 않았어요.</p><button class="btn primary" id="retry-load">다시 불러오기</button></main>`;
    $('#retry-load').onclick = () => location.reload();
  }
}
init();
