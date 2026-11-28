# HAVE 데이터베이스 설계 — 클래스 다이어그램에서 3차 정규형까지

검토 반영판 · 1123 수정본 · 2026-11-23 · 기준: 통합 클래스 다이어그램 v3(1118, UC01–UC10, 디자인 패턴 적용판 · 11-23 패턴 정리 반영), 1118 HCI 프로토타입·용어 상태 통일표·컴포넌트 다이어그램 v2 · 수업 자료: Ch09 데이터 설계, Ch10 구현

> 11-23 팀원 피드백 반영: 테이블·열·외래 키는 바뀌지 않는다. ① 승인 효력 코드 값에서 PREVIOUS를 빼고(VALID · REVOKED · NONE) 최신 버전 여부를 따로 계산한다(철회와 후속 버전은 동시에 성립). ② 수정본 재제출 때 근거자료·AI 사용 신고가 바뀌면 답변을 복사하지 않고 다시 받는다(5단계 "수정본 재제출 때의 행"). ③ 승인 · 증명서(PENDING) · 감사 · OUTBOX_EVENT 행은 한 트랜잭션으로 저장한다.

## 요약

HAVE가 영구 저장할 데이터는 **테이블 31개, 외래 키 40개**로 정리된다. 31개 테이블이 모두 3차 정규형이다. <b class="r">11-23 v3: 예전 판에서 일부러 남긴 값 2개(AUDIT_EVENT.work_id, CERTIFICATE.payload_hash)를 정리해 예외를 없앴고, 로그인 정보 열(USER.password_hash)과 감사 이벤트 행동 코드(부록 A)를 넣었다.</b>

절차는 Ch09의 데이터베이스 설계 단계(p.31–32: ERD 작성 → 데이터 요소 배정 → 3차 정규형), 정규화(p.23–30), 클래스와 테이블의 매핑(p.34–35)을 따랐다. ERD는 수업 표기(사각형 = 엔티티, 마름모 = 관계, 1/N = 관계의 타입, p.22)로 그렸고, 열까지 담은 테이블 관계도는 DB 다이어그램으로 따로 그렸다.

| 단계 | 한 일 | 결과 |
| --- | --- | --- |
| 1. 저장할 정보 고르기 | 클래스 43개 중 영속 대상 선정 | 도메인 클래스 23개 저장. QRCode, VerificationResult, 패턴 클래스 18개 제외 |
| 2. 테이블화 | 클래스 → 테이블, 객체 식별자 → 기본 키 | 초기 테이블 23개 |
| 3. 외래 키 찾기 | 관계 35개 중 33개를 FK로 옮김 | 테이블 24개(연결 테이블 1개 추가), FK 37개 |
| 4. 정규화 | 1차 4건, 2차 2건, 3차 2건<b class="r">(+ 11-23 v3 2건)</b>, 테이블 간 중복 7건 정리 | 테이블 28개, FK 36개 |
| <b class="r">5. 후속 단계 반영 (1123)</b> | <b class="r">1118 HCI 프로토타입·통일표·컴포넌트의 데이터 추가, 코드 값 통일</b> | <b class="r">테이블 31개, FK 40개</b> |
| <b class="r">6. 데이터 형식 정하기 (11-23)</b> | <b class="r">클래스 다이어그램의 속성 타입을 SQL 형식으로 옮김 (Ch09 p.35)</b> | <b class="r">열 157개에 형식 지정, 외래 키 = 참조 키와 같은 형식</b> |
| 7. ERD·DB 다이어그램 | Chen 표기 ERD, 까치발 표기 DB 다이어그램 | 그림 1, 그림 2 |

## 11-23 v3에서 고친 것

전체 점검에서 나온 단계 간 불일치와 강의 기준("모든 테이블을 3차 정규형으로", Ch09 p.31)을 반영했다. 테이블 31개 · 외래 키 40개 · 열 157개는 그대로다(열 1개 추가, 1개 삭제).

| 고친 것 | 내용 | 근거 |
| --- | --- | --- |
| 로그인 정보 열 | USER.email을 로그인 ID로 UNIQUE, <b class="r">USER.password_hash VARCHAR(255)</b> 추가(솔트를 포함한 해시 문자열, 원문 비밀번호는 저장하지 않음). 로그인 상태는 서버가 서명한 세션 토큰으로 유지해 테이블을 두지 않는다 | 컴포넌트 IAuthorization.login(credential) · logout(), 유스케이스 선행 조건 "로그인", 클래스 User.passwordHash |
| 3차 정규형 예외 정리 ① | AUDIT_EVENT.version_id(→ work_id 이행 종속)를 <b class="r">version_no</b>로 바꾸고 (work_id, version_no) → WORK_VERSION 복합 외래 키로 참조한다 | event_id → version_id → work_id 이행 종속 제거. 버전 없는 이벤트는 version_no가 NULL |
| 3차 정규형 예외 정리 ② | <b class="r">CERTIFICATE.payload_hash 삭제</b>. 검증할 때 immutable_payload의 SHA-256을 계산해 서명과 대조한다 | immutable_payload → payload_hash 이행 종속(계산 값). RISK_ASSESSMENT.total을 지운 것과 같은 처리 |
| 감사 이벤트 행동 코드 | <b class="r">AUDIT_EVENT.action 코드 21개</b>를 부록 A에 정의 | 순서 다이어그램의 record(…, action, …)와 확장 프로그램의 기록 코드 |
| 팀 확인 사항 2건 답함 | 로그인 정보 위치, 서명 키 관리 | 배치 다이어그램: 서명 키는 HAVE 서버 노드에 둔다 |

## 1123에서 고친 것

11월 18일 검토 반영판과 같은 날 만든 1118 산출물(통합 클래스 다이어그램 v3, HCI 프로토타입, 용어·상태 통일표, 컴포넌트 다이어그램 v2)은 서로 반영되지 않은 채 갈라져 있었다. 폭포수 모델에서는 뒤 단계의 결정이 앞 단계 산출물에 반영돼야 하므로, 검토 반영판의 구조는 그대로 두고 1118의 결정을 얹었다. 문서와 그림에서 <b class="r">빨간색</b>이 이번에 바꾼 곳이다.

