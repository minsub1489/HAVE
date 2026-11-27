# HAVE 최종 개발 가이드라인 — 클라이언트–서버 구조 · 4인 균등 분담

작성 2026-11-28 · 기준 산출물 `팀원공유용_v3` · 개발 마감 2026-12-04(금)

`1125` 폴더의 두 문서를 하나로 합친 최종본입니다. 이 문서 하나만 보면 되도록 썼습니다.

| 가져온 곳 | 내용 |
| --- | --- |
| `have_4.md`(= 저장소의 `HAVE_Guide_4.md`) | 유스케이스 배정의 뼈대(A: UC01·02·05, B: UC03·04, C: UC06·07·08·10), 수직 분할 원칙, 팀원별 체크리스트 형식, 3단계 로드맵 |
| `HAVE_개발_가이드라인.md` | 스택 추천, 폴더·파일 소유, API와 내부 인터페이스 계약, 확장 프로그램 전환 방법, 협업 규칙, 통합 시나리오, 설계 보완 목록 |
| 이번에 새로 한 것 | 작업을 67개 항목으로 쪼개 점수를 매기고 네 명의 합계가 같아지도록 다시 배정(4.2), 진행 중 균형을 지키는 규칙(4.3), 11/28 기준 일정(7절) |

**★ 표시는 팀이 착수 회의(11/28)에서 확정해야 하는 항목**입니다. 확정 전까지는 이 문서의 추천안을 기준으로 합니다.

---

## 0. 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 구조 | 클라이언트–서버. 클라이언트 2개(크롬 확장 프로그램, 공개 검증 페이지) + 서버 1개(서브시스템 8개) + 관계형 DB |
| 만드는 것 | `have-server`(새로 만듦) · `have-chrome-extension`(로컬 저장 → 서버 호출로 전환) · `verify-web`(새로 만듦) |
| 스택 ★ | Java 21 + Spring Boot + JDBC + PostgreSQL / 클라이언트는 지금의 순수 JavaScript 유지 |
| 분담 | A 작업·버전 / B 검토·인증 / C 승인·증명서·검증 / D 기반·저장·이력 기록·알림·통합 |
| 작업량 | A 61점 · B 60점 · C 62점 · D 60점 (합계 243점, 1점 ≈ 1시간). 먼저 끝낼 P0도 46.5 · 45.5 · 46 · 46점으로 맞춤 |
| 일정 | 11/28 계약 동결 → 11/29 뼈대 연결 → 12/1 정상 흐름 통합 → 12/3 18시 기능 동결 → 12/3 밤 통합 테스트·코드 검사 → 12/4 마감 |
| 오늘 할 일 | ① 스택과 A~D 배정 확정 ② API 표(5.2)와 내부 인터페이스(5.3) 동결 ③ 저장소 뼈대와 `app.js` 분리 PR 합치기 |

남은 기간이 7일입니다. 점수대로면 한 사람이 하루 9점 안팎을 해야 전부 끝납니다. 그래서 정상 흐름(P0)을 먼저 끝내고, 시간이 모자라면 줄일 항목과 순서를 미리 정해 두었습니다(1.4, 4.3).

---

## 1. 기준과 원칙

### 1.1 기준 산출물 — 무엇을 볼 때 어디를 여나

모든 경로는 `팀원공유용_v3/` 아래입니다.

| 알고 싶은 것 | 파일 |
| --- | --- |
| 유스케이스의 단계·예외·후행 조건 | `01_유스케이스/HAVE_유스케이스_명세.md` |
| 클래스·속성·오퍼레이션 이름 | `02_클래스/HAVE_클래스다이어그램_패턴적용_v3_수정표시.png`, `HAVE_클래스_도출과정.md` |
| 호출 순서, 트랜잭션 범위, 응답 코드 | `03_순서/UC01~UC10_순서.png` |
| 허용되는 상태 전이 | `04_상태/HAVE_상태_01~07.png`, `HAVE_상태_유스케이스_대응표.md` |
| 서브시스템 경계, 인터페이스 17종의 오퍼레이션 | `07_컴포넌트/HAVE_컴포넌트_다이어그램_v2.pdf`(아래쪽 표), `08_구조유형/…_v2.md`(4·5·7절) |
| 실행 노드와 결과물 이름 | `07_컴포넌트/HAVE_배치_다이어그램.png` |
| 패턴 4개의 구조와 Java 예제 | `09_디자인패턴/HAVE_디자인패턴_적용분석_v2.md`(3·5·7·8장) |
| 화면, 문구, 입력 검사 | `10_HCI/have-chrome-extension/`(1.1.0), `DESIGN.md`, `HAVE_HCI_피드백_태스크_입력설계.md` |
| 테이블·열·형식·제약·코드 값 | `11_DB/HAVE_데이터베이스_설계_검토반영.md`(최종 스키마, "제약을 지키는 위치", 부록 A) |
| 이미 동작하는 업무 규칙(JavaScript) | `10_HCI/have-chrome-extension/scripts/model.js`, `review-model.js` |

### 1.2 만드는 것 3개

배치 다이어그램의 결과물(artifact) 이름을 폴더 이름으로 씁니다.

| 결과물 | 지금 | 이번에 할 일 |
| --- | --- | --- |
| `have-server` | 없음 | 서브시스템 01~08과 서버 조립 지점을 구현. REST API 제공, 전자서명, 감사 이력 해시 체인 |
| `have-chrome-extension` | 브라우저 로컬 시연(IndexedDB, 역할 전환 흉내) | 화면은 유지하고 저장·규칙 실행을 서버 API 호출로 교체. 로그인 추가 |
| `verify-web` | 확장 프로그램 안의 `#verify/<토큰>` 화면 | 설치·로그인 없이 여는 공개 웹 페이지로 분리. 서버가 정적 파일로 내려 줌 |

### 1.3 지킬 원칙

1. **수직 분할.** 각자 맡은 유스케이스의 테이블 → 서버 API → 화면 연동 → 테스트까지 끝까지 책임집니다. "서버 담당", "화면 담당"으로 나누지 않습니다.
2. **유스케이스를 늘리지 않습니다.** UC01~UC10 그대로입니다. 회원 가입 같은 화면은 만들지 않고 계정은 시드 데이터로 넣습니다.
3. **이름은 설계서 그대로 씁니다.** 클래스·인터페이스·오퍼레이션·테이블·열·코드 값을 바꾸지 않습니다. 새로 필요한 오퍼레이션은 명명 규칙(조건 확인 `is…`, 읽기·탐색 `get…`, 쓰기 `set…`, 화면 출력 `show…`, 업무 동작은 동사)을 따릅니다.
4. **설계와 달라지면 기록하고 앞 단계에 반영합니다**(폭포수 모델). 구현 중 생긴 추가·변경은 `docs/design-changes.md`에 한 줄씩 적고(8.5), 마감 뒤 해당 산출물을 고칩니다.
5. **승인·서명·감사 이력은 서버만 씁니다.** 클라이언트가 계산하는 값은 파일의 SHA-256뿐이고 서버가 다시 대조합니다. 사용자 ID와 역할은 로그인 토큰과 `WORK_MEMBER`에서만 얻고, 요청 본문에 적힌 값을 믿지 않습니다. 역할은 계정이 아니라 작업별입니다.
6. **다른 서브시스템은 인터페이스로만 부릅니다.** 다른 사람의 서비스 클래스를 직접 만들거나 다른 서브시스템의 테이블을 직접 읽지 않습니다(구조유형 문서 4절의 의존 방향).

### 1.4 범위 — 12/4까지 무엇을 하나

| 단계 | 기한 | 분량 | 내용 |
| --- | --- | --- | --- |
| **P0 정상 흐름** | 12/1(화) 밤 | 184점 | 로그인 → UC01 → UC02 → UC03 → UC04(검토 통과) → UC06(최종 승인) → 증명서 발급(서버 서명) → UC07(조회·공유 링크) → UC08(공개 검증 세 판정) + 작업 목록(UC09) + 감사 기록·알림 저장 + DB 연결 |
| **P1 되돌아가는 흐름·예외** | 12/3(목) 18시 | 59점 | 수정 요청 · UC05 재제출(근거 그대로/변경) · 반려 · UC10 철회 · 검토 요청 취소 · 임시 저장 · 해시 불일치 중지 · 발급 재시도 · 공유 중지와 만료 · 이력 탭과 해시 체인 확인 · 알림 목록과 읽음 · 파일 내려받기 |
| **P2 여유가 있을 때** | — | 점수 없음 | QR(계획서의 핵심 장면이라 P2 중 1순위) · 이메일 실제 발송 · 브라우저 알림 · 현재 탭 PDF 가져오기 · `JsonFilePersistence` · 클라우드 배포(HTTPS) · 화면 흐름 자동 테스트 |

설계서의 외부 시스템은 이번 구현에서 다음처럼 대신합니다. 계약(인터페이스)은 그대로 두므로 나중에 구현만 바꾸면 됩니다.

| 설계 요소 | 이번 구현 |
| --- | --- |
| 파일 저장소(IStorageAPI) | `StorageFileStore`가 서버의 지정 폴더에 저장. 폴더는 저장소 밖에 두고 주소를 응답에 싣지 않음 |
| 알림 채널(이메일) | 알림함(`NOTIFICATION`) 저장까지 구현. 발송은 서버 로그 출력으로 대신 |
| 서명 키 | 서버가 시작할 때 키 파일을 읽음(없으면 만듦). 키 파일은 Git에 올리지 않음 |
| HTTPS | 로컬 시연은 `http://localhost:8080`. 배포할 때만 HTTPS |

---

## 2. 기술 스택 (추천안) ★

