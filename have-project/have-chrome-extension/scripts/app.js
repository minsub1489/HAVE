/* HAVE 사용자 화면 (1123) — 사이드 패널·전체 탭 공통.
   팀원의 확장 프로그램(11-23) 화면 구성과 스타일을 유지하고, 1118 산출물의 규칙과 빠진 기능(검토 시작·철회·알림·요청 취소·공유 링크·이력 해시)을 넣었다.
   1128: 화면별 그리기와 이벤트 처리를 screens/*.js로 옮겼다(동작은 그대로). 이 파일에는 화면 틀, 라우팅, 저장, 공통 도구, 이벤트 배분만 남는다.
   담당: D (화면 틀). 화면을 고칠 때는 screens/의 해당 파일을 고친다. */
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

// ── 이벤트 배분 ───────────────────────────────────────────────
// 화면별 처리는 screens/*.js가 addAction · addHandler로 등록한다. 여기서는 등록된 순서대로 불러 주기만 한다.
// match는 반드시 동기 함수다. 일치하지 않는 처리기에서는 await하지 않으므로, 일치한 처리기의 event.preventDefault()가 제때 불린다.
const handlers = { click: [], action: [], input: [], change: [], drop: [], submit: [] };
/** 화면 파일이 이벤트 처리기를 등록한다. match(event)가 참이면 run(event)를 부른다. */
function addHandler(type, match, run) { handlers[type].push({ match, run }); }
/** data-action 버튼의 처리기를 등록한다. names는 이름 하나 또는 배열. run(button, work, action) */
function addAction(names, run) { const list = [].concat(names); handlers.action.push({ match: action => list.includes(action), run }); }
/** 접두사로 시작하는 data-action의 처리기를 등록한다. */
function addActionPrefix(prefix, run) { handlers.action.push({ match: action => action.startsWith(prefix), run }); }

// 틀에 속한 공통 버튼
addAction(['guide', 'menu'], async (button, work, action) => { showGuide(action === 'menu'); });
addAction('close-dialog', async (button, work, action) => { $('#dialog').close(); });
addAction('open-tab', async (button, work, action) => { if ($('#dialog').open) $('#dialog').close(); openCurrentRouteInTab(); });
addAction('copy-text', async (button, work, action) => { await copy(button.dataset.text); });
addAction('toggle-fail-demo', async (button, work, action) => { const next = structuredClone(state); next.demo.failNextIssue = button.checked; if (await persist(next)) showToast(button.checked ? '다음 증명서 발급이 한 번 실패해요.' : '발급 실패 시연을 껐어요.'); });
addAction('reset-demo', async (button, work, action) => {
  if (!(await confirmDialog('시연 데이터를 처음으로 되돌릴까요?', '이 브라우저에 저장된 작업과 알림이 모두 시연 초기 상태로 바뀌어요.', '되돌리기', '취소'))) return;
  $('#dialog').close();
  if (await persist(await HaveSeed.createSeed())) { chainCache.clear(); conditionsCache.clear(); verifiedRoutes.clear(); await go('#works', true); showToast('시연 데이터를 처음으로 되돌렸어요.'); }
});
addAction('retry-save', async (button, work, action) => {
  if (conflictSnapshot) { state = conflictSnapshot.data; storeRevision = conflictSnapshot.revision; conflictSnapshot = null; storageError = ''; dirty = false; await go(route, true); showToast('최신 기록을 불러왔어요. 입력을 다시 확인해 주세요.'); }
  else render();
});

document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main')?.setAttribute('tabindex', '-1'); $('#main')?.focus(); return; }
  const routeLink = event.target.closest('[data-route]'), button = event.target.closest('[data-action]');
  if (routeLink) { event.preventDefault(); if (roleSubmitting) return; if ($('#dialog').open) $('#dialog').close(); await go(routeLink.dataset.route); return; }
  for (const h of handlers.click) if (h.match(event)) { await h.run(event); return; }
  if (!button || button.disabled) return;
  const action = button.dataset.action, work = getCurrentWork();
  try {
    for (const h of handlers.action) if (h.match(action)) await h.run(button, work, action);
  } catch (error) { showToast(error.message); }
});

document.addEventListener('input', event => { for (const h of handlers.input) if (h.match(event)) h.run(event); });

document.addEventListener('change', async event => { for (const h of handlers.change) if (h.match(event)) await h.run(event); });
document.addEventListener('dragover', event => { if (event.target.closest('.upload-drop, .proof-drop')) event.preventDefault(); });
document.addEventListener('drop', async event => { for (const h of handlers.drop) if (h.match(event)) await h.run(event); });

document.addEventListener('submit', async event => { for (const h of handlers.submit) if (h.match(event)) { await h.run(event); return; } });
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
