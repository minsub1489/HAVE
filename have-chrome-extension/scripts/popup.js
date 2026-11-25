'use strict';

const M = HaveUserModel;
const R = HaveUserReviewModel;
const repo = new HumanProofStorage.Repository(globalThis.indexedDB, 'have-author-gui-v1');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentWindowId = null;

function openTab(hash = '#works') {
  chrome.runtime.sendMessage({ type: 'HAVE_OPEN_TAB', hash }, () => {
    window.close();
  });
}

function openSidePanel() {
  if (!chrome.sidePanel?.open || currentWindowId == null) {
    openTab('#works');
    return;
  }
  chrome.sidePanel.open({ windowId: currentWindowId })
    .then(() => window.close())
    .catch(() => openTab('#works'));
}

function renderPopup(state) {
  const works = state.works || [];
  const all = works.length;
  const attentionList = M.filterWorks(works, '', 'attention');
  const ongoing = M.filterWorks(works, '', 'ongoing').length;
  const approved = M.filterWorks(works, '', 'approved').length;
  const reviewCount = M.REVIEWERS.reduce((sum, actor) => sum + R.pendingFor(works, 'review', actor).length, 0);
  const approvalCount = R.pendingFor(works, 'approval', R.APPROVER).length;

  chrome.runtime.sendMessage({ type: 'HAVE_BADGE_UPDATE', count: attentionList.length }).catch(() => {});

  const draftItem = state.draft
    ? `<li><button type="button" class="item-btn" data-hash="#new">
        <div style="min-width:0"><div class="item-title">${esc(state.draft.title || '제목 없는 작업')}</div>
        <div class="item-meta">임시 저장된 작업 이어서 작성</div></div>
        <span class="badge progress">임시 저장</span>
      </button></li>`
    : '';

  const attentionItems = attentionList.slice(0, 3).map(work => {
    const v = M.latest(work);
    const s = M.statusOf(work, v);
    const targetHash = `#work/${work.id}/${v.status === 'CHALLENGE_PENDING' ? 'challenge' : 'overview'}`;
    return `<li><button type="button" class="item-btn" data-hash="${esc(targetHash)}">
      <div style="min-width:0"><div class="item-title">${esc(work.title)}</div>
      <div class="item-meta">v${v.n} · 검토자 ${esc(v.reviewer)}</div></div>
      <span class="badge ${s.tone}">${esc(s.label)}</span>
    </button></li>`;
  }).join('');

  const listMarkup = (draftItem || attentionItems)
    ? `<ul class="item-list">${draftItem}${attentionItems}</ul>`
    : `<div class="empty-note">지금 확인이 필요한 작업이 없어요.</div>`;

  document.getElementById('popup-app').innerHTML = `
    <div class="metrics-grid">
      <button type="button" class="metric-card" data-hash="#works">
        <div class="metric-label">전체 작업</div>
        <div class="metric-val">${all}<span>건</span></div>
      </button>
      <button type="button" class="metric-card" data-hash="#attention">
        <div class="metric-label">내 확인 필요</div>
        <div class="metric-val">${attentionList.length}<span>건</span></div>
      </button>
      <button type="button" class="metric-card" data-hash="#works">
        <div class="metric-label">검토 진행 중</div>
        <div class="metric-val">${ongoing}<span>건</span></div>
      </button>
      <button type="button" class="metric-card" data-hash="#certificates">
        <div class="metric-label">승인 완료</div>
        <div class="metric-val">${approved}<span>건</span></div>
      </button>
    </div>

    <section class="section-card" aria-label="내 확인 필요">
      <div class="section-card-head">
        <span>내 확인 필요</span>
        <span>${attentionList.length}건</span>
      </div>
      ${listMarkup}
    </section>

    <div class="actions-stack">
      <button type="button" class="btn primary" id="btn-new-work">+ 새 작업 등록</button>
      <div class="actions-row">
        <button type="button" class="btn" id="btn-full-tab">새 탭에서 열기</button>
        <button type="button" class="btn" id="btn-side-panel">사이드 패널</button>
      </div>
    </div>

    <div class="quick-links">
      <button type="button" class="quick-link" data-hash="#certificates">증명서</button>
      <button type="button" class="quick-link" data-hash="#review-queue">검토 (${reviewCount})</button>
      <button type="button" class="quick-link" data-hash="#approval-queue">승인 (${approvalCount})</button>
    </div>

    <p class="popup-footer">로컬 확장 프로그램 · 현재 브라우저에만 저장됩니다.</p>
  `;
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-hash]');
  if (target) {
    openTab(target.dataset.hash);
    return;
  }
  if (event.target.closest('#btn-open-tab') || event.target.closest('#btn-full-tab')) {
    openTab('#works');
    return;
  }
  if (event.target.closest('#btn-new-work')) {
    openTab('#new');
    return;
  }
  if (event.target.closest('#btn-side-panel')) {
    openSidePanel();
  }
});

async function initPopup() {
  try {
    if (chrome.windows?.getCurrent) {
      const win = await chrome.windows.getCurrent();
      currentWindowId = win?.id ?? null;
    }
  } catch {}

  try {
    await repo.open();
    const stored = await repo.load();
    let state;
    if (stored && stored.data?.schema === 1 && Array.isArray(stored.data.works)) {
      state = stored.data;
    } else {
      state = await M.seed();
      await repo.commit(state, 0);
    }
    renderPopup(state);
  } catch (error) {
    document.getElementById('popup-app').innerHTML = `
      <div class="error-box">${esc(error?.message || '작업을 불러오지 못했습니다.')}</div>
      <button type="button" class="btn primary" id="btn-full-tab">전체 화면으로 열기</button>
    `;
  }
}

initPopup();