| 구분 | 추천 | 이유 |
| --- | --- | --- |
| 서버 언어·프레임워크 | Java 21 + Spring Boot (start.spring.io의 현재 안정판, Java 17 이상 필요) | 설계서가 Java를 전제로 함: 컴포넌트의 JDBC, `JdbcPersistence`·`DatabaseConnectionPool`, 패턴 문서의 Java 예제, Controller–Service–Repository 구조. 강의 Ch10 예제도 Java |
| DB 접근 | JDBC(`JdbcTemplate`), ORM 없음 | 브리지(`Repository‹T›` ↔ `IPersistence`)와 싱글톤(`DatabaseConnectionPool`)을 코드에 그대로 드러내기 위해 |
| DB | PostgreSQL | DB 문서의 "진행 중 검토 요청 최대 1개" 제약이 조건부 유니크 인덱스(`… WHERE state IN (…)`)라 PostgreSQL이 맞음. JSON 형식 열도 지원 |
| 빌드·테스트 | Gradle(래퍼 포함) · JUnit 5 | 설치 없이 `gradlew`로 실행 |
| 클라이언트 | 지금의 순수 JavaScript(Manifest V3), 빌드 도구 없음 | 화면과 스타일을 그대로 두고 호출부만 바꾸기 위해 |
| 인증 | 이메일 + 비밀번호, BCrypt 해시(`USER.password_hash`), 서버가 서명한 토큰 | DB 문서 "팀 확인 사항"의 답(세션 테이블 없음) |
| 전자서명 | JDK 내장 `java.security`(예: Ed25519) | 외부 라이브러리 없이 서명·검증 |

- 대가: 확장 프로그램의 JavaScript 규칙(`model.js`·`review-model.js`, 약 780줄)을 Java로 옮겨야 합니다. 6.3의 대응표와 9절의 시나리오로 옮긴 결과를 맞춥니다.
- 대안: Node.js + Express를 고르면 위 규칙 파일을 서버에서 거의 그대로 쓸 수 있어 빠릅니다. 대신 `JdbcPersistence`, JDBC 표기, Java 예제를 설계서(클래스·패키지·컴포넌트·패턴·배치)에서 고쳐야 합니다. 팀원 대부분이 Java·Spring을 써 본 적이 없다면 남은 7일에는 이 안이 유리합니다.
- **스택은 11/28 안에 정합니다.** 하루 늦어지면 P0가 하루 밀립니다. 스택이 바뀌어도 4절(분담과 점수), 5절(계약), 7절(일정), 8절(협업)은 그대로 씁니다. 바뀌는 곳은 2절과 3.2의 폴더, 5.5의 일부입니다.

---

## 3. 구조와 폴더

### 3.1 전체 구조

```
[크롬 확장 프로그램]                      [공개 검증 페이지 verify-web]
 측면 패널 · 팝업 · 서비스 워커              설치·로그인 없음
 (작성자 · 검토자 · 최종 승인자)             (외부 검증자)
          │  REST · JSON (토큰)                    │  REST · JSON (토큰 없음)
          ▼                                        ▼
┌──────────────────────── HAVE 서버 (have-server) ────────────────────────┐
│  진입점(Controller) → 서비스 → 도메인 모델·정책 → 저장 계약(08)           │
│  핵심 업무: 02 Work · 03 Review · 04 Approval · 05 Certificate · 06 Verification │
│  공통 지원: 01 Auth · 07 Audit · 08 Persistence · bootstrap(조립 지점)    │
└──────────┬───────────────────────┬──────────────────────────────────────┘
           ▼ JDBC                   ▼ 파일
      PostgreSQL (테이블 31개)   파일 저장 폴더 (결과물 PDF · 근거 파일)
```

서버 내부는 느슨한 계층형(Controller → Service → Domain Model → Repository)이고, 작업 상태가 바뀌는 지점은 02의 `setWorkStatus` 하나입니다. 이력·알림·발급 요청·재검토 연결은 그 통지를 받는 옵서버 4종이 처리합니다.

### 3.2 저장소 폴더

팀 Git 저장소(`Software-Engineering`) 루트 기준입니다. 괄호는 소유자입니다.

```
have-server/
  build.gradle · settings.gradle · gradlew                 (D)
  src/main/java/have/
    HaveServerApplication.java                              (D)
    bootstrap/      HaveServerBootstrap                     (D)
    common/         오류 응답, 코드 값 enum, 시간·해시 도구  (D)
    auth/           01  AuthorizationPolicy, User, WorkMember, 로그인 진입점   (B)
    work/           02  controller · service · model · status(Subject 등)       (A)
    review/         03  controller · service · model · gate(GateStrategy 등)    (B)
    approval/       04  ApprovalService, ApprovalCase, Approval, Revocation, OutboxEvent (C)
    certificate/    05  CertificateService, Certificate, ShareLink, QRCode, CertificateIssueObserver (C)
    verification/   06  VerificationService, VerificationResult                 (C)
    audit/          07  AuditLogService, AuditLogObserver, AuditEvent,
                        NotificationGateway, NotificationObserver, Notification (D)
                        HistoryService                                          (C)
    persistence/    08  IPersistence, Repository‹T›, JdbcPersistence, StubPersistence,
                        DatabaseConnectionPool, HistoryRepository               (D)
                        FileStore, StorageFileStore, WorkRepository, RevisionRepository (A)
                        ReviewRepository, UserRepository                        (B)
                        ApprovalRepository, CertificateRepository               (C)
  src/main/resources/
    application.yml · application-stub.yml · application-jdbc.yml (D)
    db/schema/  DB 문서의 묶음 5개(사용자·작업 / 버전·AI 신고 / 검토 / 승인·증명서 / 이력·알림)별 파일.
                각 테이블의 DDL은 테이블 소유자가 PR로 넣고 D가 순서를 맞춰 합침
    db/seed/    계정 5명(B), 체크리스트 4항목·위험 등급 기준 GP-2026-1(B), 시연 시나리오(D)
    static/verify/   공개 검증 페이지(verify-web)                               (C)
  src/test/java/have/…                                      (각 패키지 소유자)
have-chrome-extension/      6절 참고. 루트 폴더가 HCI 최종본 1.1.0임(11/25 교체)
docs/
  api.md                    5.2의 표를 확정해 옮긴 것 (D가 관리, 변경은 전원 공지)
  design-changes.md         설계 변경 기록 (전원)
팀원공유용_v3/               설계 산출물. 개발 중에는 고치지 않음
```

- 개발은 반드시 Git 저장소에서 합니다. 저장소 밖에 복사해 둔 폴더에서 고친 내용은 GitHub에 올라가지 않습니다.
- 패키지 이름 `have`는 예시입니다. 소문자 명사 규칙(Ch10)만 지키면 됩니다 ★.

### 3.3 실행 프로필

브리지 패턴의 목적(구현이 끝나기 전에는 스텁으로 대신)을 그대로 씁니다.

| 프로필 | 저장 | 쓰는 때 |
| --- | --- | --- |
| `stub` | `StubPersistence`(메모리). 서버를 다시 켜면 비워지고 시드가 다시 들어감 | 매일 개발. DB를 설치하지 않아도 서버가 뜸 |
| `jdbc` | `JdbcPersistence` + PostgreSQL | 12/2부터 통합, 최종 시연 |

```
# 서버 실행 (Windows는 gradlew.bat)
./gradlew bootRun --args='--spring.profiles.active=stub'
# 확장 프로그램: chrome://extensions → 개발자 모드 → 압축해제된 확장 프로그램 로드 → have-chrome-extension
```

`HaveServerBootstrap.start(profile)`이 ① 프로필에 따라 저장 구현을 골라 Repository에 넣고 ② 옵서버 4종을 `WorkStatusSubject`에 등록합니다. DB 접속 정보와 서명 키 위치는 환경 변수로 주고 Git에 올리지 않습니다.

---

## 4. 역할 분담

### 4.1 분담 요약

| | A | B | C | D |
| --- | --- | --- | --- | --- |
| 이름 ★ | | | | |
| 핵심 담당 | 작업 등록 · 결과물 · 수정/재제출 | 위험 분석 · 이해 확인 · 검토 · 인증/권한 | 최종 승인 · 철회 · 증명서 · 진위 검증 · 이력 조회 | 기반 · 저장 · 이력 기록 · 알림 · 통합 |
| 유스케이스 | UC01 · UC02 · UC05 · UC09(작업 목록) | UC03 · UC04 · 공통(로그인·권한) | UC06 · UC07 · UC08 · UC10 · UC09(이력·해시 체인) | UC09(알림) · 공통(이력 기록) |
| 서버 서브시스템 | 02 Work 전부, 08의 `FileStore` | 03 Review 전부, 01 Auth 전부 | 04 · 05 · 06 전부, 07의 `HistoryService` | bootstrap, 08 공통, 07의 기록·알림 |
| 옵서버 패턴에서 맡는 것 | Subject(`WorkStatusSubject`) | `ReReviewObserver` | `CertificateIssueObserver` | `AuditLogObserver`, `NotificationObserver` |
| 제공하는 내부 인터페이스 | `IWorkVersion`, `WorkStatusObserver`(정의), `FileStore` | `IReviewResult`, `IAuthorization` | `IApprovalStatus`, `ICertificateData` | `IAuditLog`, `INotification`, `IPersistence` |
| 화면 | 작업 목록, 작업 상세 개요, 등록 마법사, 수정본 재제출 | 이해 확인, 검토 | 최종 승인, 증명서 탭, 이력 탭, 공개 검증 페이지 | 로그인, 화면 틀, 알림, 팝업·배지 |
| 테이블 | 10개 | 13개 | 6개 | 2개 |
| **작업량** | **61점** | **60점** | **62점** | **60점** |

테이블 소유(합계 31개). 소유자가 그 테이블의 DDL(형식은 DB 문서 6단계, 제약은 "제약을 지키는 위치" 표), Java 매핑, 시드 행을 씁니다.

- **A** — WORK, WORK_VERSION, AI_DISCLOSURE, AI_TOOL_USAGE, CONTRIBUTION, EVIDENCE_ITEM, VERSION_EVIDENCE, REVISION, REVISION_DRAFT_FILE, FEEDBACK_RESPONSE
- **B** — GATE_POLICY, RISK_ASSESSMENT, REVIEW_REQUEST, CHALLENGE, CHALLENGE_RESPONSE, EVALUATION, REVIEW, CHECKLIST_ITEM, REVIEW_CHECK, FEEDBACK, FEEDBACK_ITEM, USER, WORK_MEMBER
- **C** — APPROVAL_CASE, APPROVAL, REVOCATION, CERTIFICATE, OUTBOX_EVENT, SHARE_LINK
- **D** — AUDIT_EVENT, NOTIFICATION

### 4.2 작업량 점검 — 균등하게 나눴다는 근거

