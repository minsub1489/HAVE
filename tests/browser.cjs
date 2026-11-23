// Run with a locally installed Playwright, or NODE_PATH pointing to the bundled runtime packages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[path.extname(file)] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type }); fs.createReadStream(file).pipe(response);
});
const errors = [];
async function idle(page) { await page.evaluate(async () => { await pending; }); }
async function state(page) { await idle(page); return page.evaluate(() => structuredClone(db)); }
async function action(page, name) { await page.locator(`[data-action="${name}"]`).first().click(); await idle(page); }
async function nav(page, screen) { await page.locator(`[data-nav="${screen}"]`).first().click(); await idle(page); }
async function role(page, value) { await page.locator('#role').selectOption(value); await idle(page); }
async function submitAll(page) {
  await nav(page, 'gate'); await action(page, 'sampleAll');
  for (let index = 0; index < 3; index++) { await page.locator(`[data-gate="${index}"]`).click(); await idle(page); await page.locator('#gateForm button[type=submit]').click(); await idle(page); }
}
async function evaluate(page) { await role(page, 'reviewer'); await nav(page, 'review'); await action(page, 'sampleEvaluation'); for (let index = 0; index < 4; index++) { await page.locator(`[data-check="${index}"]`).check(); await idle(page); } }
async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/prototype/dist/index.html'); await page.waitForSelector('[data-nav="gate"]');
    const artifacts = path.join(root, 'test-artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'overview-desktop.jpg'), quality: 90, fullPage: true });
    await action(page, 'previewPdf');
    assert.match(await page.locator('#modalTitle').textContent(), /PDF 원문 · v1/);
    assert.equal(await page.locator('.pdf-viewer').evaluate(async element => {
      const result = await fetch(element.data);
      return (await result.text()).startsWith('%PDF-');
    }), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').evaluate(dialog => dialog.open), false);
    await nav(page, 'gate');
    await page.locator('[data-gate="0"]').focus();
    await page.keyboard.press('ArrowRight');
    await idle(page);
    assert.equal(await page.locator('[data-gate="1"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-gate="1"]').evaluate(tab => document.activeElement === tab), true);
    await page.screenshot({ path: path.join(artifacts, 'gate-desktop.png') });
    await page.setViewportSize({ width: 360, height: 800 });
    for (const screen of ['overview', 'gate', 'review', 'history', 'certificate']) {
      await nav(page, screen);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, screen);
    }
    await nav(page, 'overview');
    assert.equal(await page.locator('.narrow-next').isVisible(), true);
    await page.screenshot({ path: path.join(artifacts, 'overview-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await nav(page, 'review'); assert.equal(await page.locator('[data-action="approve"]').isDisabled(), true);
    await submitAll(page); await evaluate(page);
    await page.screenshot({ path: path.join(artifacts, 'review-desktop.png') });
    await page.locator('[data-critical="1"]').check(); await idle(page); assert.equal(await page.locator('[data-action="approve"]').isDisabled(), true);
    await page.locator('[data-critical="1"]').uncheck(); await idle(page);

    // Revision requests preserve history and remove all stale evaluations and checklist entries.
    await action(page, 'return'); await page.locator('#returnForm textarea').fill('버전의 의미를 보완하세요.'); await page.locator('#returnForm button[type=submit]').click(); await idle(page);
    let data = await state(page); assert.equal(data.versions[0].reviewRounds.length, 1); assert.equal(data.versions[0].gates.every(gate => !gate.evaluation && !gate.submitted), true); assert.equal(data.versions[0].memo, '');
    await role(page, 'author'); await submitAll(page); await evaluate(page);

    // Extension import is previewed, confirmed, deduplicated and forces another review.
    await role(page, 'author'); await nav(page, 'history'); await action(page, 'importContributions');
    const input = { format: 'humanproof-contributions', schema: 1, records: [{ id: 'contrib-browser-test', actorType: 'HUMAN', stage: 'verification', note: '<script>window.bad=true</script>출처 확인', sourceUrl: 'https://example.org/report', selectedText: '<img src=x onerror="window.bad=true">', pageTitle: '근거', createdAt: new Date().toISOString() }] };
    await page.locator('#contributionFile').setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(input)) });
    await page.waitForFunction(() => !document.querySelector('#confirmImport').disabled); assert.equal(await page.evaluate(() => window.bad), undefined);
    await action(page, 'confirmContributions'); data = await state(page); assert.equal(data.versions[0].contributions.length, 1); assert.equal(data.versions[0].gates.every(gate => gate.evaluation === null), true);
    await evaluate(page);

    // Quota failures must not issue a receipt or leave an in-memory approval behind.
    await page.evaluate(() => { window.realCommit = repository.commit; repository.commit = async () => { throw new DOMException('quota fixture', 'QuotaExceededError'); }; });
    await action(page, 'approve'); data = await state(page); assert.equal(data.approvals.length, 0); assert.equal(await page.locator('#storageStatus').textContent().then(text => text.includes('저장하지 못해')), true);
    await page.evaluate(() => { repository.commit = window.realCommit; });
    await page.locator('#reviewMemo').fill('최종 파일과 기여 근거를 다시 확인했습니다.'); await idle(page); await nav(page, 'review');
    await page.evaluate(() => { const button = document.querySelector('[data-action="approve"]'); button.click(); button.click(); }); await idle(page);
    data = await state(page); assert.equal(data.approvals.length, 1); assert.ok(data.approvals[0].reviewDigest);
    await page.screenshot({ path: path.join(artifacts, 'certificate-desktop.png') });
    // Clipboard denial still provides the public link for manual copying.
    await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw Error('clipboard denied'); } }));
    await action(page, 'copyVerify');
    assert.match(await page.locator('#shareUrl').inputValue(), /#verify=/);
    await action(page, 'closeModal');
    await action(page, 'verify'); await page.waitForSelector('#verifyResult'); await action(page, 'compareOriginal'); assert.equal(await page.locator('#verifyResult').textContent().then(text => text.includes('파일이 일치합니다')), true);
    await action(page, 'compareTampered'); assert.equal(await page.locator('#verifyResult').textContent().then(text => text.includes('일치하지 않습니다')), true);
    const summaryUrl = page.url();
    const publicContext = await browser.newContext(); const publicPage = await publicContext.newPage(); await publicPage.goto(summaryUrl); await publicPage.waitForSelector('#verifyResult');
    assert.equal(await publicPage.locator('h2').first().textContent(), '발급 당시 승인 요약입니다'); assert.equal(await publicPage.locator('#verifyResult').textContent().then(text => text.includes('파일 미확인')), true);
    assert.deepEqual(await publicPage.locator('.verify-facts dd').allTextContents(), ['현재 효력 조회 불가', '미적용']);
    await publicPage.setViewportSize({ width: 360, height: 800 });
    assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await publicPage.screenshot({ path: path.join(artifacts, 'verify-mobile.png'), fullPage: true });
    await publicContext.close();

    await action(page, 'workspace'); await nav(page, 'certificate'); await action(page, 'revoke'); await page.locator('#revokeForm textarea').fill('근거 오류를 발견했습니다.'); await page.locator('#revokeForm button[type=submit]').click(); await idle(page);
    await action(page, 'verify'); assert.equal(await page.locator('h2').first().textContent(), '승인이 철회되었습니다');
    await action(page, 'compareOriginal'); assert.equal(await page.locator('#verifyResult').textContent().then(text => text.includes('파일이 일치합니다')), true);
    await action(page, 'workspace'); await role(page, 'author'); await nav(page, 'history'); await action(page, 'newVersion'); await page.locator('#registrationForm button[type=submit]').click(); await idle(page);
    data = await state(page); assert.equal(data.versions.length, 2); assert.equal(data.approvals.length, 1); assert.equal(data.versions[1].gates.every(gate => !gate.submitted && !gate.evaluation), true);
    await page.reload(); await page.waitForSelector('[data-nav="history"]'); assert.equal((await state(page)).versions.length, 2);

    // Real IndexedDB read/write transactions allow only one writer for an expected revision.
    const conflicts = await page.evaluate(async () => {
      const first = await new HumanProofStorage.Repository().open(), second = await new HumanProofStorage.Repository().open(), stored = await first.load();
      const a = structuredClone(stored.data), b = structuredClone(stored.data); a.versions.at(-1).memo = 'first'; b.versions.at(-1).memo = 'second';
      const results = await Promise.allSettled([first.commit(a, stored.revision), second.commit(b, stored.revision)]);
      first.connection.close(); second.connection.close(); return results.map(result => result.status === 'fulfilled' ? 'ok' : result.reason.name);
    });
    assert.deepEqual(conflicts.sort(), ['ConflictError', 'ok']);
    await page.reload(); await page.waitForSelector('[data-nav="history"]'); await nav(page, 'history'); await action(page, 'checkChain'); assert.equal(await page.locator('#chainResult').textContent().then(text => text.includes('연결이 일치')), true);
    assert.deepEqual(await page.locator('.version-row').last().locator('.badge').allTextContents(), ['후속 버전 있음', '승인 철회']);
    await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(artifacts, 'history-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: path.join(artifacts, 'history-desktop.png'), fullPage: true });

    // Standalone HTML has all dependencies, including its IndexedDB persistence adapter.
    const standalone = await context.newPage(); await standalone.goto('file:///' + path.join(root, 'prototype', 'HumanProof_프로토타입.html').replaceAll('\\', '/')); await standalone.waitForSelector('[data-nav="gate"]');
    assert.equal((await state(standalone)).versions.length, 1); await standalone.close();

    // Existing v2 localStorage is migrated after validation and retained as a recovery copy.
    const legacyContext = await browser.newContext(); const legacyPage = await legacyContext.newPage();
    const legacy = structuredClone(data); legacy.versions.forEach(version => { delete version.contributions; delete version.reviewRounds; delete version.policy; });
    legacy.approvals.forEach(approval => { delete approval.reviewDigest; delete approval.policyVersion; delete approval.payload.reviewDigest; delete approval.payload.policyVersion; });
    // Recompute only the legacy receipt's original payload hash, as the old app did.
    const domain = require('../prototype/dist/domain.js'); for (const approval of legacy.approvals) approval.payloadHash = await domain.digestText(domain.canonical(approval.payload));
    await legacyContext.addInitScript(value => localStorage.setItem('humanproof-demo-v2', JSON.stringify(value)), legacy);
    await legacyPage.goto(base + '/prototype/dist/index.html'); await legacyPage.waitForSelector('[data-nav="history"]'); assert.equal((await state(legacyPage)).versions.length, 2); assert.ok(await legacyPage.evaluate(() => localStorage.getItem('humanproof-demo-v2'))); await legacyContext.close();

    // Malformed cached records are preserved and require explicit recovery, never auto-reset.
    const brokenContext = await browser.newContext(); await brokenContext.addInitScript(() => localStorage.setItem('humanproof-demo-v2', '{broken'));
    const broken = await brokenContext.newPage(); await broken.goto(base + '/prototype/dist/index.html'); await broken.waitForSelector('#recoveryBackup'); assert.equal(await broken.locator('#recoveryReset').isDisabled(), true); assert.equal(await broken.evaluate(() => localStorage.getItem('humanproof-demo-v2')), '{broken'); await brokenContext.close();

    // A 20 MB boundary fixture must persist despite the former localStorage size limit.
    const largeContext = await browser.newContext(), large = await largeContext.newPage(); await large.goto(base + '/prototype/dist/index.html'); await large.waitForSelector('[data-nav="gate"]');
    const pdfErrors = await large.evaluate(async () => {
      const fixtures = [new File([], 'empty.pdf', { type: 'application/pdf' }), new File(['fake'], 'fake.pdf', { type: 'application/pdf' }), new File(['%PDF-1.4'], 'text.txt', { type: 'text/plain' }),
        { size: 20 * 1024 * 1024 + 1, name: 'large.pdf', type: 'application/pdf' }];
      return Promise.all(fixtures.map(file => validatePdf(file).then(() => false, () => true)));
    }); assert.deepEqual(pdfErrors, [true, true, true, true]);
    await action(large, 'newWork'); await large.locator('[name=title]').fill('용량 경계 테스트');
    const boundary = Buffer.alloc(20 * 1024 * 1024, 32); boundary.write('%PDF-1.4\n'); boundary.write('\n%%EOF\n', boundary.length - 7);
    await large.locator('[name=pdf]').setInputFiles({ name: 'boundary.pdf', mimeType: 'application/pdf', buffer: boundary }); await large.locator('#registrationForm button[type=submit]').click(); await idle(large);
    assert.equal((await state(large)).versions[0].size, boundary.length); await large.reload(); await large.waitForSelector('[data-nav="gate"]'); assert.equal((await state(large)).versions[0].size, boundary.length); await largeContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS: browser workflow, PDF preview, keyboard tabs, self-approval/critical-error blocks, revision history, extension import/XSS, quota rollback, receipts, link sharing, byte comparison, public summary, revocation, new version, persistence, concurrent IndexedDB writers, mobile, standalone HTML, legacy migration and corrupted-store recovery.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
