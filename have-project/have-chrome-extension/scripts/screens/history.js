/* HAVE 화면 — 작업 상세의 버전 · 이력 탭 — UC09
   담당: C
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

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

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addHandler('change', event => { const t = event.target; return !!(['history-version', 'history-type'].includes(t.id)); }, async event => { const t = event.target; setHistoryFilter(); });