전체 작업을 67개 항목으로 쪼개고 항목마다 점수를 매겼습니다. **1점은 한 사람이 직접 구현할 때의 약 1시간**입니다. AI 도구를 쓰면 실제 시간은 줄지만 항목 사이의 비율은 비슷하므로, 점수는 네 명의 몫을 비교하는 기준으로 씁니다. 항목과 점수는 4.4~4.7에 있고, 팀이 보기에 점수가 틀린 항목은 착수 회의에서 고친 뒤 합계를 다시 맞춥니다 ★.

| 구분 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 서버 기능 | 34 | 41.5 | 40.5 | 10 |
| DB(DDL·매핑·시드) | 4 | 5.5 | 2.5 | 2 |
| 테스트 | 5 | 5 | 5 | 3 |
| 클라이언트(화면 연동) | 18 | 8 | 14 | 16.5 |
| 공통 기반·통합 | 0 | 0 | 0 | 28.5 |
| **합계** | **61** | **60** | **62** | **60** |
| 그중 P0(12/1까지) | 46.5 | 45.5 | 46 | 46 |
| 그중 P1(12/3까지) | 14.5 | 14.5 | 16 | 14 |

- 합계는 60~62점, P0는 45.5~46.5점, P1은 14~16점으로 세 기준 모두 차이가 2점 이내입니다. 전체만 같고 앞쪽에 한 사람 일이 몰리는 일이 없도록 단계별로도 맞췄습니다.
- 개수로 세면 다릅니다(서버 타입 A 25 · B 26 · C 15 · D 13개, API A 8 · B 16 · C 13 · D 2개). C는 타입 수는 적지만 승인 트랜잭션·전자서명·공개 페이지처럼 항목 하나가 무겁고, D는 타입에 잡히지 않는 일(빌드, 저장 구현 두 벌, 스키마 합치기, 통합)이 28.5점입니다. 그래서 개수가 아니라 점수로 맞췄습니다.

기존 초안과 비교하면 다음과 같습니다. 유스케이스 배정은 그대로 두고 공통 작업만 옮겼습니다.

| | A | B | C | D |
| --- | --- | --- | --- | --- |
| `have_4.md`의 배정을 같은 점수로 계산 | 약 49 | 약 46 | 약 54 | 약 95 |
| 최종 | 61 | 60 | 62 | 60 |

| 옮긴 작업 | `have_4.md` | 최종 | 이유 |
| --- | --- | --- | --- |
| 테이블 31개의 DDL·매핑·시드 | D | 테이블 소유자 | 그 테이블을 쓰는 사람이 열과 제약을 가장 잘 앎 |
| 파일 비공개 저장, SHA-256 계산 | D | A | `FileStore`를 쓰는 곳이 02뿐 |
| 상태 변경 통지(`WorkStatusSubject`) | D | A | 설계상 02 Work 소속 |
| 작업 목록 조회(UC09 1단계) | D | A | `IWorkAPI.getWorks` |
| 로그인·권한(01 Auth) | D | B | 권한 규칙 대부분이 검토자·승인자 확인이고 멤버 등록의 주 사용처가 검토 요청. B는 A의 `setWorkStatus`를 기다리는 첫 이틀에 이 일을 함 |
| 이력 조회·해시 체인 확인(UC09 2~3단계) | D | C | 07의 "기록·조회 분리"에서 조회 쪽. C의 서명·해시 검증과 성격이 같음 |
| 화면별 서버 연동 | D가 전체 통합 | 화면 소유자 | 925줄 `app.js`를 한 사람이 다 고치지 않게 |
| D에 남는 것 | — | 뼈대·조립 지점, 저장 공통(브리지·싱글톤), 이력 기록(해시 체인)과 알림, ApiClient·로그인 화면·화면 틀, 통합 | |

11/25의 `HAVE_개발_가이드라인.md`와 다른 점은 두 가지입니다. 인증은 D에서 B로, 알림은 B에서 D로 바꿨습니다. 합계뿐 아니라 P0 분량까지 같게 하려면 이 교환이 필요했습니다.

### 4.3 진행 중에 균형을 지키는 규칙

점수는 추정이라 실제로는 어긋납니다. 어긋났을 때 한 사람이 떠안지 않도록 다음을 지킵니다.

1. **매일 공유 때 각자 "남은 점수"를 말합니다.** 끝낸 항목의 점수를 빼면 됩니다.
2. **가장 많이 남은 사람과 가장 적게 남은 사람의 차이가 8점을 넘으면 그 자리에서 항목을 옮깁니다.** 옮기기 쉬운 항목(다른 코드와 맞물리는 곳이 적은 것)은 아래와 같습니다.

| 항목 | 점수 | 원래 소유 | 넘길 때 필요한 것 |
| --- | --- | --- | --- |
| C9 공개 검증 페이지 | 5 | C | `verify` 응답 예시 |
| D15 알림 화면·팝업·배지 | 5 | D | 알림 API 응답 예시 |
| D16 시연용 시드 시나리오 | 3 | D | 서비스 호출 순서(9절 S1) |
| C18 이력 탭 연동 | 2 | C | 이력 API 응답 예시 |
| A16 결과물 파일 내려받기 | 1.5 | A | `FileStore` 사용법 |
| D17 `model.js`·`storage.js` 정리 | 1.5 | D | 없음 |
| 각자의 P1 테스트 | 2 | 전원 | 9절 시나리오 |

3. **시간이 모자라 P1을 줄일 때는 이 순서로 줄입니다.** 임시 저장(B15 중 3점) → 발급 재시도·공유 링크 만료(C16 중 2점) → 팝업·배지(D15 중 2.5점) → 파일 내려받기(A16 1.5점). 재제출·반려·철회·수정 요청은 유스케이스의 본 흐름이라 줄이지 않습니다. 자기 항목이 줄어든 사람은 위 표에서 다른 사람의 항목을 가져갑니다.
4. **막힌 시간은 본인 책임이 아닙니다.** 다른 사람의 산출물을 기다리느라 반나절 이상 멈추면 매일 공유를 기다리지 말고 바로 알리고, 7절의 "먼저 내놓을 것" 기한을 다시 잡습니다.

### 4.4 팀원 A — 작업·버전·재제출 (02 Work) · 61점

**서버 클래스** WorkController, ContributionController, VersionController, EvidenceController / WorkService, ContributionService, VersionService, EvidenceService, RevisionService / Work, WorkVersion, AiDisclosure, AiToolUsage, Contribution, EvidenceItem, Revision, FeedbackResponse / Subject, WorkStatusSubject, WorkStatusObserver, StatusChange / FileStore, StorageFileStore, WorkRepository, RevisionRepository

**P0 (46.5점)**
- [ ] **A1** `app.js` 화면별 분리 PR (4점, 11/28) — 옮기기만 하고 동작은 바꾸지 않음(6.2). 이 PR이 합쳐져야 나머지 세 명이 화면을 고칠 수 있음
- [ ] **A2** `createWork` (2.5점) — 제목·AI 사용 신고 검증 → WORK 저장(신고 초안은 `ai_disclosure_draft`) → 작성자를 `AUTHOR` 멤버로 등록(`IAuthorization.addMember`) → `CREATE_WORK` 이력
- [ ] **A3** `addContribution` (2점) — 버전이 생긴 뒤에만. 단계·주체·설명 저장, "AI 미사용"이면 주체는 사람만. 승인된 버전이면 409
- [ ] **A4** `uploadVersion` (5점) — PDF·20MB 검사와 SHA-256 계산을 서버에서 다시 함. 직전 버전과 해시가 같으면 409. 파일 저장 → 버전 저장 순서이고 DB 저장이 실패하면 저장한 파일을 지움. AI 신고 사본(AI_DISCLOSURE·AI_TOOL_USAGE) 고정, v2부터 `change_reason`, 상태 `SUBMITTED`
- [ ] **A5** `addEvidence` (3점) — 유형 4종(WEB_SOURCE·REFERENCE·PROMPT_LOG·SUPPORT_FILE). 버전이 `CHALLENGE_PENDING` 이후면 409(근거자료·AI 신고 잠금)
- [ ] **A6** `getWorks(filter)` · `getWork(workId)` (5점) — 로그인 사용자가 구성원인 작업만, 역할·상태 필터. 02의 데이터만 돌려줌(버전, 신고, 기여, 근거, 수정 회차)
- [ ] **A7** `setWorkStatus` · `WorkStatusSubject` · `StatusChange` (4점, 11/29) — 상태 다이어그램 ①의 전이만 허용하고 나머지는 409. 옵서버를 같은 트랜잭션 안에서 차례로 호출. `StatusChange`는 작업·버전, 이전·다음 상태, 행위자, 새 버전 여부·직전 버전, 재제출 여부를 담음(패턴 문서 7장 예제의 getter 기준). 예제처럼 `lastChange`를 필드 하나로 두면 동시에 온 두 요청의 내용이 섞이므로 `setWorkStatus`를 동기화하거나 요청마다 따로 만든 `StatusChange`를 넘김
- [ ] **A8** `getReviewTarget` · `getVersionHash` (2점) — B·C가 사용
- [ ] **A9** `FileStore` · `StorageFileStore` (2점) — put·get·delete. 파일 주소를 응답에 싣지 않음
- [ ] **A10** 테이블 10개 DDL·매핑 (4점)
- [ ] **A11** 등록 마법사 연동 (6점) — 화면(`registration.js`)은 A가 갖고 4·5단계(위험 분석·검토 요청)는 B의 API 모듈을 호출(6.4)
- [ ] **A12** 작업 목록 · 작업 상세 개요 연동 (4점)
- [ ] **A13** 테스트 (5점 중 P0 3점)

**P1 (14.5점)**
- [ ] **A14** `resubmit` (7점) — `REVISION_REQUIRED`에서만. `isAllResolved()`(답하지 않은 보완 항목이 있으면 거절). 새 버전 v(N+1) 생성, Revision `SUBMITTED` + `submitted_version_id`, FeedbackResponse 저장을 한 트랜잭션으로. `isBasisChanged`는 근거자료의 (유형·주소·파일 해시) 집합과 AI 사용 신고를 직전 버전과 비교해 그대로면 `REVIEW_PENDING`, 바뀌었으면 `CHALLENGE_PENDING`. 판정 결과는 저장하지 않고 `RESUBMIT` 이력 내용에 남김
- [ ] **A15** 수정본 재제출 화면 연동 (4점)
- [ ] **A16** 결과물 파일 내려받기 (1.5점) — 구성원만
- [ ] **A13** 테스트 나머지 (2점)