| 고친 것 | 내용 | 근거 |
| --- | --- | --- |
| 이름 2개를 클래스 이름으로 되돌림 | RISK_POLICY → **GATE_POLICY**, WORK_VERSION.lock_version → **revision** | 통합 클래스 다이어그램 v3의 GatePolicy(mediumMinTotal, highMinTotal)와 WorkVersion.revision을 그대로 옮긴 테이블·열이다(Ch09 p.34 "클래스는 테이블로"). 통일표·순서 다이어그램·컴포넌트도 이 이름을 쓴다. 같은 개념에 이름 두 개를 두지 않는다(Ch09 p.40 일관성) |
| 상태 코드 값 통일 | WORK_VERSION.status를 통일표 8개 값으로 바꾸고 REJECTED·REVOKED·NEXT_VERSION을 뺐다. REVIEW_REQUEST·REVIEW·FEEDBACK·REVISION의 코드 값도 통일표 값으로 바꿨다 | 검토 반영판은 1109의 폐기된 상태 다이어그램 값을 썼다. 1118 통합 상태 다이어그램과 팀원의 크롬 확장 프로그램은 통일표 값(CHALLENGE_PENDING 등)을 쓴다. 최종 반려는 REVISION_REQUIRED로 돌아가고, 철회·이전 버전은 저장하지 않는 승인 효력이다(부록 A) |
| 테이블 3개 추가 | FEEDBACK_ITEM, FEEDBACK_RESPONSE, NOTIFICATION | HCI 프로토타입의 보완 요청 항목, 항목별 반영 답변, 알림 목록 (5단계) |
| 열 9개 추가 | WORK.ai_disclosure_draft, WORK_VERSION.change_reason, RISK_ASSESSMENT.rationale, REVIEW_REQUEST.message·due_date, CHALLENGE_RESPONSE.confidence, REVISION.due_date, APPROVAL_CASE.decision_key, REVOCATION.request_key | 컴포넌트 다이어그램 v2의 오퍼레이션 인자와 프로토타입 입력 항목 (5단계) |
| NULL 허용 1개 | AUDIT_EVENT.actor_id | 공개 검증(UC08)은 로그인 없이 하므로 행위자가 없다 |
| 팀 확인 사항 4건 답함 | AI 신고 초안 위치, 멱등성 키, 공개 검증 기록, 재제출 때 위험 평가 | 1118에서 정한 것 ("팀 확인 사항" 표) |
| 본문 정정 | 오퍼레이션 이름 updateWorkStatus → setWorkStatus. 부록 B의 "독립 웹 서비스" → 크롬 확장 프로그램과 서버 | 11-23 오퍼레이션 명명 규칙(Ch06 p.23, Ch10 p.11). 제품 형태는 크롬 확장 프로그램이다 |
| 코드 값 출처 | "11월 9일 팀 확정 ReviewRequestStatus·CertificateStatus"를 통일표로 바꿈 | 1104·1109·1116 자료에서 해당 결정을 찾지 못했다. 팀 확정 값이 따로 있으면 부록 A를 그 값으로 다시 맞춘다 |
| <b class="r">데이터 형식 추가 (11-23 v2)</b> | 열 157개 모두에 SQL 데이터 형식을 적음(6단계). 최종 스키마 표와 DB 다이어그램에 표시 | Ch09 p.35 주석 "클래스 다이어그램 활용해서 데이터 형식 정하고 FK 정하면 됨" |

## 11월 18일 검토 반영판에서 고친 것

11월 16일 판을 수업 자료 기준으로 검토하면서 나온 지적을 반영했다. (이 표는 검토 반영판의 내용이다. "헷갈리는 이름" 줄의 이름 두 개는 위 표처럼 1123에서 되돌렸다.)

| 지적 | 고친 내용 | 근거 |
| --- | --- | --- |
| 수업 양식의 ERD가 없었다 | Chen 표기 ERD(그림 1)를 새로 그렸다. 예전 그림은 열과 키를 담은 테이블 관계도이므로 DB 다이어그램(그림 2)으로 이름을 바꿨다 | Ch09 p.22, p.31–32 |
| 승인한 버전을 찾는 경로가 보장되지 않았다 | RISK_ASSESSMENT를 버전에 딸린 엔티티로 바꿔 기본 키를 (version_id, assessment_seq)로 했다. REVIEW_REQUEST는 (version_id, assessment_seq)를 함께 외래 키로 가진다. 같은 버전의 평가만 가리킬 수 있고, 이행 종속이 없어 3차 정규형도 유지된다 | Ch09 p.35 (OrderItem의 OrderID + ItemSequence) |
| "버전당 최종 결정 1건"을 DB로 강제할 수 없었다 | APPROVAL_CASE.version_id(UNIQUE)를 되살렸다. 이 열은 후보 키라 3차 정규형은 유지된다. 증명서 → 버전 경로가 6단계에서 2단계로 줄었다 | Ch09 p.20 후보 키, p.28 |
| "진행 중인 검토 요청 1개"도 DB로 강제할 수 없었다 | REVIEW_REQUEST.version_id가 남으므로 부분 UNIQUE 인덱스로 강제한다 | 클래스 다이어그램 {진행 중 최대 1개} |
| 그림에서 REVOCATION의 두 선 위치가 바뀌어 있었다 | 모든 선을 자식의 FK 열 행에서 부모의 키 열로 잇게 다시 그렸다 | — |
| 다중도 표기가 문서와 달랐다 | WORK→WORK_MEMBER, REVIEW_REQUEST→CHALLENGE는 1 이상(\|<), AI_DISCLOSURE·CERTIFICATE·OUTBOX_EVENT는 정확히 1(\|\|)로 고쳤다 | 클래스 다이어그램 다중도 |
| 헷갈리는 이름 | <s>WORK_VERSION.revision → lock_version, GATE_POLICY → RISK_POLICY, 버전 상태 REVISION → REVISION_REQUESTED</s> (1123에서 이름 두 개는 되돌리고, 버전 상태는 통일표의 REVISION_REQUIRED로 바꿈) | Ch09 p.40 "혼돈되는 코드를 피해라" |
| 코드 값 누락·불일치 | 비어 있던 상태 코드를 채움, signing_state와 승인 효력의 대응을 적음 (1123에서 통일표 값으로 다시 맞춤) | Ch09 p.37–40 |
| 3차 정규형 예외 표기 | ※로 표시. prev_hash는 다른 행의 값이라 정규형 위반이 아니므로 예외 목록에서 뺐다 | Ch09 p.28 |
| 위험 점수 기준의 출처 | 9월 25일 통합 기획 보고서에는 없는 내용이라 "UC03 검토 요청 설계"로 출처를 바로잡았다 | — |

## 1단계. 저장할 정보 고르기

도메인 클래스 25개 중 23개를 저장한다. 다음 실행 때도 남아 있어야 하는 영속 데이터만 테이블로 만들고(Ch09 p.7), 계산으로 다시 얻을 수 있는 값과 실행 중에만 쓰는 객체는 뺐다.

| 영역 | 클래스 | 저장하는 정보 |
| --- | --- | --- |
| 사용자·권한 | User, WorkMember | 사용자, 작업별 역할(작성자·검토자·최종 승인자) |
| 작업·버전 (UC01·02) | Work, WorkVersion, AiDisclosure, AiToolUsage, Contribution, EvidenceItem | 승인 대상 파일 버전과 해시, AI 사용 신고, 기여 기록, 근거자료 |
| 검토 (UC03·04·05) | RiskAssessment, ReviewRequest, Challenge, ChallengeResponse, Evaluation, Review, Feedback, Revision | 위험 평가 사본, 검토 요청, 이해 과제·답변·평가, 검토 판정, 보완·재제출 |
| 승인 (UC06·10) | ApprovalCase, Approval, Revocation, Certificate, OutboxEvent | 최종 결정, 승인 기록, 철회 기록, 서명 대상 증명서, 서명 요청 재전달 |
| 공유 (UC07) | ShareLink | 공개 링크의 토큰 해시와 만료 |
| 이력 (UC09) | AuditEvent | append-only 감사 이력 |

클래스 다이어그램 주석대로 Certificate와 Receipt, AuditEvent와 ApprovalHistory는 같은 개념이므로 테이블을 하나씩만 둔다. 클래스 다이어그램 v3에서 추가된 FeedbackItem, FeedbackResponse, Notification은 5단계에서 다룬다.

### 저장하지 않는 것

