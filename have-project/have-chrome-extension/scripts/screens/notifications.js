/* HAVE 화면 — 알림 (NotificationView) — UC09
   담당: D
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function showNotifications() {
  const users = [[M.USERS.author, '작성자'], ...M.USERS.reviewers.map(u => [u, '검토자']), ...M.USERS.approvers.map(u => [u, '최종 승인자'])];
  const list = M.getNotifications(state, notifUser);
  return showHeading('알림', '검토 요청, 수정 요청, 승인, 철회 같은 일을 받는 사람에게 알려요.', `<button class="btn" data-action="read-all" ${M.getUnreadCount(state, notifUser) ? '' : 'disabled'}>모두 읽음</button>`) +
    `<label class="field role-picker" for="notif-user"><span>시연 계정</span><select id="notif-user">${users.map(([u, r]) => `<option value="${u}" ${u === notifUser ? 'selected' : ''}>${u} · ${r} (${M.getUnreadCount(state, u)})</option>`).join('')}</select></label>
    <section class="panel">${list.length ? `<ul class="notif-list">${list.map(n => `<li data-unread="${!n.readAt}"><button type="button" data-action="read-notification" data-id="${escapeHtml(n.id)}"><span class="notif-dot" aria-hidden="true"></span><span class="grow"><span class="notif-text">${escapeHtml(M.getNotificationText(state, n))}</span><small class="muted">${getTimeText(n.createdAt)}${n.readAt ? '' : ' · 읽지 않음'}</small></span>${showIcon('chevron')}</button></li>`).join('')}</ul>` : `<div class="empty">${showIcon('bell')}<h2>알림이 없어요</h2></div>`}</section>`;
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('read-notification', async (button, work, action) => {
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
});
addAction('read-all', async (button, work, action) => { if (await persist(M.setAllRead(state, notifUser))) render(); });
addHandler('change', event => { const t = event.target; return !!(t.id === 'notif-user'); }, async event => { const t = event.target; notifUser = t.value; render(); $('#notif-user')?.focus(); });