### 4.5 팀원 B — 검토·인증 (03 Review + 01 Auth) · 60점

**서버 클래스** RiskController, ReviewRequestController / RiskService, GatePolicy, ReviewRequestService, ReviewService / RiskAssessment, ReviewRequest, Challenge, ChallengeResponse, Evaluation, Review, ChecklistItem, ReviewCheck, Feedback, FeedbackItem / GateStrategy, LowRiskGate, MediumRiskGate, HighRiskGate / ReReviewObserver / AuthorizationPolicy, User, WorkMember / ReviewRepository, UserRepository

**P0 (45.5점)**
- [ ] **B1** `login` · `logout` · `getCurrentUser` (5점, 11/29) — 이메일·비밀번호(BCrypt 대조) → 서명 토큰. 공개 검증과 로그인 주소만 빼고 모든 요청에서 토큰 확인. 사용자 ID는 토큰에서만 얻음
- [ ] **B2** `AuthorizationPolicy` (4점, 11/29) — `isAuthorized(userId, target, action)`, `getMemberRole`, `addMember`. 역할은 작업별(`WORK_MEMBER.role`). 검토자·승인자를 고를 사용자 찾기(10.2)
- [ ] **B3** USER · WORK_MEMBER DDL·매핑, 시드 계정 5명 (1.5점) — 기존 시연 계정과 같은 구성(작성자 1, 검토자 2, 최종 승인자 2)
- [ ] **B4** `assessRisk` · `GatePolicy` · 전략 3종 (4점) — 점수 범위 0~3 · 0~3 · 0~2 · 0~2, 합계로 등급 계산(경계 4·7은 GATE_POLICY 행에서 읽음). 등급은 저장하지 않음. LOW는 TEACH_BACK 1개(통과 2/2), MEDIUM은 TEACH_BACK + WHAT_IF(3/4), HIGH는 3개(5/6, 치명 오류 없음)
- [ ] **B5** `requestReview(versionId, reviewerId, approverId, message, dueDate)` (4.5점) — 위험 분석 있음, 검토자 ≠ 작성자, 승인자 ≠ 검토자·작성자, 진행 중 요청 없음 → 멤버 등록(REVIEWER·APPROVER) → 과제 배정 → `CHALLENGE_PENDING`. 버전의 검토 요청 조회 포함(10.2)
- [ ] **B6** `getChallenges` · `submitAnswers` (3점) — 답변 20자 이상, 확신 정도 → `REVIEW_PENDING`
- [ ] **B7** `getAssignedRequests` · `startReview` (3.5점) — 저장된 파일의 해시를 등록 당시 값과 대조. 일치하면 Review `IN_PROGRESS`·요청 `IN_REVIEW`·작업 `IN_REVIEW`
- [ ] **B8** `submitReview` · `IReviewResult` (5점) — 통과 조건(등급별 기준, 치명 오류 없음, 체크리스트 4/4, 보완 항목 없음, 메모) 확인. 모자라면 400과 사유 목록. 통과하면 Review `COMPLETED`·Feedback `PASS`·`review_digest` → `APPROVAL_PENDING`. `isPassed`·`getConfirmedResult`는 C가 사용
- [ ] **B9** 03 테이블 11개 DDL·매핑, 시드(체크리스트 4항목, 위험 등급 기준) (4점)
- [ ] **B10** 이해 확인 화면 연동 (3점)
- [ ] **B11** 검토 화면 연동 (5점) — `review-ui.js`의 검토 부분(자료 / 평가 / 체크리스트 / 피드백 탭)
- [ ] **B12** 테스트 (5점 중 P0 3점)

**P1 (14.5점)**
- [ ] **B13** `requestRevision` (3점) — 보완 항목 1개 이상, 기한 → Feedback `REVISION_REQUIRED`·FeedbackItem·Revision `OPEN` → `REVISION_REQUIRED`
- [ ] **B14** `ReReviewObserver` (4점) — 재제출로 생긴 새 버전에 위험 평가·검토 요청·과제를 복사. 근거가 그대로면 답변도 복사, 바뀌었으면 답변을 비움. 평가는 복사하지 않음(DB 문서 "수정본 재제출 때의 행")
- [ ] **B15** `cancelRequest` · `saveAnswers` · `saveReviewDraft` (4.5점) — 취소는 검토 시작 전만, `SUBMITTED`로 복귀
- [ ] **B16** 해시 불일치 중지 (1점) — Review `HALTED`, `HALT_REVIEW` 이력을 직접 기록(상태 변경이 아니므로)
- [ ] **B12** 테스트 나머지 (2점)

### 4.6 팀원 C — 승인·증명서·검증·이력 조회 (04 · 05 · 06 + 07 조회) · 62점

**서버 클래스** ApprovalService, ApprovalCase, Approval, Revocation, OutboxEvent / CertificateService, Certificate, ShareLink, QRCode, CertificateIssueObserver / VerificationService, VerificationResult / HistoryService / ApprovalRepository, CertificateRepository

**P0 (46점)**
- [ ] **C1** `getApprovalCase(versionId)` (4점) — 결정 대상과 승인 조건 5개(지정 승인자, 검토 통과, 버전 일치, 파일 해시 일치, 기존 결정 없음)의 충족 여부. APPROVAL_CASE(PENDING) 행을 언제 만드는지 정해야 함: UC04 순서 다이어그램은 검토 통과 때 Review·Feedback만 저장하므로 04가 처음 조회할 때 만드는 방법이 의존 방향에 맞음
- [ ] **C2** `approve(caseId, key)` (5점) — 자기 승인 금지, 멱등 키, 조건 재확인 → Approval + Certificate(`PENDING`) 저장 → `setWorkStatus(APPROVED)`까지 **한 트랜잭션**. 하나라도 실패하면 전부 롤백(UC06 순서 다이어그램의 critical 영역). 같은 키로 다시 오면 새 기록 없이 기존 결과 반환(`APPROVAL_CASE.decision_key`)
- [ ] **C3** `IApprovalStatus` (2점) — `getApprovalResult`, `getCurrentValidity`(효력과 최신 버전 번호를 따로), `getPendingIssues`
- [ ] **C4** 증명서 내용 정규화·서명·검증·키 관리 (4점) — `immutable_payload`는 키를 정렬한 JSON
- [ ] **C5** `CertificateIssueObserver` · 서명 작업자 (4점) — 옵서버는 `APPROVED` 통지를 받으면 OutboxEvent만 저장(직접 발급하지 않음). 서명 작업자가 커밋된 발급 요청을 주기적으로 읽어 서명 → `READY`, 실패하면 `FAILED`와 `retry_count`. `ISSUE_CERTIFICATE`·`ISSUE_FAILED` 이력, 작성자에게 `CERTIFICATE_ISSUED` 알림
- [ ] **C6** `getCertificate` · `ICertificateData` (3점) — 구성원만. 발급 상태, 승인 효력, 최신 버전 여부, 승인자·시각·대상 버전·해시
- [ ] **C7** `createShareLink(certId, expiresAt)` (2.5점) — 토큰을 만들어 `token_hash`만 저장하고 원문은 응답에 한 번만 실음. `SHARE_LINK_CREATED` 이력
- [ ] **C8** `verify` (4점) — 로그인 없음. 증명서 없음·만료·공유 중지는 내용 없이 "대상 미식별". 세 판정을 따로 계산: 서명(PASS·FAIL), 승인 효력(VALID·REVOKED) + 최신 버전 번호, 파일(MATCH·DIFFERENT·NOT_CHECKED). `VERIFY` 이력을 행위자 없이 기록. 답변 원문·내부 의견·파일 주소는 응답에 넣지 않음
- [ ] **C9** 공개 검증 페이지 (5점) — 고른 PDF는 서버로 보내지 않고 브라우저에서 SHA-256만 계산. 네트워크 오류면 세 판정 모두 "확인 불가"(철회·불일치로 바꾸지 않음). 화면은 `app.js`의 `showVerify`를 옮김
- [ ] **C10** 04·05 테이블 6개 DDL·매핑 (2.5점)
- [ ] **C11** 최종 승인 화면 연동 (4점) — `review-ui.js`의 승인 부분
- [ ] **C12** 증명서 탭 연동 (3점)
- [ ] **C13** 테스트 (5점 중 P0 3점)

**P1 (16점)**
- [ ] **C14** `reject` (2.5점) — 사유 필수 → ApprovalCase `REJECTED` + Revision `OPEN` → `REVISION_REQUIRED`
- [ ] **C15** `revoke(approvalId, reason, key)` (3점) — 권한·멱등 키·미철회 확인 → REVOCATION 저장. 작업 상태는 `APPROVED` 그대로. 상태 변경이 아니므로 `IAuditLog.record`와 `INotification.notify`를 직접 부름
- [ ] **C16** `retryIssue` · `disableShareLink` · 링크 만료 (3점) — 중지는 `disabled_at` 기록. 승인 효력과 다른 링크는 그대로
- [ ] **C17** `getHistory` · `getLatestStatus` · `isChainValid` (3.5점) — 버전·유형 필터, 시간 역순. 해시 확인은 D의 계산 함수를 그대로 사용
- [ ] **C18** 이력 탭 연동 (2점)
- [ ] **C13** 테스트 나머지 (2점)

### 4.7 팀원 D — 기반·저장·이력 기록·알림·통합 · 60점

**서버 클래스** HaveServerBootstrap / IPersistence, Repository‹T›, StubPersistence, JdbcPersistence, DatabaseConnectionPool, (JsonFilePersistence는 P2) / HistoryRepository / AuditLogService, AuditLogObserver, AuditEvent / NotificationGateway, NotificationObserver, Notification

