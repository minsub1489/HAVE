/* HAVE workspace with local role-based review and approval (Chrome Extension edition). */
'use strict';
const M = HaveUserModel;
const R = HaveUserReviewModel;
const V = HaveUserReviewUI;
const registration = HaveRegistration;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  external: '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const repo = new HumanProofStorage.Repository(globalThis.indexedDB, 'have-author-gui-v1');
const syncChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('have-extension-sync') : null;
let state, revision = 0, route = location.hash || '#works', query = '', filter = 'all', sort = 'newest';
let editor = null, editorStep = 0, editorErrors = {}, dirty = false, saving = false, storageError = '', savedAt = '';
let questionIndex = 0, answerDraft = null, comparison = null, compareRequest = 0, toastTimer, fileChecking = false;
let conflictSnapshot = null;
let reviewerActor = M.REVIEWERS[0];
let roleSubmitting = false;
const questions = [
  { name: '선택 이유 설명', type: 'Teach-back', title: '버전과 파일 해시의 역할을 설명해 주세요.', prompt: '파일 버전 ID와 SHA-256을 함께 기록하는 이유는 무엇인가요? 각각이 무엇을 확인하는지 자신의 말로 설명해 주세요.' },
  { name: '오류 발견', type: 'Fault Injection', title: '검증용 문단에 숨은 오류를 찾아보세요.', prompt: '아래 설명의 오류를 찾고, 수정 방향과 그 이유를 적어 주세요.', reference: '“승인 여부는 파일 이름으로 확인한다. 파일 이름이 같으면 내용이 변경되어도 기존 승인이 유지된다.”' },
  { name: '조건 변경 대응', type: 'What-if', title: '승인자가 두 명이 된다면 무엇이 바뀔까요?', prompt: '승인자가 1명에서 2명으로 늘어날 때, 데이터 구조와 승인 상태 처리에서 변경할 부분을 설명해 주세요.' }
];
const stamp = value => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(new Date(value)).replace(/\. /g, '.').replace(/\.$/, '') + ' KST';
const changedAt = work => work.events.at(-1)?.at || M.latest(work).createdAt;
const size = bytes => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
const badge = (label, tone = 'neutral') => `<span class="badge ${tone}">${esc(label)}</span>`;
const statusBadge = (work, version = M.latest(work)) => { const s = M.statusOf(work, version); return badge(s.label, s.tone); };
const link = (hash, text, className = '', extra = '') => `<a href="${esc(hash)}" data-route="${esc(hash)}" class="${className}" ${extra}>${text}</a>`;
const workRoute = (work, tab = 'overview') => `#work/${work.id}/${tab}`;
const logo = className => `<img class="${className}" src="${esc($('#have-icon').getAttribute('href'))}" alt="">`;
const brand = () => `<a class="brand" href="#works" data-route="#works" aria-label="HAVE 내 작업">${logo('brand-mark')}<span class="brand-name">HAVE</span></a>`;
const reviewHelpers = { esc, icon, link, notice, badge, stamp, workRoute };
const isRoleRoute = hash => /(?:^#(?:review-queue|approval-queue)$|\/(?:review|approval)$)/.test(hash);
const isAuthorWork = hash => hash.startsWith('#work/') && !isRoleRoute(hash);

function notifyExtensionBadge() {
  if (!state?.works || !globalThis.chrome?.runtime?.sendMessage) return;
  try {
    const count = M.filterWorks(state.works, '', 'attention').length;
    chrome.runtime.sendMessage({ type: 'HAVE_BADGE_UPDATE', count }).catch(() => {});
  } catch {}
}

function openCurrentRouteInTab() {
  const hash = route || '#works';
  if (globalThis.chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'HAVE_OPEN_TAB', hash }).catch(() => {});
  } else {
    window.open(location.href.split('#')[0] + hash, '_blank', 'noopener');
  }
}

function normalizeState(data) {
  for (const work of data.works) {
    if (work.owner === '민섭') {
      work.owner = '김하늘';
      for (const event of work.events || []) if (event.actor === '민섭') event.actor = '김하늘';
    }
    if (work.demo && work.id === 'work-plan' && work.title === '소프트웨어공학 프로젝트 기획서') work.title = 'HAVE 프로젝트 기획서';
  }
  return data;
}

