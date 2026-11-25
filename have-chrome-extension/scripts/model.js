(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./domain.js') : root.HumanProof,
    isNode ? require('./registration.js') : root.HaveRegistration);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HaveUserModel = api;
})(globalThis, function (shared, registration) {
  'use strict';
  const STATUS = Object.freeze({
    CHALLENGE_PENDING: { label: '이해 확인 대기', tone: 'progress', action: '이해 확인하기' },
    REVIEW_PENDING: { label: '검토 대기', tone: 'progress', action: '진행 상황 보기' },
    APPROVAL_PENDING: { label: '승인 대기', tone: 'progress', action: '진행 상황 보기' },
    REVISION_REQUIRED: { label: '수정 요청', tone: 'warning', action: '수정 내용 확인' },
    APPROVED: { label: '승인 완료', tone: 'success', action: '증명서 보기' }
  });
  const REVIEWERS = ['김지은', '이도현'];
  const uid = prefix => prefix + '-' + crypto.randomUUID();
  const latest = work => work.versions.at(-1);
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  function encode(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  async function prepareFile(name, bytes) {
    if (bytes.length > shared.MAX_PDF_BYTES) throw new Error('20 MB 이하의 PDF를 선택해 주세요.');
    if (!/\.pdf$/i.test(name) || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('PDF 파일만 등록할 수 있어요. 파일 형식을 확인해 주세요.');
    if (name.length > 255) throw new Error('파일 이름을 255자 이내로 줄여 주세요.');
    return { name, size: bytes.length, data: encode(bytes), hash: await shared.digest(bytes) };
  }
  function validateRegistration(form, step = -1) {
    const errors = {}, check = index => step === -1 || step === index;
    if (check(0)) {
      if (!form.title?.trim() || form.title.trim().length > 100) errors.title = '작업명을 1~100자로 입력해 주세요.';
      if (!form.file) errors.file = '검토할 PDF 파일을 선택해 주세요.';
      if (form.isVersion && !form.reason?.trim()) errors.reason = '변경 사유를 입력해 주세요.';
      if ((form.reason || '').length > 2000) errors.reason = '변경 사유를 2,000자 이내로 입력해 주세요.';
    }
    if (check(1) && form.aiUsed !== false) {
      if (!form.tool?.trim() || form.tool.length > 100) errors.tool = 'AI 도구·모델을 100자 이내로 입력해 주세요.';
      if (!form.scope?.trim() || form.scope.length > 5000) errors.scope = 'AI 사용 범위를 5,000자 이내로 입력해 주세요.';
    }
    if (check(2) && (!form.contribution?.trim() || form.contribution.length > 2000)) errors.contribution = '직접 수행한 일을 2,000자 이내로 입력해 주세요.';
    if (check(3) && !REVIEWERS.includes(form.reviewer)) errors.reviewer = '검토자 한 명을 선택해 주세요.';
    return { ...errors, ...registration.validate(form, step) };
  }
  function makeVersion(form, n, at) {
    return { id: uid('version'), n, file: structuredClone(form.file),
      tool: form.aiUsed === false ? '사용 안 함' : form.tool.trim(),
      scope: form.aiUsed === false ? '이 버전에서는 AI를 사용하지 않았어요.' : form.scope.trim(),
      contribution: form.contribution.trim(), reason: form.reason?.trim() || '최초 등록', reviewer: form.reviewer,
      status: 'CHALLENGE_PENDING', answers: ['', '', ''], confidence: [80, 80, 80], approval: null,
      createdAt: at, feedback: '', ...registration.metadata(form) };
  }
  function assertForm(form) {
    const errors = validateRegistration(form);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  }
  function createWork(form, at = new Date().toISOString()) {
    assertForm(form);
    const version = makeVersion(form, 1, at);
    return { id: uid('work'), title: form.title.trim(), owner: '김하늘', versions: [version], events: [{ version: 1, action: '작업 등록 · 이해 확인 배정', actor: '김하늘', at }] };
  }
  function appendVersion(work, form, at = new Date().toISOString()) {
    if (!form.reason?.trim()) throw new Error('변경 사유를 입력해 주세요.');
    if (!['APPROVED', 'REVISION_REQUIRED'].includes(latest(work).status)) throw new Error('수정 요청 또는 승인 완료 후 새 버전을 등록할 수 있어요.');
    if (latest(work).issuance?.status === 'PENDING') throw new Error('이전 승인의 증명서를 발급한 뒤 새 버전을 등록해 주세요.');
    assertForm(form);
    const next = structuredClone(work), version = makeVersion(form, latest(work).n + 1, at);
    next.versions.push(version);
    next.events.push({ version: version.n, action: '새 버전 등록', actor: work.owner, at, note: form.reason.trim() });
    return next;
  }
  function submitAnswers(work, answers, confidence, at = new Date().toISOString()) {
    if (latest(work).status !== 'CHALLENGE_PENDING') throw new Error('이미 제출한 답변은 수정할 수 없어요. 새 검토 요청을 기다려 주세요.');
    if (!Array.isArray(answers) || answers.length !== 3 || answers.some(a => typeof a !== 'string' || !a.trim() || a.length > 10000)) throw new Error('모든 문항에 답변을 입력해 주세요.');
    if (!Array.isArray(confidence) || confidence.length !== 3 || confidence.some(c => !Number.isFinite(c) || c < 0 || c > 100)) throw new Error('확신도는 0~100%로 입력해 주세요.');
    const next = structuredClone(work), v = latest(next);
    v.answers = answers.map(a => a.trim()); v.confidence = [...confidence]; v.status = 'REVIEW_PENDING';
    next.events.push({ version: v.n, action: '이해 확인 답변 제출 · 검토 대기', actor: work.owner, at });
    return next;
  }
  function statusOf(work, version = latest(work)) {
    if (version.status === 'APPROVED' && version.id !== latest(work).id) return { label: '이전 버전 승인', tone: 'neutral', action: '이전 증명서 보기' };
    return STATUS[version.status] || { label: '상태 확인 필요', tone: 'neutral', action: '상세 보기' };
  }
  function filterWorks(works, query = '', filter = 'all') {
    const q = query.trim().toLocaleLowerCase();
    return works.filter(w => (!q || (w.title + ' ' + latest(w).file.name + ' ' + latest(w).reviewer).toLocaleLowerCase().includes(q)) &&
      (filter === 'all' || (filter === 'attention' && ['CHALLENGE_PENDING', 'REVISION_REQUIRED'].includes(latest(w).status)) ||
       (filter === 'ongoing' && ['REVIEW_PENDING', 'APPROVAL_PENDING'].includes(latest(w).status)) || (filter === 'approved' && latest(w).status === 'APPROVED')));
  }
  function certificateFor(work, n = latest(work).n) {
    const version = work.versions.find(v => v.n === Number(n));
    return version?.status === 'APPROVED' && version.approval ? version : null;
  }
  function publicRecord(work, n) {
    const v = certificateFor(work, n);
    if (!v) throw new Error('이 버전에는 발급된 증명서가 없어요.');
    return { title: work.title, version: v.n, fileName: v.file.name, fileHash: v.file.hash,
      serial: v.approval.serial, at: v.approval.at, actor: v.approval.actor, issuedAt: v.approval.issuedAt || v.approval.at };
  }
  function samplePdf() {
    const stream = 'BT /F1 20 Tf 48 760 Td (HAVE / User GUI) Tj /F1 12 Tf 0 -40 Td (Human approval is bound to one file version.) Tj 0 -24 Td (This is a local demonstration PDF.) Tj ET';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let out = '%PDF-1.4\n'; const offsets = [0];
    objects.forEach((object, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = out.length;
    out += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    return new TextEncoder().encode(out + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  }
  async function seed() {
    const file = await prepareFile('HAVE_시스템_설계.pdf', samplePdf());
    const rows = [
      ['work-design', 'AI 협업 서비스 요구사항 명세서', 'CHALLENGE_PENDING', 2, '2026-11-16T00:20:00Z'],
      ['work-research', '캠퍼스 서비스 사용자 조사 보고서', 'REVIEW_PENDING', 1, '2026-11-15T08:40:00Z'],
      ['work-architecture', 'HAVE 시스템 아키텍처 설계', 'APPROVED', 1, '2026-11-15T05:10:00Z'],
      ['work-policy', 'AI 사용 가이드라인 및 운영 정책', 'REVISION_REQUIRED', 1, '2026-11-14T07:30:00Z'],
      ['work-plan', 'HAVE 프로젝트 기획서', 'APPROVED', 1, '2026-11-13T02:00:00Z']
    ];
    const works = rows.map(([id, title, status, count, at], i) => {
      const work = createWork({ title, file, tool: 'ChatGPT · GPT-4o', scope: '문서 구조와 초안 작성에 사용했습니다. 사실 확인과 최종 수정은 직접 수행했습니다.', contribution: '요구사항을 비교하고 출처를 확인한 뒤, 버전과 승인 정책을 직접 수정했습니다.', reviewer: REVIEWERS[i % 2] }, at);
      work.id = id; work.demo = true;
      if (count === 2) work.versions.push(makeVersion({ ...latest(work), file, contribution: latest(work).contribution, reason: '용어와 승인 범위 보완' }, 2, at));
      work.versions.forEach((v, index) => { v.id = `${id}-v${index + 1}`; v.file.name = title.replaceAll(' ', '_') + `_v${v.n}.pdf`; });
      const v = latest(work); v.status = status;
      if (status === 'REVIEW_PENDING') v.answers = ['버전은 승인 대상을 식별하고 해시는 파일 바이트를 비교합니다.', '파일 이름으로 승인 여부를 판단할 수 없습니다.', '승인자 관계와 승인 완료 조건을 함께 변경해야 합니다.'];
      if (status === 'REVISION_REQUIRED') v.feedback = 'AI가 작성한 내용과 직접 수정한 부분을 구분해 주세요. 운영 정책 3절에 출처를 추가하고, 수정한 파일을 새 버전으로 제출해 주세요.';
      if (status === 'APPROVED') {
        v.approval = { serial: `HAVE-DEMO-2026-${String(i + 1).padStart(4, '0')}`, at, actor: v.reviewer };
        work.events.push({ version: v.n, action: '검토 통과 · 승인 기록 · 증명서 발급 (시연)', actor: v.reviewer, at });
      }
      return work;
    });
    return { schema: 1, works, draft: null };
  }
  return { STATUS, REVIEWERS, latest, decode, encode, prepareFile, validateRegistration, createWork, appendVersion, submitAnswers, statusOf, filterWorks, certificateFor, publicRecord, samplePdf, seed };
});