**P0 (46점)**
- [ ] **D1** 프로젝트 뼈대 (5점, 11/28) — 빌드, 패키지, 프로필 2개, 공통 오류 응답(5.1), 코드 값 enum(DB 문서 부록 A와 같은 값). 인터페이스 파일 `IPersistence`·`Repository‹T›`·`IAuditLog`·`INotification` 커밋, 저장 사용 규칙(5.5) 확정
- [ ] **D2** `IPersistence` · `StubPersistence` · `Repository‹T›` (4점, 11/29) — 세 연산(`save`, `getById`, `getByCondition`). `Repository‹T›`가 `IPersistence`를 참조(브리지). 업무 서비스는 Repository만 사용
- [ ] **D3** `JdbcPersistence` · `DatabaseConnectionPool` (6점) — 싱글톤(private 생성자, `getInstance()`, `getConnection()`). 풀에서 연결을 직접 빌려 쓰면 `@Transactional`이 그 연결에 걸리지 않으므로, 풀의 DataSource를 스프링에 등록하고 `JdbcTemplate`으로 실행해야 승인 트랜잭션이 한 연결로 묶임
- [ ] **D4** 스키마 합치기 · `jdbc` 프로필 기동 (3점) — 외래 키 순서에 맞게 합치고 `AUDIT_EVENT`에는 UPDATE·DELETE 권한을 주지 않음
- [ ] **D5** `HaveServerBootstrap` (1.5점) — 프로필에 따라 저장 구현 선택, 옵서버 4종 등록
- [ ] **D6** `AuditLogService.record` · `AuditLogObserver` (5점, 기록은 11/29) — `prev_hash`는 같은 작업의 직전 `event_hash`(첫 행은 0 64자), `event_hash`는 SHA-256(prev_hash + 키를 정렬한 이벤트 내용). 같은 작업에 동시에 기록될 때 순서가 꼬이지 않게 작업 단위로 잠금. 버전 번호가 그 작업의 것인지 검사. 옵서버는 상태 전이를 행동 코드로 바꿔 기록(5.4)
- [ ] **D7** `NotificationGateway.notify` · `NotificationObserver` (3.5점) — 패턴 문서 7장 "상태 전이별 옵서버 반응" 표대로 받는 사람과 유형을 정함. 같은 트랜잭션 안에서 NOTIFICATION 행만 저장하고 바깥으로 보내는 일은 커밋 뒤
- [ ] **D8** AUDIT_EVENT · NOTIFICATION DDL·매핑, `HistoryRepository` (2점)
- [ ] **D9** `ApiClient` · `SessionStore` · `manifest.json` (3점, 11/29) — 기본 주소, 토큰 헤더, 오류를 화면 문구로. `storage` 권한과 서버 주소 추가
- [ ] **D10** 로그인 화면 (3점, 11/29)
- [ ] **D11** 화면 틀 (4점) — 서버에서 불러와 다시 그리는 흐름, "역할 시연" 전환 제거, 라우팅 정리
- [ ] **D12** 저장 구현 공통 테스트 (3점) — 같은 Repository 테스트가 `stub`과 `jdbc`에서 모두 통과
- [ ] **D13** 통합 (6점 중 P0 3점) — 매일 밤 main을 실행해 9절 시나리오의 진행분 확인, `docs/api.md` 관리

**P1 (14점)**
- [ ] **D14** `getNotifications` · `setRead` (1.5점)
- [ ] **D15** 알림 화면 · 팝업 · 배지 (5점) — 읽지 않은 알림 수, "내 확인 필요" 수
- [ ] **D16** 시연용 시드 시나리오 (3점) — 서비스를 순서대로 불러 시연 작업을 만듦. 행 내용은 각 소유자가 제공
- [ ] **D17** `model.js` · `storage.js` · `seed.js` 정리 (1.5점)
- [ ] **D13** 통합 나머지 (3점) — `jdbc`로 전환, 결함 목록, 실행 안내(README)

### 4.8 여러 사람이 만나는 곳

여기서 어긋나면 통합 때 막힙니다. 11/28에 당사자끼리 시그니처를 먼저 맞춥니다.

| 지점 | 당사자 | 맞출 내용 |
| --- | --- | --- |
| `setWorkStatus`와 `StatusChange` | A ↔ B · C · D | 옵서버가 읽는 값(행위자, 새 버전 여부, 재제출 여부, 검토자·승인자·작성자를 찾는 방법) |
| REVISION 행 | B(수정 요청 때 생성) · C(반려 때 생성) · A(재제출 때 닫음) | 상태 값 OPEN → IN_PROGRESS → SUBMITTED, `review_id`와 `case_id` 중 하나만 채움, 보완 기한 |
| 권한 확인과 멤버 등록 | B ↔ A · C | `isAuthorized`에 넘기는 행동 이름 목록, `createWork` 때 AUTHOR 등록 |
| 로그인 화면 ↔ 로그인 API | D ↔ B | 토큰을 주고받는 형식, 만료됐을 때 401 처리 |
| 검토 시작 때 해시 대조 | A ↔ B | 저장된 파일의 현재 해시를 누가 계산하는가(`getReviewTarget`이 파일을 주고 B가 계산 / A가 계산해 함께 반환) |
| 근거자료·AI 신고 잠금 | A ↔ B | `CHALLENGE_PENDING` 이후 02의 수정 요청을 409로 막는 기준 |
| 검토 통과 → 승인 대상 | B ↔ C | `isPassed`, `getConfirmedResult`가 돌려주는 값(통과 여부, 검토 회차, `review_digest`) |
| 알림 직접 호출 | C → D | 철회·증명서 발급 완료는 옵서버가 아니라 `INotification.notify`를 직접 호출 |
| 해시 계산 함수, `HistoryRepository` | D ↔ C | `record`와 `isChainValid`가 같은 함수를 씀. D가 만든 Repository에 C가 조회 메소드를 PR로 추가 |

---

## 5. 공통 계약 — 11/28에 동결

### 5.1 REST 규칙

| 항목 | 규칙 |
| --- | --- |
| 주소 | `/api/…`, 자원 이름은 복수형·소문자·하이픈. 공개 검증만 `/api/public/…` |
| 형식 | JSON(camelCase). 파일이 있는 요청만 multipart. ID는 숫자(BIGINT), 시각은 UTC ISO-8601(화면에서 KST로 표시) |
| 인증 | `Authorization: Bearer <토큰>`. 없거나 틀리면 401 |
| 멱등 키 | 승인·반려·철회는 `Idempotency-Key` 헤더 필수. 같은 키는 기존 결과를 200으로 반환 |
| 오류 본문 | `{ "code": "…", "message": "화면에 보일 한글 문장", "fields": { "칸 이름": "칸별 문장" } }` |
| 상태 코드 | 400 입력 오류·조건 미충족 / 401 로그인 필요 / 403 권한 없음(비구성원 포함, 내용 노출 없음) / 404 없음(공개 검증의 "대상 미식별" 포함) / 409 상태 충돌·같은 파일·진행 중 요청·이미 결정됨 |
| 문구 | 오류 문장은 확장 프로그램의 기존 문구(`model.js`의 `requireThat` 메시지)를 그대로 씀 |
| 입력 검사 | 화면과 서버가 모두 하고 서버가 최종 판단. 길이 제한은 DB 문서 6단계의 형식과 같음 |

### 5.2 엔드포인트 초안

오퍼레이션 이름은 컴포넌트 다이어그램 v2의 인터페이스 표와 같습니다. 주소는 초안이며 11/28에 확정해 `docs/api.md`로 옮깁니다. "추가"는 설계서에 없어 새로 필요한 것입니다(10.2).

| 인터페이스 · 오퍼레이션 | 메서드 · 주소 | 담당 | UC |
| --- | --- | --- | --- |
| IAuthorization.login | POST `/api/auth/login` | B | 공통 |
| IAuthorization.logout | POST `/api/auth/logout` | B | 공통 |
| IAuthorization.getCurrentUser | GET `/api/auth/me` | B | 공통 |
| (추가) 사용자 찾기 | GET `/api/users?keyword=` | B | UC03 |
| IWorkAPI.createWork | POST `/api/works` | A | UC01 |
| IWorkAPI.getWorks | GET `/api/works?role=&status=&keyword=` | A | UC09 |
| IWorkAPI.getWork | GET `/api/works/{workId}` | A | 공통 |
| IWorkAPI.uploadVersion | POST `/api/works/{workId}/versions` (multipart) | A | UC02 |
| IWorkAPI.addContribution | POST `/api/versions/{versionId}/contributions` | A | UC01 |
| IWorkAPI.addEvidence | POST `/api/versions/{versionId}/evidences` | A | UC02 |
| IWorkAPI.resubmit | POST `/api/works/{workId}/resubmissions` (multipart) | A | UC05 |
| (추가) 결과물 파일 내려받기 | GET `/api/versions/{versionId}/file` | A | UC04 · UC06 |
| IReviewAPI.assessRisk | POST `/api/versions/{versionId}/risk-assessments` | B | UC03 |
| IReviewAPI.requestReview | POST `/api/versions/{versionId}/review-requests` | B | UC03 |
| (추가) 버전의 검토 요청 조회 | GET `/api/versions/{versionId}/review-request` | B | UC03 |
| IReviewAPI.cancelRequest | POST `/api/review-requests/{requestId}/cancel` | B | UC03 |
| IReviewAPI.getChallenges | GET `/api/review-requests/{requestId}/challenges` | B | UC03 |
| IReviewAPI.saveAnswers | PUT `/api/review-requests/{requestId}/answers` | B | UC03 |
| IReviewAPI.submitAnswers | POST `/api/review-requests/{requestId}/answers/submit` | B | UC03 |
| IReviewAPI.getAssignedRequests | GET `/api/review-requests?assignee=me` | B | UC04 |
| IReviewAPI.startReview | POST `/api/review-requests/{requestId}/review/start` | B | UC04 |
| IReviewAPI.saveReviewDraft | PUT `/api/review-requests/{requestId}/review/draft` | B | UC04 |
| IReviewAPI.submitReview | POST `/api/review-requests/{requestId}/review/submit` | B | UC04 |
| IReviewAPI.requestRevision | POST `/api/review-requests/{requestId}/review/revision-request` | B | UC04 |
| IApprovalAPI.getApprovalCase | GET `/api/versions/{versionId}/approval-case` | C | UC06 |
| IApprovalAPI.approve | POST `/api/approval-cases/{caseId}/approve` | C | UC06 |
| IApprovalAPI.reject | POST `/api/approval-cases/{caseId}/reject` | C | UC06 |
| IApprovalAPI.revoke | POST `/api/approvals/{approvalId}/revoke` | C | UC10 |
| ICertificateAPI.getCertificate | GET `/api/certificates/{certId}` (승인 ID로 찾기는 `?approvalId=`, 추가) | C | UC07 |
| ICertificateAPI.retryIssue | POST `/api/certificates/{certId}/retry-issue` | C | UC07 |
| ICertificateAPI.createShareLink | POST `/api/certificates/{certId}/share-links` | C | UC07 |
| ICertificateAPI.disableShareLink | POST `/api/share-links/{linkId}/disable` | C | UC07 |
| ICertificateAPI.createQRCode | (P2) 공유 링크 응답에 함께 | C | UC07 |
| IVerificationAPI.verify · verifyByQR | POST `/api/public/verifications` (토큰 없음) | C | UC08 |
| IHistoryQuery.getHistory | GET `/api/works/{workId}/history?versionNo=&type=` | C | UC09 |
| IHistoryQuery.getLatestStatus | GET `/api/works/{workId}/status` | C | UC09 |
| IHistoryQuery.isChainValid | GET `/api/works/{workId}/history/chain` | C | UC09 |
| INotificationQuery.getNotifications | GET `/api/notifications` | D | UC09 |
| INotificationQuery.setRead | POST `/api/notifications/{notificationId}/read` | D | UC09 |

