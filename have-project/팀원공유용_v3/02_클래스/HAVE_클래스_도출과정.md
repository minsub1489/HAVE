# HAVE 클래스 도출 과정 — 유스케이스 문장에서 클래스 다이어그램까지

2026-11-23 · 기준: `01_유스케이스/HAVE_유스케이스_명세.md`의 기본 흐름(주어 보완판), 통합 클래스 다이어그램 v3 (11-23 팀원 피드백 반영: UC05 근거 변경 판정, VerificationResult의 최신 버전 번호) · 수업 자료: Ch06 요구 모델링 "클래스 다이어그램 작성법"(클래스 찾기 → 연관 찾기 → 속성 찾기)

통합 클래스 다이어그램의 클래스가 어디서 나왔는지를 강의의 세 단계로 다시 정리한 문서다. 새 클래스나 유스케이스를 만든 것이 아니라, 이미 있는 클래스를 유스케이스 문장의 명사·동사와 맞춰 본 것이다.

## 1. 출발 문장

유스케이스 명세의 기본 흐름 46단계를 쓴다(11-23에 UC05의 선택 단계 하나를 더함). 모든 단계는 "누가(주어) 무엇을(목적어) 한다(동사)"로 적혀 있다. 주어는 액터 또는 시스템이다.

| 유스케이스 | 대표 문장 |
| --- | --- |
| UC01 | **작성자**가 **제목**과 **AI 사용 신고**를 입력한다. **시스템**이 **작업**을 DRAFT로 저장한다. 작성자가 **기여 기록**을 추가한다 |
| UC02 | 작성자가 **결과물 PDF**를 선택한다. 시스템이 **SHA-256**을 계산하고 **버전**을 만든다. 작성자가 **근거자료**를 추가한다 |
| UC03 | 작성자가 **지표 점수**와 근거를 입력한다. 시스템이 **등급**을 정하고 **Gate 전략**을 고른다. 작성자가 **검토자**와 **최종 승인자**를 골라 **검토를 요청**한다. 시스템이 **이해 과제**를 배정한다. 작성자가 **답변**과 확신 정도를 제출한다 |
| UC04 | **검토자**가 **검토**를 시작한다. 검토자가 답변마다 **점수**·치명 오류 여부를 입력하고 **체크리스트** 4항목을 확인한다. 검토자가 검토 메모와 **보완 요청 항목**을 쓴다 |
| UC05 | 작성자가 **피드백**과 보완 기한을 확인한다. 작성자가 **수정 파일**과 변경 요약을 입력하고 피드백 항목마다 **답변**을 쓴다. (선택) 작성자가 **근거자료**와 **AI 사용 신고**를 고친다. 시스템이 **새 버전**을 만들고 **근거 변경**을 판정한다 |
| UC06 | **최종 승인자**가 **승인 조건**을 확인하고 **최종 승인**을 확정한다. 시스템이 **승인**·**증명서**·**발급 요청**을 한 트랜잭션으로 저장한다 |
| UC07 | **작업 구성원**이 증명서 탭을 연다. 작업 구성원이 **공유 링크**를 만들고 **QR**을 내려받는다. 더 쓰지 않을 링크는 **공유를 중지**한다 |
| UC08 | **외부 검증자**가 공개 검증 페이지에 들어온다. 시스템이 서명 검증, 승인 효력, 파일 해시 비교를 각각 **판정**하고 **최신 버전** 여부를 함께 보여 준다 |
| UC09 | 작업 구성원이 작업 목록과 현재 상태를 본다. 시스템이 행위자·행동·버전·시각·사유(**이력**)를 보여 주고 **해시 체인**을 확인한다. 작업 구성원이 **알림**을 연다 |
| UC10 | 최종 승인자가 **승인 철회**를 고르고 사유를 입력한다. 시스템이 **철회 기록**을 저장한다 |

## 2. 클래스 찾기 — 명사를 뽑고 지운다

### 2.1 뽑은 명사 (클래스 후보)

작성자, 검토자, 최종 승인자, 작업 구성원, 외부 검증자, 시스템, 작업, 제목, AI 사용 신고, 도구, 모델, 사용 방식, 사용 범위, 기여 기록, 기여 타임라인, 결과물 PDF, 파일, SHA-256(해시), 버전, 버전 번호, AI 신고 사본, 근거자료, 지표 점수, 근거, 합계, 등급, Gate 전략, 메시지, 기한, 검토 요청, 위험 분석, 이해 과제, 답변, 확신 정도, 검토, 점수, 치명 오류, 체크리스트 항목, 검토 메모, 보완 요청 항목, 피드백, 반려 사유, 수정 파일, 변경 요약, 반영 여부, 새 버전, 재검토 요청, 승인 조건, 확인 창, 권한, 멱등성 키, 승인, 증명서, 발급 요청, 트랜잭션, 증명서 탭, 발급 상태, 승인 효력, 공유 링크, 만료일, QR, 공개 검증 페이지, 기기, 판정, 확인 시각, 측면 패널, 작업 목록, 현재 상태, 이력 탭, 필터, 이력(행위자·행동·시각·사유), 승인 철회, 철회 기록, 알림