| 대상 | 이유 |
| --- | --- |
| QRCode (값 객체) | ShareLink URL을 QR로 바꾼 파생 표현. 링크를 만들 때 생성해 내려받는다 |
| VerificationResult | 검증 요청마다 서명·승인 효력·파일 해시를 계산한 결과. 06 진위 검증은 IPersistence를 쓰지 않는다. 검증했다는 사실만 AUDIT_EVENT에 남긴다(5단계) |
| 패턴 클래스 18개 | Subject·Observer, GateStrategy, Repository, Persistence 구현체, DatabaseConnectionPool, 서버 조립 지점 등은 동작과 인프라 구성이다. StatusChange는 옵서버에 전달되는 일시 값이고 내용은 AuditEvent로 남는다. GatePolicy는 등급 경계 값만 GATE_POLICY에 저장한다(4단계) |
| 서비스·컨트롤러·정책 클래스 | 처리 로직 |
| Work./currentVersion | 파생 속성. version_no가 가장 큰 버전 |
| Approval./revokedAt | 파생 속성. REVOCATION.revoked_at |
| 승인 효력 | 저장하지 않고 계산한다. REVOCATION이 있으면 REVOKED, 없으면 VALID(부록 A). 최신 버전 여부는 효력과 따로, 같은 작업의 MAX(version_no)와 비교해 계산한다(11-23 — 철회와 후속 버전은 동시에 성립) |

### 클래스 다이어그램에 없어서 보완한 열 2개

| 열 | 근거 |
| --- | --- |
| USER.email | NotificationGateway가 User를 조회해 userId를 메일 주소로 바꾼다 (디자인 패턴 적용분석 4장 · 7장) |
| WORK_VERSION.status | 통합 상태 다이어그램의 버전 상태. 옵서버 패턴의 <b class="r">setWorkStatus</b>가 바꾸는 대상 (디자인 패턴 적용분석 7장) |

## 2단계. 클래스를 테이블로 옮기기

클래스 23개를 속성 그대로 테이블 23개로 옮겼다. 이 단계에서는 아직 관계와 중복을 손대지 않는다.

| 매핑 규칙 (Ch09 p.34) | HAVE 적용 |
| --- | --- |
| 클래스는 테이블로, 객체는 튜플로 | 클래스 23개 → 테이블 23개 |
| 객체 식별자는 기본 키 | workId → work_id처럼 ID 속성을 기본 키로 |
| 다른 클래스의 인스턴스를 속성으로 가지면 그 클래스를 별도 테이블로 | 값 객체 AiDisclosure, AiToolUsage, RiskAssessment도 독립 테이블 |
| 식별자가 없거나 소유 객체에 딸린 클래스는 소유 클래스의 키를 빌린다 (p.35 OrderItem) | AI_DISCLOSURE(version_id), FEEDBACK(review_id), EVALUATION(response_id), AI_TOOL_USAGE(version_id + tool_seq), CONTRIBUTION(version_id + record_id), WORK_MEMBER(work_id + user_id), RISK_ASSESSMENT(version_id + assessment_seq) |

> **RISK_ASSESSMENT의 키를 바꾼 이유.** 위험 평가는 «value object»이고 클래스 다이어그램에서 "평가 사본 보존"으로 버전 하나에 딸린다(WorkVersion 1 : 0..* RiskAssessment). 그래서 OrderItem처럼 소유자의 키에 순번을 붙인 키를 쓴다. 클래스의 assessmentId는 (version_id, assessment_seq)에 대응한다.

### 초기 테이블 23개

굵은 글씨는 기본 키, 괄호는 반복 그룹이다. "고칠 곳"은 4단계에서 처리한다.

| 테이블 | 속성 | 고칠 곳 |
| --- | --- | --- |
| USER | **user_id**, name, email | |
| WORK_MEMBER | **work_id, user_id**, (role) | 반복 그룹: roles: Set |
| WORK | **work_id**, title | |
| WORK_VERSION | **version_id**, version_no, file_hash, file_uri, status, created_at, revision | |
| AI_DISCLOSURE | **version_id**, usage_scope, no_ai_used | |
| AI_TOOL_USAGE | **version_id, tool_seq**, tool_name, model_name, usage_method, contribution | |
| CONTRIBUTION | **version_id, record_id**, stage, actor_type, note, created_at | |
| EVIDENCE_ITEM | **evidence_id**, type, title, uri, file_hash | |
| RISK_ASSESSMENT | **version_id, assessment_seq**, (score) 4개, total, level, policy_version | 반복 그룹 scores[4]. total·level은 다른 열에서 결정됨 |
| REVIEW_REQUEST | **request_id**, state, requested_at | |
| CHALLENGE | **challenge_id**, kind, prompt, rubric, policy_version | policy_version 중복 |
| CHALLENGE_RESPONSE | **response_id**, answer, submitted_at | |
| EVALUATION | **response_id**, score, reason, critical | |
| REVIEW | **review_id**, state, memo, review_digest, (item_id, criterion, required, checked) | 반복 그룹 checks[4] |
| FEEDBACK | **review_id**, evaluation_summary, comment, decision | |
| REVISION | **revision_id**, state, change_note, response, (file_uri) | 반복 그룹 draftFiles |
| APPROVAL_CASE | **case_id**, state, rejection_reason, decided_at | |
| APPROVAL | **approval_id**, approver_id, approved_at, review_digest | review_digest 중복 |
| REVOCATION | **revocation_id**, actor_id, reason, revoked_at | |
| CERTIFICATE | **certificate_id**, immutable_payload, payload_hash, file_hash, signing_state, signature, key_id, issued_at | file_hash 중복 |
| OUTBOX_EVENT | **event_id**, payload_hash, delivery_state, retry_count | payload_hash 중복 |
| SHARE_LINK | **link_id**, token_hash, expires_at, disabled_at | |
| AUDIT_EVENT | **event_id**, actor_id, action, reason, occurred_at, prev_hash, event_hash | |

REVIEW의 checks[4] 항목은 UC04 클래스 다이어그램의 ChecklistItem(itemId, criterion, required)을 따랐다. RISK_ASSESSMENT의 4개 점수는 UC03 검토 요청 설계의 AI 사용 비중(0~3), 중요도(0~3), 검증 근거 부족(0~2), 과거 실패(0~2)다. revision은 클래스의 WorkVersion.revision(동시 수정을 감지하는 낙관적 잠금 번호)이다.

## 3단계. 외래 키 찾기

클래스 다이어그램의 관계 35개 중 저장 대상끼리의 33개를 외래 키로 옮겼다. 연결 테이블 1개가 생겨 테이블은 24개, FK는 37개가 된다. 빠진 2개는 QRCode와 VerificationResult의 관계다.

| 관계 유형 | FK 위치 | 관계 수 | FK 수 |
| --- | --- | --- | --- |
| 1:N | N쪽 테이블 (Ch10 p.20: 1쪽이 N쪽 참조를 모음으로 가짐) | 17 | 17 |
| 1:1, 1:0..1, 0..1:0..1 | 나중에 생기는 쪽에 두고 UNIQUE (Ch09 p.34: 1:1 연관은 외부 키 속성으로 구현) | 15 | 15 |
| M:N | 연결 테이블에 양쪽 키 (Ch09 p.32, Ch10 p.20: M:N을 1:N 두 개로) | 1 | 2 |
| ID 속성 | approverId, actorId처럼 이미 USER의 키 값을 담은 속성 | — | 3 |

### 테이블별 외래 키 37개