요청·응답 본문은 담당자가 11/28까지 `docs/api.md`의 자기 줄 아래에 예시 JSON으로 적습니다. 응답 필드 이름은 클래스 v3의 속성 이름을 씁니다.

### 5.3 서버 내부 인터페이스

Java `interface` 파일을 11/28에 먼저 커밋하고, 11/29까지 고정 값을 돌려주는 스텁 구현을 올립니다. 그러면 구현이 끝나지 않아도 서로 호출하는 코드를 쓸 수 있습니다.

| 인터페이스 | 제공 | 쓰는 쪽 | 오퍼레이션 |
| --- | --- | --- | --- |
| IWorkVersion | 02 (A) | 03 · 04 | getReviewTarget, getVersionHash, setWorkStatus |
| WorkStatusObserver | 02가 정의 (A) | 03 · 05 · 07이 구현 | update(subject) |
| IReviewResult | 03 (B) | 04 | getConfirmedResult, isPassed |
| IAuthorization | 01 (B) | 02 ~ 05 | isAuthorized, getMemberRole, addMember, getCurrentUser |
| IApprovalStatus | 04 (C) | 05 · 06 | getApprovalResult, getCurrentValidity, getPendingIssues |
| ICertificateData | 05 (C) | 06 | getCertificateData, getSignature |
| IAuditLog | 07 (D) | 02 ~ 06 | record |
| INotification | 07 (D) | 02 · 03 · 04 · 05 | notify |
| IPersistence · Repository‹T› | 08 (D) | 01 ~ 05 · 07 | save, getById, getByCondition |
| FileStore | 08 (A) | 02 | put, get, delete |

02는 옵서버 인터페이스만 정의하고 구현 클래스를 모릅니다. 등록은 `HaveServerBootstrap`에서만 합니다(순환 의존 방지).

### 5.4 상태 변경과 이력·알림

- 작업 버전의 상태는 `setWorkStatus`로만 바꿉니다. 서비스가 `WORK_VERSION.status`를 직접 고치지 않습니다.
- 옵서버는 상태를 바꾼 서비스의 트랜잭션 안에서 동기로 실행되고 같은 DB에 행만 저장합니다. 하나라도 실패하면 상태 변경까지 롤백합니다. 서명과 알림 전송처럼 실패할 수 있는 바깥 일은 커밋 뒤의 처리기가 합니다.
- 옵서버 실행 순서에 기대는 로직을 만들지 않습니다.
- 트랜잭션은 서비스 메서드 단위입니다. Repository와 옵서버는 트랜잭션을 새로 열지 않습니다.

이력을 두 번 남기거나 빠뜨리지 않도록, 행동 코드 21개를 누가 남기는지 나눕니다(순서 다이어그램 기준).

| 남기는 곳 | 행동 코드 |
| --- | --- |
| `AuditLogObserver`(상태 전이를 받아 기록, D) | UPLOAD_VERSION, REQUEST_REVIEW, CANCEL_REQUEST, SUBMIT_ANSWERS, START_REVIEW, PASS_REVIEW, REQUEST_REVISION, RESUBMIT, APPROVE, REJECT |
| 서비스가 `IAuditLog.record`를 직접 호출(상태가 바뀌지 않는 일) | A: CREATE_WORK, ADD_CONTRIBUTION / B: ASSESS_RISK, HALT_REVIEW / C: ISSUE_CERTIFICATE, ISSUE_FAILED, RETRY_ISSUE, SHARE_LINK_CREATED, SHARE_LINK_DISABLED, REVOKE, VERIFY |

알림 10종의 받는 사람은 패턴 문서 7장의 표를 따르고, 화면 문구는 클라이언트가 유형으로 만듭니다(`model.js`의 `NOTIFICATION`).

### 5.5 저장 계약 (권장 기본값, D가 11/28 확정)

| 항목 | 규칙 |
| --- | --- |
| 매핑 | 엔티티마다 테이블 이름과 열 ↔ 필드 대응을 한 곳에 적음. 테이블 소유자가 작성 |
| `getByCondition`의 조건 | 열 이름 → 값의 묶음(같음 비교, 모두 AND). 그 밖의 조건과 정렬은 Repository 안에서 처리 |
| 복합 키 테이블 | `getById` 대신 `getByCondition`으로 조회 |
| DB가 지키는 제약 | UNIQUE, 복합 외래 키, CHECK, 조건부 유니크 인덱스(DB 문서 "제약을 지키는 위치"의 DB 항목) |
| 서비스가 지키는 제약 | 같은 표의 "서비스" 항목(자기 검토·자기 승인 금지, 재제출 전 모든 보완 항목 답변 등) |
| 동시 수정 | `WORK_VERSION.revision`을 낙관적 잠금 번호로 사용 |
| 두 구현의 일치 | 같은 Repository 테스트를 `stub`과 `jdbc`에서 모두 통과. 롤백 확인은 `jdbc`에서만 의미가 있음 |

### 5.6 코드 값

DB 문서 부록 A가 유일한 기준입니다. 서버는 `common`의 enum, 클라이언트는 `model.js`의 상수(STATUS, EFFECT, SIGNING 등)를 쓰고 값이 같아야 합니다. 작업 버전 상태 8개(`DRAFT`, `SUBMITTED`, `CHALLENGE_PENDING`, `REVIEW_PENDING`, `IN_REVIEW`, `REVISION_REQUIRED`, `APPROVAL_PENDING`, `APPROVED`), 승인 효력 3개(VALID·REVOKED·NONE, 저장하지 않고 계산), 위험 등급 3개(저장하지 않고 계산), 알림 10종, 행동 코드 21개입니다.

---

## 6. 확장 프로그램 전환

### 6.1 바뀌는 것

| | 지금(1.1.0) | 전환 뒤 |
| --- | --- | --- |
| 저장 | 작업 공간 전체를 IndexedDB 한 칸에 | 서버 DB. 브라우저에는 토큰과 등록 마법사 임시 저장만 |
| 규칙 실행 | `model.js`·`review-model.js`가 새 상태를 계산 | 서버 서비스. 클라이언트는 호출하고 결과를 다시 불러와 그림 |
| 사용자 | 고정 시연 계정을 "역할 시연" 메뉴로 전환 | 로그인한 사용자. "검토할 작업"·"승인할 작업"은 그 사용자의 것만 |
| 발급 | 브라우저에서 흉내(`processOutbox`) | 서버 서명. 화면은 발급 상태를 다시 조회 |
| 공개 검증 | 확장 프로그램 안의 화면 | 서버가 내려 주는 공개 웹 페이지 |

### 6.2 파일과 소유자

`app.js`(925줄)에 모든 화면이 있어 네 명이 동시에 고치면 충돌이 납니다. **11/28에 A가 "옮기기만 하는" PR(A1)로 화면별 파일로 나누고**, 그 PR이 합쳐지기 전에는 아무도 `app.js`·`review-ui.js`를 고치지 않습니다.

| 파일 | 내용(패키지 다이어그램 레벨 3의 화면 클래스) | 소유 |
| --- | --- | --- |
| `scripts/api/api-client.js` | ApiClient, SessionStore | D |
| `scripts/api/work-api.js` | IWorkAPI 호출 | A |
| `scripts/api/auth-api.js` · `review-api.js` | IAuthorization, IReviewAPI 호출 | B |
| `scripts/api/approval-api.js` · `certificate-api.js` · `history-api.js` | IApprovalAPI, ICertificateAPI, IHistoryQuery 호출 | C |
| `scripts/api/notification-api.js` | INotificationQuery 호출 | D |
| `scripts/app.js` | 화면 틀(AppShell), 라우팅, 불러오기·다시 그리기 | D |
| `scripts/screens/login.js` | 로그인 | D |
| `scripts/screens/works.js` | 작업 목록·작업 상세 개요(WorkListView, WorkDetailView) | A |
| `scripts/registration.js` | 등록 마법사(RegisterWizardView) | A |
| `scripts/screens/revise.js` | 수정본 재제출(RevisionView) | A |
| `scripts/screens/challenge.js` | 이해 확인(GateAnswerView) | B |
| `scripts/screens/review.js` | 검토(ReviewPanelView) | B |
| `scripts/screens/approval.js` | 최종 승인(ApprovalView) | C |
| `scripts/screens/certificate.js` · `history.js` | 작업 상세의 증명서 탭·이력 탭 | C |
| `scripts/screens/notifications.js` | 알림(NotificationView) | D |
| `scripts/popup.js` · `background.js` · `manifest.json` | 팝업(PopupView), 배지, 권한 | D |
| `scripts/model.js` | 코드 값·라벨·화면용 계산·입력 검사만 남김 | 전원(자기 영역만) |
| `scripts/storage.js` · `seed.js` · `review-model.js` | 전환이 끝나면 삭제(임시 저장은 SessionStore 쪽으로) | D가 정리 |

API 모듈의 함수 이름은 서버 오퍼레이션과 같게 씁니다(`workApi.createWork(…)`). 서버 응답을 기존 `show…` 함수가 받던 모양으로 바꾸는 일은 API 모듈 안에서 해서 화면 코드를 덜 고칩니다.

### 6.3 `model.js` · `review-model.js`의 함수가 가는 곳