### 2.2 지운 명사

| 지운 이유 (강의 기준) | 명사 | 처리 |
| --- | --- | --- |
| 중복 클래스 | 작성자 · 검토자 · 최종 승인자 · 작업 구성원 | 같은 사람이 작업마다 다른 역할을 맡는다. `User` 하나로 두고 역할은 `WorkMember.role`에 둔다 |
| 중복 클래스 | 결과물 PDF · 파일 · 수정 파일 · 새 버전 · 승인 버전 · 대상 버전 | 모두 `WorkVersion`이다 |
| 중복 클래스 | AI 사용 신고 · AI 신고 사본 | `AiDisclosure` (버전을 만들 때 사본을 고정) |
| 중복 클래스 | 위험 분석 · 지표 점수 · 등급 | `RiskAssessment` |
| 중복 클래스 | 재검토 요청 | `ReviewRequest`의 새 건이다 |
| 관계 없는 클래스 (시스템이 저장할 대상이 아님) | 시스템, 기기, 측면 패널, 확인 창, 증명서 탭, 이력 탭, 공개 검증 페이지, 작업 목록, 필터 | 화면 요소다. 도메인 클래스가 아니라 클라이언트의 화면 클래스(패키지 다이어그램 레벨 3의 00 클라이언트)로 간다 |
| 관계 없는 클래스 | 외부 검증자 | 로그인하지 않으므로 저장하지 않는다 |
| 불확실한 클래스 (요구 사항 · 제약) | 권한, 승인 조건, 멱등성, 트랜잭션 | 클래스가 아니라 지켜야 할 규칙이다. 권한은 `AuthorizationPolicy`의 판단으로, 멱등성은 `decisionKey` · `requestKey` 속성으로 반영했다 |
| 속성으로 내림 | 제목, 버전 번호, SHA-256, 근거, 합계, 메시지, 기한, 확신 정도, 점수, 치명 오류, 검토 메모, 변경 요약, 반영 여부, 반려 사유, 만료일, 발급 상태, 확인 시각 | 3절의 클래스에 속성으로 넣었다 |
| 계산해서 보여 주는 값 | 기여 타임라인, 현재 상태, 승인 효력 | 저장하지 않고 조회할 때 만든다 |

### 2.3 남은 클래스

| 유스케이스 문장의 명사 | 클래스 |
| --- | --- |
| 사용자(작성자 · 검토자 · 최종 승인자), 작업별 역할 | User, WorkMember |
| 작업, 버전 | Work, WorkVersion |
| AI 사용 신고, 도구 · 모델 | AiDisclosure, AiToolUsage |
| 기여 기록, 근거자료 | Contribution, EvidenceItem |
| 위험 분석(등급), Gate 전략 | RiskAssessment, GatePolicy · GateStrategy |
| 검토 요청, 이해 과제, 답변 | ReviewRequest, Challenge, ChallengeResponse |
| 검토, 답변 평가(점수), 체크리스트 항목 | Review, Evaluation, ChecklistItem · ReviewCheck |
| 피드백, 보완 요청 항목, 피드백 답변 | Feedback, FeedbackItem, FeedbackResponse |
| 수정(보완 회차) | Revision |
| 최종 결정, 승인, 철회 기록 | ApprovalCase, Approval, Revocation |
| 발급 요청, 증명서 | OutboxEvent, Certificate |
| 공유 링크, QR | ShareLink, QRCode (QR은 저장하지 않는 값 객체) |
| 판정(서명 · 효력 · 파일) | VerificationResult (저장하지 않음) |
| 이력, 알림 | AuditEvent, Notification |

## 3. 연관 찾기 — 동사에서 연관과 오퍼레이션을 찾는다

