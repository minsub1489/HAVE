# 설계 변경 기록

폭포수 모델이므로 구현하면서 설계와 달라진 점은 여기에 적고, 마감 뒤 해당 산출물(`팀원공유용_v3`의 다음 판)에 반영합니다. **개발 중에는 `팀원공유용_v3`를 고치지 않습니다.**

- 설계서에 없는 클래스 · 오퍼레이션 · 열 · 코드 값을 더하거나, 있는 것을 바꾸거나 빼면 **그 PR에서** 아래 표에 한 줄을 더합니다.
- 유스케이스는 늘리지 않습니다(UC01~UC10). 새 오퍼레이션 이름은 `is` · `get` · `set` · `show` 규칙을 따릅니다(업무 동작은 동사).
- "반영" 칸은 산출물을 실제로 고친 뒤 날짜로 바꿉니다.
- **1단계(각자 작업, 11/30 18시까지)에는 이 파일을 고치지 않습니다.** 자기 `docs/phase1/<담당>.md`에 적으면 통합 때 팀장이 옮깁니다(같은 자리에 네 명이 행을 더하면 번호가 겹치기 때문입니다).

## 1. 기록

### 1.1 이미 코드에 들어간 것 (11/28 뼈대와 계약)

| 번호 | 날짜 | 무엇을 추가 · 변경 | 이유 | 고쳐야 할 산출물 | 반영 |
| --- | --- | --- | --- | --- | --- |
| 1 | 11/28 | 테이블 이름을 소문자로 씀(`work_version`). `USER`는 `"user"`로 큰따옴표를 붙임 | PostgreSQL은 따옴표 없는 이름을 소문자로 바꾸고, `user`는 예약어 | DB 문서에 구현 표기 한 줄 | 미반영 |
| 2 | 11/28 | 기본값 0: `work_version.revision`, `outbox_event.retry_count` | 행을 만들 때 값이 정해져 있음. DB 문서 6단계에는 기본값 표기가 없음 | DB 문서 6단계 | 미반영 |
| 3 | 11/28 | 기본값 빈 문자열: `review.memo`, `revision.change_note`, `revision.response` | NOT NULL인데 행이 생길 때(검토 시작, 수정 요청)에는 아직 내용이 없음 | DB 문서 6단계 | 미반영 |
| 4 | 11/28 | `review.review_digest`를 NULL 허용으로 | 검토를 시작할 때 행이 생기고 결정이 끝나야 해시가 생김 | DB 문서 6단계, 클래스 v3의 Review | 미반영 |
| 5 | 11/28 | 스키마 파일을 6개로 나눔. 수정 회차 3개 테이블(REVISION · REVISION_DRAFT_FILE · FEEDBACK_RESPONSE)은 `05_revision.sql` | REVISION이 REVIEW와 APPROVAL_CASE를 참조해서 그 뒤에 만들어야 함. DB 문서의 묶음은 5개 | 없음(구현 배치) | — |
| 6 | 11/28 | 제약 이름 규칙 `pk_` · `fk_<테이블>_<열>` · `ck_<테이블>_<열>` · `uq_…` | 오류 메시지에서 어느 제약인지 알아보려고 | 없음(구현 표기) | — |
| 7 | 11/28 | 코드 값 enum 10개의 타입 이름: `MemberRole`, `ContributionStage`, `ActorType`, `RiskLevel`, `ChallengeKind`, `DecisionState`, `SigningState`, `DeliveryState`, `ApprovalEffect`, `AuditAction` | 값은 DB 문서 부록 A에 있으나 클래스 v3의 열거형 상자는 8개뿐(`DecisionState`는 속성 형식으로만 나옴) | 클래스 v3의 열거형 | 미반영 |
| 8 | 11/28 | 인터페이스가 주고받는 값 객체 9개: `ReviewTarget`, `ConfirmedResult`, `ApprovalResult`, `ApprovalValidity`, `CertificateData`, `AuditPayload`, `Credential`, `AuthAction`, `StatusChange`의 필드 구성 | 설계서의 오퍼레이션에 반환형과 매개변수 형식이 적혀 있지 않음(`StatusChange`는 패턴 문서 7장에 이름만 있음) | 클래스 v3, 컴포넌트 표 | 미반영 |
| 9 | 11/28 | 공통 기반 클래스 6개(`have.common`): `ApiError`, `ApiException`, `ApiExceptionHandler`, `HashTool`, `CanonicalJson`, `HealthController` | REST 오류 형식, 해시 · 키 정렬 JSON을 한 곳에서 계산 | 패키지 다이어그램(공통), 서버 타입 수 | 미반영 |
| 10 | 11/28 | `ReviewTarget`에 `currentFileHash`(저장된 파일을 다시 계산한 해시)를 둠 | 검토 시작과 승인 때의 위 · 변조 확인. 파일을 읽을 수 있는 곳이 02뿐이라 02가 계산해 돌려줌(가이드라인 4.8의 "누가 계산하는가") | UC04 · UC06 순서 다이어그램 | 미반영 |
| 11 | 11/28 | 확장 프로그램 `app.js`를 화면별 파일 12개로 나눔(`scripts/screens/*.js`, `start.js`). 동작은 그대로 | 네 명이 같은 파일을 고치지 않게 | 패키지 다이어그램 레벨 3(파일 이름을 적었다면) | 미반영 |
| 12 | 11/28 | `IWorkVersion.setWorkStatus(workId, status, reason)` 오버로드 | 패턴 문서 7장의 표는 취소 · 수정 요청 · 반려에서 "이벤트 · 사유 기록"이라고 하는데 `setWorkStatus(workId, status)`에는 사유를 넘길 자리가 없음 | 컴포넌트 표(IWorkVersion), 클래스 v3, 패턴 문서 7장 예제 | 미반영 |
| 13 | 11/28 | `IAuthorization.getMembers(workId, role)`, `setMember(workId, role, userId)` 추가. `addMember`는 REVIEWER · APPROVER에 다른 사람이 이미 있으면 409 | 02가 `StatusChange`에 검토자 · 최종 승인자를 채우고, v1을 다시 요청할 때 지정을 바꾸기 위해(열린 항목 2 · 18의 결정) | 컴포넌트 표(IAuthorization), 클래스 v3(AuthorizationPolicy), UC03 순서 다이어그램(멤버 등록 부분) | 미반영 |
| 14 | 11/28 | 검토자 · 최종 승인자는 작업마다 한 명. v1의 검토 요청에서 정하고 v2부터는 그대로(v1 취소 뒤 다시 요청할 때만 변경). `work_member`에 조건부 유니크 인덱스 `uq_work_member_designated` | 최종 승인자가 `WORK_MEMBER`에만 있어 버전마다 다르면 지정 승인자를 알 수 없고, 02가 알림 받을 사람을 찾을 수 없음(열린 항목 2 · 18의 결정) | UC03 명세(검토자 · 승인자 선택 단계와 취소 뒤 다시 요청), UC02 명세(새 버전의 검토 요청), DB 문서(WORK_MEMBER 제약, "제약을 지키는 위치" 표), 패턴 문서 7장(`StatusChange`를 채우는 방법) | 미반영 |
| 15 | 11/28 | `IAuthorization.getWorkIds(userId, role)`, `getUsers(keyword)` 추가 | 작업 목록(A6)이 구성원인 작업을 찾고, 검토자 · 승인자를 고를 목록이 필요함. 02가 01의 `work_member`를 직접 읽지 않게 | 컴포넌트 표(IAuthorization), 클래스 v3(AuthorizationPolicy), UC03 · UC09 순서 다이어그램 | 미반영 |
| 16 | 11/28 | `IWorkVersion.createRevision(versionId, reviewId, caseId, dueDate)` 추가 | 수정 요청(03)과 반려(04)가 02의 REVISION 테이블을 직접 쓰지 않게. 1.1.0의 `openRevision`(수정 시작)과는 다른 일 | 컴포넌트 표(IWorkVersion), 클래스 v3(RevisionService), UC04 · UC06 순서 다이어그램 | 미반영 |
| 17 | 11/28 | `ReviewTarget`에 `latestVersionNo` · `fileName` · `noAiUsed` 추가 | 승인 효력의 최신 버전 번호(04 · 06), 증명서의 파일 이름(05), 위험 분석의 AI 미사용 처리(03)를 02의 테이블을 읽지 않고 얻기 위해 | 클래스 v3(값 객체를 그린다면) | 미반영 |
| 18 | 11/28 | `TokenService`(createToken · getExpiresAt · getCurrentUserId) 추가. 토큰 구현 · 인터셉터 · `AuthController`는 D, 비밀번호 확인과 사용자 정보는 B의 `AuthorizationPolicy` | 설계서에는 "토큰 확인"으로만 나옴. 1단계에 B와 D가 서로 묻지 않고 일하도록 경계를 정함 | 클래스 v3(01 Auth), 패키지 레벨 3 | 미반영 |
| 19 | 11/28 | 저장 대응 `TableMapping` 추가, `IPersistence.delete` 추가, `StubPersistence` 구현, 저장 계약을 담당별 하위 패키지(`have.persistence.work` 등)에 두기 | 엔티티 ↔ 테이블 대응을 두 저장 구현이 같은 방식으로 쓰게 하고(행 값 형식 고정), 지정 변경(`setMember`) 때 행을 지우기 위해 | 클래스 v3(08 Persistence), 디자인 패턴 문서 5장(브리지의 Implementor 연산), 패키지 레벨 3 | 미반영 |
| 20 | 11/28 | 공용 대역 `PlaceholderConfiguration`(인터페이스 구현이 없을 때만 들어가는 빈) | 1단계에 각자 브랜치에서 서버와 테스트가 뜨게 하려고. 진행용이라 2단계가 끝나면 지움(D17) | 없음(진행용, 지운 뒤 반영할 것 없음) | — |