| 구분 | 함수 | 처리 |
| --- | --- | --- |
| 클라이언트에 남김 | STATUS·EFFECT·SIGNING 등 라벨, `getStatus`, `getRiskTotal`, `getRiskLevel`, `getGateRule`, `getNotificationText`, `prepareFile`(해시 계산) | 화면 표시와 미리 보기용. 최종 판단은 서버 |
| 양쪽에 둠 | `getRegistrationErrors`, `getAnswerErrors`, `getBasisErrors`, `isHttpUrl` | 화면은 즉시 검사, 서버는 같은 규칙으로 다시 검사 |
| 서버로 옮김 (A) | `registerWork`의 작업·버전·근거 부분, `openRevision`, `resubmit`, `isBasisChanged`, `isAllResolved`, `getWorks` | 02 서비스 |
| 서버로 옮김 (B) | `registerWork`의 위험 분석·검토 요청 부분, `requestReviewAgain`, `cancelRequest`, `saveAnswers`, `submitAnswers`, `startReview`, `isFileIntact`, `submitReview`, `requestRevision`, `isPassed`, `getReviewBlockers`, `getRevisionBlockers` | 03 서비스 |
| 서버로 옮김 (C) | `getApprovalConditions`, `approve`, `reject`, `revoke`, `processOutbox`, `retryIssue`, `createShareLink`, `disableShareLink`, `getShareLink`, `getPublicSummary`, `recordVerification`, `getEffect`, `getLatestInfo`, `isChainValid` | 04 · 05 · 06 서비스, 07 조회 |
| 서버로 옮김 (D) | `record`, `sealEvents`(해시 체인), `notify`, `getNotifications`, `setRead` | 07 기록·알림 |
| 서버 조회로 대체 | `getPendingWorks`, `getApprovedWorks` | 검토 대기 목록은 B의 `getAssignedRequests`, 승인 대기·승인 완료 목록은 A의 `getWorks` 필터 |

옮길 때는 해당 JavaScript 함수와 유스케이스 명세의 "대안·예외"를 나란히 놓고 조건을 하나씩 대조합니다. 11-23에 만든 모델 테스트 `model.test.js`(전체 흐름, 재제출, 반려·취소, 해시 불일치, 입력 검사)의 시나리오를 서버 테스트 이름으로 그대로 가져옵니다. 이 파일은 지금 저장소에 없고 작성자 PC의 `1123/_소스/test/`에 있으므로 착수할 때 저장소에 올립니다.

### 6.4 화면이 데이터를 얻는 방법

- 화면(탭)마다 그 서브시스템의 API를 부릅니다. 작업 상세는 IWorkAPI, 이해 확인·검토는 IReviewAPI, 승인은 IApprovalAPI, 증명서는 ICertificateAPI, 이력은 IHistoryQuery입니다. 02가 03~05의 데이터를 대신 모아 주지 않습니다(의존 방향).
- 명령을 보낸 뒤에는 해당 작업을 서버에서 다시 불러와 그립니다. 클라이언트가 다음 상태를 추측하지 않습니다.
- 등록 마법사는 화면 순서를 그대로 두고, 마지막에 `createWork → uploadVersion → addContribution → addEvidence → assessRisk → requestReview` 순서로 호출합니다. 중간에 실패하면 어디까지 저장됐는지 보여 주고 그 단계부터 다시 시도하게 합니다.
- `manifest.json`: `permissions`에 `storage` 추가, `host_permissions`에 서버 주소(`http://localhost:8080/*`) 추가, 버전을 1.2.0으로 올립니다.
- 세 역할을 한 PC에서 시연하려면 Chrome 프로필을 세 개 쓰거나 로그아웃 후 다른 계정으로 로그인합니다.

---

## 7. 일정 (11/28 토 ~ 12/4 금)

`have_4.md`의 3단계(기반·인터페이스 합의 → 병렬 구현 → 통합·예외 검증)를 날짜에 맞췄습니다. 주말을 포함한 계획입니다.

| 날짜 | 단계 | A | B | C | D |
| --- | --- | --- | --- | --- | --- |
| 11/28(토) | **Phase 1 계약 동결** — 10절 결정, 5.2·5.3 확정, 인터페이스 파일 커밋 | A1, `IWorkVersion`·`StatusChange`·`Revision` 시그니처 | `IAuthorization`·`IReviewResult` 시그니처, B3, B1 시작 | `IApprovalStatus`·`ICertificateData` 시그니처, C4 시험, C10 | D1, `IPersistence`·`IAuditLog`·`INotification` 시그니처, 저장 규칙 |
| 11/29(일) | **Phase 2-① 뼈대 연결** — 확장 프로그램에서 로그인 → 작업 생성 → 목록이 `stub` 서버로 동작 | A2, A6, A7 | B1, B2 | C1, C10 | D2, D9, D10, D6(기록) |
| 11/30(월) ~ 12/1(화) | **Phase 2-② 정상 흐름(P0)** — 12/1 밤 시나리오 S1을 화면으로 끝까지 | A3~A5, A8~A13 | B4~B12 | C2~C13 | D3~D5, D6(옵서버), D7, D8, D11~D13 |
| 12/2(수) ~ 12/3(목) 18시 | **Phase 2-③ 되돌아가는 흐름(P1) + DB 전환** — 12/2에 `jdbc`로 S1 통과, 12/3 18시 기능 동결 | A14~A16 | B13~B16 | C14~C18 | D14~D17 |
| 12/3(목) 밤 | **Phase 3 통합·예외 검증** — S1~S13 전부, 코드 검사, 결함 수정만 | 결함 수정 | 결함 수정 | 결함 수정 | 결함 목록 관리, 실행 안내 |
| 12/4(금) | **마감** — `jdbc`로 최종 확인, 설계 변경 기록 정리, 시연 리허설, 태그 | | | | |

- P0 184점을 12/1까지 끝내려면 한 사람이 하루 11점 안팎을 해야 해서 빠듯합니다. 12/1 밤에 S1이 안 되면 P0를 12/2까지 이어 가고, P1은 4.3의 순서대로 줄입니다.
- 12/3 18시 이후에는 새 기능을 넣지 않습니다.

다른 사람이 기다리는 것부터 끝냅니다.

| 기한 | 내놓는 사람 | 받는 사람 | 무엇 |
| --- | --- | --- | --- |
| 11/28 | D | 전원 | 빌드되고 실행되는 뼈대, 인터페이스 파일, 공통 오류 형식 |
| 11/28 | A | 전원 | `app.js` 분리 PR, `IWorkVersion`·`StatusChange` 시그니처 |
| 11/29 | D | 전원 | `StubPersistence`, ApiClient, `record` |
| 11/29 | B | 전원 | 로그인·토큰, `isAuthorized`·`addMember` |
| 11/29 | A | B · C | 동작하는 `setWorkStatus`(전이 검사 + 옵서버 호출) |
| 11/30 | B | C | `isPassed`·`getConfirmedResult` 스텁(실제 구현은 12/1) |
| 11/30 | D | 전원 | `AuditLogObserver`·`NotificationObserver` 등록 |
| 12/1 | D | 전원 | `jdbc` 프로필로 서버 기동, 스키마 1차 합본 |

---

## 8. 협업 규칙

### 8.1 Git

- `main`에 직접 올리지 않습니다. 기능 브랜치 `feat/<담당>-<항목>-<요약>`(예: `feat/b-b5-request-review`)에서 PR을 만듭니다.
- PR은 작게, 하루 한 번 이상 `main`에 합칩니다. 오래 묵힌 브랜치가 통합을 막습니다.
- 커밋 제목은 `[UC02] 직전 버전과 같은 파일이면 409`처럼 유스케이스(또는 `[공통]`)를 앞에 붙입니다.
- 자기 소유가 아닌 파일을 고치면 소유자가 검토합니다. 계약(`docs/api.md`, 인터페이스 파일, `db/schema`)을 바꾸는 PR은 전원에게 알립니다.
- 검토 짝 ★: A ↔ B, C ↔ D. 검토자 한 명이 승인하면 합칩니다.
- 비밀번호, DB 접속 정보, 서명 키, 업로드된 파일은 올리지 않습니다.

### 8.2 코딩 표준 (Ch10)

- 클래스·인터페이스는 대문자로 시작하는 명사, 메소드는 소문자로 시작하는 동사구, 상수는 대문자, 패키지는 소문자.
- 오퍼레이션 이름은 설계서와 같게. 새 메소드도 `is`·`get`·`set`·`show` 규칙.
- 클래스 위에 용도 한 줄, 공개 메소드에 하는 일·매개변수·반환값(Javadoc). 대응하는 유스케이스 단계나 순서 다이어그램 번호를 적으면 추적이 쉽습니다.
- 블록에는 항상 중괄호, 들여쓰기 4칸. JavaScript는 기존 파일의 스타일을 따릅니다.
- 상태 다이어그램의 가드는 메소드 안의 조건 검사로, 순서 다이어그램의 메시지는 받는 쪽 클래스의 메소드로 구현합니다.

### 8.3 테스트와 완료 기준

테스트 최소선: 서비스 메소드마다 정상 1개와 예외 1개 이상(`stub`), 유스케이스마다 API 수준 흐름 1개, Repository는 `stub`과 `jdbc` 양쪽.

한 항목이 "끝났다"(점수를 뺀다)는 것은 다음을 모두 만족한다는 뜻입니다.

1. 클래스·오퍼레이션·코드 값이 설계서와 같다
2. 서버 테스트가 통과한다
3. 확장 프로그램 화면에서 정상 흐름과 대표 예외가 동작한다
4. 감사 이벤트와 알림이 5.4대로 남는다
5. 검토자 한 명이 PR을 승인했다
6. 설계와 달라진 점을 `docs/design-changes.md`에 적었다

### 8.4 코드 검사 (Ch11)

12/3 밤에 검토 짝끼리 일대일로, 한 건에 30분 안팎으로 검사합니다(시간이 모자랄 때의 일대일 검사). 오류를 찾는 자리이고 고치는 방법은 저자가 따로 정합니다.

| 저자 | 검사 대상 | 검사자 |
| --- | --- | --- |
| A | `setWorkStatus`와 `resubmit` | B |
| B | `submitReview`(통과 조건)와 `isAuthorized` | A |
| C | `approve`(트랜잭션·멱등 키)와 `verify` | D |
| D | `AuditLogService.record`(해시 체인)와 `JdbcPersistence` | C |

기록은 유형(DA 데이터 · DC 문서 · FN 기능 · LO 논리 · PF 성능 · ST 표준 · OT 기타) × 종류(M 실종 · W 실수 · E 불필요) × 심각도로 남깁니다. 검사 기록을 제출물에 넣어야 하는지는 과제 공지를 확인합니다 ★.