| 문장 (주어 + 동사) | 연관 | 오퍼레이션 (컴포넌트 인터페이스) |
| --- | --- | --- |
| 작성자가 작업을 등록한다 | User — WorkMember — Work | `createWork(title, aiDisclosure)` |
| 작성자가 기여 기록을 추가한다 | WorkVersion — Contribution | `addContribution(versionId, event)` |
| 작성자가 결과물 PDF를 등록한다 | Work — WorkVersion, WorkVersion — AiDisclosure | `uploadVersion(workId, file, reason)` |
| 작성자가 근거자료를 추가한다 | WorkVersion — EvidenceItem | `addEvidence(versionId, evidence)` |
| 시스템이 등급을 정한다 | WorkVersion — RiskAssessment | `assessRisk(versionId, scores, rationale)` |
| 작성자가 검토를 요청한다 | WorkVersion — ReviewRequest — User(검토자 · 최종 승인자) | `requestReview(versionId, reviewerId, approverId, message, dueDate)` |
| 시스템이 이해 과제를 배정한다 | ReviewRequest — Challenge | `getChallenges(requestId)` |
| 작성자가 답변을 제출한다 | Challenge — ChallengeResponse | `submitAnswers(requestId, answers)` |
| 검토자가 검토를 시작한다 | ReviewRequest — Review | `startReview(requestId)` |
| 검토자가 점수를 입력하고 체크리스트를 확인한다 | ChallengeResponse — Evaluation, Review — ReviewCheck | `saveReviewDraft(requestId, form)` |
| 검토자가 검토 통과 또는 수정 요청을 고른다 | Review — Feedback — FeedbackItem | `submitReview(requestId, form)`, `requestRevision(requestId, feedbacks, dueDate)` |
| 작성자가 재제출한다 | Revision — WorkVersion(새 버전), FeedbackItem — FeedbackResponse | `resubmit(workId, file, responses, basis)` |
| 시스템이 근거 변경을 판정한다 (11-23) | WorkVersion(직전) — WorkVersion(새 버전)의 EvidenceItem · AiDisclosure 비교 | `isBasisChanged(base, next): Boolean` (조건 체크라 is로 시작) |
| 최종 승인자가 승인 또는 반려한다 | WorkVersion — ApprovalCase — Approval | `approve(caseId, key)`, `reject(caseId, reason, key)` |
| 시스템이 증명서를 발급한다 | Approval — Certificate, Approval — OutboxEvent | `retryIssue(certId)` (재시도) |
| 작업 구성원이 공유 링크를 만든다 | Certificate — ShareLink | `createShareLink(certId, expiresAt)`, `createQRCode(certId)` |
| 작업 구성원이 공유를 중지한다 (11-23) | Certificate — ShareLink | `disableShareLink(linkId)` (업무 동작이라 동사로 시작) |
| 외부 검증자가 증명서를 검증한다 | VerificationResult ⇢ Certificate · Approval (의존) | `verify(certId, fileHash?)` |
| 작업 구성원이 이력을 본다 | Work — AuditEvent | `getHistory(workId, condition)`, `getLatestStatus(workId)`, `isChainValid(workId): Boolean` (11-23, 조건 체크라 is로 시작) |
| 작업 구성원이 알림을 열어 읽는다 (11-23) | User — Notification | `getNotifications(userId)`, `setRead(notificationId)` (속성 쓰기라 set으로 시작) |
| 최종 승인자가 승인을 철회한다 | Approval — Revocation | `revoke(approvalId, reason, key)` |

문장에 드러나지 않지만 필요한 연관도 있다. 상태가 바뀔 때 이력과 알림이 남아야 하므로 WorkVersion의 상태 변경과 AuditEvent · Notification을 옵서버로 이었다(디자인 패턴 문서 7장). 다중도와 방향은 통합 클래스 다이어그램 v3에 있다.

## 4. 속성 찾기

2.2에서 속성으로 내린 명사를 클래스에 배치했다.

| 클래스 | 문장에서 온 속성 |
| --- | --- |
| Work | 제목(title) |
| WorkVersion | 버전 번호, 파일 해시(SHA-256), 변경 사유, 상태(status) |
| RiskAssessment | 지표 점수 4개, 근거, 합계, 등급 |
| ReviewRequest | 메시지, 기한, 상태 |
| ChallengeResponse | 답변, 확신 정도(confidence) |
| Evaluation | 점수(0~2), 근거, 치명 오류 여부 |
| Review | 검토 메모, 상태 |
| Revision | 보완 기한, 변경 요약, 상태 |
| FeedbackResponse | 반영 여부, 답변 |
| ApprovalCase | 결정 상태, 반려 사유, 멱등성 키(decisionKey) |
| Revocation | 철회 사유, 멱등성 키(requestKey) |
| Certificate | 발급 상태, 서명 |
| ShareLink | 만료일(expiresAt), 토큰 해시 |
| VerificationResult | 승인 효력, 최신 버전 번호(11-23), 서명 검증, 파일 비교, 확인 시각 |
| AuditEvent | 행위자, 행동, 버전, 시각, 사유 |

이 속성과 연관을 그려 넣은 결과가 통합 클래스 다이어그램 v3(`HAVE_클래스다이어그램_패턴적용_v3_수정표시.png`)다.