### 1.2 구현하면 더하게 될 것 (가이드라인 10.2)

REST로 만들면 필요한데 v3 설계서에 없는 것입니다. 구현한 사람이 날짜를 적고 1.1로 옮깁니다(1단계에는 자기 메모에). 사용자 찾기(`getUsers`)와 토큰(`TokenService`)은 계약으로 먼저 넣어 1.1로 옮겼습니다.

| 번호 | 무엇을 추가 | 이유 | 고쳐야 할 산출물 | 담당 |
| --- | --- | --- | --- | --- |
| 21 | 진입점 6개: `AuthController`, `ApprovalController`, `CertificateController`, `VerificationController`, `HistoryController`, `NotificationController` | Controller가 02(4개)와 03(2개)에만 있음 | 클래스 v3 아래 패널 ⑤, 패키지 레벨 3, 구조유형 5절, 서버 타입 수(79개) | D(Auth · Notification) · C(Approval · Certificate · Verification · History) |
| 22 | `IWorkAPI.getVersionFile(versionId)` — `GET /api/versions/{versionId}/file` | 검토자 · 승인자가 결과물 PDF를 여는 방법 | 컴포넌트 표, UC04 · UC06 순서 다이어그램 | A |
| 23 | `IReviewAPI.getReviewRequest(versionId)` — `GET /api/versions/{versionId}/review-request` | 버전 ID로 검토 요청을 찾는 조회 | 컴포넌트 표 | B |
| 24 | `ICertificateAPI.getCertificate`에 승인 ID 조회 — `GET /api/certificates?approvalId=` | 승인 ID로 증명서를 찾는 조회 | 컴포넌트 표 | C |
| 25 | 서명 작업자(Outbox 처리기) 클래스, 토큰 구현 · 인터셉터 클래스(계약은 1.1의 18번) | 순서 다이어그램에 "서명 작업자"로만 나옴 | 클래스 v3, 패키지 레벨 3 | C · D |
| 26 | `INotification` 사용처에 05 Certificate 추가 | 발급 완료 알림(`CERTIFICATE_ISSUED`)을 05가 보냄 | 컴포넌트 표 | C · D |