| 테이블 | 외래 키 → 참조 테이블 | 다이어그램의 관계 |
| --- | --- | --- |
| WORK | owner_id → USER | 작성자/owner 1 : 0..* |
| WORK_MEMBER | work_id → WORK, user_id → USER | 멤버십 1 : 1..*, 사용자별 참여 1 : 0..* |
| WORK_VERSION | work_id → WORK, prev_version_id → WORK_VERSION (UNIQUE) | 버전 1 : 0..*, 직전/후속 버전 0..1 : 0..1 |
| AI_DISCLOSURE | version_id → WORK_VERSION | 제출 시 고정 사본 1 : 1 (합성) |
| AI_TOOL_USAGE | version_id → AI_DISCLOSURE | 도구 목록 1 : 0..* (합성) |
| CONTRIBUTION | version_id → WORK_VERSION | 기여 사본 1 : 0..* (합성) |
| VERSION_EVIDENCE (신규) | version_id → WORK_VERSION, evidence_id → EVIDENCE_ITEM | 불변 자료 참조 0..* : 0..* |
| RISK_ASSESSMENT | version_id → WORK_VERSION | 평가 사본 보존 1 : 0..* |
| REVIEW_REQUEST | version_id → WORK_VERSION, (version_id, assessment_seq) → RISK_ASSESSMENT, reviewer_id → USER | 요청(진행 중 최대 1개) 1 : 0..*, 요청에 사용한 위험 근거 1 : 0..*, 지정 검토자 1 : 0..* |
| CHALLENGE | request_id → REVIEW_REQUEST | 정책에 따른 과제 1 : 1..* (합성) |
| CHALLENGE_RESPONSE | challenge_id → CHALLENGE (UNIQUE) | 현재 회차 답변 1 : 0..1 (합성) |
| EVALUATION | response_id → CHALLENGE_RESPONSE, review_id → REVIEW | 현재 평가 1 : 0..1 (합성), 해당 회차 평가 1 : 0..* |
| REVIEW | request_id → REVIEW_REQUEST (UNIQUE), version_id → WORK_VERSION | 취소 전 검토 개시 1 : 0..1, 검토 회차 1 : 0..* |
| FEEDBACK | review_id → REVIEW | 판정 확정 후 불변 1 : 0..1 (합성) |
| REVISION | base_version_id → WORK_VERSION, submitted_version_id → WORK_VERSION (UNIQUE, NULL 허용), review_id → REVIEW (UNIQUE, NULL 허용), case_id → APPROVAL_CASE (UNIQUE, NULL 허용) | 수정 전 버전 1 : 0..*, 재제출 버전 0..1 : 0..1, 보완 근거 0..1 : 0..1, 최종 반려 근거 0..1 : 0..1 |
| APPROVAL_CASE | version_id → WORK_VERSION (UNIQUE), review_id → REVIEW (UNIQUE) | 최종 결정 1 : 0..1, 고정된 승인 근거 회차 1 : 0..1 |
| APPROVAL | case_id → APPROVAL_CASE (UNIQUE), approver_id → USER | 승인 시에만 생성 1 : 0..1, approverId 속성 |
| REVOCATION | approval_id → APPROVAL (UNIQUE), actor_id → USER | 단방향 철회 1 : 0..1 (합성), actorId 속성 |
| CERTIFICATE | approval_id → APPROVAL (UNIQUE) | 발급 레코드 1 : 1 |
| OUTBOX_EVENT | certificate_id → CERTIFICATE (UNIQUE) | 동일 서명 요청 재전달 1 : 1 |
| SHARE_LINK | certificate_id → CERTIFICATE | 공유 1 : 0..* |
| AUDIT_EVENT | work_id → WORK, version_id → WORK_VERSION (NULL 허용), actor_id → USER | 변경 이력 1 : 0..*, 버전 대상 0..1 : 0..*, actorId 속성 |

다이어그램의 중괄호 제약 중 키로 표현되는 것은 {userId, workId 유일}, {버전 내 recordId 유일}, {진행 중 최대 1개}다. {요청자와 다름}, {비순환}, {XOR}, {SUBMITTED이면 1}, {append-only}는 CHECK 제약이나 서비스 계층으로 지킨다(아래 "제약을 지키는 위치" 참고).

## 4단계. 정규화

1차 4건, 2차 2건, 3차 2건을 고치고 테이블 간 중복 7건을 지워 테이블 28개가 됐다.

### 1차 정규형: 반복 그룹 없애기 (Ch09 p.24)

반복 그룹이 있는 테이블은 기본 키를 확장해 반복 그룹의 키를 포함시킨다.

| 테이블 | 반복 그룹 | 처리 |
| --- | --- | --- |
| WORK_MEMBER | roles: Set | 역할 하나가 한 행. 기본 키를 (work_id, user_id, role)로 확장 |
| RISK_ASSESSMENT | scores[4] | 의미가 정해진 4개 값이므로 열 4개로 펼침: ai_usage_score, importance_score, evidence_gap_score, past_failure_score |
| REVIEW | checks[4] | 기본 키를 (review_id, item_id)로 확장 |
| REVISION | draftFiles | 기본 키를 (revision_id, file_seq)로 확장 |

### 2차 정규형: 키 일부에만 종속된 열 분리 (Ch09 p.26)

| 테이블 | 함수 종속 | 분리 결과 |
| --- | --- | --- |
| REVIEW | review_id → request_id, version_id, state, memo, review_digest | REVIEW(review_id, request_id, version_id, state, memo, review_digest) |
| | item_id → criterion, required | CHECKLIST_ITEM(item_id, criterion, required) |
| | (review_id, item_id) → checked | REVIEW_CHECK(review_id, item_id, checked) |
| REVISION | revision_id → file_uri를 뺀 나머지 전부 | REVISION(revision_id, base_version_id, submitted_version_id, review_id, case_id, state, change_note, response) |
| | (revision_id, file_seq) → file_uri | REVISION_DRAFT_FILE(revision_id, file_seq, file_uri) |

나머지 복합 키 테이블은 이미 2차 정규형이다. WORK_MEMBER와 VERSION_EVIDENCE는 키 외 속성이 없다. AI_TOOL_USAGE, CONTRIBUTION, RISK_ASSESSMENT는 tool_seq, record_id, assessment_seq가 버전 안에서만 유일해서 모든 속성이 키 전체에 종속된다.

### 3차 정규형: 키가 아닌 열에 종속된 열 분리 (Ch09 p.28)

| 테이블 | 이행 종속 | 처리 |
| --- | --- | --- |
| RISK_ASSESSMENT | 키 → 점수 4개 → total, 그리고 (total, policy_version) → level | total 삭제(점수 4개의 합). level 삭제하고 등급 경계를 새 테이블 <b class="r">GATE_POLICY</b>(policy_version, medium_min_total, high_min_total)로 분리 |
| CHALLENGE | challenge_id → request_id → policy_version | policy_version 삭제. 같은 요청의 과제는 모두 그 요청의 위험 평가와 같은 정책 버전을 쓴다 |
| <b class="r">AUDIT_EVENT (11-23 v3)</b> | event_id → version_id → work_id | <b class="r">version_id 대신 version_no를 두고 (work_id, version_no) → WORK_VERSION 복합 외래 키로 참조한다. work_id와 version_no는 서로를 정하지 않는다</b> |
| <b class="r">CERTIFICATE (11-23 v3)</b> | certificate_id → immutable_payload → payload_hash | <b class="r">payload_hash 삭제. immutable_payload의 SHA-256으로 계산한다</b> |

