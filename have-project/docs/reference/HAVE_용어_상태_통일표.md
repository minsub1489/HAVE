> **참고용 사본입니다.** 원본은 작성자 PC의 `1118/00_통일기준`에 있던 문서이고(2026-11-23 수정본), 용어 · 상태 · 코드 값 · 오퍼레이션 명명 규칙을 한곳에서 찾아보려고 넣었습니다.
> 내용이 `팀원공유용_v3`의 문서와 다르면 **`팀원공유용_v3`가 우선**입니다. 코드 값의 기준은 DB 문서 부록 A와 `have-server/src/main/java/have/common/code`입니다.

# HAVE 용어 · 상태 · 코드 통일표

2026-11-18 작성 · 2026-11-23 수정(7절 오퍼레이션 명명 규칙 추가) · 1104·1109·1116 산출물을 서로 맞추기 위한 기준 문서. 1118의 모든 수정본은 이 표를 따른다.

기준을 고른 원칙은 두 가지다. 폭포수 모델이므로 **가장 나중 단계의 결정**(1116 HCI 프로토타입, DB 설계)을 앞 단계에 반영한다. 유스케이스 번호와 클래스 이름처럼 이미 여러 문서가 같이 쓰는 것은 **바꾸지 않는다**.

## 1. 유스케이스 (UC01~UC10, 추가 없음)

| 번호 | 이름 | 주 액터 | 서브시스템 |
| --- | --- | --- | --- |
| UC01 | AI 작업 및 사용 내역 등록 | 작성자 | 02 Work |
| UC02 | 결과물 및 근거자료 등록 | 작성자 | 02 Work |
| UC03 | 위험 분석 및 검토 요청 (이해 확인 답변 제출까지 포함) | 작성자 | 03 Review |
| UC04 | 결과물 검토 및 피드백 | 검토자 | 03 Review |
| UC05 | 결과물 수정 및 재제출 | 작성자 | 02 Work |
| UC06 | 최종 승인 및 반려 | 최종 승인자 | 04 Approval |
| UC07 | 승인 증명서 조회 및 공유 | 작업 구성원 | 05 Certificate |
| UC08 | 승인 증명서 진위 검증 | 외부 검증자 | 06 Verification |
| UC09 | 승인 이력 및 상태 조회 | 작업 구성원 | 07 Audit |
| UC10 | 승인 철회 | 최종 승인자 | 04 Approval |

이해 확인(Understanding Gate 답변 제출)은 유스케이스를 새로 만들지 않고 UC03의 흐름에 넣는다. 같은 작성자가 검토 요청 직후 이어서 하는 일이고, 프로토타입도 이 화면을 "UC03 후속"으로 표기했다.

## 2. 클래스 이름

통합 클래스 다이어그램(`HAVE_클래스다이어그램_패턴적용_v2`)의 이름이 기준이다. 1104의 UC별 다이어그램에 쓰인 다른 이름은 아래처럼 읽는다.

| 1104 UC별 다이어그램의 이름 | 통일 이름 | 쓰인 곳 |
| --- | --- | --- |
| Version, ResultVersion, VersionSnapshot | WorkVersion | UC01·02·04·05·06 |
| WorkResult | Work | UC04·05 |
| EvidenceMaterial | EvidenceItem | UC04 |
| AIUsageRecord | AiDisclosure + AiToolUsage | UC04 |
| RevisionRequest | Revision | UC04·05 |
| Receipt | Certificate | UC06·10 |
| ApprovalHistory | AuditEvent | UC09 |
| VerifyResult | VerificationResult | UC08 |
| ReviewSnapshot | Review (판정 확정 후 불변, reviewDigest) | UC06·10 |
| Reviewer, Author, Verifier (User 하위 클래스) | User + WorkMember.role | UC04·05·08 |
| NotificationService, Notifier | NotificationGateway (INotification) | UC04·05 |
| IntegrityService, HashService, FileValidator | VersionService의 파일 검사·해시 계산 | UC04·05 |
| FileStoragePort | FileStore (IFileStore) | UC02 |

## 3. 상태 코드

### 3.1 작업 버전 — `WorkVersion.status` (`IWorkVersion.setWorkStatus`가 바꾸는 값)

| 코드 | 화면 표기 | 의미 | 들어오는 사건 |
| --- | --- | --- | --- |
| DRAFT | 작성 중 | 작업 생성, 파일 등록 전 | UC01 createWork |
| SUBMITTED | 제출 완료 | 파일·해시 확정, 검토 요청 전 | UC02 uploadVersion 성공 |
| CHALLENGE_PENDING | 이해 확인 대기 | 검토 요청 접수, 과제 배정, 작성자 답변 대기 | UC03 requestReview |
| REVIEW_PENDING | 검토 대기 | 답변 제출 완료, 검토자 열람 대기 | UC03 submitAnswers, UC05 resubmit(새 버전) |
| IN_REVIEW | 검토 중 | 검토자 열람(해시 일치), 버전 잠금 | UC04 startReview |
| REVISION_REQUIRED | 수정 요청 | 검토자 수정 요청 또는 최종 승인자 반려 | UC04 requestRevision, UC06 reject |
| APPROVAL_PENDING | 승인 대기 | 검토 통과 | UC04 submitReview |
| APPROVED | 승인 완료 | 최종 승인 | UC06 approve |