## 2. 설계서에 답이 없던 것 (열린 항목) — 모두 결정

설계서에 답이 없거나 서로 다른 곳입니다. **11/28에 팀장이 모두 결정했습니다.** 1단계에는 이 결정대로 하고, 바꿀 필요가 생기면 `docs/phase1/<담당>.md`에 적어 통합 때 정합니다. `docs/api.md`도 이 결정대로 적혀 있습니다.

| 번호 | 무엇 | 결정한 내용 | 당사자 | 결정 |
| --- | --- | --- | --- | --- |
| 1 | `APPROVAL_CASE(PENDING)` 행을 언제 만드는가. UC04 · UC06 순서 다이어그램에 만드는 메시지가 없음 | 04가 승인 건을 처음 조회할 때 만듦(03이 04의 테이블을 쓰지 않게) | C |**11/28 결정** — 이대로 |
| 2 | 버전별 지정 최종 승인자를 어디에 두는가. `REVIEW_REQUEST`에는 `reviewer_id`만 있고 승인자는 `WORK_MEMBER(APPROVER)`뿐 | 한 작업의 최종 승인자는 한 명. 이미 다른 승인자가 있는 작업에 다른 사람을 지정하면 409. 승인 가능 = APPROVER 멤버이고 작성자 · 그 버전의 검토자가 아님. 철회 가능 = 그 승인을 한 사람(`APPROVAL.approver_id`) | B · C |**11/28 결정** — 권장안대로. 검토자도 같은 규칙. v1의 검토 요청을 취소하고 다시 요청할 때만 바꿀 수 있음(1.1의 13 · 14번, 가이드라인 5.4) |
| 3 | 파일 이름을 어디에 두는가. `WORK_VERSION` · `EVIDENCE_ITEM`에 파일 이름 열이 없음 | 저장 키(`file_uri`)의 마지막 구간에 원래 이름을 둠. `file_uri`는 응답에 싣지 않음 | A |**11/28 결정** — 이대로 |
| 4 | AI 사용 신고 화면(도구·모델 한 칸 + 사용 방식 선택)을 `AI_TOOL_USAGE`의 4개 열에 어떻게 담는가 | `tool_name` = 입력값, `model_name` = 같은 값, `usage_method` = 고른 사용 방식을 쉼표로 이은 값, `contribution` = 빈 문자열 | A |**11/28 결정** — 이대로 |
| 5 | 검토 화면의 메모 한 칸을 `REVIEW.memo` · `FEEDBACK.comment` · `FEEDBACK.evaluation_summary`에 어떻게 담는가 | 메모를 `memo`와 `comment`에 같이 넣고 `evaluation_summary`는 서버가 `총점/만점 · 치명 오류 …`로 만듦 | B |**11/28 결정** — 이대로 |
| 6 | 증명서 내용(`immutable_payload`)에 넣을 키 | 1.1.0과 같은 구성: certificateId, workId, title, versionId, n, fileName, fileHash, approver, approvedAt, reviewer, reviewDigest | C |**11/28 결정** — 이대로 |
| 7 | 새 버전 등록 때 "이전 승인의 증명서가 발급 중이면 거절". 02가 05의 상태를 알아야 함 | 02가 05를 부르지 않도록, 화면이 증명서 상태를 확인해 막고 서버는 이 확인을 하지 않음 | A · C |**11/28 결정** — 이대로 |
| 8 | 알림 목록의 작업 제목 · 버전 번호. `NOTIFICATION`에는 `version_id`뿐이고 07은 02의 테이블을 읽지 않음 | 서버는 `versionId`만 주고 클라이언트가 작업 목록에서 찾음(`api.md` 10.1) | D · A |**11/28 결정** — 이대로 |
| 9 | 로그인 토큰의 형식과 유효 시간 | 서버가 HMAC으로 서명한 토큰(사용자 ID + 만료 시각), 12시간 | D | **11/28 결정** — D가 만든다(D19). HMAC 서명, 12시간 |
| 10 | 검토 요청 취소 사유, 검토 중지 사유를 어디에 두는가. `REVIEW_REQUEST` · `REVIEW`에 사유 열이 없음 | 감사 이력의 `reason`에만 남김 | B |**11/28 결정** — 이대로 |
| 11 | 공유 링크를 만든 시각. `SHARE_LINK`에 생성 시각 열이 없음 | 화면에 필요하면 이력(`SHARE_LINK_CREATED`)의 시각을 씀 | C |**11/28 결정** — 이대로 |
| 12 | 반려로 열린 수정 회차의 보완 기한 | 기한 없음(`REVISION.due_date`가 NULL) | C · A |**11/28 결정** — 이대로 |
| 13 | 반려로 열린 회차의 답변. 보완 항목이 없어 `FEEDBACK_RESPONSE`에 넣을 수 없음 | `REVISION.response`에 넣음 | A |**11/28 결정** — 이대로 |
| 14 | `REVISION.base_version_id`. DB 문서 "수정본 재제출 때의 행"에는 나오지만 최종 스키마에 없음 | 최종 스키마를 따름. 수정 전 버전은 REVISION → REVIEW → REVIEW_REQUEST.version_id(반려면 APPROVAL_CASE.version_id)로 찾음 | A · B |**11/28 결정** — 이대로 |
| 15 | 근거자료 등록. 컴포넌트 표는 `addEvidence` 하나, 클래스 v3은 `addWebSource` · `addSupportFile` 둘, DB는 유형 4종 | `addEvidence` 하나로 받고 유형으로 구분 | A |**11/28 결정** — 이대로 |
| 16 | ApiClient의 위치. 구조유형 3절은 서비스 워커, 패키지 레벨 3은 "background · common-ui" | 측면 패널 페이지에서 직접 호출(파일 업로드 때문). 서비스 워커는 배지 갱신에만 같은 모듈 사용 | D |**11/28 결정** — 이대로 |
| 17 | 공유 링크를 만들고 중지할 수 있는 사람 | 그 작업의 구성원 전원(UC07의 주 액터) | C |**11/28 결정** — 이대로 |
| 18 | 옵서버가 알림 받을 사람(검토자 · 최종 승인자)을 찾는 방법. 패턴 문서 7장 예제는 `StatusChange`에서 `getReviewerId()` · `getApproverId()`를 읽는데, 02는 검토자(03의 `REVIEW_REQUEST`)와 승인자(01의 `WORK_MEMBER`)를 직접 알 수 없음 | `IAuthorization.getMembers(workId, role)`를 더해 02가 `StatusChange`를 채움. 그러려면 한 작업의 검토자도 최종 승인자처럼 한 명으로 둠(2번과 같은 규칙. 1.1.0의 시연 데이터도 작업마다 검토자 · 승인자가 한 명씩) | A · B · D |**11/28 결정** — 권장안대로. `WorkStatusSubject`가 `getMembers`로 `StatusChange`를 채우고, 03은 지정 → 과제 배정 → `setWorkStatus` 순서로 부름(1.1의 13 · 14번, 가이드라인 5.4) |
