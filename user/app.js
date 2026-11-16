/* HAVE author workspace. Server review and signing are intentionally unconnected. */
'use strict';
const M = HaveUserModel;
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
  refresh: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const repo = new HumanProofStorage.Repository(globalThis.indexedDB, 'have-author-gui-v1');
let state, revision = 0, route = location.hash || '#works', query = '', filter = 'all', sort = 'newest';
let editor = null, editorStep = 0, editorErrors = {}, dirty = false, saving = false, storageError = '', savedAt = '';
let questionIndex = 0, answerDraft = null, comparison = null, compareRequest = 0, toastTimer, fileChecking = false;
let conflictSnapshot = null;
const questions = [
  { name: '선택 이유 설명', type: 'Teach-back', title: '버전과 파일 해시의 역할을 설명해 주세요.', prompt: '파일 버전 ID와 SHA-256을 함께 기록하는 이유는 무엇인가요? 각각이 무엇을 확인하는지 자신의 말로 설명해 주세요.' },
  { name: '오류 발견', type: 'Fault Injection', title: '검증용 문단에 숨은 오류를 찾아보세요.', prompt: '아래 설명의 오류를 찾고, 수정 방향과 그 이유를 적어 주세요.', reference: '“승인 여부는 파일 이름으로 확인한다. 파일 이름이 같으면 내용이 변경되어도 기존 승인이 유지된다.”' },
  { name: '조건 변경 대응', type: 'What-if', title: '승인자가 두 명이 된다면 무엇이 바뀔까요?', prompt: '승인자가 1명에서 2명으로 늘어날 때, 데이터 구조와 승인 상태 처리에서 변경할 부분을 설명해 주세요.' }
];
const stamp = value => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(new Date(value)).replace(/\. /g, '.').replace(/\.$/, '') + ' KST';
const size = bytes => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
const badge = (label, tone = 'neutral') => `<span class="badge ${tone}">${esc(label)}</span>`;
const statusBadge = (work, version = M.latest(work)) => { const s = M.statusOf(work, version); return badge(s.label, s.tone); };
const link = (hash, text, className = '', extra = '') => `<a href="${esc(hash)}" data-route="${esc(hash)}" class="${className}" ${extra}>${text}</a>`;
const workRoute = (work, tab = 'overview') => `#work/${work.id}/${tab}`;
const brand = () => `<a class="brand" href="#works" data-route="#works" aria-label="HAVE 내 작업">${'<span class="brand-mark">' + icon('shield') + '</span>'}<span><span class="brand-name">HAVE</span><span class="brand-caption" style="display:block">HUMAN APPROVAL</span></span></a>`;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000); }
function announce(message) { $('#announcer').textContent = message; }
function heading(title, description, action = '', eyebrow = '') { return `<div class="heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1 tabindex="-1">${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`; }
function notice(title, text, tone = '', extra = '') { return `<div class="notice ${tone}">${icon('info')}<div><strong>${esc(title)}</strong>${esc(text)}${extra}</div></div>`; }
function footnote() { return `<footer class="footnote">${icon('info')}<span>로컬 데모 · 입력한 파일과 기록은 현재 브라우저에 저장됩니다. 검토자 전달·계정 인증·전자서명은 연결되지 않았습니다.</span></footer>`; }
function navMarkup() {
  const attention = M.filterWorks(state.works, '', 'attention').length;
  return `<nav class="navigation" aria-label="주 메뉴">${[
    ['#works', 'grid', '내 작업', state.works.length], ['#attention', 'clock', '내 확인 필요', attention], ['#certificates', 'award', '승인 증명서', '']
  ].map(([hash, glyph, text, count]) => link(hash, `${icon(glyph)}${text}${count !== '' ? `<span class="count">${count}</span>` : ''}`, `nav-link ${route === hash || (hash === '#works' && route.startsWith('#work/')) ? 'active' : ''}`, route === hash ? 'aria-current="page"' : '')).join('')}</nav>`;
}
function shell(body, label = '내 작업') {
  return `<div class="shell"><aside class="sidebar">${brand()}<div style="margin-top:48px"><div class="side-label">WORKSPACE</div>${navMarkup()}</div><div class="sidebar-bottom"><div class="sidebar-tip"><b>기록이 모여, 신뢰가 됩니다.</b>AI의 기여와 사람의 검토를<br>하나의 버전에 연결하세요.</div><button class="side-guide" data-action="guide">${icon('book')}HAVE 사용 가이드${icon('chevron')}</button><div class="side-footer">HAVE · SOFTWARE ENGINEERING</div></div></aside><div class="content-shell"><header class="topbar"><button class="btn icon-only mobile-menu" data-action="menu" aria-label="주 메뉴 열기" aria-haspopup="dialog">${icon('menu')}</button><div class="breadcrumb"><span>소프트웨어공학</span>${icon('chevron')}<strong>${esc(label)}</strong></div><div class="top-actions"><span class="demo-tag">LOCAL DEMO</span><div class="profile"><span class="avatar">민</span><span>민섭<small>작성자 워크스페이스</small></span></div></div></header>${storageError ? `<div role="alert" class="storage-alert">${esc(storageError)} <button class="btn" data-action="retry-save">다시 저장</button></div>` : ''}<main id="main" class="main">${body}${footnote()}</main></div></div>`;
}
function listScreen() {
  const attentionOnly = route === '#attention';
  const all = state.works.length, attention = M.filterWorks(state.works, '', 'attention').length;
  const approved = M.filterWorks(state.works, '', 'approved').length, ongoing = M.filterWorks(state.works, '', 'ongoing').length;
  const next = M.filterWorks(state.works, '', 'attention')[0];
  const metrics = [['전체 작업', all, 'file', '버전별 기록을 한곳에서'], ['내 확인 필요', attention, 'edit', '이해 확인 또는 수정 요청'], ['검토 진행 중', ongoing, 'clock', '검토자의 확인을 기다려요'], ['승인 완료', approved, 'shield', '승인된 버전의 증명서 확인']];
  const counts = { all, attention, ongoing, approved };
  const title = attentionOnly ? '내 확인이 필요한 작업' : '내 작업';
  return heading(title, 'AI와 만든 결과물, 사람의 검토와 승인까지 한곳에서 관리하세요.', link('#new', icon('plus') + '작업 등록', 'btn primary'), 'MY WORKSPACE') +
    `<div class="metrics">${metrics.map(([label, count, glyph, note]) => `<div class="metric"><div class="metric-label">${label}${icon(glyph)}</div><div class="metric-value">${count}<span>건</span></div><div class="metric-note">${note}</div></div>`).join('')}</div>` +
    (state.draft ? `<div class="attention-strip"><div class="attention-copy">${icon('file')}<div><b>이어서 작성할 작업이 있어요</b><p>${esc(state.draft.title || '제목 없는 작업')} · 임시 저장한 입력을 불러올 수 있어요.</p></div></div>${link('#new', '이어서 작성하기' + icon('arrow'), 'btn')}</div>` : next ? `<div class="attention-strip"><div class="attention-copy">${icon('clock')}<div><b>다음 단계로 이어가 볼까요?</b><p>${esc(next.title)} · ${esc(M.statusOf(next).label)} · v${M.latest(next).n}</p></div></div>${link(workRoute(next, M.latest(next).status === 'CHALLENGE_PENDING' ? 'challenge' : 'overview'), M.statusOf(next).action + icon('arrow'), 'btn')}</div>` : '') +
    `<section aria-label="작업 목록"><div class="section-header"><h2>작업 목록 <span class="muted small">${all}</span></h2><label class="sr-only" for="sort">정렬</label><select id="sort" aria-label="작업 정렬" style="width:auto;min-height:44px;font-size:12px;background:transparent;border:0"><option value="newest" ${sort === 'newest' ? 'selected' : ''}>최근 변경순</option><option value="title" ${sort === 'title' ? 'selected' : ''}>작업명순</option></select></div><div class="work-list"><div class="list-toolbar"><div class="tabs" role="tablist" aria-label="작업 상태">${[['all', '전체'], ['attention', '내 확인 필요'], ['ongoing', '검토 진행 중'], ['approved', '승인 완료']].map(([key, text]) => `<button class="tab ${filter === key ? 'active' : ''}" role="tab" id="filter-${key}" aria-selected="${filter === key}" aria-controls="work-results" tabindex="${filter === key ? '0' : '-1'}" data-filter="${key}">${text}<span>${counts[key]}</span></button>`).join('')}</div><div class="search-wrap">${icon('search')}<label for="search" class="sr-only">작업 검색</label><input id="search" type="text" placeholder="작업명, 파일명, 검토자 검색" value="${esc(query)}" autocomplete="off"></div></div><div id="work-results" role="tabpanel" aria-labelledby="filter-${filter}" tabindex="0">${workResults()}</div></div></section>`;
}
function workResults() {
  const rows = M.filterWorks(state.works, query, filter).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : M.latest(b).createdAt.localeCompare(M.latest(a).createdAt));
  if (!rows.length) return `<div class="empty">${icon('search')}<h2>${state.works.length ? '조건에 맞는 작업이 없어요' : '아직 등록한 작업이 없어요'}</h2><p>${state.works.length ? '검색어나 상태 필터를 바꿔 다시 찾아보세요.' : '첫 작업을 등록하고 검토 과정을 시작해 보세요.'}</p>${state.works.length ? '<button class="btn" data-action="clear-filter">필터 초기화</button>' : link('#new', '작업 등록', 'btn primary')}</div>`;
  const titleCell = w => `<div class="row">${'<span style="color:var(--color-muted)">' + icon('file') + '</span>'}<div class="grow">${link(workRoute(w), esc(w.title), 'work-title')}<div class="file-meta"><span>v${M.latest(w).n}</span><span>PDF</span><span>${w.demo ? '시연 자료' : '내가 등록한 작업'}</span></div></div></div>`;
  return `<div class="table-container"><table style="width:100%;border-collapse:collapse"><caption class="sr-only">내 작업 ${rows.length}건</caption><thead><tr>${['작업명 / 버전', '현재 상태', '검토자', '최근 변경 시각', '상세'].map(t => `<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(w => `<tr><td>${titleCell(w)}</td><td>${statusBadge(w)}</td><td>${esc(M.latest(w).reviewer)}</td><td class="muted" style="font-size:11px">${stamp(M.latest(w).createdAt)}</td><td>${link(workRoute(w), icon('chevron'), 'btn text icon-only', `aria-label="${esc(w.title)} 상세 보기"`)}</td></tr>`).join('')}</tbody></table></div><div class="work-cards">${rows.map(w => `<article class="work-card">${titleCell(w)}<dl class="work-card-meta"><div><dt>현재 상태</dt><dd>${statusBadge(w)}</dd></div><div><dt>검토자</dt><dd>${esc(M.latest(w).reviewer)}</dd></div><div style="grid-column:1/-1"><dt>최근 변경 시각</dt><dd>${stamp(M.latest(w).createdAt)}</dd></div></dl></article>`).join('')}</div><div class="table-footer"><span>총 ${rows.length}개 작업</span><span>승인은 표시된 버전에만 적용됩니다.</span></div>`;
}
function context(work) {
  const v = M.latest(work), s = M.statusOf(work);
  const next = { CHALLENGE_PENDING: '세 문항의 답변을 작성해 주세요.', REVIEW_PENDING: `${v.reviewer} 님의 검토를 기다리고 있어요.`, REVISION_REQUIRED: '피드백을 반영하고 새 버전을 제출해 주세요.', APPROVED: '승인된 버전의 증명서를 확인하세요.' }[v.status] || '상태를 다시 확인해 주세요.';
  return `<section class="work-context" aria-label="작업 요약">${icon('file')}<div class="grow"><h2>${esc(work.title)}</h2><div class="context-meta"><span>대상 버전 v${v.n}</span>${statusBadge(work)}<span>검토자 ${esc(v.reviewer)}</span></div></div><div class="next-action"><b>다음 행동</b>${esc(next)}</div></section>`;
}
function detailTabs(work, tab) {
  return `<nav class="detail-tabs" aria-label="작업 상세">${[['overview', '작업 정보'], ['challenge', '이해 확인'], ['certificate', '증명서'], ['history', '버전 · 이력']].map(([key, text]) => link(workRoute(work, key), text, '', tab === key ? 'aria-current="page"' : '')).join('')}</nav>`;
}
function journey(v) {
  const at = v.status === 'APPROVED' ? 4 : v.status === 'REVIEW_PENDING' ? 2 : 1;
  return `<div class="journey">${['작업 등록', '이해 확인', '사람의 검토', '승인 · 발급'].map((text, i) => `<div class="journey-item ${i < at ? 'done' : i === at ? 'current' : ''}"><span class="journey-number">${i < at ? '✓' : i + 1}</span>${text}</div>`).join('')}</div>`;
}
function fileInfo(v) {
  return `<dl class="definition"><dt>대상 버전</dt><dd>v${v.n}</dd><dt>등록 파일</dt><dd>${esc(v.file.name)}</dd><dt>파일 크기</dt><dd>${size(v.file.size)}</dd><dt>등록 시각</dt><dd>${stamp(v.createdAt)}</dd></dl><details class="hash-details"><summary>파일 식별 정보 · SHA-256</summary><p class="mono">${esc(v.file.hash)}</p><button class="btn text" data-action="copy-hash">전체 해시 복사</button></details><button class="btn full space-top" data-action="download-file">${icon('download')}등록한 PDF 받기</button>`;
}
function overview(work) {
  const v = M.latest(work);
  const action = v.status === 'CHALLENGE_PENDING' ? link(workRoute(work, 'challenge'), '이해 확인하기' + icon('arrow'), 'btn primary') : ['REVISION_REQUIRED', 'APPROVED'].includes(v.status) ? `<button class="btn ${v.status === 'REVISION_REQUIRED' ? 'primary' : ''}" data-action="new-version">${icon('plus')}새 버전 등록</button>` : '';
  return `<div class="split"><div class="stack"><section class="panel"><div class="panel-head"><h2>검토 진행 상황</h2>${statusBadge(work)}</div>${journey(v)}<div class="panel-body" style="padding-top:0">${v.status === 'REVISION_REQUIRED' ? notice('수정 요청이 도착했어요', v.feedback, 'warning') : v.status === 'REVIEW_PENDING' ? notice('답변을 제출했어요', `${v.reviewer} 님이 이 버전의 파일과 답변을 확인할 예정이에요.`) : v.status === 'APPROVED' ? notice('v' + v.n + '에 대한 승인이 기록되어 있어요', '검토 통과와 승인 기록, 증명서 발급이 완료된 시연 자료입니다.') : notice('내 말로 설명하고, 검토를 요청하세요', '세 문항의 답변은 이 파일 버전에 연결되어 검토자에게 표시됩니다.')}</div><div class="panel-foot"><span class="muted small">작성자에게는 승인 권한이 없어요.</span>${action || badge('검토자 확인 대기', 'progress')}</div></section><section class="panel"><div class="panel-head"><h2>AI 사용 신고와 나의 기여</h2>${badge('작성자 신고')}</div><div class="panel-body details"><div><div class="detail-label">AI 도구 · 모델</div><div class="detail-value">${esc(v.tool)}</div></div><div><div class="detail-label">AI 사용 범위</div><div class="detail-value">${esc(v.scope)}</div></div><div><div class="detail-label">직접 수행한 일</div><div class="detail-value">${esc(v.contribution)}</div></div></div></section></div><aside class="stack" style="align-content:start"><section class="panel"><div class="panel-head"><h2>등록 파일</h2>${icon('file')}</div><div class="panel-body">${fileInfo(v)}</div></section>${notice('새 파일은 새 버전으로', '파일이나 AI 사용 신고를 수정하면 새 버전으로 제출해 주세요. 이전 승인은 새 버전에 적용되지 않아요.', 'neutral')}</aside></div>`;
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
  if (editorStep === 0) body = field('title', '작업명', editor.title, { readonly: editor.isVersion, placeholder: '예: HAVE 서비스 요구사항 정의서' }) + `<div class="field"><label for="pdf">검토할 파일 <small class="required">필수</small></label><label for="pdf" class="upload-drop" style="display:block;border:1px dashed var(--color-muted);border-radius:8px;padding:28px 20px;text-align:center;cursor:pointer"><span style="color:var(--color-primary)">${icon('upload')}</span><b style="display:block;font-size:14px;margin:8px 0">PDF를 끌어 놓거나 파일을 선택하세요</b><small class="muted">PDF · 최대 20 MB</small><input id="pdf" type="file" accept=".pdf,application/pdf" style="display:block;margin:16px auto 0;max-width:100%;font-size:12px" aria-describedby="file-hint${editorErrors.file ? ' file-error' : ''}" ${editorErrors.file ? 'aria-invalid="true"' : ''}></label><small id="file-hint" class="muted">선택한 파일은 현재 브라우저에 저장됩니다.</small>${editor.file ? `<div class="selected-file">${icon('check')}<div class="grow"><b>${esc(editor.file.name)}</b>${size(editor.file.size)} · 파일 확인 완료</div></div>` : ''}<div id="file-status" class="upload-feedback" role="status" aria-live="polite">${fileChecking ? '파일을 확인하는 중…' : ''}</div>${editorErrors.file ? `<small id="file-error" style="color:var(--color-danger)">${esc(editorErrors.file)}</small>` : ''}</div><button type="button" class="btn text" data-action="sample-pdf">${icon('file')}샘플 PDF로 체험하기</button>` + (editor.isVersion ? field('reason', '변경 사유', editor.reason, { multiline: true, hint: '이전 버전과 달라진 내용을 적어 주세요.' }) : '');
  if (editorStep === 1) body = field('tool', 'AI 도구 · 모델', editor.tool, { placeholder: '예: ChatGPT · GPT-4o', hint: 'AI를 사용하지 않았다면 “사용 안 함”으로 적어 주세요.' }) + field('scope', 'AI 사용 범위', editor.scope, { multiline: true, max: 5000, placeholder: 'AI가 도운 작업과 적용한 범위를 구체적으로 적어 주세요.', hint: '예: 문서 구조와 초안 작성. 수치 확인과 결론은 직접 작성.' });
  if (editorStep === 2) body = field('contribution', '직접 수행한 일', editor.contribution, { multiline: true, placeholder: '직접 판단하고, 확인하고, 수정한 내용을 적어 주세요.', hint: '예: 출처 세 곳을 확인하고 오류를 수정했습니다.' }) + notice('기여 기록은 현재 버전에 연결돼요', 'AI 사용 신고와 나의 기여를 구분하면 검토자가 확인할 부분을 쉽게 찾을 수 있어요.', 'neutral');
  if (editorStep === 3) body = `<fieldset style="border:0;margin:0;padding:0"><legend style="font-size:14px;font-weight:550;margin-bottom:16px">검토자 선택 <small class="required">필수</small></legend>${M.REVIEWERS.map((name, i) => `<label class="reviewer-choice"><input type="radio" name="reviewer" value="${name}" ${editor.reviewer === name ? 'checked' : ''} ${i === 0 ? 'id="reviewer"' : ''} ${editorErrors.reviewer ? 'aria-invalid="true" aria-describedby="reviewer-error"' : ''}><span class="avatar">${name[0]}</span><span><b>${name}</b><small>프로젝트 팀원 · 시연 검토자</small></span></label>`).join('')}${editorErrors.reviewer ? `<small id="reviewer-error" style="color:var(--color-danger)">${esc(editorErrors.reviewer)}</small>` : ''}</fieldset><div class="registration-summary"><h3>제출 전 확인</h3><dl class="definition"><dt>작업명</dt><dd>${esc(editor.title)}</dd><dt>대상 파일</dt><dd>${esc(editor.file?.name || '')}</dd><dt>AI 도구</dt><dd>${esc(editor.tool)}</dd><dt>AI 사용 범위</dt><dd>${esc(editor.scope)}</dd><dt>나의 기여</dt><dd>${esc(editor.contribution)}</dd></dl></div><div class="space-top">${notice('제출 후 이해 확인을 진행해요', '현재 버전의 파일과 신고 내용이 고정됩니다. 제출 뒤 변경하려면 수정 요청 또는 승인 후 새 버전으로 등록해 주세요.')}</div>`;
  return heading(editor.isVersion ? '새 버전 등록' : '작업 등록', '파일과 AI 사용 내역을 정리하고, 검토를 시작하세요.', '', 'REGISTER YOUR WORK') + `<div style="max-width:720px;margin:auto"><nav class="form-progress journey" aria-label="등록 단계">${steps.map((text, i) => `<div class="journey-item ${i < editorStep ? 'done' : i === editorStep ? 'current' : ''}" ${i === editorStep ? 'aria-current="step"' : ''}><span class="journey-number">${i < editorStep ? '✓' : i + 1}</span>${text}</div>`).join('')}</nav><form id="registration" novalidate><section class="panel"><div class="panel-head"><h2>${String(editorStep + 1).padStart(2, '0')} · ${steps[editorStep]}</h2><span class="small muted">${editorStep + 1} / 4</span></div><div class="panel-body">${errors}${body}</div></section><div class="space-top"><div class="saved-at" role="status">${esc(savedAt)}</div><div class="wizard-actions"><button type="button" class="btn" data-action="save-draft" ${saving || fileChecking ? 'disabled' : ''}>${saving ? '저장 중…' : '임시 저장'}</button><div><button type="button" class="btn" data-action="${editorStep ? 'previous-step' : 'cancel-editor'}">${editorStep ? '이전 단계' : '취소'}</button><button type="submit" class="btn primary" ${saving || fileChecking ? 'disabled' : ''}>${saving ? '제출 중…' : editorStep === 3 ? '검토 요청' : '다음 단계'}${icon('arrow')}</button></div></div></div></form></div>`;
}
function challenge(work) {
  const v = M.latest(work), editable = v.status === 'CHALLENGE_PENDING';
  if (!answerDraft || answerDraft.versionId !== v.id) answerDraft = { versionId: v.id, answers: [...v.answers], confidence: [...v.confidence] };
  const q = questions[questionIndex], completed = answerDraft.answers.filter(a => a.trim()).length;
  return `<div class="split"><section class="panel"><div class="panel-head"><h2>나의 이해 확인</h2><span class="small muted">${completed} / 3 작성</span></div><div class="panel-body"><div class="tabs" role="tablist" aria-label="이해 확인 문항">${questions.map((question, i) => `<button id="question-${i}" role="tab" aria-selected="${i === questionIndex}" aria-controls="question-panel" tabindex="${i === questionIndex ? '0' : '-1'}" class="tab ${i === questionIndex ? 'active' : ''}" data-question="${i}">${i + 1}. ${question.name}${answerDraft.answers[i].trim() ? ' ✓' : ''}</button>`).join('')}</div><div id="question-panel" role="tabpanel" aria-labelledby="question-${questionIndex}" class="question"><div class="eyebrow">QUESTION ${String(questionIndex + 1).padStart(2, '0')} · ${q.type.toUpperCase()}</div><h2>${q.title}</h2><div class="question-text">${q.prompt}${q.reference ? `<div class="question-ref">${q.reference}</div>` : ''}</div><form id="answers" novalidate><label class="field" for="answer"><span>나의 답변 <small class="required">필수</small></span><textarea id="answer" maxlength="10000" ${editable ? '' : 'readonly'} aria-describedby="answer-hint answer-error" placeholder="내가 이해한 내용을 근거와 함께 적어 주세요.">${esc(answerDraft.answers[questionIndex])}</textarea><small id="answer-hint" class="muted">${editable ? '다른 문항으로 이동해도 입력은 유지돼요. 임시 저장으로 기록을 보관하세요.' : '답변은 제출되어 읽기 전용이에요. 수정 요청을 받으면 새 버전으로 보완해 주세요.'}</small><small id="answer-error" role="alert" style="display:block;color:var(--color-danger);margin-top:8px"></small></label><label class="field" for="confidence"><span>답변에 대한 자기 확신</span><div class="confidence-row"><input id="confidence" type="range" min="0" max="100" step="5" value="${answerDraft.confidence[questionIndex]}" ${editable ? '' : 'disabled'}><output id="confidence-value" for="confidence">${answerDraft.confidence[questionIndex]}%</output></div><small class="muted">검토 참고 정보이며, 합격 점수와 별도로 기록돼요.</small></label><div class="row between wrap"><button class="btn" type="button" data-action="save-answers" ${!editable || saving ? 'disabled' : ''}>임시 저장</button>${questionIndex < 2 ? `<button class="btn primary" type="button" data-question="${questionIndex + 1}">다음 문항${icon('arrow')}</button>` : `<button class="btn primary" type="submit" ${!editable || saving ? 'disabled' : ''}>${v.status === 'REVIEW_PENDING' ? '답변 제출 완료' : '전체 답변 제출'}</button>`}</div><div class="saved-at space-top" role="status">${esc(savedAt)}</div></form></div></div></section><aside class="stack" style="align-content:start"><section class="panel"><div class="panel-head"><h2>이해 확인 안내</h2>${icon('book')}</div><div class="panel-body"><ol class="task-list">${questions.map((question, i) => `<li><span class="journey-number" style="flex:none">${answerDraft.answers[i].trim() ? '✓' : i + 1}</span><div><h3>${question.name}</h3><p class="small muted">${question.type}</p></div></li>`).join('')}</ol></div></section>${notice('고정 문항으로 체험해요', '이 문항은 시연용 템플릿이에요. 업로드한 PDF를 분석해 생성한 문항은 아니에요.', 'neutral')}${notice('최종 판단은 검토자가 해요', '답변 제출은 검토 대기로 연결됩니다. 자동 채점이나 승인은 실행하지 않아요.', 'neutral')}</aside></div>`;
}
function certificate(work) {
  const approved = work.versions.filter(v => M.certificateFor(work, v.n));
  if (!approved.length) return `<section class="panel empty">${icon('award')}<h2>아직 발급된 증명서가 없어요</h2><p>검토 통과와 최종 승인이 완료되면 이곳에서 확인할 수 있어요.</p>${link(workRoute(work, 'overview'), '진행 상황 보기', 'btn primary')}</section>`;
  const v = approved.at(-1), p = M.publicRecord(work, v.n);
  return `<article class="receipt panel" style="max-width:800px;margin:auto"><div class="panel-body"><div class="receipt-header row between"><div><div class="eyebrow" style="color:var(--color-primary)">HUMAN APPROVAL RECORD</div><h2>인간 승인 증명서</h2></div><span class="receipt-emblem" style="display:grid;place-items:center;color:var(--color-primary)">${icon('shield')}</span></div><div class="row between wrap space-top">${badge('발급 완료 · 시연', 'success')}<span class="small muted">${esc(p.serial)}</span></div><h3 class="receipt-title">${esc(work.title)}</h3><dl class="definition"><dt>승인 대상</dt><dd>v${v.n} · ${esc(p.fileName)}</dd><dt>승인자</dt><dd>${esc(p.actor)}</dd><dt>승인 시각</dt><dd>${stamp(p.at)}</dd><dt>검토 결과</dt><dd>검토 통과 · 시연 기록</dd><dt>승인 효력</dt><dd>현재 서버 효력 확인 불가</dd></dl>${v.id !== M.latest(work).id ? `<div class="space-top">${notice('이전 버전의 승인 기록이에요', `최신 버전은 v${M.latest(work).n}입니다. 이 승인은 v${v.n}에만 연결돼요.`, 'warning')}</div>` : ''}<div class="hash-details"><h3>승인 파일의 SHA-256</h3><p class="mono">${p.fileHash}</p></div>${notice('기록된 승인과 파일의 연결', '내용의 정확성이나 실제 이해 수준을 보증하지 않습니다. 전자서명과 서버 승인은 연결되지 않은 시연 증명서입니다.', 'neutral')}<div class="receipt-bottom row wrap space-top">${link(`#verify/${work.id}/${v.n}`, icon('shield') + '공개 검증 보기', 'btn primary')}<button class="btn" data-action="download-certificate" data-version="${v.n}">${icon('download')}증명서 받기</button><button class="btn" data-action="copy-link" data-version="${v.n}">${icon('link')}링크 복사</button></div><p class="small muted space-top">공유 링크는 이 브라우저의 기록을 참조합니다. 다른 기기에서의 조회에는 서버 연결이 필요해요.</p></div></article>`;
}
function historyScreen(work) {
  return `<div class="split"><section class="panel"><div class="panel-head"><h2>버전별 기록</h2><span class="small muted">${work.versions.length}개 버전</span></div><div class="panel-body"><div class="stack">${[...work.versions].reverse().map(v => `<section style="border-bottom:1px solid var(--color-border);padding-bottom:24px"><div class="row between wrap"><h3>v${v.n} ${v.id === M.latest(work).id ? '<span class="small muted">· 현재 버전</span>' : ''}</h3>${statusBadge(work, v)}</div><p class="detail-value space-top">${esc(v.reason)}</p><p class="small muted">${esc(v.file.name)}<br>${stamp(v.createdAt)}</p>${v.approval && v.id !== M.latest(work).id ? '<p class="small" style="color:var(--color-warning);margin-top:8px">이전 버전 승인 · 새 버전에는 적용되지 않아요.</p>' : ''}<details class="hash-details"><summary>파일 해시 보기</summary><p class="mono">${v.file.hash}</p></details><button class="btn" data-action="download-file" data-version="${v.n}">${icon('download')}이 버전 PDF 받기</button></section>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><h2>활동 이력</h2>${icon('clock')}</div><div class="panel-body"><ol class="timeline">${[...work.events].reverse().map(e => `<li><b>${esc(e.action)}</b><p>v${e.version} · ${esc(e.actor)}<br>${stamp(e.at)}</p></li>`).join('')}</ol></div></section></div>`;
}
function certificatesScreen() {
  const rows = state.works.filter(w => w.versions.some(v => M.certificateFor(w, v.n)));
  return heading('승인 증명서', '어떤 파일 버전이 승인됐는지 확인하고 검증 화면을 열어보세요.', '', 'APPROVAL RECORDS') + `<section class="panel">${rows.length ? rows.map(w => { const v = w.versions.filter(v => M.certificateFor(w, v.n)).at(-1); return `<div class="panel-body row between wrap" style="border-bottom:1px solid var(--color-border)"><div class="grow"><div class="row wrap"><h2 style="font-size:16px">${esc(w.title)}</h2>${badge('v' + v.n + ' · 발급 완료', 'success')}</div><p class="small muted" style="margin-top:8px">${esc(v.approval.serial)} · ${stamp(v.approval.at)}</p></div>${link(workRoute(w, 'certificate'), '증명서 보기' + icon('arrow'), 'btn')}</div>`; }).join('') : `<div class="empty">${icon('award')}<h2>아직 발급된 증명서가 없어요</h2><p>최종 승인 후 이곳에서 확인할 수 있어요.</p>${link('#works', '내 작업 보기', 'btn')}</div>`}</section>`;
}
function publicScreen(work, n) {
  let p; try { p = M.publicRecord(work, n); } catch { return `<main id="main" class="public-main" style="max-width:800px;margin:auto">${heading('승인 기록을 찾을 수 없어요', '증명서를 발급한 브라우저에서 링크를 다시 열어 주세요.')}${link('#works', '내 작업으로', 'btn')}</main>`; }
  const fileResult = comparison?.loading ? badge('비교 중', 'progress') : comparison?.error ? badge('확인 불가', 'neutral') : comparison ? badge(comparison.match ? '파일 일치' : '파일 불일치', comparison.match ? 'success' : 'danger') : badge('파일 미확인', 'warning');
  return `<header class="public-header row between" style="background:white;border-bottom:1px solid var(--color-border)">${brand()}${link('#works', '내 작업으로', 'btn')}</header><main id="main" class="public-main" style="max-width:800px;margin:auto;padding-top:40px">${heading('승인 기록 확인', '승인 기록, 서명 상태, 파일 일치 여부를 각각 확인하세요.', '', 'PUBLIC VERIFICATION')}<section class="panel"><div class="panel-head"><h2>${esc(p.title)}</h2>${badge('v' + p.version)}</div><div class="panel-body"><div class="result-row row between" style="padding:16px 0;border-bottom:1px solid var(--color-border)"><div><h3>01 · 승인 효력</h3><p class="small muted">로컬 시연 기록 있음 · 현재 서버 효력은 확인할 수 없어요.</p></div>${badge('확인 불가', 'neutral')}</div><div class="result-row row between" style="padding:20px 0;border-bottom:1px solid var(--color-border)"><div><h3>02 · 서명 검증</h3><p class="small muted">전자서명이 연결되지 않았어요.</p></div>${badge('확인 불가', 'neutral')}</div><div class="result-row row between" style="padding:20px 0"><div><h3>03 · 파일 비교</h3><p class="small muted">${comparison ? esc(comparison.error || (comparison.loading ? '파일의 SHA-256을 계산하고 있어요.' : comparison.name)) : '비교할 PDF를 선택해 주세요.'}</p></div>${fileResult}</div><div class="space-top"><label class="field" for="compare-file"><span>전달받은 PDF 비교하기 <small class="muted">선택</small></span><input id="compare-file" type="file" accept=".pdf,application/pdf" ${comparison?.loading ? 'disabled' : ''} style="font-size:12px;width:100%;min-height:44px" aria-describedby="compare-hint"><small id="compare-hint" class="muted">파일은 서버로 전송되지 않아요. 현재 브라우저에서 해시를 비교합니다.</small></label></div><dl class="definition"><dt>승인 대상</dt><dd>v${p.version} · ${esc(p.fileName)}</dd><dt>승인자</dt><dd>${esc(p.actor)} (시연)</dd><dt>승인 기록</dt><dd>${stamp(p.at)}</dd><dt>확인 시각</dt><dd>${stamp(new Date())}</dd></dl><details class="hash-details"><summary>승인된 파일 해시 확인</summary><p class="mono">${p.fileHash}</p></details>${link(`#verify/${work.id}/${n}`, icon('refresh') + '다시 확인', 'btn', 'data-recheck="true"')}<div class="space-top">${notice('검증 결과의 범위', '이 결과는 기록된 승인과 해당 파일의 일치 여부를 보여줍니다. 내용의 정확성이나 실제 이해 수준을 보증하지 않습니다.', 'neutral')}</div><p class="small muted space-top">시연 자료 · 답변 원문·기여 기록·비공개 파일은 이 화면에 표시하지 않습니다.</p></div></section></main>`;
}
function currentWork() { return state.works.find(w => w.id === route.split('/')[1]); }
function render(focus = false) {
  if (!state) return;
  if (route.startsWith('#verify/')) { const [, id, n] = route.split('/'); const work = state.works.find(w => w.id === id); $('#app').innerHTML = publicScreen(work, n); }
  else if (route === '#new') $('#app').innerHTML = shell(editorScreen(), '작업 등록');
  else if (route === '#certificates') $('#app').innerHTML = shell(certificatesScreen(), '승인 증명서');
  else if (route.startsWith('#work/')) {
    const work = currentWork(), tab = route.split('/')[2] || 'overview';
    if (!work) $('#app').innerHTML = shell(heading('작업을 찾을 수 없어요', '내 작업 목록에서 다시 선택해 주세요.') + link('#works', '내 작업으로', 'btn'));
    else {
      const labels = { overview: '작업 상세', challenge: '이해 확인', certificate: '증명서', history: '버전 · 이력' };
      const content = tab === 'challenge' ? challenge(work) : tab === 'certificate' ? certificate(work) : tab === 'history' ? historyScreen(work) : overview(work);
      $('#app').innerHTML = shell(heading(labels[tab] || '작업 상세', work.title, link('#works', '목록으로', 'btn')) + context(work) + detailTabs(work, tab) + content, labels[tab]);
    }
  } else $('#app').innerHTML = shell(listScreen(), route === '#attention' ? '내 확인 필요' : '내 작업');
  document.title = 'HAVE · ' + ($('#app h1')?.textContent || '내 작업');
  if (focus) { $('#main h1')?.focus(); window.scrollTo(0, 0); }
}
async function confirmDialog(title, text, confirmLabel = '이동하기') {
  const dialog = $('#dialog'), previous = document.activeElement;
  dialog.className = ''; dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button class="btn icon-only" value="cancel" aria-label="닫기">${icon('close')}</button></div><div class="dialog-body"><p>${esc(text)}</p></div><div class="dialog-actions"><button class="btn" value="cancel" autofocus>계속 작성</button><button class="btn primary" value="confirm">${esc(confirmLabel)}</button></div></form>`;
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => { previous?.isConnected && previous.focus(); resolve(dialog.returnValue === 'confirm'); }, { once: true }));
}
async function go(hash, skipGuard = false) {
  if (saving || fileChecking) { toast('처리가 끝난 뒤 이동해 주세요.'); return; }
  if (dirty && !skipGuard && !(await confirmDialog('저장하지 않은 내용이 있어요', '이동하면 마지막 임시 저장 이후의 입력은 사라져요. 계속 이동할까요?'))) return;
  dirty = false; storageError = ''; savedAt = ''; compareRequest++; comparison = null;
  conflictSnapshot = null;
  if (hash !== '#new') { editor = null; editorStep = 0; editorErrors = {}; }
  answerDraft = null; questionIndex = 0; route = hash;
  if (hash === '#attention') filter = 'attention'; else if (hash === '#works') filter = 'all';
  history.pushState(null, '', hash); render(true);
}
async function persist(next) {
  if (saving) return false;
  saving = true; announce('기록을 저장하는 중');
  const controls = [...document.querySelectorAll('button[type="submit"], [data-action="save-draft"], [data-action="save-answers"]')];
  const previous = controls.map(b => ({ disabled: b.disabled, html: b.innerHTML }));
  controls.forEach(b => { b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = b.type === 'submit' ? '제출 중…' : '저장 중…'; });
  try { revision = await repo.commit(next, revision); state = next; storageError = ''; announce('저장 완료'); return true; }
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
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${menu ? 'HAVE 메뉴' : 'HAVE 사용 가이드'}</h2><button class="btn icon-only" data-action="close-dialog" aria-label="닫기">${icon('close')}</button></div><div class="dialog-body">${menu ? navMarkup() : `<ol><li><b>작업 등록</b>PDF → AI 사용 신고 → 나의 기여 → 검토자를 입력해요.</li><li><b>이해 확인</b>세 문항을 작성하고 전체 답변을 제출해요.</li><li><b>검토 결과 확인</b>수정 요청이 오면 피드백을 반영해 새 버전으로 제출해요.</li><li><b>승인 기록과 파일 확인</b>증명서와 공개 검증에서 버전·승인 기록·파일 일치를 구분해 확인해요.</li></ol><p class="muted">이 화면은 작성자용 로컬 데모입니다. 실제 검토·승인과 서명은 서버 연결이 필요해요. 승인 완료된 예시 작업에서 증명서와 PDF 비교를 체험할 수 있어요.</p>`}</div><div class="dialog-actions"><button class="btn ${menu ? '' : 'accent'}" data-action="close-dialog">${menu ? '닫기' : '가이드 닫기'}</button></div>`;
  dialog.showModal(); dialog.addEventListener('close', () => previous?.isConnected && previous.focus(), { once: true });
}
function download(data, name, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
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
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main')?.setAttribute('tabindex', '-1'); $('#main')?.focus(); return; }
  const routeLink = event.target.closest('[data-route]'), button = event.target.closest('[data-action]');
  if (routeLink) { event.preventDefault(); $('#dialog').open && $('#dialog').close(); if (routeLink.dataset.recheck) { comparison = null; render(); return; } await go(routeLink.dataset.route); return; }
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
        captureEditor(); captureAnswers(); download(JSON.stringify({ editor, answers: answerDraft }, null, 2), 'HAVE_미저장입력.json', 'application/json');
        state = conflictSnapshot.data; revision = conflictSnapshot.revision; conflictSnapshot = null; dirty = false; editor = null; answerDraft = null;
        await go('#works', true); toast('최신 기록을 불러왔어요. 미저장 입력은 백업 파일에서 확인할 수 있어요.');
      } else if (route === '#new') await saveDraft(); else if (route.endsWith('/challenge')) await saveAnswers();
    }
    if (action === 'new-version') {
      const v = M.latest(work);
      if (!['APPROVED', 'REVISION_REQUIRED'].includes(v.status)) return;
      const form = { title: work.title, file: null, tool: v.tool, scope: v.scope, contribution: v.contribution, reviewer: v.reviewer, reason: '', isVersion: true, workId: work.id };
      if (state.draft && !(await confirmDialog('임시 저장한 작업이 있어요', '새 버전을 작성하면 다음 임시 저장에서 기존 작성 중인 작업을 대체합니다.', '새 버전 작성'))) return;
      await go('#new'); editor = form; editorStep = 0; render(true);
    }
    if (action === 'download-file') { const v = work.versions.find(v => v.n === Number(button.dataset.version)) || M.latest(work); download(M.decode(v.file.data), v.file.name); }
    if (action === 'copy-hash') await copy(M.latest(work).file.hash);
    if (action === 'download-certificate') download(JSON.stringify({ demo: true, serverApprovalVerified: false, signature: null, ...M.publicRecord(work, button.dataset.version) }, null, 2), 'HAVE_승인기록_v' + button.dataset.version + '.json', 'application/json');
    if (action === 'copy-link') await copy(location.href.split('#')[0] + `#verify/${work.id}/${button.dataset.version}`);
  } catch (error) { toast(error.message); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search') { query = event.target.value; $('#work-results').innerHTML = workResults(); announce(M.filterWorks(state.works, query, filter).length + '개 작업'); return; }
  if (route === '#new') { captureEditor(); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; $('.saved-at') && ($('.saved-at').textContent = savedAt); }
  if (route.endsWith('/challenge') && ['answer', 'confidence'].includes(event.target.id)) { captureAnswers(); dirty = true; savedAt = '저장하지 않은 변경이 있어요'; if ($('#confidence-value')) $('#confidence-value').textContent = answerDraft.confidence[questionIndex] + '%'; $('.saved-at') && ($('.saved-at').textContent = savedAt); }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'pdf') await chooseFile(event.target.files[0]);
  if (event.target.id === 'compare-file') await compareFile(event.target.files[0]);
  if (event.target.id === 'sort') { sort = event.target.value; $('#work-results').innerHTML = workResults(); }
});
document.addEventListener('dragover', event => { if (event.target.closest('.upload-drop')) event.preventDefault(); });
document.addEventListener('drop', async event => { if (event.target.closest('.upload-drop')) { event.preventDefault(); await chooseFile(event.dataTransfer.files[0]); } });
document.addEventListener('submit', async event => {
  if (!['registration', 'answers'].includes(event.target.id)) return;
  event.preventDefault(); if (saving || fileChecking) return;
  if (event.target.id === 'answers') { await saveAnswers(true); return; }
  captureEditor(); editorErrors = M.validateRegistration(editor, editorStep);
  if (Object.keys(editorErrors).length) { render(); const key = Object.keys(editorErrors)[0]; (key === 'file' ? $('#pdf') : $('#' + key))?.focus(); return; }
  if (editorStep < 3) { editorStep++; render(); $('#main h1')?.focus(); return; }
  editorErrors = M.validateRegistration(editor);
  if (Object.keys(editorErrors).length) { editorStep = ['title', 'file', 'reason'].some(k => editorErrors[k]) ? 0 : ['tool', 'scope'].some(k => editorErrors[k]) ? 1 : editorErrors.contribution ? 2 : 3; render(); return; }
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
    if (!crypto.subtle) throw new Error('파일 해시 계산을 위해 Chrome·Edge 또는 로컬 서버로 열어 주세요.');
    await repo.open(); const stored = await repo.load();
    if (stored) { if (stored.data?.schema !== 1 || !Array.isArray(stored.data.works)) throw new Error('저장 기록의 형식을 확인할 수 없어요.'); state = stored.data; revision = stored.revision; }
    else { state = await M.seed(); revision = await repo.commit(state, 0); }
    if (route === '#attention') filter = 'attention';
    render();
  } catch (error) {
    $('#app').innerHTML = `<main id="main" class="loading-screen"><h1>작업을 불러올 수 없어요</h1><p>${esc(error.message)}</p><p>기존 브라우저 기록은 삭제하지 않았어요.</p><button class="btn primary" id="retry-load">다시 불러오기</button></main>`;
    $('#retry-load').onclick = () => location.reload();
  }
}
init();
