/* HAVE 화면 — 최종 승인 · 반려 · 철회 (ApprovalView) — UC06 · UC10, 증명서 발급 처리
   담당: C
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

function getConditions(work, version) {
  const key = `${work.id}:${version.n}:${version.revision}:${approverActor}`;
  if (!conditionsCache.has(key)) {
    conditionsCache.set(key, null);
    R.getApprovalConditions(work, version, approverActor, version.revision).then(list => { conditionsCache.set(key, list); if (isRoleRoute(route)) render(); });
  }
  return conditionsCache.get(key);
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

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler · role.js의 addRoleDecision) ──
addRoleDecision('approval', async (form, decision, work) => {
  let next, message;
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
  return { next, message };
});
addRoleDecision('revoke', async (form, decision, work) => {
  let next, message;
  const n = Number(form.dataset.versionN), reason = new FormData(form).get('reason') || '';
  if (!reason.trim()) throw new Error('철회 사유를 입력해 주세요.');
  if (!(await confirmDialog('승인을 철회할까요?', `${work.title} · v${n}\n철회는 되돌릴 수 없고, 공개 검증에 ‘승인 철회’로 표시돼요.`, '승인 철회', '취소'))) return;
  next = R.revoke(state, work.id, n, approverActor, { reason, requestKey: core.createId('key') });
  message = '승인을 철회했어요.';
  return { next, message };
});
addHandler('input', event => { return !!(event.target.closest('#role-approval') || event.target.closest('#role-revoke')); }, event => { dirty = true; });