if (syncChannel) {
  syncChannel.onmessage = async event => {
    if (!event?.data || event.data.revision === revision) return;
    if (dirty || saving || fileChecking || roleSubmitting) return;
    try {
      const stored = await repo.load();
      if (stored && stored.revision !== revision && stored.data?.schema === 1 && Array.isArray(stored.data.works)) {
        state = normalizeState(stored.data);
        revision = stored.revision;
        render();
        notifyExtensionBadge();
      }
    } catch {}
  };
}

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000); }
function announce(message) { $('#announcer').textContent = message; }
function heading(title, description, action = '', eyebrow = '') { return `<div class="heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1 tabindex="-1">${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`; }
function notice(title, text, tone = '', extra = '') { return `<div class="notice ${tone}">${icon('info')}<div><strong>${esc(title)}</strong>${text}${extra}</div></div>`; }
function footnote() { return `<footer class="footnote">${icon('info')}<span>로컬 시연 · 현재 브라우저 확장 프로그램 저장소에만 저장됩니다. 역할은 시연용이며 서버 계정과 전자서명은 미연결 상태입니다.</span></footer>`; }
function navMarkup() {
  const attention = M.filterWorks(state.works, '', 'attention').length;
  const reviewCount = M.REVIEWERS.reduce((total, actor) => total + R.pendingFor(state.works, 'review', actor).length, 0);
  const approvalCount = R.pendingFor(state.works, 'approval', R.APPROVER).length;
  return `<nav class="navigation" aria-label="주 메뉴">${[
    ['#works', 'grid', '내 작업', state.works.length], ['#attention', 'clock', '내 확인 필요', attention], ['#certificates', 'award', '승인 증명서', '']
  ].map(([hash, glyph, label, count]) => navLink(hash, glyph, label, count, route === hash || (hash === '#works' && isAuthorWork(route)))).join('')}<div class="nav-group-label">역할 시연</div>
  ${navLink('#review-queue', 'edit', '검토할 작업', reviewCount, route === '#review-queue' || route.endsWith('/review'))}
  ${navLink('#approval-queue', 'shield', '승인할 작업', approvalCount, route === '#approval-queue' || route.endsWith('/approval'))}</nav>`;
}
function navLink(hash, glyph, label, count, current) {
  const countBadge = count === '' ? '' : `<span class="count">${count}</span>`;
  return link(hash, `${icon(glyph)}${label}${countBadge}`, `nav-link ${current ? 'active' : ''}`, current ? 'aria-current="page"' : '');
}
function mobileDock() {
  return `<nav class="mobile-dock" aria-label="작업 메뉴">
    ${link('#works', icon('grid') + '내 작업', 'dock-link', route === '#works' || isAuthorWork(route) ? 'aria-current="page"' : '')}
    ${link('#attention', icon('clock') + '내 확인', 'dock-link', route === '#attention' ? 'aria-current="page"' : '')}
    ${link('#certificates', icon('award') + '증명서', 'dock-link', route === '#certificates' ? 'aria-current="page"' : '')}
    <button type="button" class="dock-link" data-action="menu" aria-haspopup="dialog" ${isRoleRoute(route) ? 'aria-current="page"' : ''}>${icon('menu')}메뉴</button>
  </nav>`;
}
function shell(body, label = '내 작업') {
  return `<div class="shell"><aside class="sidebar">${brand()}<div style="margin-top:48px"><div class="side-label">작업 공간</div>${navMarkup()}</div><div class="sidebar-bottom"><button class="side-guide" data-action="guide">${icon('book')}HAVE 사용 가이드${icon('chevron')}</button><div class="side-footer">HAVE · EXTENSION</div></div></aside><div class="content-shell"><header class="topbar"><button class="btn icon-only mobile-menu" data-action="menu" aria-label="주 메뉴 열기" aria-haspopup="dialog">${icon('menu')}</button><div class="breadcrumb"><span>HAVE</span>${icon('chevron')}<strong>${esc(label)}</strong></div><div class="top-actions"><button type="button" class="btn icon-only ext-popout-btn" data-action="open-tab" title="새 탭에서 크게 보기" aria-label="새 탭에서 크게 보기">${icon('external')}</button><span class="demo-tag">LOCAL EXTENSION</span><div class="profile"><span class="avatar">${esc((isRoleRoute(route) ? (route.includes("approval") ? R.APPROVER : reviewerActor) : "김하늘")[0])}</span><span>${esc(isRoleRoute(route) ? (route.includes("approval") ? R.APPROVER : reviewerActor) : "김하늘")}<small>${isRoleRoute(route) ? "역할 시연" : "작성자"}</small></span></div></div></header>${storageError ? `<div role="alert" class="storage-alert">${esc(storageError)} <button class="btn" data-action="retry-save">다시 저장</button></div>` : ''}<main id="main" class="main">${body}${footnote()}</main></div>${mobileDock()}</div>`;
}
function listScreen() {
  const attentionOnly = route === '#attention';
  const all = state.works.length, attention = M.filterWorks(state.works, '', 'attention').length;
  const approved = M.filterWorks(state.works, '', 'approved').length, ongoing = M.filterWorks(state.works, '', 'ongoing').length;
  const next = M.filterWorks(state.works, '', 'attention')[0];
  const metrics = [['전체 작업', all, 'file', '버전별 기록을 한곳에서'], ['내 확인 필요', attention, 'edit', '이해 확인 또는 수정 요청'], ['검토 진행 중', ongoing, 'clock', '검토 또는 최종 승인 대기'], ['승인 완료', approved, 'shield', '승인된 버전의 증명서 확인']];
  const counts = { all, attention, ongoing, approved };
  const title = attentionOnly ? '내 확인이 필요한 작업' : '내 작업';
  return heading(title, 'AI와 만든 결과물, 사람의 검토와 승인까지 한곳에서 관리하세요.', link('#new', icon('plus') + '작업 등록', 'btn primary'), '') +
    `<div class="metrics">${metrics.map(([label, count, glyph, note]) => `<div class="metric"><div class="metric-label">${label}${icon(glyph)}</div><div class="metric-value">${count}<span>건</span></div><div class="metric-note">${note}</div></div>`).join('')}</div>` +
    (state.draft ? `<div class="attention-strip"><div class="attention-copy">${icon('file')}<div><b>이어서 작성할 작업이 있어요</b><p>${esc(state.draft.title || '제목 없는 작업')} · 임시 저장한 입력을 불러올 수 있어요.</p></div></div>${link('#new', '이어서 작성하기' + icon('arrow'), 'btn')}</div>` : next ? `<div class="attention-strip"><div class="attention-copy">${icon('clock')}<div><b>지금 확인할 작업</b><p>${esc(next.title)} · ${esc(M.statusOf(next).label)} · v${M.latest(next).n}</p></div></div>${link(workRoute(next, M.latest(next).status === 'CHALLENGE_PENDING' ? 'challenge' : 'overview'), M.statusOf(next).action + icon('arrow'), 'btn')}</div>` : '') +
    `<section aria-label="작업 목록"><div class="section-header"><h2>작업 목록 <span class="muted small">${all}</span></h2><label class="sr-only" for="sort">정렬</label><select id="sort" aria-label="작업 정렬" style="width:auto;min-height:44px;font-size:12px;background:transparent;border:0"><option value="newest" ${sort === 'newest' ? 'selected' : ''}>최근 변경순</option><option value="title" ${sort === 'title' ? 'selected' : ''}>작업명순</option></select></div><div class="work-list"><div class="list-toolbar"><div class="tabs" role="tablist" aria-label="작업 상태">${[['all', '전체'], ['attention', '내 확인 필요'], ['ongoing', '검토 진행 중'], ['approved', '승인 완료']].map(([key, text]) => `<button class="tab ${filter === key ? 'active' : ''}" role="tab" id="filter-${key}" aria-selected="${filter === key}" aria-controls="work-results" tabindex="${filter === key ? '0' : '-1'}" data-filter="${key}">${text}<span>${counts[key]}</span></button>`).join('')}</div><div class="search-wrap">${icon('search')}<label for="search" class="sr-only">작업 검색</label><input id="search" type="text" placeholder="작업명, 파일명, 검토자 검색" value="${esc(query)}" autocomplete="off"></div></div><div id="work-results" role="tabpanel" aria-labelledby="filter-${filter}" tabindex="0">${workResults()}</div></div></section>`;
}
function workResults() {
  const rows = M.filterWorks(state.works, query, filter).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : changedAt(b).localeCompare(changedAt(a)));
  if (!rows.length) return `<div class="empty">${icon('search')}<h2>${state.works.length ? '조건에 맞는 작업이 없어요' : '아직 등록한 작업이 없어요'}</h2><p>${state.works.length ? '검색어나 상태 필터를 바꿔 다시 찾아보세요.' : '첫 작업을 등록하고 검토 과정을 시작해 보세요.'}</p>${state.works.length ? '<button class="btn" data-action="clear-filter">필터 초기화</button>' : link('#new', '작업 등록', 'btn primary')}</div>`;
  const titleCell = w => `<div class="row"><span style="color:var(--color-muted)">${icon('file')}</span><div class="grow">${link(workRoute(w), esc(w.title), 'work-title')}<div class="file-meta"><span>v${M.latest(w).n}</span><span>PDF</span><span>${w.demo ? '시연 자료' : '내가 등록한 작업'}</span></div></div></div>`;
  return `<div class="table-container"><table style="width:100%;border-collapse:collapse"><caption class="sr-only">내 작업 ${rows.length}건</caption><thead><tr>${['작업명 / 버전', '현재 상태', '검토자', '최근 변경 시각', '상세'].map(t => `<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(w => `<tr><td>${titleCell(w)}</td><td>${statusBadge(w)}</td><td>${esc(M.latest(w).reviewer)}</td><td class="muted" style="font-size:11px">${stamp(changedAt(w))}</td><td>${link(workRoute(w), icon('chevron'), 'btn text icon-only', `aria-label="${esc(w.title)} 상세 보기"`)}</td></tr>`).join('')}</tbody></table></div><div class="work-cards">${rows.map(w => `<article class="work-card">${titleCell(w)}<dl class="work-card-meta"><div><dt>현재 상태</dt><dd>${statusBadge(w)}</dd></div><div><dt>검토자</dt><dd>${esc(M.latest(w).reviewer)}</dd></div><div style="grid-column:1/-1"><dt>최근 변경 시각</dt><dd>${stamp(changedAt(w))}</dd></div></dl></article>`).join('')}</div><div class="table-footer"><span>총 ${rows.length}개 작업</span><span>승인은 표시된 버전에만 적용됩니다.</span></div>`;
}
function context(work) {
  const v = M.latest(work);
  const next = {
    CHALLENGE_PENDING: '작성자 · 세 문항의 답변을 작성해 주세요.',
    REVIEW_PENDING: `검토자 ${v.reviewer} · 제출한 파일과 답변을 확인할 차례예요.`,
    APPROVAL_PENDING: `최종 승인자 ${R.approverFor(v)} · 검토 결과를 확인할 차례예요.`,
    REVISION_REQUIRED: '작성자 · 피드백을 반영해 새 버전을 등록해 주세요.',
    APPROVED: v.approval ? '승인된 버전의 증명서를 열 수 있어요.' : '최종 승인자 · 증명서 발급을 진행할 차례예요.'
  }[v.status] || '상태를 확인해 주세요.';
  return `<section class="work-context" aria-label="작업 요약">${icon('file')}
    <div class="grow"><h2>${esc(work.title)}</h2><div class="context-meta"><span>대상 버전 v${v.n}</span>${statusBadge(work)}<span>검토자 ${esc(v.reviewer)}</span></div></div>
    <div class="next-action"><b>다음 행동</b>${esc(next)}</div>
  </section>`;
}
function detailTabs(work, tab) {
  const tabs = [['overview', '작업 정보'], ['challenge', '이해 확인'], ['certificate', '증명서'], ['history', '버전 · 이력']];
  return `<nav class="detail-tabs" aria-label="작업 상세">${tabs.map(([key, label]) =>
    link(workRoute(work, key), label, '', tab === key ? 'aria-current="page"' : '')).join('')}</nav>`;
}
function journey(v) {
  const submitted = v.answers.filter(a => a.trim()).length;
  const reviewed = v.status === 'APPROVAL_PENDING' || v.status === 'APPROVED';
  const approved = v.status === 'APPROVED';
  const reviseReview = v.status === 'REVISION_REQUIRED' && v.finalDecision?.decision !== 'REVISE';
  const reviseApproval = v.status === 'REVISION_REQUIRED' && !reviseReview;
  const steps = [
    ['작업 등록', '완료', 'done'],
    ['이해 확인', v.status === 'CHALLENGE_PENDING' ? `${submitted} / 3 작성` : '답변 제출', v.status === 'CHALLENGE_PENDING' ? 'current' : 'done'],
    ['사람의 검토', reviseReview ? '수정 요청' : reviewed || reviseApproval ? '통과' : '대기', reviseReview ? 'revision' : reviewed || reviseApproval ? 'done' : v.status === 'REVIEW_PENDING' ? 'current' : ''],
    ['최종 승인', reviseApproval ? '수정 요청' : approved ? '승인 완료' : '대기', reviseApproval ? 'revision' : approved ? 'done' : v.status === 'APPROVAL_PENDING' ? 'current' : ''],
    ['증명서', v.approval ? '발급 완료' : approved ? '발급 대기' : '미발급', v.approval ? 'done' : approved ? 'current' : '']
  ];
  return `<ol class="progress-steps">${steps.map(([label, status, type], i) => `
    <li class="progress-item" data-state="${type}" ${type === 'current' ? 'aria-current="step"' : ''}>
      <span class="progress-marker" aria-hidden="true">${type === 'done' ? icon('check') : i + 1}</span>
      <span class="progress-label">${label}</span><span class="progress-state">${status}</span>
    </li>`).join('')}</ol>`;
}
function fileInfo(v) {
  return `<dl class="definition"><dt>대상 버전</dt><dd>v${v.n}</dd><dt>등록 파일</dt><dd>${esc(v.file.name)}</dd><dt>파일 크기</dt><dd>${size(v.file.size)}</dd><dt>등록 시각</dt><dd>${stamp(v.createdAt)}</dd></dl>
    <div class="pdf-actions">
      <button class="btn" data-action="view-file" data-version="${v.n}">${icon('file')}PDF 원문 보기</button>
      <button class="btn" data-action="download-file" data-version="${v.n}">${icon('download')}다운로드</button>
    </div>
    <details class="hash-details"><summary>파일 식별 정보 · SHA-256</summary><p class="mono">${esc(v.file.hash)}</p><button class="btn text" data-action="copy-hash" data-version="${v.n}">전체 해시 복사</button></details>`;
}
function recentActivity(work) {
  return `<section class="panel recent-activity"><div class="panel-head"><h2>최근 활동</h2>${link(workRoute(work, 'history'), '전체 이력', 'btn text')}</div>
    <div class="panel-body"><ul>${work.events.slice(-3).reverse().map(event => `<li><div class="grow"><b>${esc(event.action)}</b><p class="small muted">${esc(event.actor)} · v${event.version}</p></div><time datetime="${esc(event.at)}">${stamp(event.at)}</time></li>`).join('')}</ul></div></section>`;
}
function overview(work) {
  const v = M.latest(work);
  const info = {
    REVISION_REQUIRED: ['수정 요청이 도착했어요', v.feedback || '이전 검토 결과를 확인해 주세요.', 'warning'],
    REVIEW_PENDING: ['답변을 제출했어요', `검토자 ${v.reviewer}의 확인을 기다리고 있어요.`],
    APPROVAL_PENDING: ['검토를 통과했어요', `최종 승인자 ${R.approverFor(v)}의 결정을 기다리고 있어요.`],
    APPROVED: v.approval ? ['승인 증명서가 발급됐어요', `v${v.n} 파일에 연결된 승인 기록을 확인하세요.`] : ['최종 승인이 기록됐어요', '증명서는 승인자 화면에서 발급할 수 있어요.'],
    CHALLENGE_PENDING: ['이해 확인을 작성해 주세요', '답변은 이 PDF 버전에 연결됩니다.']
  }[v.status];
  const actions = {
    CHALLENGE_PENDING: link(workRoute(work, 'challenge'), '이해 확인하기' + icon('arrow'), 'btn primary'),
    REVISION_REQUIRED: '<button class="btn primary" data-action="new-version">새 버전 등록</button>',
    APPROVED: v.approval ? link(workRoute(work, 'certificate') + '/' + v.n, '증명서 보기' + icon('arrow'), 'btn primary') : ''
  };
  return `<div class="split"><div class="stack">
    <section class="panel"><div class="panel-head"><h2>진행 상황</h2>${statusBadge(work)}</div>
      <div class="panel-body">${info ? notice(...info) : ''}${actions[v.status] ? `<div class="space-top">${actions[v.status]}</div>` : ''}</div>
      ${journey(v)}
    </section>
    <section class="panel"><div class="panel-head"><h2>AI 사용 신고와 나의 기여</h2>${badge('작성자 신고')}</div><div class="panel-body details">
      <div><div class="detail-label">AI 도구 · 모델</div><div class="detail-value">${esc(v.tool)}</div></div>
      <div><div class="detail-label">AI 사용 범위</div><div class="detail-value">${esc(v.scope || 'AI 사용 없음')}</div></div>
      <div><div class="detail-label">직접 수행한 일</div><div class="detail-value">${esc(v.contribution)}</div></div>
      ${registration.renderDetails(v)}
    </div></section>
    ${recentActivity(work)}
  </div><aside class="stack" style="align-content:start">
    <section class="panel"><div class="panel-head"><h2>등록 파일</h2>${icon('file')}</div><div class="panel-body">${fileInfo(v)}${v.status === 'APPROVED' && v.issuance?.status !== 'PENDING' ? '<button class="btn full space-top" data-action="new-version">새 버전 등록</button>' : ''}</div></section>
  </aside></div>`;
}
function field(name, label, value, options = {}) {
  const error = editorErrors[name], hint = options.hint || '';
  const attributes = `id="${name}" name="${name}" ${options.required === false ? '' : 'required'} aria-describedby="${name}-hint${error ? ' ' + name + '-error' : ''}" ${error ? 'aria-invalid="true"' : ''} ${options.readonly ? 'readonly' : ''}`;
  return `<label class="field" for="${name}"><span>${label}${options.required === false ? '' : '<small class="required">필수</small>'}</span>${options.multiline ? `<textarea ${attributes} maxlength="${options.max || 2000}" placeholder="${esc(options.placeholder || '')}">${esc(value || '')}</textarea>` : `<input type="text" ${attributes} value="${esc(value || '')}" maxlength="${options.max || 100}" placeholder="${esc(options.placeholder || '')}">`}<small id="${name}-hint" class="muted" style="display:block;margin-top:8px">${esc(hint)}</small>${error ? `<small id="${name}-error" style="color:var(--color-danger);display:block;margin-top:8px">${esc(error)}</small>` : ''}</label>`;
}
function editorScreen() {
  if (!editor) editor = state.draft ? structuredClone(state.draft) : { title: '', file: null, tool: '', scope: '', contribution: '', reviewer: '', reason: '', isVersion: false };
  const steps = ['파일 등록', 'AI 사용 신고', '나의 기여', '검토자 · 제출'];
  const errors = Object.keys(editorErrors).length ? `<div class="notice error" role="alert" style="margin-bottom:24px">${icon('info')}<div><strong>입력 내용을 확인해 주세요</strong>${Object.entries(editorErrors).map(([key, error]) => `<div><a href="#${key}" data-error-field="${key}" style="color:inherit;text-decoration:underline">${esc(error)}</a></div>`).join('')}</div></div>` : '';
  let body = '';
  if (editorStep === 0) body = field('title', '작업명', editor.title, { readonly: editor.isVersion, placeholder: '예: HAVE 서비스 요구사항 정의서' }) + `<div class="field"><label for="pdf">검토할 파일 <small class="required">필수</small></label><label for="pdf" class="upload-drop" style="display:block;border:1px dashed var(--color-muted);border-radius:8px;padding:28px 20px;text-align:center;cursor:pointer"><span style="color:var(--color-primary)">${icon('upload')}</span><b style="display:block;font-size:14px;margin:8px 0">PDF를 끌어 놓거나 파일을 선택하세요</b><small class="muted">PDF · 최대 20 MB</small><input id="pdf" type="file" accept=".pdf,application/pdf" style="display:block;margin:16px auto 0;max-width:100%;font-size:12px" aria-describedby="file-hint${editorErrors.file ? ' file-error' : ''}" ${editorErrors.file ? 'aria-invalid="true"' : ''}></label><small id="file-hint" class="muted">선택한 파일은 현재 브라우저 확장 프로그램 저장소에 저장됩니다.</small>${editor.file ? `<div class="selected-file">${icon('check')}<div class="grow"><b>${esc(editor.file.name)}</b>${size(editor.file.size)} · 파일 확인 완료</div></div>` : ''}<div id="file-status" class="upload-feedback" role="status" aria-live="polite">${fileChecking ? '파일을 확인하는 중…' : ''}</div>${editorErrors.file ? `<small id="file-error" style="color:var(--color-danger)">${esc(editorErrors.file)}</small>` : ''}</div><button type="button" class="btn text" data-action="sample-pdf">${icon('file')}샘플 PDF로 체험하기</button>` + (editor.isVersion ? field('reason', '변경 사유', editor.reason, { multiline: true, hint: '이전 버전과 달라진 내용을 적어 주세요.' }) : '');
  if (editorStep === 1) body = field('tool', 'AI 도구 · 모델', editor.tool, { placeholder: '예: ChatGPT · GPT-4o', hint: 'AI를 사용하지 않았다면 “사용 안 함”으로 적어 주세요.' }) + field('scope', 'AI 사용 범위', editor.scope, { multiline: true, max: 5000, placeholder: 'AI가 도운 작업과 적용한 범위를 구체적으로 적어 주세요.', hint: '예: 문서 구조와 초안 작성. 수치 확인과 결론은 직접 작성.' });
  if (editorStep === 2) body = field('contribution', '직접 수행한 일', editor.contribution, { multiline: true, placeholder: '직접 판단하고, 확인하고, 수정한 내용을 적어 주세요.', hint: '예: 출처 세 곳을 확인하고 오류를 수정했습니다.' }) + notice('기여 기록은 현재 버전에 연결돼요', 'AI 사용 신고와 나의 기여를 구분하면 검토자가 확인할 부분을 쉽게 찾을 수 있어요.', 'neutral');
  if (editorStep === 3) body = `<fieldset style="border:0;margin:0;padding:0"><legend style="font-size:14px;font-weight:550;margin-bottom:16px">검토자 선택 <small class="required">필수</small></legend>${M.REVIEWERS.map((name, i) => `<label class="reviewer-choice"><input type="radio" name="reviewer" value="${name}" ${editor.reviewer === name ? 'checked' : ''} ${i === 0 ? 'id="reviewer"' : ''} ${editorErrors.reviewer ? 'aria-invalid="true" aria-describedby="reviewer-error"' : ''}><span class="avatar">${name[0]}</span><span><b>${name}</b><small>프로젝트 팀원 · 시연 검토자</small></span></label>`).join('')}${editorErrors.reviewer ? `<small id="reviewer-error" style="color:var(--color-danger)">${esc(editorErrors.reviewer)}</small>` : ''}</fieldset><div class="registration-summary"><h3>제출 전 확인</h3><dl class="definition"><dt>작업명</dt><dd>${esc(editor.title)}</dd><dt>대상 파일</dt><dd>${esc(editor.file?.name || '')}</dd><dt>AI 도구</dt><dd>${esc(editor.tool)}</dd><dt>AI 사용 범위</dt><dd>${esc(editor.scope)}</dd><dt>나의 기여</dt><dd>${esc(editor.contribution)}</dd></dl></div><div class="space-top">${notice('제출 후 이해 확인을 진행해요', '현재 버전의 파일과 신고 내용이 고정됩니다. 제출 뒤 변경하려면 수정 요청 또는 승인 후 새 버전으로 등록해 주세요.')}</div>`;
  const registrationDetails = registration.render(editorStep, editor, state.works.find(work => work.id === editor.workId), editorErrors);
  if (editorStep === 1) body = registrationDetails + body;
  else body += registrationDetails;
  if (editorStep === 3) body += `<p class="small muted space-top">최종 승인자 · ${esc(R.APPROVER)} (시연)</p>`;
  return heading(editor.isVersion ? '새 버전 등록' : '작업 등록', '파일과 AI 사용 내역을 정리하고, 검토를 시작하세요.', '') + `<div style="max-width:720px;margin:auto"><nav class="form-progress journey" aria-label="등록 단계">${steps.map((text, i) => `<div class="journey-item ${i < editorStep ? 'done' : i === editorStep ? 'current' : ''}" ${i === editorStep ? 'aria-current="step"' : ''}><span class="journey-number">${i < editorStep ? '✓' : i + 1}</span>${text}</div>`).join('')}</nav><form id="registration" novalidate><section class="panel"><div class="panel-head"><h2>${String(editorStep + 1).padStart(2, '0')} · ${steps[editorStep]}</h2><span class="small muted">${editorStep + 1} / 4</span></div><div class="panel-body">${errors}${body}</div></section><div class="space-top"><div class="saved-at" role="status">${esc(savedAt)}</div><div class="wizard-actions"><button type="button" class="btn" data-action="save-draft" ${saving || fileChecking ? 'disabled' : ''}>${saving ? '저장 중…' : '임시 저장'}</button><div><button type="button" class="btn" data-action="${editorStep ? 'previous-step' : 'cancel-editor'}">${editorStep ? '이전 단계' : '취소'}</button><button type="submit" class="btn primary" ${saving || fileChecking ? 'disabled' : ''}>${saving ? '제출 중…' : editorStep === 3 ? '검토 요청' : '다음 단계'}${icon('arrow')}</button></div></div></div></form></div>`;
}
function challenge(work) {
  const v = M.latest(work), editable = v.status === 'CHALLENGE_PENDING';
  if (!answerDraft || answerDraft.versionId !== v.id) answerDraft = { versionId: v.id, answers: [...v.answers], confidence: [...v.confidence] };
  const q = questions[questionIndex], completed = answerDraft.answers.filter(a => a.trim()).length;
  return `<div class="split"><section class="panel"><div class="panel-head"><h2>나의 이해 확인</h2><span class="small muted">${completed} / 3 작성</span></div><div class="panel-body"><div class="tabs" role="tablist" aria-label="이해 확인 문항">${questions.map((question, i) => `<button id="question-${i}" role="tab" aria-selected="${i === questionIndex}" aria-controls="question-panel" tabindex="${i === questionIndex ? '0' : '-1'}" class="tab ${i === questionIndex ? 'active' : ''}" data-question="${i}">${i + 1}. ${question.name}${answerDraft.answers[i].trim() ? ' ✓' : ''}</button>`).join('')}</div><div id="question-panel" role="tabpanel" aria-labelledby="question-${questionIndex}" class="question"><div class="eyebrow">QUESTION ${String(questionIndex + 1).padStart(2, '0')} · ${q.type.toUpperCase()}</div><h2>${q.title}</h2><div class="question-text">${q.prompt}${q.reference ? `<div class="question-ref">${q.reference}</div>` : ''}</div><form id="answers" novalidate><label class="field" for="answer"><span>나의 답변 <small class="required">필수</small></span><textarea id="answer" maxlength="10000" ${editable ? '' : 'readonly'} aria-describedby="answer-hint answer-error" placeholder="내가 이해한 내용을 근거와 함께 적어 주세요.">${esc(answerDraft.answers[questionIndex])}</textarea><small id="answer-hint" class="muted">${editable ? '다른 문항으로 이동해도 입력은 유지돼요. 임시 저장으로 기록을 보관하세요.' : '답변은 제출되어 읽기 전용이에요. 수정 요청을 받으면 새 버전으로 보완해 주세요.'}</small><small id="answer-error" role="alert" style="display:block;color:var(--color-danger);margin-top:8px"></small></label><label class="field" for="confidence"><span>답변에 대한 자기 확신</span><div class="confidence-row"><input id="confidence" type="range" min="0" max="100" step="5" value="${answerDraft.confidence[questionIndex]}" ${editable ? '' : 'disabled'}><output id="confidence-value" for="confidence">${answerDraft.confidence[questionIndex]}%</output></div><small class="muted">검토 참고 정보이며, 합격 점수와 별도로 기록돼요.</small></label><div class="row between wrap"><button class="btn" type="button" data-action="save-answers" ${!editable || saving ? 'disabled' : ''}>임시 저장</button>${questionIndex < 2 ? `<button class="btn primary" type="button" data-question="${questionIndex + 1}">다음 문항${icon('arrow')}</button>` : `<button class="btn primary" type="submit" ${!editable || saving ? 'disabled' : ''}>${v.status === 'REVIEW_PENDING' ? '답변 제출 완료' : '전체 답변 제출'}</button>`}</div><div class="saved-at space-top" role="status">${esc(savedAt)}</div></form></div></div></section><aside class="stack" style="align-content:start"><section class="panel"><div class="panel-head"><h2>이해 확인 안내</h2>${icon('book')}</div><div class="panel-body"><ol class="task-list">${questions.map((question, i) => `<li><span class="journey-number" style="flex:none">${answerDraft.answers[i].trim() ? '✓' : i + 1}</span><div><h3>${question.name}</h3><p class="small muted">${question.type}</p></div></li>`).join('')}</ol></div></section>${notice('고정 문항으로 체험해요', '이 문항은 시연용 템플릿이에요. 업로드한 PDF를 분석해 생성한 문항은 아니에요.', 'neutral')}${notice('최종 판단은 검토자가 해요', '답변 제출은 검토 대기로 연결됩니다. 자동 채점이나 승인은 실행하지 않아요.', 'neutral')}</aside></div>`;
}
function certificate(work, selectedVersion) {
  const approved = work.versions.filter(v => M.certificateFor(work, v.n));
  if (!approved.length) return `<section class="panel empty">${icon('award')}<h2>아직 발급된 증명서가 없어요</h2><p>검토 통과와 최종 승인이 완료되면 이곳에서 확인할 수 있어요.</p>${link(workRoute(work, 'overview'), '진행 상황 보기', 'btn primary')}</section>`;
  const v = approved.find(version => version.n === Number(selectedVersion)) || approved.at(-1);
  const p = M.publicRecord(work, v.n);
  const versionPicker = approved.length > 1 ? `<label class="field" for="certificate-version"><span>증명서 발급 버전</span><select id="certificate-version">${approved.map(item => `<option value="${item.n}" ${item.n === v.n ? 'selected' : ''}>v${item.n}</option>`).join('')}</select></label>` : '';
  return `<article class="receipt panel" style="max-width:800px;margin:auto"><div class="panel-body">${versionPicker}<div class="receipt-header row between"><div><h2>인간 승인 증명서</h2></div>${logo("receipt-brand")}</div><div class="row between wrap space-top">${badge('발급 완료 · 시연', 'success')}<span class="small muted">${esc(p.serial)}</span></div><h3 class="receipt-title">${esc(work.title)}</h3><dl class="definition"><dt>승인 대상</dt><dd>v${v.n} · ${esc(p.fileName)}</dd><dt>승인자</dt><dd>${esc(p.actor)}</dd><dt>승인 시각</dt><dd>${stamp(p.at)}</dd><dt>발급 시각</dt><dd>${stamp(p.issuedAt)}</dd><dt>검토 결과</dt><dd>검토 통과 · 시연 기록</dd><dt>승인 효력</dt><dd>현재 서버 효력 확인 불가</dd></dl>${v.id !== M.latest(work).id ? `<div class="space-top">${notice('이전 버전의 승인 기록이에요', `최신 버전은 v${M.latest(work).n}입니다. 이 승인은 v${v.n}에만 연결돼요.`, 'warning')}</div>` : ''}<div class="hash-details"><h3>승인 파일의 SHA-256</h3><p class="mono">${p.fileHash}</p></div>${notice('기록된 승인과 파일의 연결', '내용의 정확성이나 실제 이해 수준을 보증하지 않습니다. 전자서명과 서버 승인은 연결되지 않은 시연 증명서입니다.', 'neutral')}<div class="receipt-bottom row wrap space-top">${link(`#verify/${work.id}/${v.n}`, icon('shield') + '공개 검증 보기', 'btn primary')}<button class="btn" data-action="download-certificate" data-version="${v.n}">${icon('download')}증명서 받기</button><button class="btn" data-action="copy-link" data-version="${v.n}">${icon('link')}링크 복사</button><button class="btn" data-action="print-certificate">인쇄 · PDF 저장</button></div><p class="small muted space-top">공유 링크는 이 브라우저의 기록을 참조합니다. 다른 기기에서의 조회에는 서버 연결이 필요해요.</p></div></article>`;
}
function historyScreen(work) {
  const versions = [...work.versions].reverse();
  return `<div class="split">
    <section class="panel"><div class="panel-head"><h2>버전별 기록</h2><span class="small muted">${versions.length}개 버전</span></div>
      <div class="panel-body stack">${versions.map(v => `<section class="version-record">
        <div class="row between wrap"><h3>v${v.n}${v.id === M.latest(work).id ? ' · 현재 버전' : ''}</h3>${statusBadge(work, v)}</div>
        <p class="detail-value space-top">${esc(v.reason)}</p><p class="small muted">${esc(v.file.name)}<br>${stamp(v.createdAt)}</p>
        ${v.feedback ? `<p class="small space-top"><strong>수정 피드백</strong><br>${esc(v.feedback)}</p>` : ''}
        <div class="pdf-actions"><button class="btn" data-action="view-file" data-version="${v.n}">PDF 원문 보기</button>
          <button class="btn" data-action="download-file" data-version="${v.n}">다운로드</button>
          ${v.approval ? link(workRoute(work, 'certificate') + '/' + v.n, '이 버전의 증명서', 'btn') : ''}
        </div>
        <details class="hash-details"><summary>파일 해시 보기</summary><p class="mono">${esc(v.file.hash)}</p></details>
      </section>`).join('')}</div>
    </section>
    <section class="panel"><div class="panel-head"><h2>활동 이력</h2>${icon('clock')}</div>
      <div class="panel-body"><div class="row wrap history-controls">
        <label class="field"><span>버전</span><select id="history-version"><option value="">모든 버전</option>${versions.map(v => `<option value="${v.n}">v${v.n}</option>`).join('')}</select></label>
        <label class="field"><span>기록 유형</span><select id="history-type"><option value="">모든 유형</option><option value="work">등록·이해 확인</option><option value="review">검토</option><option value="approval">승인·발급</option></select></label>
      </div><div id="history-events">${eventList(work.events)}</div></div>
    </section>
  </div>`;
}
function eventList(events) {
  if (!events.length) return '<p class="small muted">선택한 조건의 활동이 없어요.</p>';
  return `<ol class="timeline">${events.slice().reverse().map(event => `<li><b>${esc(event.action)}</b>
    <p>v${event.version} · ${esc(event.actor)}<br>${stamp(event.at)}</p>
    ${event.note ? `<p class="detail-value">${esc(event.note)}</p>` : ''}</li>`).join('')}</ol>`;
}
function filterHistory() {
  const version = $('#history-version').value;
  const type = $('#history-type').value;
  const events = currentWork().events.filter(event => {
    const eventType = /이해 확인 답변 제출|작업 등록|새 버전 등록/.test(event.action) ? 'work'
      : /검토 통과|검토자 수정/.test(event.action) ? 'review'
      : /승인|증명서/.test(event.action) ? 'approval' : 'work';
    return (!version || Number(version) === event.version) && (!type || type === eventType);
  });
  $('#history-events').innerHTML = eventList(events);
  announce(`활동 ${events.length}건`);
}
function certificatesScreen() {
  const rows = state.works.filter(w => w.versions.some(v => M.certificateFor(w, v.n)));
  return heading('승인 증명서', '어떤 파일 버전이 승인됐는지 확인하고 검증 화면을 열어보세요.', '', 'APPROVAL RECORDS') + `<section class="panel">${rows.length ? rows.map(w => { const v = w.versions.filter(v => M.certificateFor(w, v.n)).at(-1); return `<div class="panel-body row between wrap" style="border-bottom:1px solid var(--color-border)"><div class="grow"><div class="row wrap"><h2 style="font-size:16px">${esc(w.title)}</h2>${badge('v' + v.n + ' · 발급 완료', 'success')}</div><p class="small muted" style="margin-top:8px">${esc(v.approval.serial)} · ${stamp(v.approval.at)}</p></div>${link(workRoute(w, 'certificate'), '증명서 보기' + icon('arrow'), 'btn')}</div>`; }).join('') : `<div class="empty">${icon('award')}<h2>아직 발급된 증명서가 없어요</h2><p>최종 승인 후 이곳에서 확인할 수 있어요.</p>${link('#works', '내 작업 보기', 'btn')}</div>`}</section>`;
}
function publicScreen(work, n) {
  let p;
  try { p = M.publicRecord(work, n); }
  catch {
    return `<main id="main" class="public-main">${heading('승인 기록을 찾을 수 없어요', '증명서를 발급한 브라우저에서 링크를 다시 열어 주세요.')}${link('#works', '내 작업으로', 'btn')}</main>`;
  }
  const fileState = comparison?.loading ? 'checking' : comparison?.error ? 'error' : comparison ? (comparison.match ? 'match' : 'mismatch') : 'idle';
  const result = {
    checking: ['비교 중', 'progress', '파일의 SHA-256을 계산하고 있어요.'],
    error: ['확인 불가', 'danger', comparison?.error],
    idle: ['파일 미확인', 'neutral', '전달받은 PDF를 선택하면 파일을 비교합니다.'],
    match: ['파일 일치', 'success', '선택한 PDF와 승인 기록의 파일 해시가 같아요.'],
    mismatch: ['파일 불일치', 'danger', '선택한 PDF는 승인 기록에 연결된 파일과 달라요.']
  }[fileState];
  const sample = work.demo && /^HAVE-DEMO-2026-\d+$/.test(p.serial);
  return `<header class="public-header row between">${brand()}${link('#works', '내 작업으로', 'btn')}</header>
    <main id="main" class="public-main">${heading('승인 기록 확인', '버전별 승인 기록을 읽고 받은 PDF가 같은 파일인지 확인하세요.')}
      <section class="panel">
        <div class="panel-head"><h2>${esc(p.title)}</h2>${badge('v' + p.version)}</div>
        <div class="panel-body">
          <div class="result-row"><div><h3>승인 효력</h3><p class="small muted">이 브라우저에 시연 승인 기록이 저장되어 있어요. 서버의 현재 효력은 조회할 수 없어요.</p></div>${badge('확인 불가')}</div>
          <div class="result-row"><div><h3>전자서명</h3><p class="small muted">이 시연 기록은 전자서명 기능과 연결되어 있지 않아요.</p></div>${badge('확인 불가')}</div>
          <dl class="definition"><dt>승인 대상</dt><dd>v${p.version} · ${esc(p.fileName)}</dd><dt>승인자</dt><dd>${esc(p.actor)} (시연)</dd>
            <dt>승인 시각</dt><dd>${stamp(p.at)}</dd><dt>확인 시각</dt><dd>${stamp(new Date())}</dd>
          </dl>
          <details class="hash-details"><summary>승인된 파일 해시 보기</summary><p class="mono">${esc(p.fileHash)}</p></details>
        </div>
      </section>
      <section class="panel proof-card">
        <div class="panel-head"><h2>파일 비교</h2></div>
        <div class="panel-body">
          <label class="proof-drop" for="compare-file">${icon('file')}<b>전달받은 PDF 비교하기</b><span id="compare-hint" class="muted">PDF · 최대 20 MB · 이 기기에서 비교</span>
            <input id="compare-file" type="file" accept=".pdf,application/pdf" aria-describedby="compare-hint" ${comparison?.loading ? 'disabled' : ''}>
          </label>
          <div class="proof-result" data-state="${fileState}">
            ${badge(result[0], result[1])}<p>${esc(result[2])}</p>
            ${comparison?.name ? `<p class="small muted">${esc(comparison.name)}</p>` : ''}
          </div>
          <div class="row wrap">
            ${sample ? '<button class="btn" data-action="sample-compare-original">원본 예시 비교</button><button class="btn" data-action="sample-compare-changed">수정 예시 비교</button>' : ''}
            ${comparison && !comparison.loading ? link(`#verify/${work.id}/${n}`, '비교 초기화', 'btn text', 'data-recheck="true"') : ''}
          </div>
        </div>
      </section>
      <p class="footnote">HAVE는 기록된 승인과 파일의 일치 여부를 보여줍니다. 내용의 정확성과 실제 이해 수준은 별도로 판단해야 합니다.</p>
    </main>`;
}
function currentWork() { return state.works.find(w => w.id === route.split('/')[1]); }
function roleScreen(mode, work) {
  const isReview = mode === 'review';
  const actor = isReview ? reviewerActor : R.APPROVER;
  const label = isReview ? '검토할 작업' : '승인할 작업';
  const queueRoute = isReview ? '#review-queue' : '#approval-queue';
  const identity = isReview && !work ? `<label class="field role-picker" for="reviewer-role">
      <span>시연 검토자</span><select id="reviewer-role">${M.REVIEWERS.map(name => `<option ${actor === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
    </label>` : '';
  const intro = work ? heading(isReview ? '작업 검토' : '최종 승인', work.title, link(queueRoute, '대기 목록', 'btn'))
    : heading(label, `현재 시연 역할 · ${actor}`);
  const content = work ? V.detail(work, mode, actor, questions, reviewHelpers) : V.queue(state.works, mode, actor, reviewHelpers);
  return shell(`<div class="review-demo">${intro}${identity}${work ? context(work) : ''}${content}</div>`, label);
}
function render(focus = false) {
  if (!state) return;
  if (route.startsWith('#verify/')) { const [, id, n] = route.split('/'); const work = state.works.find(w => w.id === id); $('#app').innerHTML = publicScreen(work, n); }
  else if (route === '#new') $('#app').innerHTML = shell(editorScreen(), '작업 등록');
  else if (route === '#certificates') $('#app').innerHTML = shell(certificatesScreen(), '승인 증명서');
  else if (route === '#review-queue' || route === '#approval-queue') $('#app').innerHTML = roleScreen(route === '#review-queue' ? 'review' : 'approval');
  else if (route.startsWith('#work/')) {
    const work = currentWork(), tab = route.split('/')[2] || 'overview';
    if (!work) $('#app').innerHTML = shell(heading('작업을 찾을 수 없어요', '내 작업 목록에서 다시 선택해 주세요.') + link('#works', '내 작업으로', 'btn'));
    else if (tab === 'review' || tab === 'approval') $('#app').innerHTML = roleScreen(tab, work);
    else {
      const labels = { overview: '작업 상세', challenge: '이해 확인', certificate: '증명서', history: '버전 · 이력' };
      const content = tab === 'challenge' ? challenge(work) : tab === 'certificate' ? certificate(work, route.split('/')[3]) : tab === 'history' ? historyScreen(work) : overview(work);
      $('#app').innerHTML = shell(heading(labels[tab] || '작업 상세', work.title, link('#works', '목록으로', 'btn')) + context(work) + detailTabs(work, tab) + content, labels[tab]);
    }
  } else $('#app').innerHTML = shell(listScreen(), route === '#attention' ? '내 확인 필요' : '내 작업');
  document.title = 'HAVE · ' + ($('#app h1')?.textContent || '내 작업');
  if (route === '#new') registration.syncRisk(document);
  if (focus) { $('#main h1')?.focus(); window.scrollTo(0, 0); }
}
async function confirmDialog(title, text, confirmLabel = '이동하기', cancelLabel = '계속 작성') {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = ''; dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button class="btn icon-only" value="cancel" aria-label="닫기">${icon('close')}</button></div><div class="dialog-body"><p>${esc(text)}</p></div><div class="dialog-actions"><button class="btn" value="cancel" autofocus>${esc(cancelLabel)}</button><button class="btn primary" value="confirm">${esc(confirmLabel)}</button></div></form>`;
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => { previous?.isConnected && previous.focus(); resolve(dialog.returnValue === 'confirm'); }, { once: true }));
}
async function go(hash, skipGuard = false) {
  if (saving || fileChecking || roleSubmitting) { toast('처리가 끝난 뒤 이동해 주세요.'); return; }
  if (dirty && !skipGuard && !(await confirmDialog('저장하지 않은 내용이 있어요', '이동하면 마지막 임시 저장 이후의 입력은 사라져요. 계속 이동할까요?'))) return;
  dirty = false; storageError = ''; savedAt = ''; compareRequest++; comparison = null;
  conflictSnapshot = null;
  if (hash !== '#new') { editor = null; editorStep = 0; editorErrors = {}; }
  answerDraft = null; questionIndex = 0; route = hash;
  if (hash === '#attention') filter = 'attention'; else if (hash === '#works') filter = 'all';
  if (hash === '#review-queue' && R.pendingFor(state.works, 'review', reviewerActor).length === 0) {
    reviewerActor = M.REVIEWERS.find(actor => R.pendingFor(state.works, 'review', actor).length) || reviewerActor;
  }
  history.pushState(null, '', hash); render(true);
}
async function persist(next) {
  if (saving) return false;
  saving = true; announce('기록을 저장하는 중');
  const controls = [...document.querySelectorAll('button[type="submit"], [data-action="save-draft"], [data-action="save-answers"]')];
  const previous = controls.map(b => ({ disabled: b.disabled, html: b.innerHTML }));
  controls.forEach(b => { b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = b.type === 'submit' ? '제출 중…' : '저장 중…'; });
  try {
    revision = await repo.commit(next, revision);
    state = next;
    storageError = '';
    announce('저장 완료');
    notifyExtensionBadge();
    syncChannel?.postMessage({ revision, route });
    return true;
  }
  catch (error) {
    storageError = error.name === 'ConflictError' ? '다른 창에서 변경한 기록이 있어요. 현재 입력은 보존됐어요. 최신 기록을 불러온 뒤 다시 저장해 주세요.' : '기록을 저장하지 못했어요. 입력은 유지됐어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
    if (error.name === 'ConflictError') { conflictSnapshot = await repo.load(); storageError += ' 미저장 입력을 백업한 뒤 최신 기록을 불러올 수 있어요.'; }
    announce(storageError); toast(storageError); return false;
  } finally { saving = false; controls.forEach((b, i) => { if (b.isConnected) { b.disabled = previous[i].disabled; b.innerHTML = previous[i].html; b.removeAttribute('aria-busy'); } }); }
}
function captureEditor() {
  if (!editor) return;
  for (const name of ['title', 'tool', 'scope', 'contribution', 'reason']) { const node = $('#' + name); if (node) editor[name] = node.value; }
  const reviewer = $('input[name="reviewer"]:checked'); if (reviewer) editor.reviewer = reviewer.value;
  registration.capture(document, editor);
}
function captureAnswers() {
  if (!answerDraft) return;
  if ($('#answer')) answerDraft.answers[questionIndex] = $('#answer').value;
  if ($('#confidence')) answerDraft.confidence[questionIndex] = Number($('#confidence').value);
}
async function saveDraft() {
  captureEditor(); const next = structuredClone(state); next.draft = structuredClone(editor);
  if (await persist(next)) { dirty = false; savedAt = '임시 저장됨 · ' + stamp(new Date()); render(); toast('작성 중인 작업을 저장했어요.'); } else render();
}
async function saveAnswers(submit = false) {
  captureAnswers(); const work = currentWork(); if (!work || !answerDraft) return;
  if (M.latest(work).id !== answerDraft.versionId) { toast('대상 버전이 바뀌었어요. 입력을 백업한 뒤 최신 버전을 열어 주세요.'); return; }
  let updated;
  try {
    if (submit) updated = M.submitAnswers(work, answerDraft.answers, answerDraft.confidence);
    else { updated = structuredClone(work); const v = M.latest(updated); if (v.status !== 'CHALLENGE_PENDING') return; v.answers = [...answerDraft.answers]; v.confidence = [...answerDraft.confidence]; }
  } catch (error) { const index = answerDraft.answers.findIndex(a => !a.trim()); if (index >= 0) questionIndex = index; render(); $('#answer-error').textContent = error.message; $('#answer').setAttribute('aria-invalid', 'true'); $('#answer').focus(); return; }
  const next = structuredClone(state); next.works[next.works.findIndex(w => w.id === work.id)] = updated;
  if (await persist(next)) { dirty = false; savedAt = '저장됨 · ' + stamp(new Date()); render(); toast(submit ? '답변을 제출했어요. 검토자의 확인을 기다려 주세요.' : '답변을 임시 저장했어요.'); } else render();
}
function showGuide(menu = false) {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = menu ? 'menu-dialog' : '';
  const openTabAction = menu ? `<button class="btn" data-action="open-tab">${icon('external')}새 탭에서 크게 보기</button>` : '';
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${menu ? 'HAVE 메뉴' : 'HAVE 사용 가이드'}</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${icon('close')}</button></div><div class="dialog-body">${menu ? navMarkup() : `<ol><li><b>작업 등록</b>PDF → AI 사용 신고 → 나의 기여 → 검토자를 입력해요.</li><li><b>이해 확인</b>세 문항을 작성하고 전체 답변을 제출해요.</li><li><b>검토 결과 확인</b>수정 요청이 오면 피드백을 반영해 새 버전으로 제출해요.</li><li><b>승인 기록과 파일 확인</b>증명서와 공개 검증에서 버전·승인 기록·파일 일치를 구분해 확인해요.</li></ol><p class="muted">이 화면은 작성자용 Chrome 확장 프로그램 로컬 데모입니다. 메뉴에서 검토자와 최종 승인자 역할을 각각 선택해 제출한 작업을 이어서 처리할 수 있어요. 인증과 전자서명은 서버 연동이 필요해요.</p>`}</div><div class="dialog-actions">${openTabAction}<button class="btn ${menu ? '' : 'accent'}" data-action="close-dialog">${menu ? '닫기' : '가이드 닫기'}</button></div>`;
  dialog.showModal(); dialog.addEventListener('close', () => previous?.isConnected && previous.focus(), { once: true });
}
function download(data, name, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function openPdf(version) {
  const url = URL.createObjectURL(new Blob([M.decode(version.file.data)], { type: 'application/pdf' }));
  const preview = document.createElement('a');
  preview.href = url;
  preview.target = '_blank';
  preview.rel = 'noopener noreferrer';
  preview.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요.'); }
  catch {
    const dialog = $('#dialog'); dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">복사할 내용을 선택해 주세요</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${icon('close')}</button></div><div class="dialog-body"><label class="field"><span>복사할 내용</span><textarea readonly id="copy-value">${esc(text)}</textarea></label></div>`; dialog.showModal(); $('#copy-value').select();
  }
}
async function chooseFile(file) {
  if (!file || !editor || fileChecking) return;
  captureEditor(); fileChecking = true; editorErrors = {}; render(); announce('파일을 확인하는 중');
  try { editor.file = await readPdf(file); dirty = true; announce('파일 확인 완료'); }
  catch (error) { editorErrors.file = error.message; announce(error.message); }
  finally { fileChecking = false; render(); if (editorErrors.file) $('#pdf')?.focus(); }
}
async function readPdf(file) {
  if (file.size > HumanProof.MAX_PDF_BYTES) throw new Error('20 MB 이하의 PDF를 선택해 주세요.');
  return M.prepareFile(file.name, new Uint8Array(await file.arrayBuffer()));
}
async function compareFile(file) {
  if (!file) return;
  const request = ++compareRequest, [, id, n] = route.split('/'), work = state.works.find(w => w.id === id), p = M.publicRecord(work, n);
  comparison = { loading: true }; render(); announce('파일을 비교하는 중');
  try { const f = await readPdf(file); if (request !== compareRequest) return; comparison = { match: f.hash === p.fileHash, name: f.name }; }
  catch (error) { if (request !== compareRequest) return; comparison = { error: error.message }; }
  if (request === compareRequest) { render(); announce(comparison.error || (comparison.match ? '파일 일치' : '파일 불일치')); }
}
async function runRoleDecision(event) {
  if (roleSubmitting || saving) return;
  const form = event.target;
  const { mode, versionId, payload } = V.read(form, event.submitter);
  const work = currentWork();
  const actor = mode === 'review' ? reviewerActor : R.APPROVER;
  const decision = { PASS: '검토 통과', REVISE: '수정 요청', APPROVE: '최종 승인' }[payload.decision] || '증명서 발급';
  roleSubmitting = true;
  try {
    if (!(await confirmDialog(decision + '을 기록할까요?', `${work.title} · v${M.latest(work).n} · ${actor}\n이 결정은 해당 버전에 저장됩니다.`, decision, '취소'))) return;
    const updated = mode === 'review' ? R.reviewWork(work, actor, versionId, payload)
      : mode === 'approval' ? await R.decideApproval(work, actor, versionId, payload)
      : await R.issueCertificate(work, actor, versionId);
    const next = structuredClone(state);
    next.works[next.works.findIndex(item => item.id === work.id)] = updated;
    if (await persist(next)) {
      dirty = false;
      render(true);
      toast(decision + ' 기록을 저장했어요.');
    } else {
      V.showError(form, storageError);
      if (conflictSnapshot && !form.querySelector('[data-action="retry-save"]')) {
        const recover = document.createElement('button');
        recover.type = 'button';
        recover.className = 'btn';
        recover.textContent = '입력 백업 후 최신 기록 불러오기';
        recover.dataset.action = 'retry-save';
        form.append(recover);
      }
    }
  } catch (error) {
    V.showError(form, error.message);
  } finally {
    roleSubmitting = false;
  }
}
document.addEventListener('click', async event => {
  if (registration.handleClick(event)) return;
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main')?.setAttribute('tabindex', '-1'); $('#main')?.focus(); return; }
  const routeLink = event.target.closest('[data-route]'), button = event.target.closest('[data-action]');
  if (routeLink) {
    event.preventDefault();
    if (roleSubmitting) return;
    if ($('#dialog').open) $('#dialog').close();
    if (routeLink.dataset.recheck) { compareRequest++; comparison = null; render(); $('#compare-file')?.focus(); return; }
    await go(routeLink.dataset.route); return;
  }
  const fieldLink = event.target.closest('[data-error-field]');
  if (fieldLink) { event.preventDefault(); const key = fieldLink.dataset.errorField; (key === 'file' ? $('#pdf') : $('#' + key))?.focus(); return; }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { filter = filterButton.dataset.filter; render(); $(`#filter-${filter}`)?.focus(); return; }
  const questionButton = event.target.closest('[data-question]');
  if (questionButton) { captureAnswers(); questionIndex = Number(questionButton.dataset.question); render(); $('#question-' + questionIndex)?.focus(); return; }
  if (!button || button.disabled) return;
  const action = button.dataset.action, work = currentWork();
  try {
    if (action === 'guide' || action === 'menu') showGuide(action === 'menu');
    if (action === 'close-dialog') $('#dialog').close();
    if (action === 'open-tab') { if ($('#dialog').open) $('#dialog').close(); openCurrentRouteInTab(); }
    if (action === 'clear-filter') { query = ''; filter = 'all'; render(); $('#search')?.focus(); }
    if (action === 'save-draft') await saveDraft();
    if (action === 'previous-step') { captureEditor(); editorStep = Math.max(0, editorStep - 1); editorErrors = {}; render(); $('#main h1')?.focus(); }
    if (action === 'cancel-editor') await go('#works');
    if (action === 'sample-pdf') {
      captureEditor(); fileChecking = true; render();
      try { editor.file = await M.prepareFile('HAVE_sample.pdf', M.samplePdf()); dirty = true; delete editorErrors.file; }
      finally { fileChecking = false; render(); }
    }
    if (action === 'save-answers') await saveAnswers();
    if (action === 'retry-save') {
      if (conflictSnapshot) {
        if (!(await confirmDialog('최신 기록을 불러올까요?', '미저장 입력을 백업 파일로 내려받고 최신 기록을 불러옵니다. 백업 내용을 확인한 뒤 다시 입력해 주세요.', '백업 후 불러오기'))) return;
        captureEditor(); captureAnswers();
        const roleForm = document.querySelector('[data-role-mode]');
        const roleDraft = roleForm ? Object.fromEntries(new FormData(roleForm)) : null;
        download(JSON.stringify({ editor, answers: answerDraft, roleDraft }, null, 2), 'HAVE_미저장입력.json', 'application/json');
        state = conflictSnapshot.data; revision = conflictSnapshot.revision; conflictSnapshot = null; dirty = false; editor = null; answerDraft = null;
        await go('#works', true); toast('최신 기록을 불러왔어요. 미저장 입력은 백업 파일에서 확인할 수 있어요.');
      } else if (route === '#new') await saveDraft(); else if (route.endsWith('/challenge')) await saveAnswers();
    }
    if (action === 'new-version') {
      const v = M.latest(work);
      if (!['APPROVED', 'REVISION_REQUIRED'].includes(v.status)) return;
      const form = { ...registration.metadata(v), title: work.title, file: null,
        tool: v.aiUsed === false ? '' : v.tool, scope: v.aiUsed === false ? '' : v.scope,
        contribution: v.contribution, reviewer: v.reviewer, reason: '', isVersion: true, workId: work.id,
        responseNotes: [] };
      if (state.draft && !(await confirmDialog('임시 저장한 작업이 있어요', '새 버전을 작성하면 다음 임시 저장에서 기존 작성 중인 작업을 대체합니다.', '새 버전 작성'))) return;
      await go('#new'); editor = form; editorStep = 0; render(true);
    }
    if (['view-file', 'download-file', 'copy-hash'].includes(action)) {
      const v = work.versions.find(v => v.n === Number(button.dataset.version)) || M.latest(work);
      if (action === 'view-file') openPdf(v);
      if (action === 'download-file') download(M.decode(v.file.data), v.file.name);
      if (action === 'copy-hash') await copy(v.file.hash);
    }
    if (action === 'print-certificate') window.print();
    if (action.startsWith('sample-compare-')) {
      const bytes = M.samplePdf();
      const changed = action === 'sample-compare-changed';
      if (changed) bytes[new TextDecoder().decode(bytes).indexOf('demonstration')] = 68;
      await compareFile(new File([bytes], changed ? 'HAVE_수정_예시.pdf' : 'HAVE_원본_예시.pdf', { type: 'application/pdf' }));
    }
    if (action === 'download-certificate') download(JSON.stringify({ demo: true, serverApprovalVerified: false, signature: null, ...M.publicRecord(work, button.dataset.version) }, null, 2), 'HAVE_승인기록_v' + button.dataset.version + '.json', 'application/json');
    if (action === 'copy-link') await copy(location.href.split('#')[0] + `#verify/${work.id}/${button.dataset.version}`);
  } catch (error) { toast(error.message); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search') { query = event.target.value; $('#work-results').innerHTML = workResults(); announce(M.filterWorks(state.works, query, filter).length + '개 작업'); return; }
  if (route === '#new' && event.target.closest('#registration')) { captureEditor(); registration.syncRisk(document); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; $('.saved-at') && ($('.saved-at').textContent = savedAt); }
  if (event.target.closest('[data-role-mode]')) dirty = true;
  if (route.endsWith('/challenge') && ['answer', 'confidence'].includes(event.target.id)) { captureAnswers(); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; if ($('#confidence-value')) $('#confidence-value').textContent = answerDraft.confidence[questionIndex] + '%'; $('.saved-at') && ($('.saved-at').textContent = savedAt); }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'pdf') await chooseFile(event.target.files[0]);
  if (event.target.id === 'compare-file') await compareFile(event.target.files[0]);
  if (event.target.id === 'sort') { sort = event.target.value; $('#work-results').innerHTML = workResults(); }
  if (event.target.id === 'reviewer-role' && M.REVIEWERS.includes(event.target.value)) { reviewerActor = event.target.value; render(); $('#reviewer-role')?.focus(); }
  if (event.target.id === 'certificate-version') await go(workRoute(currentWork(), 'certificate') + '/' + event.target.value);
  if (['history-version', 'history-type'].includes(event.target.id)) filterHistory();
});
document.addEventListener('dragover', event => { if (event.target.closest('.upload-drop, .proof-drop')) event.preventDefault(); });
document.addEventListener('drop', async event => {
  if (event.target.closest('.upload-drop')) { event.preventDefault(); await chooseFile(event.dataTransfer.files[0]); }
  if (event.target.closest('.proof-drop')) { event.preventDefault(); await compareFile(event.dataTransfer.files[0]); }
});
document.addEventListener('submit', async event => {
  if (event.target.matches('[data-role-mode]')) { event.preventDefault(); await runRoleDecision(event); return; }
  if (!['registration', 'answers'].includes(event.target.id)) return;
  event.preventDefault(); if (saving || fileChecking) return;
  if (event.target.id === 'answers') { await saveAnswers(true); return; }
  captureEditor(); editorErrors = M.validateRegistration(editor, editorStep);
  if (Object.keys(editorErrors).length) { render(); const key = Object.keys(editorErrors)[0]; (key === 'file' ? $('#pdf') : $('#' + key))?.focus(); return; }
  if (editorStep < 3) { editorStep++; render(); $('#main h1')?.focus(); return; }
  editorErrors = M.validateRegistration(editor);
  if (Object.keys(editorErrors).length) {
    editorStep = [0, 1, 2, 3].find(step => Object.keys(M.validateRegistration(editor, step)).length) ?? 0;
    render(); return;
  }
  const next = structuredClone(state);
  try {
    let work;
    if (editor.isVersion) { const index = next.works.findIndex(w => w.id === editor.workId); if (index < 0) throw new Error('원래 작업을 찾을 수 없어요.'); work = M.appendVersion(next.works[index], editor); next.works[index] = work; }
    else { work = M.createWork(editor); next.works.unshift(work); }
    next.draft = null;
    if (await persist(next)) { dirty = false; await go(workRoute(work), true); toast('작업을 제출했어요. 이해 확인을 진행해 주세요.'); } else render();
  } catch (error) { editorErrors = { title: error.message }; editorStep = 0; render(); }
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
    await repo.open(); const stored = await repo.load();
    if (stored) {
      if (stored.data?.schema !== 1 || !Array.isArray(stored.data.works)) throw new Error('저장 기록의 형식을 확인할 수 없어요.');
      state = normalizeState(stored.data); revision = stored.revision;
    }
    else { state = await M.seed(); revision = await repo.commit(state, 0); }
    if (route === '#attention') filter = 'attention';
    render();
    notifyExtensionBadge();
  } catch (error) {
    $('#app').innerHTML = `<main id="main" class="loading-screen"><h1>작업을 불러올 수 없어요</h1><p>${esc(error.message)}</p><p>기존 브라우저 기록은 삭제하지 않았어요.</p><button class="btn primary" id="retry-load">다시 불러오기</button></main>`;
    $('#retry-load').onclick = () => location.reload();
  }
}
init();