폐기된 상태 다이어그램의 값은 이렇게 대응한다: DRAFTING → DRAFT·SUBMITTED·CHALLENGE_PENDING, PENDING → REVIEW_PENDING, UNDER_REVIEW → IN_REVIEW, REVISION → REVISION_REQUIRED, APPROVED → APPROVED. REVOKED와 NEXT_VERSION은 작업 상태가 아니라 승인 효력이다(3.2).

### 3.2 그 밖의 상태

| 대상 | 값 | 비고 |
| --- | --- | --- |
| 승인 효력 (저장하지 않고 계산) | VALID 승인 유효 / REVOKED 승인 철회 / PREVIOUS 이전 버전 승인 / NONE 승인 기록 없음 | Revocation 유무와 후속 버전 유무로 계산. 화면 전용 값 UNKNOWN(확인 불가) |
| ReviewRequest.state | REQUESTED / IN_REVIEW / CLOSED / CANCELED | |
| Review.state | IN_PROGRESS / COMPLETED / HALTED | HALTED = 해시 불일치로 검토 중지 |
| Feedback.decision | PASS / REVISION_REQUIRED | 화면의 "검토 결과" = Review.state + decision |
| Revision.state | OPEN / IN_PROGRESS / SUBMITTED / EXPIRED | UC05의 RESUBMITTED는 SUBMITTED로 통일 |
| ApprovalCase.state | PENDING / REJECTED / APPROVED | |
| Certificate.signingState | PENDING 발급 중 / READY 발급 완료 / FAILED 발급 실패 | |
| OutboxEvent.deliveryState | PENDING / DELIVERED / FAILED | |
| VerificationResult | signature PASS·FAIL·UNKNOWN / effect VALID·REVOKED·PREVIOUS·UNKNOWN / file MATCH·DIFFERENT·NOT_CHECKED | 화면 표기: 정상·검증 실패·확인 불가 / 파일 일치·불일치·미확인 |

1104의 UC07·08·09가 각자 다르게 쓴 `CertStatus`(VALID·REVOKED·EXPIRED, DRAFT·IN_REVIEW·…)는 쓰지 않는다. 증명서 발급 상태, 승인 효력, 작업 상태를 위 표처럼 따로 둔다.

## 4. 그 밖의 코드 값

| 항목 | 값 | 화면 표기 |
| --- | --- | --- |
| WorkMember.role | AUTHOR / REVIEWER / APPROVER | 작성자 / 검토자 / 최종 승인자 |
| Contribution.stage | IDEA / DRAFT / REVISION / SOURCE_VERIFICATION | 기획 / 초안 / 수정 / 검증 |
| Contribution.actorType | AI / HUMAN / MIXED | AI / 사람 / AI+사람 |
| EvidenceItem.type | WEB_SOURCE / REFERENCE / PROMPT_LOG / SUPPORT_FILE | URL / 참고 문헌 / 프롬프트 기록 / 파일 |
| Challenge.kind | TEACH_BACK / FAULT_INJECTION / WHAT_IF | 설명하기 / 오류 찾기 / 조건 바꾸기 |
| ChallengeResponse.confidence | LOW / MEDIUM / HIGH | 낮음 / 보통 / 높음 |
| 위험 등급 (계산) | LOW 0~3 / MEDIUM 4~6 / HIGH 7~10 | 낮음 / 보통 / 높음 |
| Notification.type | REVIEW_REQUESTED, REQUEST_CANCELED, ANSWERS_SUBMITTED, REVISION_REQUESTED, RESUBMITTED, REVIEW_PASSED, APPROVED, REJECTED, CERTIFICATE_ISSUED, APPROVAL_REVOKED | 5절 참조 |

## 5. 등급별 이해 과제와 통과 기준 (GatePolicy · GateStrategy)

위험 점수는 4개 지표의 합(0~10)이다: AI 사용 비중 0~3, 중요도 0~3, 검증 근거 부족 0~2, 과거 실패 0~2. 등급 경계 4와 7은 프로젝트 계획서 17쪽과 DB의 `GATE_POLICY`가 같은 값이다.

| 등급 | 전략 클래스 | 과제 | 통과 기준 (과제당 0~2점) |
| --- | --- | --- | --- |
| LOW (0~3) | LowRiskGate | TEACH_BACK 1개 | 2점 / 2점 |
| MEDIUM (4~6) | MediumRiskGate | TEACH_BACK + WHAT_IF | 3점 / 4점 |
| HIGH (7~10) | HighRiskGate | TEACH_BACK + FAULT_INJECTION + WHAT_IF | 5점 / 6점 |