> **REVIEW_REQUEST.version_id는 이행 종속이 아니다.** 예전 판은 위험 평가의 키가 assessment_id 하나여서 request_id → assessment_id → version_id가 이행 종속이었고, 그래서 version_id를 지웠다. 이번 판은 위험 평가의 키가 (version_id, assessment_seq)라서 REVIEW_REQUEST 안의 assessment_seq만으로는 version_id가 정해지지 않는다. version_id는 기본 키 request_id에만 종속되므로 3차 정규형이고, 지우지 않는다. 별도의 FK version_id → WORK_VERSION은 복합 FK에 포함되므로 하나로 합쳤다.

등급은 합계가 medium_min_total 미만이면 LOW, high_min_total 미만이면 MEDIUM, 그 이상이면 HIGH로 읽는다. UC03 설계의 기준(낮음 0~3, 보통 4~6, 높음 7~10)이면 경계값은 4와 7이다. GATE_POLICY의 행은 고치지 않고 새 policy_version으로만 추가해야 지난 평가의 등급이 바뀌지 않는다. 테이블 이름은 이 경계 값을 가진 클래스 GatePolicy(통합 클래스 다이어그램 v3의 «Context»)를 따른다. 등급별 과제 구성(LowRiskGate 등 GateStrategy)은 동작이므로 저장하지 않는다.

### 테이블 간 중복 없애기

정규형은 테이블 하나 안의 종속만 본다. 아래 7개 열은 자기 테이블 안에서는 3차 정규형을 깨지 않지만, 외래 키를 따라가면 같은 값이 나오므로 지웠다.

| 지운 열 | 같은 값을 얻는 경로 |
| --- | --- |
| WORK_VERSION.prev_version_id | 같은 work_id에서 version_no가 1 작은 행. (work_id, version_no)를 UNIQUE로 둔다 |
| REVIEW.version_id | REVIEW → REVIEW_REQUEST.version_id (1단계) |
| EVALUATION.review_id | EVALUATION → CHALLENGE_RESPONSE → CHALLENGE → REVIEW_REQUEST → REVIEW |
| REVISION.base_version_id | REVISION → REVIEW → REVIEW_REQUEST.version_id. 반려 근거면 REVISION → APPROVAL_CASE.version_id |
| APPROVAL.review_digest | APPROVAL → APPROVAL_CASE → REVIEW.review_digest |
| CERTIFICATE.file_hash | CERTIFICATE → APPROVAL → APPROVAL_CASE.version_id → WORK_VERSION.file_hash. 서명된 immutable_payload 안에도 들어 있다 |
| OUTBOX_EVENT.payload_hash | OUTBOX_EVENT → CERTIFICATE.immutable_payload (1:1)의 SHA-256 <b class="r">(11-23 v3)</b> |

> **지우지 않은 열: APPROVAL_CASE.version_id.** REVIEW를 거쳐 얻을 수도 있지만, 이 열은 "버전당 최종 결정 1건"을 UNIQUE로 강제하는 후보 키다. 후보 키에 종속된 열은 3차 정규형을 깨지 않는다(Ch09 p.20 후보 키). 이 열 덕분에 증명서에서 승인 대상 버전까지 CERTIFICATE → APPROVAL → APPROVAL_CASE → WORK_VERSION으로 바로 간다.

FK는 이 단계에서 5개가 줄고(REVIEW_REQUEST.version_id → WORK_VERSION을 복합 FK에 합친 것 1개와 위 표의 앞 4개 prev_version_id·REVIEW.version_id·EVALUATION.review_id·REVISION.base_version_id), 새 테이블 때문에 4개가 늘어(REVIEW_CHECK 2개, REVISION_DRAFT_FILE 1개, RISK_ASSESSMENT.policy_version 1개) 37개에서 36개가 됐다.

## 5단계. 후속 단계 반영 (1123)

4단계까지의 스키마는 1116 클래스 다이어그램 v2만 보고 만들었다. 1118에 만든 HCI 프로토타입과 앞 단계의 구조유형·컴포넌트 설계에는 이 스키마에 자리가 없는 데이터가 있다. 1118 통합 클래스 다이어그램 v3는 이것을 이미 반영했으므로 같은 내용을 테이블로 옮긴다.

### 추가한 테이블 3개

| 테이블 | 근거 | 정규형 확인 |
| --- | --- | --- |
| <b class="r">FEEDBACK_ITEM</b>(**feedback_item_id**, review_id, target_section, content) | 프로토타입의 검토 화면은 보완 요청을 항목별(대상 구간, 내용)로 받는다. UC04 클래스 다이어그램의 Feedback(targetSection, content)도 항목 단위였는데 통합 때 FEEDBACK 한 행으로 줄었다. 클래스 다이어그램 v3의 FeedbackItem | 키가 단일 열이고 모든 열이 항목 하나에 종속 → 3NF. review_id는 FEEDBACK(review_id)를 가리킨다 |
| <b class="r">FEEDBACK_RESPONSE</b>(**feedback_item_id**, applied, response, responded_at) | 수정본 재제출 화면은 항목마다 반영 여부와 답변을 받는다(UC05의 FeedbackResponse). FEEDBACK_ITEM은 판정 확정 후 불변이고 답변은 나중에 작성자가 쓰므로 테이블을 나눴다 | 1:0..1이라 부모 키를 그대로 기본 키로 쓴다. revision_id는 두지 않는다. FEEDBACK_ITEM → FEEDBACK → REVIEW → REVISION으로 따라가면 나오는 값이라 4단계의 '테이블 간 중복 없애기'와 같은 이유다 |
| <b class="r">NOTIFICATION</b>(**notification_id**, user_id, version_id, type, created_at, read_at) | 프로토타입에 읽음 표시가 있는 알림 목록이 있다. 컴포넌트 다이어그램 v2의 INotificationQuery(getNotifications, setRead)가 읽는 데이터다 | 문구는 저장하지 않는다. type과 대상 버전에서 만들 수 있다. work_id도 version_id로 정해지므로 두지 않는다 |

### 추가·변경한 열

