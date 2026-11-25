'use strict';
/* HAVE 팝업 (1123) — 지금 할 일, 알림, 측면 패널·전체 탭 열기 */
const M = HaveModel;
const R = HaveReviewModel;
const store = new HaveStorage.WorkspaceStore();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let currentWindowId = null;
function openTab(hash = '#works') { chrome.runtime.sendMessage({ type: 'HAVE_OPEN_TAB', hash }, () => window.close()); }
function openSidePanel() {
  if (!chrome.sidePanel?.open || currentWindowId == null) { openTab('#works'); return; }
  chrome.sidePanel.open({ windowId: currentWindowId }).then(() => window.close()).catch(() => openTab('#works'));
}
function getNextHash(work) {
  const v = M.getLatestVersion(work);
  return `#work/${work.id}/${{ CHALLENGE_PENDING: 'challenge', REVISION_REQUIRED: 'revise', SUBMITTED: 'request' }[v.status] || 'overview'}`;
}
function showPopup(state) {
  const attention = M.getWorks(state, '', 'attention');
  const counts = { all: state.works.length, ongoing: M.getWorks(state, '', 'ongoing').length, approved: M.getWorks(state, '', 'approved').length };
  const reviewCount = M.USERS.reviewers.reduce((t, a) => t + R.getPendingWorks(state, 'review', a).length, 0);
  const approvalCount = M.USERS.approvers.reduce((t, a) => t + R.getPendingWorks(state, 'approval', a).length, 0);
  const unread = M.getUnreadCount(state, M.USERS.author);
  chrome.runtime.sendMessage({ type: 'HAVE_BADGE_UPDATE', count: attention.length }).catch(() => {});
  const draft = state.draft ? `<li><button type="button" class="item-btn" data-hash="#new"><div style="min-width:0"><div class="item-title">${escapeHtml(state.draft.title || '제목 없는 작업')}</div><div class="item-meta">임시 저장된 작업 이어서 작성</div></div><span class="badge">작성 중</span></button></li>` : '';
  const items = attention.slice(0, 3).map(work => {
    const v = M.getLatestVersion(work), s = M.getStatus(v);
    return `<li><button type="button" class="item-btn" data-hash="${escapeHtml(getNextHash(work))}"><div style="min-width:0"><div class="item-title">${escapeHtml(work.title)}</div><div class="item-meta">v${v.n}${v.request ? ' · 검토자 ' + escapeHtml(v.request.reviewer) : ''}</div></div><span class="badge ${s.tone}">${escapeHtml(s.label)}</span></button></li>`;
  }).join('');
  document.getElementById('popup-app').innerHTML = `
    <div class="metrics-grid">
      <button type="button" class="metric-card" data-hash="#works"><div class="metric-label">전체 작업</div><div class="metric-val">${counts.all}<span>건</span></div></button>
      <button type="button" class="metric-card" data-hash="#attention"><div class="metric-label">내 확인 필요</div><div class="metric-val">${attention.length}<span>건</span></div></button>
      <button type="button" class="metric-card" data-hash="#works"><div class="metric-label">검토 진행 중</div><div class="metric-val">${counts.ongoing}<span>건</span></div></button>
      <button type="button" class="metric-card" data-hash="#notifications"><div class="metric-label">읽지 않은 알림</div><div class="metric-val">${unread}<span>건</span></div></button>
    </div>
    <section class="section-card" aria-label="내 확인 필요"><div class="section-card-head"><span>내 확인 필요</span><span>${attention.length}건</span></div>
      ${draft || items ? `<ul class="item-list">${draft}${items}</ul>` : '<div class="empty-note">지금 확인이 필요한 작업이 없어요.</div>'}</section>
    <div class="actions-stack"><button type="button" class="btn primary" id="btn-new-work">+ 새 작업 등록</button>
      <div class="actions-row"><button type="button" class="btn" id="btn-full-tab">새 탭에서 열기</button><button type="button" class="btn" id="btn-side-panel">사이드 패널</button></div></div>
    <div class="quick-links"><button type="button" class="quick-link" data-hash="#certificates">증명서 ${counts.approved}</button><button type="button" class="quick-link" data-hash="#review-queue">검토 ${reviewCount}</button><button type="button" class="quick-link" data-hash="#approval-queue">승인 ${approvalCount}</button></div>
    <p class="popup-footer">로컬 확장 프로그램 · 현재 브라우저에만 저장됩니다.</p>`;
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-hash]');
  if (target) { openTab(target.dataset.hash); return; }
  if (event.target.closest('#btn-open-tab') || event.target.closest('#btn-full-tab')) { openTab('#works'); return; }
  if (event.target.closest('#btn-new-work')) { openTab('#new'); return; }
  if (event.target.closest('#btn-side-panel')) openSidePanel();
});
async function initPopup() {
  try { if (chrome.windows?.getCurrent) currentWindowId = (await chrome.windows.getCurrent())?.id ?? null; } catch {}
  try {
    await store.open();
    const stored = await store.getStored();
    let state;
    if (stored && stored.data?.schema === 2 && Array.isArray(stored.data.works)) state = stored.data;
    else {
      state = await HaveSeed.createSeed();
      try { await store.save(state, 0); } catch (e) { const again = await store.getStored(); if (again?.data?.schema === 2) state = again.data; }
    }
    showPopup(state);
  } catch (error) {
    document.getElementById('popup-app').innerHTML = `<div class="error-box">${escapeHtml(error?.message || '작업을 불러오지 못했습니다.')}</div><button type="button" class="btn primary" id="btn-full-tab">전체 화면으로 열기</button>`;
  }
}
initPopup();
