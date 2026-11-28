/* HAVE 화면 — 작업 상세의 증명서 탭 · 승인 증명서 목록 — UC07
   담당: C
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

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

function showCertificates() {
  const rows = state.works.flatMap(w => w.versions.filter(v => v.certificate).map(v => ({ w, v })));
  return showHeading('승인 증명서', '어떤 파일 버전이 승인됐는지, 지금도 유효한지 확인하세요.', '', 'APPROVAL RECORDS') + `<section class="panel">${rows.length ? rows.map(({ w, v }) => { const e = M.EFFECT[M.getEffect(w, v)], s = M.SIGNING[v.certificate.signingState]; return `<div class="panel-body row between wrap" style="border-bottom:1px solid var(--color-border)"><div class="grow"><div class="row wrap"><h2 style="font-size:16px">${escapeHtml(w.title)}</h2>${showBadge('v' + v.n)}${showBadge(s.label, s.tone)}${showBadge(e.label, e.tone)}</div><p class="small muted" style="margin-top:8px">${escapeHtml(v.certificate.serial || '발급 전')} · 승인 ${getTimeText(v.approval.approvedAt)}</p></div>${showLink(getWorkRoute(w, 'certificate') + '/' + v.n, '증명서 보기' + showIcon('arrow'), 'btn')}</div>`; }).join('') : `<div class="empty">${showIcon('award')}<h2>아직 승인된 버전이 없어요</h2><p>최종 승인 후 이곳에서 확인할 수 있어요.</p>${showLink('#works', '내 작업 보기', 'btn')}</div>`}</section>`;
}

function showLinkDialog(url) {
  const dialog = $('#dialog');
  dialog.className = '';
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">공유 링크를 만들었어요</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${showIcon('close')}</button></div><div class="dialog-body"><p>이 주소는 지금만 볼 수 있어요. 복사해 두세요.</p><p class="mono" style="word-break:break-all">${escapeHtml(url)}</p></div><div class="dialog-actions"><button class="btn" data-action="copy-text" data-text="${escapeHtml(url)}">${showIcon('link')}복사</button>${showLink('#verify/' + url.split('#verify/')[1], '공개 검증 열기', 'btn primary')}</div>`;
  dialog.showModal();
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addAction('print-certificate', async (button, work, action) => { window.print(); });
addAction('download-certificate', async (button, work, action) => { const v = M.getVersion(work, button.dataset.version); download(JSON.stringify({ demo: true, signature: null, payload: v.certificate.payload, payloadHash: v.certificate.payloadHash, effect: M.getEffect(work, v) }, null, 2), `HAVE_증명서_v${v.n}.json`, 'application/json'); });
addAction('retry-issue', async (button, work, action) => { const next = R.retryIssue(state, work.id, Number(button.dataset.version), getCurrentUser() === M.USERS.author ? M.USERS.author : approverActor); if (await persist(next)) { render(); showToast('발급을 다시 요청했어요.'); scheduleOutbox(); } });
addAction('disable-link', async (button, work, action) => {
  if (!(await confirmDialog('공유 링크를 중지할까요?', '이 링크로는 더 이상 승인 기록을 볼 수 없어요.', '중지', '취소'))) return;
  const next = M.disableShareLink(state, work.id, Number(button.dataset.version), button.dataset.link, M.USERS.author);
  if (await persist(next)) { render(); showToast('공유 링크를 중지했어요.'); }
});
addHandler('change', event => { const t = event.target; return !!(t.id === 'certificate-version'); }, async event => { const t = event.target; await go(getWorkRoute(getCurrentWork(), 'certificate') + '/' + t.value); });
addHandler('submit', event => { const form = event.target; return !!(form.id === 'link-form'); }, async event => {
  const form = event.target;
  event.preventDefault();
  const work = getCurrentWork(), days = Number(new FormData(form).get('days'));
  try { const out = await M.createShareLink(state, work.id, Number(form.dataset.version), M.USERS.author, days); if (await persist(out.state)) { render(); showLinkDialog(location.href.split('#')[0] + '#verify/' + out.token); } }
  catch (error) { showToast(error.message); }
  return;
});