| 열 | 내용 | 근거 |
| --- | --- | --- |
| WORK.ai_disclosure_draft (NULL 허용) | 버전이 생기기 전의 AI 신고 초안 | UC01 클래스 다이어그램의 Work.aiDisclosureDraft. 팀 확인 사항 "버전 등록 전의 AI 신고 초안은 어디에 두는가"의 답이다. 버전이 만들어지면 AI_DISCLOSURE로 사본이 고정된다 |
| WORK_VERSION.status (코드 값 변경) | DRAFT, SUBMITTED, CHALLENGE_PENDING, REVIEW_PENDING, IN_REVIEW, REVISION_REQUIRED, APPROVAL_PENDING, APPROVED | 통일표 3.1. 검토 반영판의 값은 폐기된 상태 다이어그램의 것이다. 최종 반려는 REVISION_REQUIRED로 돌아가므로 REJECTED는 APPROVAL_CASE.state에만 둔다. REVOKED·NEXT_VERSION은 승인 효력이라 저장하지 않는다 |
| WORK_VERSION.revision (이름 변경) | lock_version → revision | 클래스 속성 WorkVersion.revision과 같은 이름 (1123에서 고친 것) |
| WORK_VERSION.change_reason (NULL 허용) | v2 이상을 직접 등록할 때의 변경 사유 | IWorkAPI.uploadVersion(workId, file, reason)의 reason, UC02의 WorkVersion.changeReason. 재제출로 생긴 버전은 REVISION.change_note를 쓰므로 이 열은 비워 둔다(같은 값을 두 곳에 두지 않는다) |
| EVIDENCE_ITEM.type (코드 값 추가) | WEB_SOURCE, REFERENCE, PROMPT_LOG, SUPPORT_FILE | 프로토타입의 근거자료 유형(URL, 참고 문헌, 프롬프트 기록, 파일) |
| RISK_ASSESSMENT.rationale | 위험 점수의 근거 | IReviewAPI.assessRisk(versionId, scores, rationale), 프로토타입 등록 4/5 |
| REVIEW_REQUEST.message, due_date (NULL 허용) | 검토자에게 보내는 메시지와 검토 기한 | requestReview(versionId, reviewerId, approverId, message, dueDate), UC03 클래스 다이어그램의 ReviewRequest.message |
| CHALLENGE_RESPONSE.confidence (NULL 허용) | 답변의 확신 정도 LOW·MEDIUM·HIGH | 프로토타입 이해 확인 화면, 계획서 23쪽 "답변·확신도" |
| REVISION.due_date (NULL 허용) | 보완 기한 | 프로토타입 수정 요청, UC04의 RevisionRequest.dueDate |
| APPROVAL_CASE.decision_key (UNIQUE, NULL 허용), REVOCATION.request_key (UNIQUE) | 승인·반려·철회 요청의 멱등성 키 | 구조유형 설계의 "IApprovalAPI의 key를 멱등성 키로 사용", UC06 순서 다이어그램의 approve(caseId, key). 팀 확인 사항 "멱등성 키를 어디에 저장하는가"의 답이다 |
| AUDIT_EVENT.actor_id (NULL 허용으로 변경) | 공개 검증 이벤트는 행위자가 없다 | 06 진위 검증이 IAuditLog로 익명 검증 이력을 남긴다(컴포넌트 v2, UC08). 팀 확인 사항 "공개 검증 기록을 남길 것인가"의 답이다 |
| REVIEW_REQUEST.state, REVIEW.state, FEEDBACK.decision, REVISION.state (코드 값 변경) | 부록 A | 통일표 3.2 |
| <b class="r">USER.password_hash (11-23 v3 추가), USER.email (UNIQUE)</b> | 로그인 정보 | IAuthorization.login(credential), 클래스 User.passwordHash |
| <b class="r">AUDIT_EVENT.version_no (11-23 v3, version_id 대신)</b> | 이벤트의 대상 버전 번호. (work_id, version_no) → WORK_VERSION | 3차 정규형 예외 정리 |

새 열은 모두 자기 테이블의 기본 키에만 종속되고 다른 일반 열을 결정하지 않으므로 3차 정규형이 유지된다. 외래 키는 FEEDBACK_ITEM 1개, FEEDBACK_RESPONSE 1개, NOTIFICATION 2개가 늘어 36개에서 40개가 됐다.

### 수정본 재제출 때의 행 (팀 확인 사항의 답)

복합 FK 때문에 v2를 검토 요청하려면 v2의 위험 평가 행이 있어야 한다. UC05 순서 다이어그램의 규칙대로 재제출하면 03 Review의 ReReviewObserver가 다음 행을 만든다. 11-23부터는 RevisionService.isBasisChanged가 v1과 v2의 근거(VERSION_EVIDENCE로 연결된 EVIDENCE_ITEM의 type · uri · file_hash 집합, AI_DISCLOSURE · AI_TOOL_USAGE)를 비교한 결과에 따라 답변 복사 여부가 갈린다.

| 테이블 | 만드는 행 |
| --- | --- |
| RISK_ASSESSMENT | v1 평가를 v2로 복사 (version_id = v2, assessment_seq = 1, 같은 점수·근거·policy_version) |
| REVIEW_REQUEST | v2의 새 요청 (같은 검토자, state = REQUESTED). v2의 작업 상태는 근거 그대로면 REVIEW_PENDING, <b class="r">근거 변경이면 CHALLENGE_PENDING</b> |
| CHALLENGE | v1 요청의 과제를 새 요청 아래로 복사 |
| CHALLENGE_RESPONSE | 근거 그대로: v1 답변을 새 과제 아래로 복사(작성자는 다시 쓰지 않음). <b class="r">근거 변경: 복사하지 않고 작성자가 v2에서 다시 답한다.</b> 이전 답변은 v1 요청에 그대로 남으므로 REVISION.base_version_id로 찾아 "v1 답변 · 참고"로 보여 준다 |
| EVALUATION | 복사하지 않는다. 검토자가 v2에서 다시 평가한다(평가 점수 초기화) |
| APPROVAL_CASE | 만들지 않는다. 승인은 버전을 넘어 승계되지 않는다 |

근거 변경 판정은 저장하지 않고 재제출 때 계산하며, 판정 결과는 AUDIT_EVENT의 재제출 이벤트 내용에 남긴다. 그래서 테이블과 열은 바뀌지 않는다.

승인 완료 후 새로 등록한 버전(UC02)은 이 규칙이 아니라 처음부터 위험 분석과 검토 요청을 거친다.

## 6단계. 데이터 형식 정하기 (11-23)

Ch09 p.35의 매핑 예시(`OrderID: INT <<PK>>`)처럼 클래스 다이어그램의 속성 타입을 SQL 데이터 형식으로 옮겼다. 강의 주석 "클래스 다이어그램 활용해서 데이터 형식 정하고 FK 정하면 됨"에 따른 것이다. 아래 최종 스키마 표와 DB 다이어그램의 모든 열에 형식을 적었다.

<!--TYPE_RULES-->

- **외래 키는 참조하는 기본 키와 같은 형식이다.** 대부분 BIGINT이고, RISK_ASSESSMENT.policy_version → GATE_POLICY는 VARCHAR(20), 복합 외래 키의 assessment_seq는 INT다. 생성 스크립트가 157개 열 전체에서 이를 확인한다.
- **문자열 길이는 화면의 입력 검사와 같다.** 작업명 100자, AI 도구·모델 100자, AI 사용 범위 5,000자, 기여 내용·근거·사유·메모 2,000자, 근거자료 제목 200자, 메시지 1,000자, 보완 항목 구간 100자·내용 1,000자, 답변 10,000자(TEXT). 화면이 받는 길이와 DB가 저장하는 길이가 달라 잘리는 일이 없다.
- **코드 열은 VARCHAR(30)에 CHECK 제약을 건다.** 허용 값은 부록 A의 문자 코드다.
- 형식 이름은 표준 SQL 기준이다. 실제 DBMS를 정하면 BOOLEAN·JSON·TEXT는 그 DBMS의 형식으로 바꾼다(예: MySQL은 TINYINT(1)·JSON·TEXT).

## 최종 스키마

열 표기는 `열 이름: 데이터 형식`이다(6단계).

최종 테이블은 31개, 외래 키는 40개다. 굵은 글씨는 기본 키이고, 기본 키 열이 외래 키를 겸하는 경우 두 칸에 모두 적었다. <b class="r">빨간색</b>은 1123에서 추가·변경한 것이다.

<!--FINAL_SCHEMA-->

## 3차 정규형 확인과 제약을 지키는 위치

### 3차 정규형 예외 없음 (11-23 v3)

예전 판은 아래 2개 열을 무결성 검증 때문에 일부러 남겼다(※). 강의 기준("모든 테이블을 3차 정규형으로")에 맞춰 둘 다 정리했다.