모든 등급에서 치명 오류(Evaluation.critical)가 하나라도 있으면 통과할 수 없다. HIGH의 5/6은 계획서에 있는 값이고, LOW와 MEDIUM의 기준은 프로토타입이 제안한 값이라 팀 확인이 필요하다.

## 6. 알림 규칙 (NotificationObserver)

| 사건 | 받는 사람 | 처리 |
| --- | --- | --- |
| 검토 요청 (→ CHALLENGE_PENDING) | 검토자 | 상태 옵서버 |
| 검토 요청 취소 | 검토자 | 상태 옵서버 |
| 이해 확인 답변 제출 (→ REVIEW_PENDING) | 검토자 | 상태 옵서버 |
| 수정 요청 (→ REVISION_REQUIRED) | 작성자 | 상태 옵서버 |
| 재제출 (새 버전 REVIEW_PENDING) | 검토자 | 상태 옵서버 |
| 검토 통과 (→ APPROVAL_PENDING) | 최종 승인자, 작성자 | 상태 옵서버 |
| 최종 승인 (→ APPROVED) | 작성자, 검토자 | 상태 옵서버 |
| 반려 (→ REVISION_REQUIRED) | 작성자, 검토자 | 상태 옵서버 |
| 증명서 발급 완료 | 작성자 | CertificateService → INotification |
| 승인 철회 | 작성자, 검토자 | ApprovalService → INotification (작업 상태가 바뀌지 않으므로 직접 호출) |

1109 서브시스템 정의서의 규칙(검토 요청 → 검토자, 보완 요청 → 작성자, 재제출·검토 통과 → 검토자·승인자)에 프로토타입이 보여 준 나머지 알림을 더했다.

## 7. 오퍼레이션 명명 규칙 (2026-11-23 추가)

강의 자료의 규칙이다(Ch06 23쪽 "오퍼레이션의 종류", 클래스 다이어그램 작성법 보조 7~9쪽, Ch10 9·11쪽 "명명 규칙"). 오퍼레이션은 소문자로 시작하고, 기본 유형은 정해진 접두어를 쓴다.

| 유형 | 접두어 | 강의 예 | HAVE 예 |
| --- | --- | --- | --- |
| 조건 체크 (참·거짓을 돌려줌) | is | `IsNullPhone()`, `isEquilateralTriangle()` | `isPassed`, `isAuthorized`, `isValid` |
| 속성 읽기 · 탐색 | get | `getShippingAddress()`, `getAllOrders()`, `getOrders(Date)` | `getVersionHash`, `getWorks`, `getById` |
| 속성 쓰기 · 입력 | set (put) | `putShippingAddress()`, `setCustomer()`, `setTitle()` | `setWorkStatus`, `setRead`, `put(key, file)` |
| 출력 | show | `showCustomer()`, `showPurchaseMade()` | (화면 출력은 클라이언트 View가 맡는다) |
| 객체 생성 · 소멸 | 클래스 이름 | `Customer(...)`, `~Customer()` | `DatabaseConnectionPool()` |
| 조작 (업무 동작) | 동사 | `makeOrder()`, `addToHoldings()`, `checkout()` | `approve`, `reject`, `revoke`, `submitReview`, `createShareLink`, `save`, `notify`, `update` |

조건 체크의 첫 글자는 Ch06이 대문자(`Is…`), Ch10이 소문자(`is…`)로 쓴다. "오퍼레이션은 소문자로 시작"이라는 Ch10의 코딩 표준에 따라 소문자로 통일했다.

### 바꾼 이름 35개

| 유형 | 이전 이름 → 새 이름 |
| --- | --- |
| 조건 체크 (10) | can → isAllowed · hasSuccessor → isSuperseded · passes → isPassed · authorize → isAuthorized · checkAllResolved → isAllResolved · existsByKey → isKeyUsed · checkOwnerAndEditable → isOwnerAndEditable · checkFile → isValidFile · validateUrl → isValidUrl · validateDisclosure → isValidDisclosure |
| 속성 읽기 · 탐색 (21) | canonicalHash → getCanonicalHash · publicSummary → getPublicSummary · currentUser → getCurrentUser · listWorks → getWorks · listRequests → getAssignedRequests · listNotifications → getNotifications · findById → getById · findBy → getByCondition · findByVersion → getByVersion · findPendingByReviewer → getPendingRequests · findByVersionId → getByVersionId · findActiveByVersion → getActiveByVersion · findByEmail → getByEmail · findMembers → getMembers · findByMember → getByMember · findVersion → getVersion · loadForUpdate → getForUpdate · toMessage → getMessage · resolveAddress → getAddress · chainHash → getChainHash · hashSha256 → getSha256 |
| 속성 쓰기 (4) | updateWorkStatus → setWorkStatus · updateDraft → setDraft · markSubmitted → setSubmitted · markRead → setRead |

조작 오퍼레이션 65개는 바꾸지 않았다. 옵서버의 `update(subject)`는 강의(Ch07 part2)의 표기 그대로다.
