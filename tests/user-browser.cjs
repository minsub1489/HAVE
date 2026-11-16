// Uses the same optional Playwright runtime as the existing browser suites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; ({ chromium } = require('playwright-core')); }
const M = require('../user/model.js');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'docs/ui/evidence');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const results = [], errors = [];
async function check(name, run) { await run(); results.push(name); console.log('PASS', name); }
async function loaded(page) { await page.getByRole('heading', { name: '내 작업', exact: true }).waitFor(); }
async function nav(page, route) { await page.locator(`[data-route="${route}"]`).filter({ visible: true }).first().click(); }
async function action(page, name) { await page.locator(`[data-action="${name}"]`).filter({ visible: true }).first().click(); }
async function saved(page) { await page.waitForFunction(() => !saving); }
async function clickSubmit(page) { await page.locator('form#registration button[type=submit]').click(); await saved(page); }
async function run() {
  fs.mkdirSync(evidence, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/user/index.html'); await loaded(page);
    await check('teal primary and red guide tokens match the supplied design', async () => {
      const colors = await page.evaluate(() => ({ primary: getComputedStyle(document.querySelector('.btn.primary')).backgroundColor, accent: getComputedStyle(document.querySelector('.side-guide')).color }));
      assert.equal(colors.primary, 'rgb(15, 118, 110)'); assert.equal(colors.accent, 'rgb(194, 65, 59)');
      assert.equal(await page.locator('.mobile-menu').isVisible(), false);
    });
    await check('search and status filters show the matching latest version', async () => {
      await page.getByLabel('작업 검색').fill('아키텍처'); assert.equal(await page.locator('tbody tr').count(), 1);
      await page.getByLabel('작업 검색').fill('없는 작업'); await page.getByText('조건에 맞는 작업이 없어요').waitFor();
      await action(page, 'clear-filter'); assert.equal(await page.locator('tbody tr').count(), 5);
      await page.getByRole('tab', { name: /내 확인 필요/ }).click(); assert.equal(await page.locator('tbody tr').count(), 2);
      await page.getByRole('tab', { name: /^전체/ }).click();
    });
    await check('keyboard tab navigation and guide dialog return focus', async () => {
      await page.getByRole('tab', { name: /^전체/ }).focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.getByRole('tab', { name: /내 확인 필요/ }).getAttribute('aria-selected'), 'true');
      await page.getByRole('tab', { name: /^전체/ }).click();
      await action(page, 'guide'); assert.equal(await page.locator('#dialog').evaluate(d => d.open), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('[data-action=guide]').evaluate(d => document.activeElement === d), true);
    });
    await page.screenshot({ path: path.join(evidence, 'desktop-1440.png'), fullPage: true });
    await check('registration validates fields and PDF bytes while preserving entered values', async () => {
      await nav(page, '#new'); await clickSubmit(page);
      assert.equal(await page.locator('#title').getAttribute('aria-invalid'), 'true');
      await page.getByLabel('작업명', { exact: false }).fill('GUI 기능 검증 작업');
      await page.locator('#pdf').setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not-pdf') });
      await page.getByText('PDF 파일만 등록할 수 있어요.', { exact: false }).first().waitFor();
      assert.equal(await page.locator('#title').inputValue(), 'GUI 기능 검증 작업');
      await action(page, 'sample-pdf'); await page.getByText('파일 확인 완료', { exact: false }).waitFor();
      await clickSubmit(page); await page.locator('#tool').fill('ChatGPT'); await page.locator('#scope').fill('초안 작성에 사용했습니다.');
      await action(page, 'previous-step'); assert.equal(await page.locator('#title').inputValue(), 'GUI 기능 검증 작업');
      await clickSubmit(page); assert.equal(await page.locator('#tool').inputValue(), 'ChatGPT');
      await action(page, 'save-draft'); await saved(page); await page.getByText('임시 저장됨', { exact: false }).waitFor();
      await page.reload(); await page.getByRole('heading', { name: '작업 등록', exact: true }).waitFor();
      assert.equal(await page.locator('#title').inputValue(), 'GUI 기능 검증 작업');
      await clickSubmit(page); await clickSubmit(page); await page.locator('#contribution').fill('검증 근거를 확인하고 승인 정책을 수정했습니다.');
      await page.screenshot({ path: path.join(evidence, 'registration.png'), fullPage: true });
      await clickSubmit(page); await page.getByLabel('김지은', { exact: false }).check();
      await clickSubmit(page); await page.getByRole('heading', { name: '작업 상세', exact: true }).waitFor();
      await page.getByText('GUI 기능 검증 작업', { exact: true }).first().waitFor();
    });
    const workHash = await page.evaluate(() => location.hash);
    await check('understanding answers save, preserve edits during navigation and submit once', async () => {
      await nav(page, workHash.replace('/overview', '/challenge'));
      await page.locator('#answer').fill('버전 ID는 승인 대상을 식별하고 SHA-256은 파일의 바이트를 비교합니다.');
      await nav(page, '#works'); assert.equal(await page.locator('#dialog').evaluate(d => d.open), true);
      await page.getByRole('button', { name: '계속 작성', exact: true }).click(); assert.ok(await page.locator('#answer').inputValue());
      await page.getByRole('tab', { name: /오류 발견/ }).click();
      await page.locator('#answer').fill('이름이 같아도 내용은 다를 수 있습니다. 해시로 비교해야 합니다.');
      await page.getByRole('tab', { name: /조건 변경 대응/ }).click();
      await page.locator('#answer').fill('서로 다른 승인자 두 명의 기록과 승인 완료 조건을 확인해야 합니다.');
      await action(page, 'save-answers'); await saved(page); await page.screenshot({ path: path.join(evidence, 'understanding.png'), fullPage: true });
      await page.locator('#answers button[type=submit]').click(); await saved(page);
      assert.equal(await page.locator('#answer').getAttribute('readonly'), '');
      assert.equal(await page.getByRole('button', { name: /승인/ }).count(), 0);
      await page.getByText('검토 대기', { exact: true }).first().waitFor();
    });
    await check('new versions preserve old certificates and do not inherit approval', async () => {
      await nav(page, '#works'); await nav(page, '#work/work-architecture/overview'); await action(page, 'new-version');
      await action(page, 'sample-pdf'); await page.locator('#reason').fill('용어 정의와 근거를 보완했습니다.');
      await clickSubmit(page); await clickSubmit(page); await clickSubmit(page); await clickSubmit(page);
      await page.getByRole('heading', { name: '작업 상세', exact: true }).waitFor();
      await page.getByText('이해 확인 대기', { exact: true }).first().waitFor();
      await nav(page, '#work/work-architecture/certificate'); await page.getByText('이전 버전의 승인 기록이에요').waitFor();
      await page.screenshot({ path: path.join(evidence, 'certificate.png'), fullPage: true });
    });
    await check('public verification separates signature, approval and actual PDF comparison', async () => {
      await nav(page, '#verify/work-architecture/1');
      assert.equal(await page.locator('.sidebar').count(), 0);
      assert.equal(await page.getByText('확인 불가', { exact: true }).count(), 2);
      await page.getByText('파일 미확인', { exact: true }).waitFor();
      const pdf = M.samplePdf();
      await page.locator('#compare-file').setInputFiles({ name: 'original.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
      await page.locator('#main').getByText('파일 일치', { exact: true }).waitFor();
      pdf[pdf.length - 1] ^= 1;
      await page.locator('#compare-file').setInputFiles({ name: 'changed.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
      await page.locator('#main').getByText('파일 불일치', { exact: true }).waitFor();
      assert.equal((await page.locator('#app').textContent()).includes('직접 수행한 일'), false);
      await page.screenshot({ path: path.join(evidence, 'verification.png'), fullPage: true });
    });
    await check('save failure keeps entered values and does not commit a submitted work', async () => {
      await nav(page, '#works'); await nav(page, '#new');
      await page.locator('#title').fill('저장 오류 복구');
      await page.evaluate(() => { window.realCommit = repo.commit; repo.commit = async () => { throw new DOMException('quota fixture', 'QuotaExceededError'); }; });
      await action(page, 'save-draft'); await saved(page);
      assert.equal(await page.locator('#title').inputValue(), '저장 오류 복구');
      await page.getByRole('alert').getByText('기록을 저장하지 못했어요.', { exact: false }).waitFor();
      await page.screenshot({ path: path.join(evidence, 'save-error.png'), fullPage: true });
      await page.evaluate(() => { repo.commit = window.realCommit; }); await action(page, 'retry-save'); await saved(page);
      await page.getByText('임시 저장됨', { exact: false }).waitFor();
      await nav(page, '#works');
    });
    await check('conflicting tab saves preserve edits until explicit backup and reload', async () => {
      await nav(page, '#new'); await page.locator('#title').fill('동시 수정 입력 유지');
      const other = await context.newPage(); await other.goto(base + '/user/index.html'); await loaded(other);
      await other.evaluate(async () => { const stored = await repo.load(); const next = structuredClone(stored.data); next.draft.title = '다른 창의 변경'; await repo.commit(next, stored.revision); });
      await action(page, 'save-draft'); await saved(page);
      assert.equal(await page.locator('#title').inputValue(), '동시 수정 입력 유지');
      await page.getByRole('alert').getByText('다른 창에서 변경한 기록이 있어요.', { exact: false }).waitFor();
      await action(page, 'retry-save');
      const download = page.waitForEvent('download'); await page.getByRole('button', { name: '백업 후 불러오기' }).click();
      await download; await loaded(page); await other.close();
    });
    await check('loading, first empty list and invalid public link have recovery states', async () => {
      const emptyContext = await browser.newContext(); const emptyPage = await emptyContext.newPage();
      let release; const hold = new Promise(resolve => { release = resolve; });
      await emptyPage.route('**/user/app.js', async request => { await hold; await request.continue(); });
      const navigation = emptyPage.goto(base + '/user/index.html', { waitUntil: 'domcontentloaded' });
      await emptyPage.getByRole('heading', { name: '작업을 불러오는 중' }).waitFor();
      await emptyPage.screenshot({ path: path.join(evidence, 'loading.png') }); release(); await navigation; await loaded(emptyPage);
      await emptyPage.evaluate(() => { state.works = []; render(); });
      await emptyPage.getByRole('heading', { name: '아직 등록한 작업이 없어요' }).waitFor();
      await emptyPage.screenshot({ path: path.join(evidence, 'empty.png') });
      await emptyPage.evaluate(() => go('#verify/missing/1', true));
      await emptyPage.getByRole('heading', { name: '승인 기록을 찾을 수 없어요' }).waitFor();
      await emptyContext.close();
    });
    await check('desktop and mobile screens reflow without horizontal overflow', async () => {
      for (const [width, height] of [[1440, 1000], [1024, 900], [768, 1024], [360, 800]]) {
        await page.setViewportSize({ width, height });
        for (const hash of ['#works', '#new', '#work/work-policy/overview', '#work/work-design/challenge', '#work/work-architecture/certificate', '#work/work-design/history', '#verify/work-architecture/1']) {
          await page.evaluate(hash => { dirty = false; go(hash, true); }, hash);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} overflow on ${hash}`);
        }
        await page.evaluate(() => go('#works', true));
        // Capture a clean sample workspace separately from modified test fixtures.
        const previewContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
        const preview = await previewContext.newPage(); await preview.goto(base + '/user/index.html'); await loaded(preview);
        await preview.screenshot({ path: path.join(evidence, `desktop-${width}.png`), fullPage: true });
        await previewContext.close();
      }
      await action(page, 'menu'); await page.getByRole('dialog').getByRole('link', { name: /내 확인 필요/ }).click();
      assert.equal(await page.locator('#dialog').evaluate(d => d.open), false);
      await page.getByRole('heading', { name: '내 확인이 필요한 작업', exact: true }).waitFor();
    });
    await check('standalone HTML loads and shows the same primary action', async () => {
      const standalone = await context.newPage();
      await standalone.goto('file://' + path.join(root, 'prototype/HAVE_사용자_GUI.html'));
      await loaded(standalone); assert.equal(await standalone.getByRole('link', { name: '작업 등록', exact: true }).count(), 1);
      await standalone.close();
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify({ passed: results, pageErrors: errors }, null, 2));
    console.log(`${results.length} browser scenarios passed; no page errors.`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