| 열 | 왜 중복이었나 | 정리한 방법 |
| --- | --- | --- |
| AUDIT_EVENT.work_id | version_id가 있으면 work_id가 정해졌다 (event_id → version_id → work_id) | version_id를 version_no로 바꿔 (work_id, version_no) → WORK_VERSION 복합 외래 키로 참조. 버전 없는 이벤트(작업 생성 등)는 version_no가 NULL |
| CERTIFICATE.payload_hash | immutable_payload를 SHA-256으로 계산하면 나왔다 | 열 삭제. 진위 검증 때 immutable_payload에서 계산해 서명과 대조한다. 저장된 payload가 바뀌면 계산 값이 달라져 서명 검증이 실패하므로 무결성 확인은 그대로 된다 |

AUDIT_EVENT.prev_hash는 직전 행의 event_hash와 같지만, 같은 행 안의 다른 열에서 정해지는 값이 아니므로 정규형 위반이 아니다. 행이 지워지거나 순서가 바뀐 것을 찾는 감사 체인의 기준값이다.

### 제약을 지키는 위치

| 규칙 | 어디서 지키나 | 방법 |
| --- | --- | --- |
| 버전당 최종 결정 1건 | DB | APPROVAL_CASE.version_id UNIQUE |
| 버전당 진행 중 검토 요청 최대 1개 | DB | UNIQUE INDEX ON REVIEW_REQUEST(version_id) WHERE state IN ('REQUESTED','IN_REVIEW') |
| 검토 요청의 위험 평가는 같은 버전의 것 | DB | 복합 FK (version_id, assessment_seq) → RISK_ASSESSMENT |
| 수정 근거는 검토 회차 또는 반려 결정 중 정확히 하나 {XOR} | DB | CHECK ((review_id IS NULL) <> (case_id IS NULL)) |
| SUBMITTED인 수정 회차는 재제출 버전이 있다 | DB | CHECK (state <> 'SUBMITTED' OR submitted_version_id IS NOT NULL) |
| 평가 점수 0~2, 위험 점수 항목별 범위 | DB | CHECK (범위) |
| <b class="r">같은 승인·반려·철회 요청은 한 번만 처리</b> | DB | APPROVAL_CASE.decision_key, REVOCATION.request_key UNIQUE |
| 최종 결정의 버전 = 근거 검토 회차의 버전 | 서비스 | ApprovalService가 승인 조건 확인 때 비교 (REVIEW에 version_id가 없어 FK로 못 건다) |
| 검토자 ≠ 작성자, 승인자 ≠ 검토자·작성자 | 서비스 | WORK.owner_id, WORK_MEMBER와 비교 |
| <b class="r">재제출 전 모든 보완 항목에 답변</b> | 서비스 | RevisionService.isAllResolved()가 FEEDBACK_ITEM마다 FEEDBACK_RESPONSE가 있는지 확인 |
| <b class="r">등급별 과제 수와 통과 기준</b> | 서비스 | GatePolicy가 GATE_POLICY의 경계로 등급을 정하고 GateStrategy가 과제를 낸다 (LOW 1개 2/2, MEDIUM 2개 3/4, HIGH 3개 5/6, 치명 오류 없음) |
| 감사 이벤트의 버전은 같은 작업의 것 {동일 Work} | 서비스 | AuditLogService가 기록할 때 검사 |
| 감사 이력은 추가만 {append-only} | DB 권한 | AUDIT_EVENT에 UPDATE·DELETE 권한을 주지 않는다 |
| 위험 등급 기준은 바꾸지 않고 새 버전으로 추가 | 운영 규칙 | GATE_POLICY 행 수정 금지 |

평가 점수 범위는 검토 반영판의 "0~3"을 통일표 5절의 과제당 0~2점으로 고쳤다.

## 팀 확인 사항

| 질문 | 지금 설계 | 상태 |
| --- | --- | --- |
| 수정본 재제출 때 위험 평가를 새로 하는가 | 위험 평가는 새로 하지 않는다. v1 평가와 과제를 v2로 복사하고 평가 점수는 초기화한다. 답변은 근거가 그대로일 때만 복사하고, 근거가 바뀌면 다시 받는다(5단계, 11-23 팀원 피드백) | <b class="r">1123 답함</b> |
| 공개 검증 기록을 남길 것인가 | VerificationResult는 저장하지 않는다. 검증 조회 사실은 AUDIT_EVENT에 행위자 없는 이벤트로 남긴다(actor_id NULL 허용) | <b class="r">1123 답함</b> |
| 공유 링크와 QR을 다시 보여 줄 것인가 | SHARE_LINK는 token_hash만 저장해서 생성 직후에만 볼 수 있다. 다시 보여 준다면 SHARE_LINK에 QR 이미지 위치 열을 추가한다 | 팀 확인 |
| 버전 등록 전의 AI 신고 초안은 어디에 두는가 | WORK.ai_disclosure_draft | <b class="r">1123 답함</b> |
| 로그인 정보는 어디에 두는가 | USER.email(UNIQUE)을 로그인 ID로, USER.password_hash(솔트 포함 해시)를 비밀번호 대신 저장한다. 로그인 상태는 서버가 서명한 세션 토큰으로 유지해 테이블을 두지 않는다 | <b class="r">11-23 v3 답함</b> |
| 서명 키를 DB에서 관리하는가 | 관리하지 않는다. 서명 키는 HAVE 서버 노드에 둔다(배치 다이어그램). CERTIFICATE.key_id는 어느 키로 서명했는지 적는 일반 열이다 | <b class="r">11-23 v3 답함</b> |
| 위험 등급 정책과 과제 정책이 같은 버전인가 | 같다. GatePolicy가 등급을 정하고 같은 정책 버전의 GateStrategy가 과제를 낸다(디자인 패턴 적용분석 8장). 그래서 CHALLENGE.policy_version을 지웠다 | 확정 |
| 멱등성 키를 어디에 저장하는가 | APPROVAL_CASE.decision_key, REVOCATION.request_key | <b class="r">1123 답함</b> |
| 코드 값 | 부록 A (통일표). "11월 9일 팀 확정" 값의 근거가 있으면 다시 맞춘다 | 팀 확인 |

## 부록 A. 코드 값 (Ch09 p.37–40)

상태와 유형 열은 Ch09 코드 설계의 문자 코드로 저장한다. 1118 `HAVE_용어_상태_통일표`와 같은 값이다. <b class="r">빨간색</b>은 검토 반영판에서 바뀐 것이다.

