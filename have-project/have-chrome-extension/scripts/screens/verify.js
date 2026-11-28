/* HAVE 화면 — 공개 검증 (VerifyPage) — UC08. 서버 연동 때 verify-web(공개 웹 페이지)으로 옮긴다
   담당: D
   app.js(1.1.0)에서 옮겨 온 코드다(1128, 동작은 그대로). app.js의 상태 변수와 공통 도구를 그대로 쓰므로 app.html에서 app.js 다음에 불러온다. */
'use strict';

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

async function compareFile(file) {
  if (!file || !verifyView?.found) return;
  const request = ++compareRequest, p = M.getPublicSummary(verifyView.found.work, verifyView.found.version);
  comparison = { loading: true }; render();
  try { const f = await readPdf(file); if (request !== compareRequest) return; comparison = { match: f.hash === p.fileHash, name: f.name }; }
  catch (error) { if (request !== compareRequest) return; comparison = { error: error.message }; }
  if (request === compareRequest) { render(); announce(comparison.error || (comparison.match ? '파일 일치' : '파일 불일치')); }
}

// ── 이벤트 처리 등록 (app.js의 addAction · addHandler) ──
addActionPrefix('sample-compare-', async (button, work, action) => {
  const original = core.getBytes(verifyView.found.version.file.data);
  const bytes = action === 'sample-compare-changed' ? (() => { const b = original.slice(); b[b.length - 40] ^= 1; return b; })() : original;
  await compareFile(new File([bytes], action === 'sample-compare-changed' ? 'HAVE_1바이트_수정_예시.pdf' : verifyView.found.version.file.name, { type: 'application/pdf' }));
});
addAction('reset-compare', async (button, work, action) => { compareRequest++; comparison = null; render(); $('#compare-file')?.focus(); });
addHandler('change', event => { const t = event.target; return !!(t.id === 'compare-file'); }, async event => { const t = event.target; await compareFile(t.files[0]); });
addHandler('drop', event => { return !!(event.target.closest('.proof-drop')); }, async event => { event.preventDefault(); await compareFile(event.dataTransfer.files[0]); });