### 8.5 설계 변경 기록

`docs/design-changes.md`에 한 줄씩 적습니다.

| 날짜 | 무엇을 추가·변경 | 이유 | 고쳐야 할 산출물 | 반영 |
| --- | --- | --- | --- | --- |
| 11/28 | 예: `IAuthorization.getUsers(keyword)` 추가 | 검토자·승인자 선택 목록 | 컴포넌트 표, 클래스 v3 아래 패널, 구조유형 7절 | 미반영 |

### 8.6 매일 공유

정한 시각(예: 22:00)에 15분. 각자 **남은 점수**, 오늘 끝낸 항목, 막힌 것만 말합니다. 그 자리에서 D가 `main`을 실행해 보여 주고, 남은 점수 차이가 8점을 넘으면 4.3대로 항목을 옮깁니다. 막힌 것이 다른 사람의 산출물이면 그 자리에서 기한을 정합니다.

---

## 9. 통합 시나리오

12/3 밤에 전부 통과해야 합니다. S1은 12/1, 나머지는 12/3 18시까지 담당자가 먼저 확인합니다.

| 번호 | 시나리오 | 확인할 것 | 주 담당 |
| --- | --- | --- | --- |
| S1 | 로그인 → UC01 → UC02 → UC03(답변 제출) → [검토자] UC04 통과 → [승인자] UC06 승인 → 발급 완료 → UC07 공유 링크 → [로그인 없이] UC08 | 상태 8개가 순서대로, 공개 검증이 "승인 유효 · 서명 통과 · 파일 일치" | 전원 |
| S2 | 수정 요청 → 재제출(근거 그대로) | 새 버전 `REVIEW_PENDING`, 답변·위험 평가 복사, 평가 초기화, 검토자에게 "재제출" 알림 | A · B |
| S3 | 수정 요청 → 재제출(근거 변경) | 새 버전 `CHALLENGE_PENDING`, 이전 답변은 "v1 답변 · 참고", 답변 제출 뒤 검토자 알림 | A · B |
| S4 | 최종 승인자 반려 → 재제출 | 사유 필수, `REVISION_REQUIRED`, 승인은 새 버전으로 넘어가지 않음 | C · A |
| S5 | 검토 요청 취소 → 다시 요청 | `SUBMITTED`로 복귀, 검토 시작 뒤에는 취소 불가 | B |
| S6 | 저장된 파일을 바꾼 뒤 검토 시작 | 검토 중지(`HALTED`), 위·변조 경고, `HALT_REVIEW` 이력 | B · A |
| S7 | 승인 → 철회 → 새 버전 등록 | 작업 상태는 `APPROVED` 그대로, 공개 검증에 "v1 승인 철회 · 후속 버전 v2 있음"이 함께 표시 | C |
| S8 | 공유 링크 두 개 중 하나 중지 | 중지한 링크는 "대상 미식별", 다른 링크와 승인 효력은 그대로 | C |
| S9 | 발급 실패 → 재시도 | 승인은 유지, `FAILED` → `READY`, 이력 2건 | C |
| S10 | 권한과 중복 요청 | 자기 검토·자기 승인 차단, 비구성원 403, 같은 멱등 키는 기존 결과 | B · C |
| S11 | 입력 오류 | PDF 아님·20MB 초과 400, 같은 파일 409, 답변 20자 미만, 점수 범위 | A · B |
| S12 | 이력과 알림 | 이력이 시간 역순, 해시 체인 "이상 없음", DB에서 한 행을 고치면 경고, 알림 읽음 처리 | C · D |
| S13 | 서버를 끈 상태의 공개 검증 | 세 판정 모두 "확인 불가" | C |

---

## 10. 착수 회의에서 정할 것 ★

### 10.1 결정

| 번호 | 결정할 것 | 추천 |
| --- | --- | --- |
| 1 | 서버 스택 | Java 21 + Spring Boot + PostgreSQL (2절). 오늘 안에 확정 |
| 2 | A~D에 누가 들어가는가 | 확장 프로그램을 가장 잘 아는 사람이 A(분리 PR을 맡음) |
| 3 | 점수가 맞는가 | 4.4~4.7의 항목 점수를 훑어보고 틀린 것은 고친 뒤 합계를 다시 맞춤 |
| 4 | 각자 하루에 쓸 수 있는 시간 | 합쳐서 하루 35점에 못 미치면 P1을 4.3의 순서대로 미리 줄임 |
| 5 | 시연 환경 | 로컬(`localhost`) 기준. 배포는 P2 |
| 6 | 등록 화면 순서(v3에서 남긴 항목) | 화면은 그대로(파일 → AI 신고 → …), 서버 호출만 유스케이스 순서로(6.4) |
| 7 | QR(v3에서 남긴 항목) | P2. 공유 링크를 만든 직후 응답에 함께 주고 저장하지 않음(UC07 후행 조건) |
| 8 | 근거자료 유형 | 4종(DB 부록 A). `addEvidence` 하나로 받고 유형으로 구분 |
| 9 | 공유 링크를 만들고 중지할 수 있는 사람(v3에서 남긴 항목) | 그 작업의 구성원 전원(UC07의 주 액터) |
| 10 | ApiClient의 위치 | 측면 패널 페이지에서 직접 호출(파일 업로드가 있어서). 서비스 워커는 배지 갱신에만 같은 모듈 사용 |
| 11 | 검토 짝, 매일 공유 시각 | 8.1, 8.6 |

### 10.2 구현하려면 설계서에 더해야 하는 것

REST로 만들면 반드시 필요한데 v3 설계서에 없는 것들입니다. 추가하기로 하면 `docs/design-changes.md`에 적고 마감 뒤 산출물에 반영합니다. 유스케이스는 늘어나지 않습니다.

| 번호 | 없는 것 | 제안 | 고칠 산출물 |
| --- | --- | --- | --- |
| 1 | 01 · 04 · 05 · 06 · 07의 요청 진입점. Controller가 02(4개)·03(2개)에만 있음 | AuthController, ApprovalController, CertificateController, VerificationController, HistoryController, NotificationController | 클래스 v3 아래 패널 ⑤, 패키지 레벨 3, 구조유형 5절, 서버 타입 수(79개) |
| 2 | 검토자·최종 승인자를 고를 사용자 목록 | `IAuthorization.getUsers(keyword)` | 컴포넌트 표, 클래스 v3, UC03 순서 다이어그램 |
| 3 | 검토자·승인자가 결과물 PDF를 여는 방법 | `IWorkAPI.getVersionFile(versionId)`(구성원만) | 컴포넌트 표, UC04·UC06 순서 다이어그램 |
| 4 | 버전 ID로 진행 중인 검토 요청을, 승인 ID로 증명서를 찾는 조회 | `IReviewAPI.getReviewRequest(versionId)`, `ICertificateAPI.getCertificate`에 승인 ID 조회 | 컴포넌트 표 |
| 5 | 서명 작업자(Outbox 처리기)와 토큰 확인의 클래스 이름 | 순서 다이어그램의 "서명 작업자"를 클래스로(예: OutboxProcessor) | 클래스 v3, 패키지 레벨 3 |

### 10.3 설계서 안에서 서로 다른 곳

구현 전에 어느 쪽을 따를지 정해 둡니다.

| 곳 | 내용 | 따를 쪽(제안) |
| --- | --- | --- |
| DB 문서 "수정본 재제출 때의 행" | `REVISION.base_version_id`로 이전 답변을 찾는다고 적혀 있으나 최종 스키마에는 그 열이 없음(정규화 때 삭제) | 최종 스키마. 수정 전 버전은 REVISION → REVIEW → REVIEW_REQUEST.version_id(반려면 APPROVAL_CASE.version_id)로 찾음 |
| 근거자료 등록 | 컴포넌트 표는 `addEvidence` 하나, 클래스 v3은 `addWebSource`·`addSupportFile` 둘, DB는 유형 4종 | 10.1의 8번 |
| 승인 대상 생성 | APPROVAL_CASE(PENDING)를 만드는 메시지가 UC04·UC06 순서 다이어그램에 없음 | 4.6의 C1 |
| ApiClient | 구조유형 3절은 서비스 워커, 패키지 레벨 3은 "background · common-ui" | 10.1의 10번 |
| 증명서 발급 알림 | 알림 유형에 `CERTIFICATE_ISSUED`가 있는데 컴포넌트 표의 `INotification` 사용처(02 · 03 · 04)에 05가 없음 | 05가 발급 완료 뒤 `notify`를 호출하고 사용처에 05를 더함 |

---

## 11. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 7일 안에 다 못 끝냄 | P0를 먼저 끝내고 12/3 18시 이후 새 기능 금지. P1은 4.3의 순서로 줄이고, 줄인 사람은 다른 사람의 항목을 가져감 |
| 점수 추정이 틀려 한 사람에게 몰림 | 매일 남은 점수를 공유하고 차이가 8점을 넘으면 4.3의 표에서 옮김 |
| 스택 결정이 늦어짐 | 11/28 안에 확정. 미정이면 추천안으로 시작 |
| 기반이 늦어 세 명이 멈춤 | 기반을 D(뼈대·저장·ApiClient)와 B(로그인·권한)가 나눠 11/29까지 스텁 수준으로 먼저 냄. JDBC는 그 뒤 |
| JavaScript 규칙을 Java로 옮기며 조건이 달라짐 | 6.3의 대응표로 함수 단위 이식, 기존 테스트 시나리오를 서버 테스트로, 9절로 최종 확인 |
| `stub`에서는 되는데 DB에서는 안 됨 | Repository 테스트를 두 구현에 실행(D12), 12/2부터 `jdbc`로 통합 |
| 승인만 저장되고 발급 요청이 빠짐 | 5.4의 트랜잭션 규칙, D3의 연결 주의, C2를 코드 검사 대상으로 지정 |
| 같은 파일을 여럿이 고쳐 충돌 | 6.2의 파일 소유, 11/28 분리 PR, 작은 PR을 자주 |
| 설계와 코드가 어긋남 | 이름은 설계서 그대로, 달라지면 8.5에 기록하고 마감 뒤 반영 |
| 서버 연동판이 시연 때 불안정 | 로컬 시연판(1.1.0)이 `팀원공유용_v3/10_HCI`에 그대로 있어 대체 시연 가능 |
