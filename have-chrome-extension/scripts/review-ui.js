(function (root) {
  'use strict';

  const Model = root.HaveUserModel;
  const Review = root.HaveUserReviewModel;
  const MODES = Object.freeze({
    review: { label: '검토할 작업', action: '검토하기' },
    approval: { label: '승인할 작업', action: '최종 결정하기' }
  });

  function queue(works, mode, actor, helpers) {
    const { esc, icon, link, badge, stamp, workRoute } = helpers;
    const rows = Review.pendingFor(works, mode, actor);
    const meta = MODES[mode];
    if (!rows.length) {
      return `<section class="panel empty">${icon('check')}<h2>${meta.label}이 없어요</h2>
        <p>${esc(actor)}에게 배정된 작업을 이 화면에서 확인할 수 있어요.</p></section>`;
    }

    return `<ul class="role-queue" aria-label="${meta.label}">${rows.map(work => {
      const version = Model.latest(work);
      const status = Model.statusOf(work, version);
      const needsIssue = mode === 'approval' && version.status === 'APPROVED' && !version.approval;
      const action = needsIssue ? '증명서 발급하기' : meta.action;
      const submitted = version.review?.at || work.events.at(-1)?.at || version.createdAt;
      return `<li class="role-item panel panel-body">
        <div class="stack"><div class="row wrap">${badge(needsIssue ? '증명서 발급 대기' : status.label, needsIssue ? 'warning' : status.tone)}<small>v${version.n}</small></div>
        <div><h2>${esc(work.title)}</h2><p class="small muted">작성자 ${esc(work.owner)} · ${esc(stamp(submitted))}</p></div></div>
        ${link(workRoute(work, mode), action + icon('arrow'), 'btn primary')}
      </li>`;
    }).join('')}</ul>`;
  }

  function fileSummary(work, version, helpers) {
    const { esc, icon } = helpers;
    return `<section class="panel"><header class="panel-head"><h2>검토 대상</h2><span class="small muted">v${version.n}</span></header>
      <div class="panel-body stack">
        <dl class="definition"><dt>작성자</dt><dd>${esc(work.owner)}</dd><dt>검토자</dt><dd>${esc(version.reviewer)}</dd>
          <dt>최종 승인자</dt><dd>${esc(Review.approverFor(version))}</dd><dt>파일</dt><dd>${esc(version.file.name)}</dd>
          <dt>AI 도구</dt><dd>${esc(version.tool)}</dd><dt>AI 범위</dt><dd>${esc(version.scope)}</dd>
          <dt>작성자 기여</dt><dd>${esc(version.contribution)}</dd></dl>
        <details class="hash-details"><summary>등록 PDF의 SHA-256 보기</summary><p class="mono">${esc(version.file.hash)}</p></details>
        ${root.HaveRegistration.renderDetails(version)}
        <div class="pdf-actions">
          <button class="btn" data-action="view-file" data-version="${version.n}">${icon('file')}PDF 원문 보기</button>
          <button class="btn" data-action="download-file" data-version="${version.n}">${icon('download')}다운로드</button>
        </div>
      </div></section>`;
  }

  function reviewSummary(review, helpers) {
    const { esc, badge, stamp } = helpers;
    if (!review) return '';
    return `<section class="panel"><header class="panel-head"><h2>검토 결정</h2>${review.decision === 'PASS' ? badge('검토 통과', 'success') : badge('수정 요청', 'warning')}</header>
      <div class="panel-body stack"><dl class="definition"><dt>검토자</dt><dd>${esc(review.actor)}</dd><dt>검토 시각</dt><dd>${esc(stamp(review.at))}</dd>
        ${review.total === null ? '' : `<dt>검토 점수</dt><dd>${review.total} / 6점</dd>`}<dt>검토 근거</dt><dd class="review-answer">${esc(review.rationale)}</dd>
        ${(review.comments || []).map((comment, index) => comment ? `<dt>문항 ${index + 1} 의견</dt><dd class="review-answer">${esc(comment)}</dd>` : '').join('')}</dl></div>
      </section>`;
  }

  function finalSummary(decision, helpers) {
    const { esc, badge, stamp } = helpers;
    if (!decision) return '';
    return `<section class="panel"><header class="panel-head"><h2>최종 결정</h2>${decision.decision === 'APPROVE' ? badge('승인 완료', 'success') : badge('수정 요청', 'warning')}</header>
      <div class="panel-body stack"><dl class="definition"><dt>최종 승인자</dt><dd>${esc(decision.actor)}</dd><dt>결정 시각</dt><dd>${esc(stamp(decision.at))}</dd>
        <dt>결정 근거</dt><dd class="review-answer">${esc(decision.rationale)}</dd></dl></div></section>`;
  }

  function alertArea() {
    return '<p class="review-error" role="alert" tabindex="-1" hidden></p>';
  }

  function reviewForm(version, questions, helpers) {
    const { esc, icon } = helpers;
    return `<form class="review-workflow stack" id="role-review" data-role-mode="review" data-version-id="${esc(version.id)}">
      <section class="panel"><header class="panel-head"><h2>이해 확인 답변 평가</h2><span class="small muted" data-review-score role="status">0 / 6점 · 5점 이상 통과</span></header>
        <div class="panel-body stack">${version.answers.map((answer, index) => {
          const question = questions[index];
          return `<fieldset class="review-evaluation"><legend>${esc(question.name)} <span class="small muted">문항 ${index + 1}</span></legend>
            <p class="small muted">${esc(question.prompt)}</p>${question.reference ? `<blockquote class="review-answer">${esc(question.reference)}</blockquote>` : ''}
            <p class="review-answer">${esc(answer)}</p><p class="small muted">작성자 확신도 ${esc(version.confidence[index])}%</p>
            <div class="review-evaluation-control row wrap"><label class="field">평가 점수 <select name="score-${index}">
              <option value="">선택</option><option value="0">0점 · 근거 부족</option><option value="1">1점 · 일부 충족</option><option value="2">2점 · 충분함</option>
            </select></label><label class="row"><input type="checkbox" name="critical-${index}">중대한 오류 발견</label></div>
            <details class="hash-details"><summary>문항별 의견 남기기</summary><label class="field"><span>문항 ${index + 1} 검토 의견</span>
              <textarea name="comment-${index}" rows="2" maxlength="1000" placeholder="수정하거나 확인할 내용을 적어 주세요."></textarea></label></details></fieldset>`;
        }).join('')}</div>
      </section>
      <section class="panel"><header class="panel-head"><h2>검토 확인과 결정</h2></header>
        <div class="panel-body stack"><fieldset class="review-checks"><legend>검토 확인 항목</legend>
          ${Review.CHECKS.map((check, index) => `<label class="row"><input type="checkbox" name="check-${index}">${esc(check)}</label>`).join('')}
        </fieldset>
        <label class="field" for="review-rationale"><span>검토 근거 또는 수정 요청 사유</span>
          <textarea id="review-rationale" name="rationale" maxlength="2000" required placeholder="잘한 점이나 보완할 부분을 구체적으로 알려 주세요."></textarea></label>
        <ul class="review-blockers" data-review-blockers aria-live="polite">${Review.reviewBlockers({ critical: [false, false, false] }).map(message => `<li>${esc(message)}</li>`).join('')}</ul>
        ${alertArea()}
        <div class="review-actions row wrap"><button type="submit" class="btn primary" name="decision" value="PASS" data-review-pass disabled>${icon('check')}검토 통과</button>
          <button type="submit" class="btn" name="decision" value="REVISE">수정 요청</button></div></div>
      </section>
    </form>`;
  }

  function approvalForm(version, helpers) {
    const { esc, icon } = helpers;
    return `<form class="review-workflow panel" id="role-approval" data-role-mode="approval" data-version-id="${esc(version.id)}">
      <header class="panel-head"><h2>최종 승인 결정</h2></header><div class="panel-body stack">
        <p class="small muted">v${version.n}의 검토 근거와 PDF를 확인하고 결정해 주세요. 승인 이후 증명서를 발급할 수 있어요.</p>
        <label class="field" for="approval-rationale"><span>최종 결정 근거</span>
          <textarea id="approval-rationale" name="rationale" maxlength="2000" required placeholder="승인하거나 보완을 요청한 이유를 적어 주세요."></textarea></label>
        ${alertArea()}
        <div class="review-actions row wrap"><button type="submit" class="btn primary" name="decision" value="APPROVE">${icon('check')}최종 승인</button>
          <button type="submit" class="btn" name="decision" value="REVISE">수정 요청</button></div></div>
    </form>`;
  }

  function issueForm(version, helpers) {
    const { esc, icon } = helpers;
    return `<form class="review-workflow panel" id="role-issue" data-role-mode="issue" data-version-id="${esc(version.id)}">
      <header class="panel-head"><h2>시연 증명서 발급</h2></header><div class="panel-body stack">
        <p class="small muted">v${version.n}은 승인됐어요. PDF 해시를 확인한 뒤 이 브라우저에서 증명서를 발급합니다.</p>
        ${alertArea()}<div class="review-actions"><button type="submit" class="btn primary">${icon('award')}증명서 발급</button></div></div>
    </form>`;
  }

  function detail(work, mode, actor, questions, helpers) {
    const { notice, link, workRoute } = helpers;
    const version = Model.latest(work);
    const assigned = mode === 'review' ? version.reviewer : Review.approverFor(version);
    if (actor !== assigned || actor === work.owner || version.reviewer === Review.approverFor(version)) {
      return notice('지정된 참가자의 화면이에요', `${assigned}의 시연 역할로 전환해 주세요.`, 'warning');
    }

    let actions;
    if (mode === 'review' && Review.pendingFor([work], mode, actor).length) {
      actions = reviewForm(version, questions, helpers);
    } else if (mode === 'approval' && version.status === 'APPROVAL_PENDING') {
      actions = approvalForm(version, helpers);
    } else if (mode === 'approval' && version.status === 'APPROVED' && version.finalDecision && !version.approval) {
      actions = issueForm(version, helpers);
    } else if (version.approval) {
      actions = `<section class="panel panel-body">${link(workRoute(work, 'certificate'), '증명서 보기', 'btn primary')}</section>`;
    } else if (version.status === 'REVISION_REQUIRED') {
      actions = notice('작성자의 수정 반영을 기다려요', '새 버전 등록 후 작성자가 이해 확인 답변을 제출하면 검토가 시작됩니다.', 'neutral');
    } else if (version.status === 'APPROVAL_PENDING') {
      actions = notice('최종 승인 대기', `${Review.approverFor(version)}에게 v${version.n} 최종 결정이 배정됐어요.`, 'neutral');
    } else {
      actions = notice('진행 중인 결정이 없어요', '작업의 현재 상태와 배정 내역을 확인해 주세요.', 'neutral');
    }

    return `<div class="review-grid split">
      <div class="stack">${reviewSummary(version.review, helpers)}${finalSummary(version.finalDecision, helpers)}${actions}</div>
      <aside>${fileSummary(work, version, helpers)}</aside>
    </div>`;
  }

  function read(form, submitter) {
    const inputs = new FormData(form);
    const mode = form.dataset.roleMode;
    const payload = { decision: submitter?.value, rationale: inputs.get('rationale') || '' };
    if (mode === 'review') {
      payload.scores = Array.from({ length: 3 }, (_, index) => {
        const value = inputs.get(`score-${index}`);
        return value === null || value === '' ? null : Number(value);
      });
      payload.critical = Array.from({ length: 3 }, (_, index) => inputs.has(`critical-${index}`));
      payload.comments = Array.from({ length: 3 }, (_, index) => inputs.get(`comment-${index}`) || '');
      payload.checks = Review.CHECKS.map((_, index) => inputs.has(`check-${index}`));
    }
    return { mode, versionId: form.dataset.versionId, payload };
  }

  function refresh(form) {
    const pass = form.querySelector('[data-review-pass]');
    if (!pass) return;
    const payload = read(form, pass).payload;
    const blockers = Review.reviewBlockers(payload);
    form.querySelector('[data-review-score]').textContent = `${payload.scores.reduce((total, score) => total + (score || 0), 0)} / 6점 · 5점 이상 통과`;
    const tip = form.querySelector('[data-review-blockers]');
    const items = blockers.map(blocker => {
      const item = document.createElement('li');
      item.textContent = blocker;
      return item;
    });
    tip.replaceChildren(...items);
    tip.hidden = !blockers.length;
    pass.disabled = Boolean(blockers.length);
  }

  function showError(form, message) {
    const error = form.querySelector('.review-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    error.focus();
  }

  document.addEventListener('input', event => {
    const form = event.target.closest('#role-review');
    if (form) refresh(form);
  });

  root.HaveUserReviewUI = { queue, detail, read, refresh, showError };
})(globalThis);