| 열 | 코드 값 | 출처 |
| --- | --- | --- |
| WORK_MEMBER.role | AUTHOR, REVIEWER, APPROVER | 통일표 4절 (작성자·검토자·최종 승인자) |
| WORK_VERSION.status | <b class="r">DRAFT, SUBMITTED, CHALLENGE_PENDING, REVIEW_PENDING, IN_REVIEW, REVISION_REQUIRED, APPROVAL_PENDING, APPROVED</b> | 통일표 3.1, 1118 통합 상태 다이어그램. 검토 반영판의 DRAFTING·PENDING·UNDER_REVIEW·REVISION_REQUESTED·REJECTED·REVOKED·NEXT_VERSION 대신 |
| CONTRIBUTION.stage | IDEA, DRAFT, REVISION, SOURCE_VERIFICATION | UC01 클래스 다이어그램, 통일표 4절 |
| CONTRIBUTION.actor_type | AI, HUMAN, MIXED | UC01 클래스 다이어그램 |
| EVIDENCE_ITEM.type | WEB_SOURCE, <b class="r">REFERENCE, PROMPT_LOG,</b> SUPPORT_FILE | 통일표 4절, 프로토타입 |
| 위험 등급 (저장하지 않고 계산) | LOW, MEDIUM, HIGH | UC03 클래스 다이어그램 |
| CHALLENGE.kind | TEACH_BACK, FAULT_INJECTION, WHAT_IF | UC03 클래스 다이어그램 |
| CHALLENGE_RESPONSE.confidence | <b class="r">LOW, MEDIUM, HIGH</b> | 통일표 4절 |
| REVIEW_REQUEST.state | <b class="r">REQUESTED, IN_REVIEW, CLOSED, CANCELED</b> | 통일표 3.2. 검토 결과(통과·수정 요청)는 FEEDBACK.decision에 있으므로 요청 상태에 다시 두지 않는다 |
| REVIEW.state | <b class="r">IN_PROGRESS, COMPLETED, HALTED</b> | 통일표 3.2. HALTED = 검토 시작 때 파일 해시 불일치로 중지 |
| FEEDBACK.decision | <b class="r">PASS, REVISION_REQUIRED</b> | 통일표 3.2 |
| REVISION.state | <b class="r">OPEN, IN_PROGRESS, SUBMITTED, EXPIRED</b> | 통일표 3.2 |
| APPROVAL_CASE.state | PENDING, REJECTED, APPROVED | UC06·UC10 클래스 다이어그램 |
| CERTIFICATE.signing_state | PENDING, READY, FAILED | UC06·UC10 클래스 다이어그램. 발급 상태만 뜻한다 |
| 승인 효력 (저장하지 않고 계산) | <b class="r">VALID, REVOKED, NONE</b> | 통일표 3.2를 11-23에 고침. REVOCATION이 있으면 REVOKED, 아니면 VALID(승인이 없으면 NONE). 후속 버전 여부는 효력이 아니라 최신 버전 여부로 따로 계산한다(PREVIOUS를 뺌). 공유 링크 만료는 SHARE_LINK.expires_at으로 따로 판단한다 |
| OUTBOX_EVENT.delivery_state | PENDING, DELIVERED, FAILED | 통일표 3.2. 재시도는 retry_count |
| NOTIFICATION.type | <b class="r">REVIEW_REQUESTED, REQUEST_CANCELED, ANSWERS_SUBMITTED, REVISION_REQUESTED, RESUBMITTED, REVIEW_PASSED, APPROVED, REJECTED, CERTIFICATE_ISSUED, APPROVAL_REVOKED</b> | 통일표 4·6절 |
| <b class="r">AUDIT_EVENT.action (11-23 v3)</b> | <b class="r">CREATE_WORK, ADD_CONTRIBUTION, UPLOAD_VERSION, ASSESS_RISK, REQUEST_REVIEW, CANCEL_REQUEST, SUBMIT_ANSWERS, START_REVIEW, HALT_REVIEW, PASS_REVIEW, REQUEST_REVISION, RESUBMIT, APPROVE, REJECT, ISSUE_CERTIFICATE, ISSUE_FAILED, RETRY_ISSUE, SHARE_LINK_CREATED, SHARE_LINK_DISABLED, REVOKE, VERIFY</b> | 순서 다이어그램의 record(workId, actorId, action, …)와 확장 프로그램의 기록 코드(21개). VERIFY는 행위자 없음 |

## 부록 B. 9월 25일 통합 기획 보고서와 달라진 점

DB에 반영된 범위를 기준으로 비교했다. 이 표는 고칠 목록이 아니라 보고서에 적어 둘 변경 이력이다.

| 항목 | 기획 보고서 (9/25) | 지금 DB |
| --- | --- | --- |
| 추적 단위 | 결과물 → 블록(문단·코드 조각) → 버전, 블록별 선택적 재승인과 의존관계 | 파일(PDF) 버전 단위. 블록 테이블 없음 |
| 환경 | Chrome 확장, GitHub PR·커밋에 영수증 연결 | <b class="r">Chrome 확장 프로그램(사이드 패널·팝업)과 서버, 공개 검증 페이지.</b> GitHub 연동은 없어 저장소·PR·커밋 열 없음 |
| 승인 구조 | 작성자 외 지정 검토자 1인의 승인 | 검토자 검토(REVIEW) + 최종 승인자 승인(APPROVAL_CASE·APPROVAL) 2단계 |
| 이해 확인 | "퀴즈 미통과 시 PR 강제 차단 게이트"는 제외, AI 퀴즈는 보류 | 이해 확인 과제·평가(CHALLENGE, EVALUATION)와 위험 등급(RISK_ASSESSMENT)이 승인 조건 |
| 증명 | PDF 파일 일치 확인, 작업 영수증. 법적 전자서명 인증은 제외 | 전자서명 증명서, 공유 링크·QR, 서명 요청 재전달(CERTIFICATE, SHARE_LINK, OUTBOX_EVENT). 법적 서명은 아님 |
| 검토 기록 | 검토 범위·근거·미해결 질문 | 범위·미해결 질문 열 없음. 검토 메모·의견·체크리스트·<b class="r">보완 요청 항목(FEEDBACK_ITEM)</b>으로 기록 |
| 검색 | 승인 기록의 제목·태그 검색 | 태그 테이블 없음 |
| 출처 구분 | AI·인간·혼합·미상 | AI·HUMAN·MIXED (미상 없음) |
| 역할 | 작성자·검토자·최종 승인자·열람자 | AUTHOR·REVIEWER·APPROVER (열람자 없음) |
| 계정 인증 | 최소 구현 범위 ① | USER.email(UNIQUE) · <b class="r">password_hash (11-23 v3)</b> |
| 유지된 것 | 수정·검토·승인을 서로 다른 사건으로 보존, 승인 철회, 해시로 버전 비교 | CONTRIBUTION / REVIEW / APPROVAL 분리, REVOCATION, file_hash |

## 부록 C. 수업 자료 대응

| 수업 내용 | 이 문서에서 |
| --- | --- |
| Ch09 p.22 ER 다이어그램 (사각형 = 엔티티, 마름모 = 관계, 1:1·1:N·M:N) | 그림 1 |
| Ch09 p.21·35 키를 표시한 테이블, 클래스와 테이블의 매핑 | 그림 2, 2단계 |
| Ch09 p.23–30 1·2·3차 정규형 | 4단계 |
| Ch09 p.31–32 ERD 작성 → 데이터 요소 배정 → 3차 정규형, M:N → 1:N | 요약, VERSION_EVIDENCE |
| Ch09 p.34 클래스와 테이블의 매핑 규칙 | 2·3단계, 5단계, GATE_POLICY·revision 이름 |
| Ch09 p.37–40 코드 설계 (문자 코드, 혼돈되는 코드 피하기, 일관성) | 부록 A, 이름 정리 |
| Ch10 p.20 연관의 다중도에 따른 구현 (1:1 참조, 1:N 모음, M:N 연관 클래스) | 3단계 FK 규칙 |
| Ch06 p.23, Ch10 p.11 오퍼레이션 명명 규칙 (is·get·set) | 1단계의 setWorkStatus |

<div style="break-before: page"></div>

## 그림 1. ER 다이어그램 (Chen 표기) · 엔티티 31개, 관계 40개

![ER 다이어그램](HAVE_ERD.png)

<div style="break-before: page"></div>

## 그림 2. DB 다이어그램 (테이블 관계도) · 테이블 31개, 외래 키 40개

![DB 다이어그램](HAVE_DB_다이어그램.png)

원본 크기 그림은 별도 파일 `HAVE_ERD.svg`·`.png`, `HAVE_DB_다이어그램.svg`·`.png`.
