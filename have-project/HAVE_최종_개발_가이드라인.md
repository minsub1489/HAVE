# HAVE 최종 개발 가이드라인 — 클라이언트–서버 구조 · 4인 균등 분담

작성 2026-11-28 · 개정 2026-11-28 저녁(두 단계 진행으로 개편) · 기준 산출물 `팀원공유용_v3` · 개발 마감 2026-12-04(금)

`1125` 폴더의 두 문서를 하나로 합친 최종본입니다. 분담 · 일정 · 규칙은 이 문서 하나만 보면 되도록 썼습니다. 주고받는 JSON은 `docs/api.md`, 설계와 달라진 점은 `docs/design-changes.md`에 있습니다.

**두 단계로 진행합니다.** 11/30(월) 18시까지는 네 명이 연락하거나 중간 결과를 나누지 않고 각자 일합니다(1단계). 11/30 저녁에 한 번에 합친 뒤, 통합이 있어야 할 수 있는 일을 다시 나눠 12/3까지 진행합니다(2단계). 1단계에는 다른 사람의 중간 결과 없이 끝낼 수 있는 일만 넣었습니다. 그렇게 할 수 있도록 서로 맞물리는 곳(인터페이스 · 저장 대응 · 코드 값 · 스키마 · API)을 모두 코드와 문서로 고정했고, 다른 사람의 구현이 없어도 서버와 테스트가 돌도록 공용 대역을 넣어 두었습니다.

**11/28 개정 이력**

| 바뀐 것 | 내용 | 절 |
| --- | --- | --- |
| 스택 확정(오후) | Java 21 + Spring Boot 4.1.3 + JDBC + PostgreSQL | 2 |
| 미리 만들어 둔 것(오후) | 서버 뼈대, 서브시스템 사이 인터페이스, 코드 값 enum 18개, 테이블 31개의 스키마 SQL, `app.js` 화면별 분리, `docs/api.md`, `AGENTS.md` | 3.2, 5, 6.2 |
| 알림 받을 사람(오후) | 검토자 · 최종 승인자는 작업마다 한 명. 02가 `IAuthorization.getMembers`로 `StatusChange`에 채움 | 5.4 |
| **두 단계 진행(저녁)** | 1단계 각자 작업 → 11/30 통합 → 2단계 재분담. 열린 항목 18건을 모두 결정. 계약을 더함(저장 대응 `TableMapping`, `TokenService`, `createRevision`, `getWorkIds` · `getUsers`, `ReviewTarget` 필드). 공용 대역 · `StubPersistence`를 넣음. 로그인의 토큰 · 진입점을 B에서 D로 옮겨 1단계 점수를 맞춤 | 4, 5.3, 5.5, 7, 8.6 |

| 가져온 곳 | 내용 |
| --- | --- |
| `have_4.md`(= 저장소의 `HAVE_Guide_4.md`) | 유스케이스 배정의 뼈대(A: UC01·02·05, B: UC03·04, C: UC06·07·08·10), 수직 분할 원칙, 팀원별 체크리스트 형식, 3단계 로드맵 |
| `HAVE_개발_가이드라인.md` | 스택 추천, 폴더·파일 소유, API와 내부 인터페이스 계약, 확장 프로그램 전환 방법, 협업 규칙, 통합 시나리오, 설계 보완 목록 |
| 이번에 새로 한 것 | 작업을 항목으로 쪼개 점수를 매기고 네 명의 몫을 맞춤(4.2), 두 단계 진행과 통합 순서(4.3, 7), 연락 없이 일하는 규칙(8.6) |

**★ 표시는 착수 전에 팀장이 정해 알릴 항목**입니다(10.1).

---

## 0. 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 구조 | 클라이언트–서버. 클라이언트 2개(크롬 확장 프로그램, 공개 검증 페이지) + 서버 1개(서브시스템 8개) + 관계형 DB |
| 만드는 것 | `have-server`(새로 만듦) · `have-chrome-extension`(로컬 저장 → 서버 호출로 전환) · `verify-web`(새로 만듦) |
| 스택(확정) | Java 21 + Spring Boot 4.1.3 + JDBC + PostgreSQL / 클라이언트는 지금의 순수 JavaScript 유지 |
| 분담 | A 작업·버전 / B 검토·권한 / C 승인·증명서·검증 / D 기반·저장·이력 기록·알림·로그인 토큰·통합 |
| 진행 | **1단계** 각자 작업(11/28 ~ 11/30 18시, 연락 없음) → **통합**(11/30 저녁) → **2단계** 통합 뒤 작업(12/1 ~ 12/3 18시, 매일 합침) → 마무리(12/3 밤 ~ 12/4) |
| 작업량 | 1단계 A 33.5 · B 33 · C 33 · D 33.5점(합계 133점). 2단계 91점은 통합 뒤 다시 나누며 기본안은 A 23 · B 22.5 · C 23 · D 22.5점. 합계 A 56.5 · B 55.5 · C 56 · D 56점(1점 ≈ 직접 구현 1시간) |
| 1단계에서 하는 것 | 각자 서브시스템의 서버 정상 흐름과 테스트, PostgreSQL 저장 구현, 로그인 토큰, ApiClient · 로그인 화면 · 공개 검증 페이지 |
| 2단계에서 하는 것 | 확장 프로그램 화면 연동 전부, 되돌아가는 흐름(수정 요청 · 재제출 · 반려 · 취소 · 철회 등), 이력 조회, 저장 공통 테스트, 시연 시드, 통합 |
| 시작 전에 | ① 팀장이 A~D를 정해 알림 ★ ② `have-project`를 레포에 올리고 모두 같은 커밋에서 자기 브랜치를 만듦 ③ JDK 21 설치, `gradlew test` 통과 확인(README) ④ 8.6의 1단계 규칙 읽기 |

1단계는 한 사람이 2일에 33점 안팎이라 빠듯합니다. AI 도구를 쓰는 것을 전제로 했습니다. 1단계 목록은 위에서부터 하고(앞쪽이 통합 때 다른 사람이 부르는 것), 못 끝낸 항목은 통합 때 2단계 목록으로 넘깁니다(4.3).

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

개발용 문서는 `팀원공유용_v3` 밖에 있습니다: 요청 · 응답 예시 `docs/api.md`, 설계 변경 기록과 열린 항목 `docs/design-changes.md`, 용어 · 상태 통일표 사본 `docs/reference/`, AI 도구용 안내 `AGENTS.md`.

### 1.2 만드는 것 3개

배치 다이어그램의 결과물(artifact) 이름을 폴더 이름으로 씁니다.

| 결과물 | 지금 | 이번에 할 일 |
| --- | --- | --- |
| `have-server` | 뼈대만 있음(빌드 · 실행됨, `GET /api/health`) | 서브시스템 01~08과 서버 조립 지점을 구현. REST API 제공, 전자서명, 감사 이력 해시 체인 |
| `have-chrome-extension` | 브라우저 로컬 시연(IndexedDB, 역할 전환 흉내). 화면별 파일로 나뉘어 있음 | 화면은 유지하고 저장·규칙 실행을 서버 API 호출로 교체. 로그인 추가 |
| `verify-web` | 확장 프로그램 안의 `#verify/<토큰>` 화면 | 설치·로그인 없이 여는 공개 웹 페이지로 분리. 서버가 정적 파일로 내려 줌(`have-server/src/main/resources/static/verify/`, 주소 `/verify/index.html`) |

### 1.3 지킬 원칙

1. **수직 분할.** 각자 맡은 유스케이스의 테이블 → 서버 API → 테스트(1단계) → 화면 연동(2단계)까지 끝까지 책임집니다. "서버 담당", "화면 담당"으로 나누지 않습니다.
2. **유스케이스를 늘리지 않습니다.** UC01~UC10 그대로입니다. 회원 가입 같은 화면은 만들지 않고 계정은 시드 데이터로 넣습니다.
3. **이름은 설계서 그대로 씁니다.** 클래스·인터페이스·오퍼레이션·테이블·열·코드 값을 바꾸지 않습니다. 새로 필요한 오퍼레이션은 명명 규칙(조건 확인 `is…`, 읽기·탐색 `get…`, 쓰기 `set…`, 화면 출력 `show…`, 업무 동작은 동사)을 따릅니다.
4. **설계와 달라지면 기록하고 앞 단계에 반영합니다**(폭포수 모델). 구현 중 생긴 추가·변경은 `docs/design-changes.md`에 한 줄씩 적고(8.5), 마감 뒤 해당 산출물을 고칩니다.
5. **승인·서명·감사 이력은 서버만 씁니다.** 클라이언트가 계산하는 값은 파일의 SHA-256뿐이고 서버가 다시 대조합니다. 사용자 ID와 역할은 로그인 토큰과 `WORK_MEMBER`에서만 얻고, 요청 본문에 적힌 값을 믿지 않습니다. 역할은 계정이 아니라 작업별입니다.
6. **다른 서브시스템은 인터페이스로만 부릅니다.** 다른 사람의 서비스 클래스를 직접 만들거나 다른 서브시스템의 테이블을 직접 읽지 않습니다(구조유형 문서 4절의 의존 방향). 1단계 동안 인터페이스와 값 객체는 고정입니다(8.6).

### 1.4 범위와 단계 — 12/4까지 무엇을 하나

| 단계 | 기간 | 분량 | 내용 |
| --- | --- | --- | --- |
| **1단계 각자 작업** | 11/28(토) ~ 11/30(월) 18시 | 133점 | 서버 정상 흐름: 로그인 → UC01 → UC02 → UC03 → UC04(검토 통과) → UC06(최종 승인) → 증명서 발급(서버 서명) → UC07(조회 · 공유 링크) → UC08(공개 검증 세 판정) + 작업 목록 + 이력 · 알림 기록과 알림 조회 + 파일 내려받기 + PostgreSQL 저장 구현. 확장 프로그램은 ApiClient · 로그인 화면 · 공개 검증 페이지만 |
| **통합** | 11/30(월) 저녁 | — | 네 브랜치를 합치고 서버를 띄워 API로 정상 흐름을 확인(7.2). 12/1 오전에 2단계를 다시 나눔(4.3) |
| **2단계 통합 뒤 작업** | 12/1(화) ~ 12/3(목) 18시 | 91점 | 확장 프로그램 화면 연동 전부, 수정 요청 · UC05 재제출(근거 그대로/변경) · 반려 · UC10 철회 · 검토 요청 취소 · 임시 저장 · 해시 불일치 중지 · 발급 재시도 · 공유 중지와 만료 · 이력 탭과 해시 체인 확인 · 알림 화면, 저장 공통 테스트, 시연 시드, 정리 |
| **P2 여유가 있을 때** | — | 점수 없음 | QR(계획서의 핵심 장면이라 P2 중 1순위) · 이메일 실제 발송 · 브라우저 알림 · 현재 탭 PDF 가져오기 · `JsonFilePersistence` · 클라우드 배포(HTTPS) · 화면 흐름 자동 테스트 |

설계서의 외부 시스템은 이번 구현에서 다음처럼 대신합니다. 계약(인터페이스)은 그대로 두므로 나중에 구현만 바꾸면 됩니다.

| 설계 요소 | 이번 구현 |
| --- | --- |
| 파일 저장소(IStorageAPI) | `StorageFileStore`가 서버의 지정 폴더에 저장. 폴더는 저장소 밖에 두고 주소를 응답에 싣지 않음 |
| 알림 채널(이메일) | 알림함(`NOTIFICATION`) 저장까지 구현. 발송은 서버 로그 출력으로 대신 |
| 서명 키 | 서버가 시작할 때 키 파일을 읽음(없으면 만듦). 키 파일은 Git에 올리지 않음 |
| HTTPS | 로컬 시연은 `http://localhost:8080`. 배포할 때만 HTTPS |

---

## 2. 기술 스택 (11/28 확정)

| 구분 | 확정 | 이유 |
| --- | --- | --- |
| 서버 언어·프레임워크 | Java 21 + Spring Boot 4.1.3 | 설계서가 Java를 전제로 함: 컴포넌트의 JDBC, `JdbcPersistence`·`DatabaseConnectionPool`, 패턴 문서의 Java 예제, Controller–Service–Repository 구조. 강의 Ch10 예제도 Java |
| DB 접근 | JDBC(`JdbcTemplate`), ORM 없음 | 브리지(`Repository‹T›` ↔ `IPersistence`)와 싱글톤(`DatabaseConnectionPool`)을 코드에 그대로 드러내기 위해 |
| DB | PostgreSQL(16에서 확인) | DB 문서의 "진행 중 검토 요청 최대 1개" 제약이 조건부 유니크 인덱스(`… WHERE state IN (…)`)라 PostgreSQL이 맞음. JSON 형식 열도 지원 |
| 빌드·테스트 | Gradle 8.14.3(래퍼 포함) · JUnit | Gradle을 설치하지 않고 `gradlew`로 실행. JDK 21만 있으면 됨 |
| 클라이언트 | 지금의 순수 JavaScript(Manifest V3), 빌드 도구 없음 | 화면과 스타일을 그대로 두고 호출부만 바꾸기 위해 |
| 인증 | 이메일 + 비밀번호, BCrypt 해시(`USER.password_hash`), 서버가 서명한 토큰 | DB 문서 "팀 확인 사항"의 답(세션 테이블 없음). BCrypt는 `spring-security-crypto`만 넣었고 스프링 시큐리티 전체는 쓰지 않음 |
| 전자서명 | JDK 내장 `java.security`(예: Ed25519) | 외부 라이브러리 없이 서명·검증 |

- 대가: 확장 프로그램의 JavaScript 규칙(`model.js`·`review-model.js`, 약 780줄)을 Java로 옮겨야 합니다. 6.3의 대응표와 9절의 시나리오로 옮긴 결과를 맞춥니다.
- Spring Boot 4는 3과 이름이 다른 곳이 있습니다. AI 도구가 3 기준으로 코드를 내면 빌드가 깨지므로 `AGENTS.md`의 "Spring Boot 4에서 주의할 것"을 먼저 읽힙니다(웹 스타터 이름 `spring-boot-starter-webmvc`, JSON은 Jackson 3 `tools.jackson`, 테스트 지원 패키지).
- 의존성을 더할 때는 `have-server/build.gradle`을 고치고 전원에게 알립니다. ORM(JPA · MyBatis)과 Lombok은 넣지 않습니다.

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

팀 Git 저장소 루트 기준입니다. 괄호는 소유자이고, **✔는 이미 들어 있는 것**입니다. "고정"은 1단계 동안 아무도 바꾸지 않는 파일입니다(8.6).

```
README.md                    처음 받은 사람이 할 일, 실행 방법                    ✔ 고정
AGENTS.md · CLAUDE.md        AI 도구가 먼저 읽는 안내                             ✔ 고정
HAVE_최종_개발_가이드라인.md  이 문서                                             ✔ 고정
.gitignore · .gitattributes · .env.example                                     ✔ (D)
docs/
  api.md                     요청·응답 예시 JSON                                  ✔ 고정
  design-changes.md          설계 변경 기록, 열린 항목과 결정                      ✔ 고정
  phase1/A.md ~ D.md         1단계 메모: 못 끝낸 항목, 공용 파일 변경 요청 등        ✔ (각자 자기 파일)
  reference/                 용어·상태 통일표 사본                                ✔
have-server/
  build.gradle · settings.gradle · gradlew · gradlew.bat · gradle/              ✔ (D)
  src/main/java/have/
    HaveServerApplication.java                                                  ✔ (D)
    bootstrap/      HaveServerBootstrap(옵서버 등록), PlaceholderConfiguration(공용 대역) ✔ 고정
    common/         ApiError · ApiException · ApiExceptionHandler,
                    HashTool · CanonicalJson · HealthController                 ✔ 고정
    common/code/    코드 값 enum 18개                                            ✔ 고정
    auth/           01  IAuthorization · AuthAction · Credential · User · TokenService ✔ 고정
                        AuthorizationPolicy, WorkMember                          (B)
    auth/token/         TokenService 구현, 토큰 확인 인터셉터, AuthController      (D)
    work/           02  IWorkVersion · ReviewTarget                              ✔ 고정
                        controller · service · model                              (A)
    work/status/        Subject · WorkStatusObserver · StatusChange               ✔ 고정
                        WorkStatusSubject(틀만 있음, 채우는 것은 A7)              (A)
    review/         03  IReviewResult · ConfirmedResult                          ✔ 고정
                        controller · service · model · GateStrategy 등            (B)
    approval/       04  IApprovalStatus · ApprovalResult · ApprovalValidity      ✔ 고정
                        ApprovalService, ApprovalCase, Approval, Revocation, OutboxEvent (C)
    certificate/    05  ICertificateData · CertificateData                       ✔ 고정
                        CertificateService, Certificate, ShareLink, QRCode, CertificateIssueObserver (C)
    verification/   06  VerificationService, VerificationResult                   (C)
    audit/          07  IAuditLog · AuditPayload · INotification                 ✔ 고정
                        AuditLogService, AuditLogObserver, AuditEvent,
                        NotificationGateway, NotificationObserver, Notification   (D)
                        HistoryService                                            (C, 2단계)
    persistence/    08  IPersistence · Repository‹T› · TableMapping · FileStore  ✔ 고정
                        StubPersistence(메모리 구현)                             ✔ 고정
                        JdbcPersistence, DatabaseConnectionPool                   (D)
      persistence/work/      WorkRepository · RevisionRepository · 대응, StorageFileStore (A)
      persistence/auth/      UserRepository · 대응                               (B)
      persistence/review/    ReviewRepository · 대응                             (B)
      persistence/approval/  ApprovalRepository · CertificateRepository · 대응   (C)
      persistence/audit/     HistoryRepository · 대응                            (D)
  src/main/resources/
    application.yml · application-stub.yml · application-jdbc.yml               ✔ (D)
    META-INF/spring/…AutoConfiguration.imports  공용 대역 등록                    ✔ 고정
    db/schema/  01_user_work · 02_version · 03_review · 04_approval · 05_revision · 06_audit (.sql)
                테이블 31개                                                       ✔ 고정
    db/seed/    계정 5명 · 체크리스트 4항목 · 위험 등급 기준 GP-2026-1(B), 시연 시나리오(D, 2단계)
    static/verify/   공개 검증 페이지(verify-web). 지금은 자리만 있음              (D)
  src/test/java/have/…       뼈대 테스트 17개 ✔ / 그 밖에는 각 패키지 소유자
have-chrome-extension/       6절 참고. HCI 최종본 1.1.0을 화면별 파일로 나눈 것    ✔
  tests/model.test.js        업무 규칙 테스트 7개                                 ✔
팀원공유용_v3/                설계 산출물. 개발 중에는 고치지 않음                  ✔
```

- 개발은 반드시 Git 저장소에서 합니다. 저장소 밖에 복사해 둔 폴더에서 고친 내용은 GitHub에 올라가지 않고, 합칠 때 Git이 비교할 공통 출발점도 없습니다.
- 담당마다 하위 패키지(`persistence/work` 등)를 따로 써서, 1단계에 네 명이 같은 파일을 만들지 않게 했습니다.
- 패키지 이름은 `have`입니다.

### 3.3 실행 프로필

브리지 패턴의 목적(구현이 끝나기 전에는 스텁으로 대신)을 그대로 씁니다.

| 프로필 | 저장 | 쓰는 때 |
| --- | --- | --- |
| `stub`(기본) | `StubPersistence`(메모리). 서버를 다시 켜면 비워지고 시드가 다시 들어감 | 매일 개발. DB를 설치하지 않아도 서버가 뜸 |
| `jdbc` | `JdbcPersistence`(D3) + PostgreSQL. 서버가 시작할 때 `db/schema`의 테이블을 만듦(이미 있으면 건너뜀) | D3 확인(1단계), 12/2부터 통합, 최종 시연 |

```
# 서버 실행 — have-server 폴더에서. Windows 명령 프롬프트는 gradlew.bat, macOS·Linux는 ./gradlew
gradlew.bat bootRun                                              (stub)
gradlew.bat bootRun --args="--spring.profiles.active=jdbc"       (PostgreSQL)
gradlew.bat test                                                 (테스트)
# 확인: 브라우저에서 http://localhost:8080/api/health
# 확장 프로그램: chrome://extensions → 개발자 모드 → 압축해제된 확장 프로그램 로드 → have-chrome-extension
```

지금 두 프로필 모두 서버가 뜨는 것까지 확인돼 있습니다(`stub`은 DB 없이, `jdbc`는 테이블 31개를 만든 뒤). 환경 준비와 DB 접속 값은 `README.md`에 있습니다.

`HaveServerBootstrap.start(profile)`이 ① 프로필에 따라 저장 구현을 고르고 ② 옵서버 4종을 `WorkStatusSubject`에 등록합니다. ①은 각 구현에 붙인 `@Profile`로 정해집니다(`StubPersistence`는 들어 있고, `JdbcPersistence`는 D3). ②는 `WorkStatusObserver`를 구현한 스프링 빈을 모두 찾아 등록하므로, 옵서버 클래스에 `@Component`만 붙이면 됩니다.

1단계 동안 서버를 띄우면 다른 사람이 맡은 부분은 공용 대역이라, 그 기능을 부르면 "아직 구현되지 않았습니다(담당 ○)" 오류가 납니다. 1단계의 확인은 서버를 띄워 눌러 보는 것이 아니라 테스트로 합니다(8.3).

---

## 4. 역할 분담

### 4.1 분담 요약

| | A | B | C | D |
| --- | --- | --- | --- | --- |
| 이름 ★ | | | | |
| 핵심 담당 | 작업 등록 · 결과물 · 수정/재제출 | 위험 분석 · 이해 확인 · 검토 · 권한 | 최종 승인 · 철회 · 증명서 · 진위 검증 · 이력 조회 | 기반 · 저장 · 이력 기록 · 알림 · 로그인 토큰 · 공개 검증 페이지 · 통합 |
| 유스케이스 | UC01 · UC02 · UC05 · UC09(작업 목록) | UC03 · UC04 · 공통(권한) | UC06 · UC07 · UC08 · UC10 · UC09(이력·해시 체인) | UC09(알림) · 공통(로그인 토큰 · 이력 기록) |
| 서버 서브시스템 | 02 Work 전부, 08의 `FileStore` | 03 Review 전부, 01 Auth의 권한 | 04 · 05 · 06 전부, 07의 `HistoryService` | bootstrap, 08 공통, 07의 기록·알림, 01의 토큰 · 진입점 |
| 옵서버 패턴에서 맡는 것 | Subject(`WorkStatusSubject`) | `ReReviewObserver` | `CertificateIssueObserver` | `AuditLogObserver`, `NotificationObserver` |
| 제공하는 내부 인터페이스 | `IWorkVersion`, `WorkStatusObserver`(정의), `FileStore` | `IReviewResult`, `IAuthorization` | `IApprovalStatus`, `ICertificateData` | `IAuditLog`, `INotification`, `IPersistence`, `TokenService` |
| 화면(연동은 2단계) | 작업 목록, 작업 상세 개요, 등록 마법사, 수정본 재제출 | 이해 확인, 검토 | 최종 승인, 증명서 탭, 이력 탭 | 로그인(1단계), 공개 검증 페이지(1단계), 화면 틀, 알림, 팝업·배지 |
| 테이블 | 10개 | 13개 | 6개 | 2개 |
| **1단계 작업량** | **33.5점** | **33점** | **33점** | **33.5점** |
| 2단계 기본안 | 23점 | 22.5점 | 23점 | 22.5점 |
| 합계 | 56.5점 | 55.5점 | 56점 | 56점 |

테이블 소유(합계 31개). 테이블을 만드는 SQL은 31개 모두 `db/schema`에 들어 있고 1단계 동안 바꾸지 않습니다(형식은 DB 문서 6단계, 제약은 "제약을 지키는 위치" 표의 DB 항목). 소유자는 그 테이블의 엔티티, 저장 대응(`TableMapping`), Repository, 시드 행을 씁니다.

- **A** — WORK, WORK_VERSION, AI_DISCLOSURE, AI_TOOL_USAGE, CONTRIBUTION, EVIDENCE_ITEM, VERSION_EVIDENCE, REVISION, REVISION_DRAFT_FILE, FEEDBACK_RESPONSE
- **B** — GATE_POLICY, RISK_ASSESSMENT, REVIEW_REQUEST, CHALLENGE, CHALLENGE_RESPONSE, EVALUATION, REVIEW, CHECKLIST_ITEM, REVIEW_CHECK, FEEDBACK, FEEDBACK_ITEM, USER, WORK_MEMBER
- **C** — APPROVAL_CASE, APPROVAL, REVOCATION, CERTIFICATE, OUTBOX_EVENT, SHARE_LINK
- **D** — AUDIT_EVENT, NOTIFICATION

### 4.2 두 단계로 나눈 기준과 작업량

**1단계에 넣은 일**은 다음을 모두 만족합니다.

1. 자기 서브시스템 안의 일이다(자기 패키지 · 자기 테이블 · 자기 화면 파일).
2. 다른 사람의 코드는 고정된 인터페이스로만 부르고, 테스트에서는 Mockito로 대신할 수 있다.
3. 공용 파일(8.6의 목록)을 고치지 않아도 된다.
4. 다른 사람의 진짜 구현 없이 테스트로 결과를 확인할 수 있다.

**2단계로 미룬 일**은 둘 중 하나입니다.

- **(가) 통합이 있어야 하는 일** — 확장 프로그램 화면 연동(서버 전체와 D의 화면 틀이 합쳐져야 함), 재제출 A14(수정 회차가 어느 버전 것인지와 보완 항목을 모두 답했는지 확인하려면 03 · 04의 데이터를 같이 봐야 해서 방법을 함께 정해야 함), 이력 조회 C17(D의 감사 이력 구현이 있어야 함), 저장 공통 테스트 D12(모든 Repository가 모여야 함), 통합 · 시연 시드 · 정리(D13 · D16 · D17)
- **(나) 혼자 할 수 있지만 1단계 분량을 넘는 일** — 수정 요청 B13, 재검토 연결 B14, 취소 · 임시 저장 B15, 해시 불일치 중지 B16, 반려 C14, 철회 C15, 발급 재시도 · 공유 중지 C16. 1단계를 일찍 끝내면 자기 (나) 항목을 해도 됩니다(4.3).

1점은 한 사람이 직접 구현할 때의 약 1시간입니다. AI 도구를 쓰면 실제 시간은 줄지만 항목 사이의 비율은 비슷하므로, 점수는 네 명의 몫을 비교하는 기준으로 씁니다.

**1단계 (11/28 ~ 11/30 18시)**

| 구분 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 서버 기능 | 28.5 | 26.5 | 28.5 | 19.5 |
| DB(대응·시드) | 2 | 3.5 | 1.5 | 1.5 |
| 테스트 | 3 | 3 | 3 | 0 |
| 클라이언트 | 0 | 0 | 0 | 11 |
| 공통 기반 | 0 | 0 | 0 | 1.5 |
| **합계** | **33.5** | **33** | **33** | **33.5** |

**2단계 기본안 (통합 뒤 다시 나눔)**

| 구분 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 서버 기능 | 7 | 12.5 | 12 | 0 |
| 테스트 | 2 | 2 | 2 | 3 |
| 클라이언트(화면 연동) | 14 | 8 | 9 | 9 |
| 공통 기반·통합 | 0 | 0 | 0 | 10.5 |
| **합계** | **23** | **22.5** | **23** | **22.5** |

- 1단계는 33~33.5점으로 차이가 0.5점입니다. 2단계 기본안은 22.5~23점, 두 단계를 합치면 55.5~56.5점입니다.
- D는 1단계의 서버 기능이 적은 대신 클라이언트(ApiClient · 로그인 화면 · 공개 검증 페이지, 11점)를 맡습니다. D의 테스트 점수는 2단계의 D12에 있고, 1단계 항목의 테스트는 각 항목 안에 들어 있습니다.
- 개수로 세면 다릅니다(서버 타입 A 25 · B 26 · C 15 · D 13개 안팎). C는 타입 수는 적지만 승인 트랜잭션 · 전자서명처럼 항목 하나가 무겁고, D는 타입에 잡히지 않는 일(저장 구현, 화면 틀, 통합)이 많습니다. 그래서 개수가 아니라 점수로 맞췄습니다.

**점수가 바뀐 내역.** 11/28 오전 배정(A 61 · B 60 · C 62 · D 60점)에서 미리 만든 것을 빼고, 두 단계 진행에 맞춰 옮겼습니다.

| | A | B | C | D |
| --- | --- | --- | --- | --- |
| 11/28 오전 배정 | 61 | 60 | 62 | 60 |
| A1 `app.js` 화면별 분리 — 끝남 | −4 | | | |
| D1 프로젝트 뼈대 — 끝남 | | | | −5 |
| 테이블 31개의 스키마 SQL — 들어 있음 | −2 | −2 | −1 | −0.5 |
| 스키마 합치기와 `jdbc` 기동, 옵서버 등록 — 끝남(D4 · D5의 일부) | | | | −2.5 |
| 공개 검증 페이지(5점, 옛 C9)를 C → D | | | −5 | +5 |
| 알림 받을 사람 결정(A7 · B2 · B5) | +0.5 | +1 | | |
| `StubPersistence`와 저장 구현 선택을 미리 만듦(D2 · D5) | | | | −4.5 |
| 수정 회차 만들기 `createRevision`을 더함(A17) | +1 | | | |
| 로그인의 토큰 · 진입점을 B → D(옛 B1 5점 중 3.5점, D19) | | −3.5 | | +3.5 |
| **지금(1단계 + 2단계 기본안)** | **56.5** | **55.5** | **56** | **56** |

- 토큰을 D로 옮긴 이유: 1단계 점수를 맞추면서, 토큰 형식을 정하는 사람(서버)과 토큰을 저장하고 보내는 사람(ApiClient · 로그인 화면)을 한 명으로 모아 1단계에 서로 물어볼 일을 없앴습니다. B는 비밀번호 확인과 권한 정책을 그대로 맡습니다.
- 인터페이스와 값 객체, 키 정렬 JSON · 해시 도구, 공용 대역도 미리 들어 있지만 점수는 빼지 않았습니다. 그것을 쓰는 항목의 일은 줄지 않기 때문입니다.

원래 초안(`have_4.md`)과 비교하면 유스케이스 배정은 그대로 두고 공통 작업만 옮겼습니다(`have_4.md`의 배정을 같은 점수로 계산하면 A 약 49 · B 약 46 · C 약 54 · D 약 95점).

| 옮긴 작업 | `have_4.md` | 최종 | 이유 |
| --- | --- | --- | --- |
| 테이블 31개의 대응·시드 | D | 테이블 소유자 | 그 테이블을 쓰는 사람이 열과 제약을 가장 잘 앎 |
| 파일 비공개 저장, SHA-256 계산 | D | A | `FileStore`를 쓰는 곳이 02뿐 |
| 상태 변경 통지(`WorkStatusSubject`) | D | A | 설계상 02 Work 소속 |
| 작업 목록 조회(UC09 1단계) | D | A | `IWorkAPI.getWorks` |
| 권한(01 Auth의 정책) | D | B | 권한 규칙 대부분이 검토자·승인자 확인이고 멤버 등록의 주 사용처가 검토 요청 |
| 로그인 토큰 · 진입점 | D | D | 위 이유로 D에 남김(11/28 저녁) |
| 이력 조회·해시 체인 확인(UC09 2~3단계) | D | C | 07의 "기록·조회 분리"에서 조회 쪽. C의 서명·해시 검증과 성격이 같음 |
| 화면별 서버 연동 | D가 전체 통합 | 화면 소유자 | 한 사람이 모든 화면을 다 고치지 않게 |

### 4.3 균형 규칙 — 1단계에는 옮기지 않고, 통합 때 다시 나눈다

**1단계(연락 없음)**

1. 1단계 목록은 위에서부터 합니다. 앞쪽이 통합 때 다른 사람이 부르는 것이라, 시간이 모자라도 앞쪽은 끝나 있어야 합니다.
2. 일찍 끝나면 자기 2단계 목록에서 "(나) 혼자 할 수 있음" 항목을 합니다. 다른 사람의 항목은 가져가지 않습니다(같은 파일을 둘이 만들게 됩니다).
3. 11/30 18시까지 못 끝낸 1단계 항목은 `docs/phase1/<담당>.md`의 "못 끝낸 항목"에 적고 통합 때 2단계 목록으로 넘깁니다. 반쯤 된 코드는 테스트가 통과하는 데까지만 올리고, 나머지는 `// TODO(통합): …`로 남깁니다.

**2단계 분담(12/1 오전, 30분)**

1. 남은 일 = 못 끝낸 1단계 항목 + 2단계 목록 − 1단계에 미리 끝낸 (나) 항목.
2. 4.4~4.7의 2단계 기본안에서 출발합니다. 각자의 합계(1단계에 끝낸 점수 + 2단계 몫)가 같아지도록 나눕니다. 못 끝낸 1단계 항목은 원래 담당이 계속하는 것이 빠르므로, 그 사람의 2단계 몫 중 그만큼을 다른 사람에게 넘깁니다.
3. 2단계에는 매일 남은 점수를 말하고(8.7), 가장 많이 남은 사람과 가장 적게 남은 사람의 차이가 8점을 넘으면 아래 항목을 옮깁니다.

| 옮기기 쉬운 항목(2단계) | 점수 | 기본 담당 | 넘길 때 필요한 것 |
| --- | --- | --- | --- |
| D15 알림 화면·팝업·배지 | 5 | D | 알림 API 응답 예시(`docs/api.md` 10절) |
| D16 시연용 시드 시나리오 | 3 | D | 서비스 호출 순서(9절 S1) |
| C18 이력 탭 연동 | 2 | C | 이력 API 응답 예시(`docs/api.md` 9절) |
| D17 `model.js`·`storage.js`·`seed.js` 정리 | 1.5 | D | 없음 |
| B16 해시 불일치 중지 | 1 | B | 없음 |
| 각자의 테스트 나머지 | 2 | 전원 | 9절 시나리오 |

4. **시간이 모자라 2단계를 줄일 때는 이 순서로 줄입니다.** 임시 저장(B15 중 3점) → 발급 재시도·공유 링크 만료(C16 중 2점) → 팝업·배지(D15 중 2.5점). 재제출 · 반려 · 철회 · 수정 요청은 유스케이스의 본 흐름이라 줄이지 않습니다.

### 4.4 팀원 A — 작업·버전·재제출 (02 Work) · 1단계 33.5점 · 2단계 기본안 23점

**서버 클래스** WorkController, ContributionController, VersionController, EvidenceController / WorkService, ContributionService, VersionService, EvidenceService, RevisionService / Work, WorkVersion, AiDisclosure, AiToolUsage, Contribution, EvidenceItem, Revision, FeedbackResponse / Subject, WorkStatusSubject, WorkStatusObserver, StatusChange / FileStore, StorageFileStore, WorkRepository, RevisionRepository

**미리 들어 있는 것(고정)** `IWorkVersion`(`createRevision` 포함) · `ReviewTarget`(12개 필드) · `Subject` · `WorkStatusObserver` · `StatusChange` · `FileStore`, `WorkStatusSubject`(틀만), 테이블 10개의 SQL(`01_user_work` · `02_version` · `05_revision`), 화면 파일 `screens/works.js` · `register.js` · `revise.js`

**1단계 (33.5점, 위에서부터)** — 각 항목은 서비스 · 진입점(`docs/api.md`의 주소와 본문) · 테스트까지입니다. `IAuthorization` · `IAuditLog`는 테스트에서 Mockito로 대신하고, 저장은 `StubPersistence`로 확인합니다.

- [x] **A1** `app.js` 화면별 분리 (끝남, 11/28)
- [ ] **A10** 테이블 10개의 엔티티 · 대응 · Repository (2점) — `TableMapping`과 `WorkRepository` · `RevisionRepository`를 `have.persistence.work`에(5.5). `StubPersistence`로 저장 · 조회 테스트
- [ ] **A8** `getReviewTarget` · `getVersionHash` (2점) — `ReviewTarget`의 모든 필드를 채움: 최신 버전 번호, 파일 이름, 저장된 파일을 다시 계산한 해시(`currentFileHash`), AI 미사용 여부. 통합 뒤 B · C가 바로 부름
- [ ] **A7** `setWorkStatus` · `WorkStatusSubject` · `StatusChange` (4.5점) — 상태 다이어그램 ①의 전이만 허용하고 나머지는 409. 옵서버를 같은 트랜잭션 안에서 차례로 호출. `StatusChange`의 작성자는 `WORK.owner_id`, 검토자·최종 승인자는 `IAuthorization.getMembers(workId, REVIEWER · APPROVER)`로 채우고 없으면 null(5.4). 예제처럼 `lastChange`를 필드 하나로 두면 동시에 온 두 요청의 내용이 섞이므로 `setWorkStatus`를 동기화하거나 요청마다 따로 만든 `StatusChange`를 넘김. 테스트는 테스트용 옵서버를 등록해 받은 내용을 확인
- [ ] **A17** `createRevision` (1점) — REVISION(OPEN) 한 행 저장. `reviewId` · `caseId` 중 하나만, 버전 상태가 `REVIEW_PENDING` · `IN_REVIEW` · `APPROVAL_PENDING`이 아니면 409. 03(B13) · 04(C14)가 부름
- [ ] **A9** `FileStore` · `StorageFileStore` (2점) — put·get·delete. 저장 폴더는 설정 `have.file-store.path`. 파일 주소를 응답에 싣지 않음
- [ ] **A2** `createWork` (2.5점) — 제목·AI 사용 신고 검증 → WORK 저장(신고 초안은 `ai_disclosure_draft`) → 작성자를 `AUTHOR` 멤버로 등록(`IAuthorization.addMember`) → `CREATE_WORK` 이력(`IAuditLog.record`)
- [ ] **A4** `uploadVersion` (5점) — PDF·20MB 검사와 SHA-256 계산을 서버에서 다시 함. 직전 버전과 해시가 같으면 409. 파일 저장 → 버전 저장 순서이고 DB 저장이 실패하면 저장한 파일을 지움. AI 신고 사본(AI_DISCLOSURE·AI_TOOL_USAGE) 고정, v2부터 `change_reason`, 상태 `SUBMITTED`
- [ ] **A3** `addContribution` (2점) — 버전이 생긴 뒤에만. 단계·주체·설명 저장, "AI 미사용"이면 주체는 사람만. 승인된 버전이면 409. `ADD_CONTRIBUTION` 이력
- [ ] **A5** `addEvidence` (3점) — 유형 4종. 버전이 `CHALLENGE_PENDING` 이후면 409(근거자료·AI 신고 잠금)
- [ ] **A6** `getWorks` · `getWork` (5점) — `IAuthorization.getWorkIds`로 구성원인 작업만, 역할·상태·검색어 필터, `getMemberRole`로 `myRoles`, `getMembers`로 작업 상세의 `reviewer` · `approver`. 02의 데이터만 돌려줌
- [ ] **A16** 결과물 파일 내려받기 (1.5점) — 구성원만(`isAuthorized(…, VIEW)`)
- [ ] **A13** 테스트 (3점) — 서비스마다 정상 1 · 예외 1 이상, 진입점은 `@WebMvcTest` + `@MockitoBean`

**2단계 기본안 (23점, 통합 뒤 다시 나눔)**

- [ ] **A14** `resubmit` (7점) · (가) — 먼저 B · C와 두 가지를 정함: 수정 회차가 어느 버전 것인지 찾는 방법(REVISION → REVIEW → REVIEW_REQUEST.version_id, 반려면 APPROVAL_CASE.version_id)과 보완 항목 목록(03의 FEEDBACK_ITEM)을 읽는 방법. 그다음은 기존 설명대로: `REVISION_REQUIRED`에서만, `isAllResolved()`, 새 버전 v(N+1) · Revision `SUBMITTED` + `submitted_version_id` · FeedbackResponse를 한 트랜잭션으로, `isBasisChanged`로 `REVIEW_PENDING` 또는 `CHALLENGE_PENDING`, 판정 결과는 `RESUBMIT` 이력의 사유에
- [ ] **A11** 등록 마법사 연동 (6점) · (가) — 4·5단계는 B의 API 모듈을 호출(6.4). 검토자·최종 승인자 선택은 v2부터 잠금(5.4)
- [ ] **A12** 작업 목록 · 작업 상세 개요 연동 (4점) · (가)
- [ ] **A15** 수정본 재제출 화면 연동 (4점) · (가)
- [ ] **A13** 테스트 나머지 (2점)
- 1단계를 일찍 끝내면: 자기 API 모듈 `scripts/api/work-api.js`를 6.2의 ApiClient 사용법대로 미리 써 둡니다(`app.html`에는 2단계에 더함. 점수는 A11 · A12에 포함).

### 4.5 팀원 B — 검토·권한 (03 Review + 01 Auth) · 1단계 33점 · 2단계 기본안 22.5점

**서버 클래스** RiskController, ReviewRequestController / RiskService, GatePolicy, ReviewRequestService, ReviewService / RiskAssessment, ReviewRequest, Challenge, ChallengeResponse, Evaluation, Review, ChecklistItem, ReviewCheck, Feedback, FeedbackItem / GateStrategy, LowRiskGate, MediumRiskGate, HighRiskGate / ReReviewObserver / AuthorizationPolicy, User, WorkMember / ReviewRepository, UserRepository. 토큰과 `AuthController`는 D(D19)

**미리 들어 있는 것(고정)** `IAuthorization`(`getMembers` · `setMember` · `getWorkIds` · `getUsers` 포함) · `AuthAction` · `Credential` · `User` · `TokenService`(D가 구현, B는 사용) · `IReviewResult` · `ConfirmedResult`, 테이블 13개의 SQL(`01_user_work` · `03_review`), BCrypt용 `spring-security-crypto`, 화면 파일 `screens/challenge.js` · `review.js` · `role.js`(C와 공동)

**1단계 (33점, 위에서부터)** — `IWorkVersion` · `IAuditLog` · `TokenService`는 테스트에서 Mockito로 대신합니다.

- [ ] **B3** USER · WORK_MEMBER의 엔티티 · 대응 · Repository, 시드 계정 5명 (1점) — `have.persistence.auth`. 계정은 `docs/api.md` 3절(userId 1~5, 작성자 1 · 검토자 2 · 최종 승인자 2). `jdbc`는 `db/seed/01_users.sql`, `stub`은 서버가 시작할 때 넣는 코드(`have.auth` 안). SQL에서 `user`는 항상 `"user"`
- [ ] **B2** `AuthorizationPolicy` (4.5점) — `isAuthorized`, `getMemberRole`, `addMember`(REVIEWER · APPROVER에 다른 사람이 이미 있으면 409), `getMembers`, `setMember`(이전 사람의 역할 행을 지우고 바꿈), `getWorkIds`, `getUsers`. 역할은 작업별이고 검토자·최종 승인자는 작업마다 한 명(5.4). 통합 뒤 A · C · D가 바로 부름
- [ ] **B1** `login` · `logout` · `getCurrentUser` (1.5점) — 비밀번호를 BCrypt로 대조하고 `TokenService.createToken`으로 토큰을 만듦. `getCurrentUser`는 `TokenService.getCurrentUserId()`로 찾은 사용자, 없으면 401. 토큰 형식 · 확인 · 주소는 D19
- [ ] **B9** 03 테이블 11개의 엔티티 · 대응 · Repository, 시드(체크리스트 4항목, 위험 등급 기준 `GP-2026-1` 경계 4 · 7) (2.5점) — `have.persistence.review`
- [ ] **B4** `assessRisk` · `GatePolicy` · 전략 3종 (4점) — 점수 범위 0~3 · 0~3 · 0~2 · 0~2, "AI 미사용"(`ReviewTarget.isNoAiUsed()`)이면 AI 사용 비중 0, 합계로 등급 계산(경계는 GATE_POLICY 행에서 읽음). 등급은 저장하지 않음. LOW는 TEACH_BACK 1개(통과 2/2), MEDIUM은 TEACH_BACK + WHAT_IF(3/4), HIGH는 3개(5/6, 치명 오류 없음)
- [ ] **B5** `requestReview` (5점) — 위험 분석 있음, 검토자 ≠ 작성자, 승인자 ≠ 검토자·작성자, 진행 중 요청 없음 → 검토자·최종 승인자 지정(5.4: 아직 없으면 `addMember`, 같은 사람이면 그대로, 다른 사람이면 v1일 때만 `setMember`, v2부터는 409) → 과제 배정 → `setWorkStatus(CHALLENGE_PENDING)`. 버전의 검토 요청 조회 포함
- [ ] **B6** `getChallenges` · `submitAnswers` (3점) — 답변 20자 이상, 확신 정도 → `REVIEW_PENDING`
- [ ] **B7** `getAssignedRequests` · `startReview` (3.5점) — `ReviewTarget.getCurrentFileHash()`를 등록 당시 값과 대조. 일치하면 Review `IN_PROGRESS`·요청 `IN_REVIEW`·작업 `IN_REVIEW`. 목록의 제목 · 상태 · 작성자는 `getReviewTarget`과 USER에서
- [ ] **B8** `submitReview` · `IReviewResult` (5점) — 통과 조건(등급별 기준, 치명 오류 없음, 체크리스트 4/4, 메모) 확인. 모자라면 400과 사유 목록. 통과하면 Review `COMPLETED`·Feedback `PASS`·`review_digest` → `APPROVAL_PENDING`. 승인 건(APPROVAL_CASE)은 만들지 않음(04가 만듦). `isPassed` · `getConfirmedResult`는 통합 뒤 C가 부름
- [ ] **B12** 테스트 (3점)

**2단계 기본안 (22.5점, 통합 뒤 다시 나눔)**

- [ ] **B13** `requestRevision` (3점) · (나) 혼자 할 수 있음 — 보완 항목 1개 이상, 기한 → Feedback `REVISION_REQUIRED` · FeedbackItem → `IWorkVersion.createRevision(versionId, reviewId, null, dueDate)` → `setWorkStatus(REVISION_REQUIRED, 사유)`
- [ ] **B14** `ReReviewObserver` (4점) · (나) — 재제출로 생긴 새 버전(`StatusChange.isResubmission()`)에 위험 평가·검토 요청·과제를 복사. 새 상태가 `REVIEW_PENDING`이면 답변도 복사, `CHALLENGE_PENDING`이면 답변을 비움. 평가는 복사하지 않음
- [ ] **B15** `cancelRequest` · `saveAnswers` · `saveReviewDraft` (4.5점) · (나) — 취소는 검토 시작 전만, `setWorkStatus(SUBMITTED, 사유)`
- [ ] **B16** 해시 불일치 중지 (1점) · (나) — Review `HALTED`, `HALT_REVIEW` 이력을 직접 기록
- [ ] **B10** 이해 확인 화면 연동 (3점) · (가)
- [ ] **B11** 검토 화면 연동 (5점) · (가) — `review-ui.js`의 검토 부분
- [ ] **B12** 테스트 나머지 (2점)
- 1단계를 일찍 끝내면: (나) 항목을 B13부터 하거나, `scripts/api/review-api.js`를 6.2의 사용법대로 미리 써 둡니다.

### 4.6 팀원 C — 승인·증명서·검증·이력 조회 (04 · 05 · 06 + 07 조회) · 1단계 33점 · 2단계 기본안 23점

**서버 클래스** ApprovalController, CertificateController, VerificationController / ApprovalService, ApprovalCase, Approval, Revocation, OutboxEvent / CertificateService, Certificate, ShareLink, QRCode, CertificateIssueObserver, 서명 작업자 / VerificationService, VerificationResult / HistoryService, HistoryController(2단계) / ApprovalRepository, CertificateRepository

**미리 들어 있는 것(고정)** `IApprovalStatus` · `ApprovalResult` · `ApprovalValidity` · `ICertificateData` · `CertificateData`, 키 정렬 JSON `CanonicalJson`, 해시 `HashTool`, 테이블 6개의 SQL(`04_approval`), 화면 파일 `screens/approval.js` · `certificate.js` · `history.js` · `role.js`(B와 공동)

**1단계 (33점, 위에서부터)** — `IReviewResult` · `IWorkVersion` · `IAuthorization` · `IAuditLog` · `INotification`은 테스트에서 Mockito로 대신합니다.

- [ ] **C10** 04·05 테이블 6개의 엔티티 · 대응 · Repository (1.5점) — `have.persistence.approval`
- [ ] **C3** `IApprovalStatus` (2점) — `getApprovalResult`, `getCurrentValidity`(효력과 최신 버전 번호를 따로, 최신 번호는 `ReviewTarget.getLatestVersionNo()`), `getPendingIssues`
- [ ] **C1** `getApprovalCase(versionId)` (4점) — 버전이 `APPROVAL_PENDING`인데 승인 건이 없으면 이때 `PENDING`으로 만듦(열린 항목 1의 결정). 승인 조건 5개(지정 승인자 = `getMembers(workId, APPROVER)`의 사람, 검토 통과 = `isPassed`, 버전 일치, 파일 해시 일치 = `currentFileHash`, 기존 결정 없음)
- [ ] **C2** `approve(caseId, key)` (5점) — 자기 승인 금지, 멱등 키, 조건 재확인 → Approval + Certificate(`PENDING`) 저장 → `setWorkStatus(APPROVED)`까지 **한 트랜잭션**. 같은 키로 다시 오면 기존 결과 반환
- [ ] **C4** 증명서 내용 정규화 · 서명 · 검증 · 키 관리 (4점) — `immutable_payload`는 `CanonicalJson.getCanonical`로 만든 문자열(키는 열린 항목 6의 결정). 키 폴더는 설정 `have.signing-key.path`
- [ ] **C5** `CertificateIssueObserver` · 서명 작업자 (4점) — 옵서버는 `APPROVED` 통지를 받으면 OutboxEvent만 저장. 서명 작업자(`@Scheduled`)가 처리하지 않은 발급 요청을 읽어 서명 → `READY`, 실패하면 `FAILED`와 `retry_count`. `ISSUE_CERTIFICATE` · `ISSUE_FAILED` 이력, 작성자에게 `CERTIFICATE_ISSUED` 알림
- [ ] **C6** `getCertificate` · `ICertificateData` (3점) — 구성원만. 승인 ID로 찾기 포함
- [ ] **C7** `createShareLink(certId, expiresAt)` (2.5점) — 토큰은 `token_hash`만 저장하고 원문은 응답에 한 번만. 주소는 `/verify/index.html#<토큰>`. `SHARE_LINK_CREATED` 이력
- [ ] **C8** `verify` (4점) — 로그인 없음. 응답은 `docs/api.md` 8.1 그대로(D18의 페이지가 이 모양을 씀). 세 판정을 따로 계산, `VERIFY` 이력은 행위자 없이
- [ ] **C13** 테스트 (3점)

**2단계 기본안 (23점, 통합 뒤 다시 나눔)**

- [ ] **C14** `reject` (2.5점) · (나) 혼자 할 수 있음 — 사유 필수 → ApprovalCase `REJECTED` → `IWorkVersion.createRevision(versionId, null, caseId, null)` → `setWorkStatus(REVISION_REQUIRED, 사유)`
- [ ] **C15** `revoke(approvalId, reason, key)` (3점) · (나) — REVOCATION 저장. 작업 상태는 그대로이므로 `IAuditLog.record`와 `INotification.notify`를 직접 부름
- [ ] **C16** `retryIssue` · `disableShareLink` · 링크 만료 (3점) · (나)
- [ ] **C17** `getHistory` · `getLatestStatus` · `isChainValid` (3.5점) · (가) — D의 AuditEvent · HistoryRepository와 해시 계산을 그대로 씀. 통합 뒤 D와 함께 시작
- [ ] **C11** 최종 승인 화면 연동 (4점) · (가) — `review-ui.js`의 승인 부분
- [ ] **C12** 증명서 탭 연동 (3점) · (가)
- [ ] **C18** 이력 탭 연동 (2점) · (가)
- [ ] **C13** 테스트 나머지 (2점)
- 1단계를 일찍 끝내면: (나) 항목을 C14부터 하거나, `scripts/api/approval-api.js` · `certificate-api.js`를 미리 써 둡니다.

### 4.7 팀원 D — 기반·저장·이력 기록·알림·로그인 토큰·공개 검증 페이지·통합 · 1단계 33.5점 · 2단계 기본안 22.5점

**서버 클래스** HaveServerBootstrap / IPersistence, Repository‹T›, StubPersistence, JdbcPersistence, DatabaseConnectionPool, (JsonFilePersistence는 P2) / HistoryRepository / AuditLogService, AuditLogObserver, AuditEvent / NotificationGateway, NotificationObserver, Notification, NotificationController / TokenService 구현, 토큰 확인 인터셉터, AuthController

**미리 들어 있는 것** 빌드와 실행 프로필 2개, `have.common`(오류 응답 · `HashTool` · `CanonicalJson` · `HealthController`), 코드 값 enum 18개, `HaveServerBootstrap`(옵서버 등록), `PlaceholderConfiguration`(공용 대역), `IPersistence` · `Repository‹T›` · `TableMapping` · `StubPersistence`, `IAuditLog` · `AuditPayload` · `INotification` · `TokenService`(고정), 스키마 SQL 6개 파일, 뼈대 테스트 17개, 화면 파일 `app.js`(틀) · `screens/notifications.js` · `verify.js` · `start.js`

**1단계 (33.5점, 위에서부터)** — `IAuthorization`은 테스트에서 Mockito로 대신합니다. 1단계에는 D만 `app.html` · `app.js` · `manifest.json`을 고칩니다.

- [x] **D1** 프로젝트 뼈대 (끝남) · [x] **D2** `StubPersistence` · `Repository` · `TableMapping` (11/28 저녁에 미리 만듦) · [x] **D5** 저장 구현 선택(`@Profile`)과 옵서버 등록 (끝남)
- [ ] **D8** AUDIT_EVENT · NOTIFICATION의 엔티티 · 대응, `HistoryRepository` (1.5점) — `have.persistence.audit`. 감사 이력은 추가만
- [ ] **D19** 토큰 · 로그인 진입점 (3.5점) — `TokenService` 구현(HMAC 서명, 12시간, 비밀 값은 `have.token.secret`), 토큰 확인 인터셉터(`/api/**` 중 `/api/auth/login` · `/api/public/**` · `/api/health` 제외, 없거나 틀리면 401), `AuthController`(`POST /api/auth/login` → `IAuthorization.login` · `getExpiresAt`, `POST /logout`, `GET /me` → `getCurrentUser`, `GET /api/users` → `getUsers`). 파일은 `have.auth.token`
- [ ] **D6** `AuditLogService.record` · `AuditLogObserver` (5점) — `prev_hash`는 같은 작업의 직전 `event_hash`(첫 행은 `HashTool.ZERO_HASH`), `event_hash`는 SHA-256(prev_hash + `CanonicalJson.getCanonical`(이벤트 내용)). 이벤트 내용의 키를 정해 코드 주석과 `docs/phase1/D.md`에 적음(2단계에 C17이 같은 계산을 씀). 작업 단위로 잠금, 버전 번호가 그 작업의 것인지 검사. 옵서버는 상태 전이를 행동 코드로 바꿔 기록(5.4)
- [ ] **D7** `NotificationGateway.notify` · `NotificationObserver` (3.5점) — 패턴 문서 7장 표대로 받는 사람과 유형. 받는 사람은 `StatusChange`의 작성자 · 검토자 · 최종 승인자에서 읽음. NOTIFICATION 행만 저장하고 바깥 발송은 커밋 뒤(로그 출력)
- [ ] **D14** `getNotifications` · `setRead` · `NotificationController` (1.5점)
- [ ] **D3** `JdbcPersistence` · `DatabaseConnectionPool` (6점) — `TableMapping` 계약대로: 식별자 따옴표, 자동 번호, 값 형식 변환(Timestamp ↔ Instant, Date ↔ LocalDate, JSON 열), 키가 같으면 고침. 싱글톤(private 생성자, `getInstance()`, `getConnection()`)이고 풀의 DataSource를 스프링에 등록해 `JdbcTemplate`으로 실행해야 승인 트랜잭션이 한 연결로 묶임. 자기 대응(D8)과 테스트 전용 대응으로 PostgreSQL에서 확인
- [ ] **D4** `jdbc` 프로필 마무리 (1.5점) — `AUDIT_EVENT`에 UPDATE·DELETE 권한이 없는 접속 계정, 시드 파일 연결(`spring.sql.init.data-locations`), 팀원용 DB 준비 안내 확인
- [ ] **D9** `ApiClient` · `SessionStore` · `manifest.json` (3점) — 6.2의 사용법 그대로. `storage` 권한과 서버 주소 추가
- [ ] **D10** 로그인 화면 (3점) — D19의 주소를 부름. 로그인 응답의 토큰을 SessionStore에 두고 `/api/auth/me`로 사용자 확인
- [ ] **D18** 공개 검증 페이지 (5점) — `have-server/src/main/resources/static/verify/`(주소 `/verify/index.html#<토큰>`). 토큰은 `#` 뒤에서 읽어 `POST /api/public/verifications`로. 고른 PDF는 보내지 않고 브라우저에서 SHA-256만 계산. 네트워크 오류면 세 판정 모두 "확인 불가". 화면은 확장 프로그램 `screens/verify.js`의 `showVerify` · `compareFile`을 옮김. 1단계에는 `docs/api.md` 8.1의 예시 응답으로 확인

**2단계 기본안 (22.5점, 통합 뒤 다시 나눔)**

- [ ] **D11** 화면 틀 (4점) · (가) — 서버에서 불러와 다시 그리는 흐름, "역할 시연" 전환 제거, 라우팅 정리
- [ ] **D15** 알림 화면 · 팝업 · 배지 (5점) · (가)
- [ ] **D12** 저장 구현 공통 테스트 (3점) · (가) — 모든 Repository 테스트를 `stub`과 `jdbc`에서
- [ ] **D13** 통합 (6점) — 2단계의 매일 통합, `jdbc`로 전환, 결함 목록, 실행 안내(README). 11/30 통합은 팀장이 진행(7.2)
- [ ] **D16** 시연용 시드 시나리오 (3점) · (가) — 서비스를 순서대로 불러 시연 작업을 만듦
- [ ] **D17** 정리 (1.5점) · (가) — `model.js` · `storage.js` · `seed.js`, 공용 대역(`PlaceholderConfiguration`과 imports 등록) 삭제
- 1단계를 일찍 끝내면: D12의 틀(대응 하나를 받아 `stub` · `jdbc` 양쪽에서 같은 테스트를 돌리는 공통 테스트)을 자기 대응으로 먼저 만듭니다.

### 4.8 통합 때 맞물리는 곳 — 모두 고정함

1단계에 서로 묻지 않아도 되도록 아래 맞물림을 코드와 문서로 고정했습니다. 1단계 동안 바꾸지 않습니다. 바꿀 필요가 생기면 `docs/phase1/<담당>.md`에 적고 통합 때 정합니다.

| 지점 | 제공 → 사용 | 고정한 내용 |
| --- | --- | --- |
| `setWorkStatus` · `StatusChange` | A → B · C · D | 필드(행위자, 새 버전·직전 버전, 재제출 여부, 사유, 작성자·검토자·최종 승인자), 사유를 받는 오버로드, 옵서버는 같은 트랜잭션(5.4) |
| `ReviewTarget` | A → B · C | 12개 필드. 현재 파일 해시는 A가 계산, 최신 버전 번호, 파일 이름, AI 미사용 여부 포함 |
| 수정 회차 만들기 | A → B · C | `IWorkVersion.createRevision`. REVISION은 A만 씀 |
| 권한 · 구성원 | B → A · C · D | `AuthAction`의 행동 이름, `addMember` · `getMembers` · `setMember` · `getWorkIds` · `getUsers`, 검토자·승인자는 작업마다 한 명(5.4) |
| 로그인 토큰 | D ↔ B | `TokenService`(D가 구현). B의 `login`은 `createToken`, `getCurrentUser`는 `getCurrentUserId`. 토큰 형식 · 만료는 D가 정함 |
| 검토 통과 → 승인 대상 | B → C | `isPassed`, `ConfirmedResult`(reviewId, requestId, versionId, reviewerId, decision, reviewDigest) |
| 승인 건을 만드는 때 | C | 04가 승인 건을 처음 조회할 때 만듦. B는 만들지 않음 |
| 이력 · 알림 | D → A · B · C | `IAuditLog.record` · `INotification.notify` 시그니처, 직접 부르는 행동 코드의 분담(5.4) |
| 저장 | D → 전원 | `TableMapping` · `IPersistence` · `Repository`(5.5), 담당별 하위 패키지 |
| 공개 검증 | C → D | 응답 필드(`docs/api.md` 8.1), 공유 링크 주소 `/verify/index.html#<토큰>` |
| 알림 목록의 제목 | D → A | 알림은 `versionId`만 주고 화면이 작업 목록에서 찾음(`docs/api.md` 10.1) |

---

## 5. 공통 계약 — 11/28 고정, 1단계 동안 바꾸지 않음

### 5.1 REST 규칙

| 항목 | 규칙 |
| --- | --- |
| 주소 | `/api/…`, 자원 이름은 복수형·소문자·하이픈. 공개 검증만 `/api/public/…` |
| 형식 | JSON(camelCase). 파일이 있는 요청만 multipart. ID는 숫자(BIGINT), 시각은 UTC ISO-8601(화면에서 KST로 표시) |
| 인증 | `Authorization: Bearer <토큰>`. 없거나 틀리면 401 |
| 멱등 키 | 승인·반려·철회는 `Idempotency-Key` 헤더 필수. 같은 키는 기존 결과를 200으로 반환 |
| 오류 본문 | `{ "code": "…", "message": "화면에 보일 한글 문장", "fields": { "칸 이름": "칸별 문장" } }` — 구현돼 있음. 서비스에서 `throw ApiException.conflict("…")`처럼 던지면 이 모양으로 나감 |
| 상태 코드 | 400 입력 오류·조건 미충족 / 401 로그인 필요 / 403 권한 없음(비구성원 포함, 내용 노출 없음) / 404 없음(공개 검증의 "대상 미식별" 포함) / 409 상태 충돌·같은 파일·진행 중 요청·이미 결정됨 |
| 문구 | 오류 문장은 확장 프로그램의 기존 문구(`model.js`의 `requireThat` 메시지)를 그대로 씀 |
| 입력 검사 | 화면과 서버가 모두 하고 서버가 최종 판단. 길이 제한은 DB 문서 6단계의 형식과 같음 |

### 5.2 엔드포인트

오퍼레이션 이름은 컴포넌트 다이어그램 v2의 인터페이스 표와 같습니다. **요청과 응답의 예시 JSON, 검사 규칙, 오류 문장은 `docs/api.md`에 있습니다.** 아래 표는 한눈에 보는 목록입니다. "추가"는 설계서에 없어 새로 필요한 것입니다(10.2). "단계"는 그 주소를 만드는 단계입니다(2단계 기본안의 항목이라도 1단계에 일찍 끝내면 먼저 만들어도 됨).

| 인터페이스 · 오퍼레이션 | 메서드 · 주소 | 담당 | UC | 단계 |
| --- | --- | --- | --- | --- |
| IAuthorization.login | POST `/api/auth/login` | D(진입점) · B | 공통 | 1 |
| IAuthorization.logout | POST `/api/auth/logout` | D(진입점) · B | 공통 | 1 |
| IAuthorization.getCurrentUser | GET `/api/auth/me` | D(진입점) · B | 공통 | 1 |
| (추가) IAuthorization.getUsers | GET `/api/users?keyword=` | D(진입점) · B | UC03 | 1 |
| IWorkAPI.createWork | POST `/api/works` | A | UC01 | 1 |
| IWorkAPI.getWorks | GET `/api/works?role=&status=&keyword=` | A | UC09 | 1 |
| IWorkAPI.getWork | GET `/api/works/{workId}` | A | 공통 | 1 |
| IWorkAPI.uploadVersion | POST `/api/works/{workId}/versions` (multipart) | A | UC02 | 1 |
| IWorkAPI.addContribution | POST `/api/versions/{versionId}/contributions` | A | UC01 | 1 |
| IWorkAPI.addEvidence | POST `/api/versions/{versionId}/evidences` | A | UC02 | 1 |
| IWorkAPI.resubmit | POST `/api/works/{workId}/resubmissions` (multipart) | A | UC05 | 2 |
| (추가) 결과물 파일 내려받기 | GET `/api/versions/{versionId}/file` | A | UC04 · UC06 | 1 |
| IReviewAPI.assessRisk | POST `/api/versions/{versionId}/risk-assessments` | B | UC03 | 1 |
| IReviewAPI.requestReview | POST `/api/versions/{versionId}/review-requests` | B | UC03 | 1 |
| (추가) 버전의 검토 요청 조회 | GET `/api/versions/{versionId}/review-request` | B | UC03 | 1 |
| IReviewAPI.cancelRequest | POST `/api/review-requests/{requestId}/cancel` | B | UC03 | 2 |
| IReviewAPI.getChallenges | GET `/api/review-requests/{requestId}/challenges` | B | UC03 | 1 |
| IReviewAPI.saveAnswers | PUT `/api/review-requests/{requestId}/answers` | B | UC03 | 2 |
| IReviewAPI.submitAnswers | POST `/api/review-requests/{requestId}/answers/submit` | B | UC03 | 1 |
| IReviewAPI.getAssignedRequests | GET `/api/review-requests?assignee=me` | B | UC04 | 1 |
| IReviewAPI.startReview | POST `/api/review-requests/{requestId}/review/start` | B | UC04 | 1 |
| IReviewAPI.saveReviewDraft | PUT `/api/review-requests/{requestId}/review/draft` | B | UC04 | 2 |
| IReviewAPI.submitReview | POST `/api/review-requests/{requestId}/review/submit` | B | UC04 | 1 |
| IReviewAPI.requestRevision | POST `/api/review-requests/{requestId}/review/revision-request` | B | UC04 | 2 |
| IApprovalAPI.getApprovalCase | GET `/api/versions/{versionId}/approval-case` | C | UC06 | 1 |
| IApprovalAPI.approve | POST `/api/approval-cases/{caseId}/approve` | C | UC06 | 1 |
| IApprovalAPI.reject | POST `/api/approval-cases/{caseId}/reject` | C | UC06 | 2 |
| IApprovalAPI.revoke | POST `/api/approvals/{approvalId}/revoke` | C | UC10 | 2 |
| ICertificateAPI.getCertificate | GET `/api/certificates/{certId}` (승인 ID로 찾기는 `?approvalId=`, 추가) | C | UC07 | 1 |
| ICertificateAPI.retryIssue | POST `/api/certificates/{certId}/retry-issue` | C | UC07 | 2 |
| ICertificateAPI.createShareLink | POST `/api/certificates/{certId}/share-links` | C | UC07 | 1 |
| ICertificateAPI.disableShareLink | POST `/api/share-links/{linkId}/disable` | C | UC07 | 2 |
| ICertificateAPI.createQRCode | (P2) 공유 링크 응답에 함께 | C | UC07 | P2 |
| IVerificationAPI.verify · verifyByQR | POST `/api/public/verifications` (토큰 없음) | C (페이지는 D) | UC08 | 1 |
| IHistoryQuery.getHistory | GET `/api/works/{workId}/history?versionNo=&type=` | C | UC09 | 2 |
| IHistoryQuery.getLatestStatus | GET `/api/works/{workId}/status` | C | UC09 | 2 |
| IHistoryQuery.isChainValid | GET `/api/works/{workId}/history/chain` | C | UC09 | 2 |
| INotificationQuery.getNotifications | GET `/api/notifications` | D | UC09 | 1 |
| INotificationQuery.setRead | POST `/api/notifications/{notificationId}/read` | D | UC09 | 1 |

`docs/api.md`는 11/28에 고정했습니다. 1단계 동안 바꾸지 않고, 고칠 곳은 `docs/phase1/<담당>.md`에 적어 두었다가 통합 때 반영합니다. 응답 필드 이름은 클래스 v3의 속성 이름을 씁니다. 2단계에 필드를 바꾸면 그 응답을 쓰는 화면 담당자에게 바로 알립니다.

### 5.3 서버 내부 인터페이스 (11/28 고정)

Java `interface` 파일과 주고받는 값 객체가 `have-server`에 들어 있고, 1단계 동안 바꾸지 않습니다.

| 인터페이스 | 제공 | 쓰는 쪽 | 오퍼레이션 |
| --- | --- | --- | --- |
| IWorkVersion | 02 (A) | 03 · 04 · 05 · 06 | getReviewTarget, getVersionHash, setWorkStatus(사유를 받는 오버로드 포함), createRevision · 값 객체 `ReviewTarget` |
| WorkStatusObserver | 02가 정의 (A) | 03 · 05 · 07이 구현 | update(subject) · 값 객체 `StatusChange` |
| IReviewResult | 03 (B) | 04 | getConfirmedResult, isPassed · 값 객체 `ConfirmedResult` |
| IAuthorization | 01 (B) | 02 ~ 05, D의 AuthController | login, logout, getCurrentUser, isAuthorized, getMemberRole, addMember, getMembers, setMember, getWorkIds, getUsers · `AuthAction`, `Credential`, `User` |
| TokenService | 01 (D) | B의 AuthorizationPolicy | createToken, getExpiresAt, getCurrentUserId |
| IApprovalStatus | 04 (C) | 05 · 06 | getApprovalResult, getCurrentValidity, getPendingIssues · `ApprovalResult`, `ApprovalValidity` |
| ICertificateData | 05 (C) | 06 | getCertificateData, getSignature · `CertificateData` |
| IAuditLog | 07 (D) | 02 ~ 06 | record(workId, actorId, action, payload) · `AuditPayload` |
| INotification | 07 (D) | 02 · 03 · 04 · 05 | notify(userId, type, targetId) |
| IPersistence · Repository‹T› · TableMapping | 08 (D) | 01 ~ 05 · 07 | save, getById, getByCondition, delete · 저장 대응(5.5) |
| FileStore | 08 (A) | 02 | put, get, delete |

02는 옵서버 인터페이스만 정의하고 구현 클래스를 모릅니다. 등록은 `HaveServerBootstrap`에서만 합니다(순환 의존 방지).

값 객체와 엔티티는 Java `record`가 아니라 **getter가 있는 클래스**로 씁니다. `record`의 접근자는 `workId()`처럼 `get`이 붙지 않아 오퍼레이션 명명 규칙(`is` · `get` · `set` · `show`)과 어긋납니다.

**1단계에 다른 사람의 인터페이스를 쓰는 법**

- 내 코드는 다른 사람의 인터페이스를 생성자로 받습니다. 진짜 구현은 통합 때 들어옵니다.
- 자기 브랜치에는 다른 사람의 구현이 없으므로 공용 대역(`PlaceholderConfiguration`)이 그 자리에 들어가 서버와 `gradlew test`가 뜹니다. 대역을 부르면 "아직 구현되지 않았습니다(담당 ○)" 예외가 납니다. 진짜 구현이 생기면 대역은 자동으로 빠집니다(`PlaceholderConfigurationTest`로 확인함).
- **다른 사람의 인터페이스를 main 코드에서 구현하지 않습니다.** 대역이 이미 있고, 구현이 둘이 되면 합칠 때 서버가 뜨지 않습니다.
- 테스트에서는 Mockito로 원하는 값을 돌려주게 합니다. 진입점(Controller) 테스트는 `@WebMvcTest(…Controller.class)` + `@MockitoBean`을 씁니다.

```java
@ExtendWith(MockitoExtension.class)
class ReviewRequestServiceTest {
    @Mock IWorkVersion works;            // A의 인터페이스 — 1단계에는 Mockito로 대신
    @Mock IAuthorization authorization;  // B 자신의 것이라도 서비스 테스트에서는 대신해도 됨
    @Mock IAuditLog auditLog;            // D의 인터페이스

    @Test
    void 위험_분석이_없으면_400이다() {
        when(works.getReviewTarget(21L)).thenReturn(new ReviewTarget(12L, 21L, 1, 1, 1L, "보고서", "a.pdf",
                WorkStatus.SUBMITTED, "9f…", "9f…", 2, false));
        // 서비스를 만들어 부르고 ApiException의 상태 코드를 확인한다
    }
}
```

### 5.4 상태 변경과 이력·알림

- 작업 버전의 상태는 `setWorkStatus`로만 바꿉니다. 서비스가 `WORK_VERSION.status`를 직접 고치지 않습니다.
- 수정 요청(B13)과 반려(C14)는 `IWorkVersion.createRevision`으로 수정 회차를 만든 뒤 `setWorkStatus(workId, REVISION_REQUIRED, 사유)`를 부릅니다. 03 · 04는 REVISION 테이블을 직접 쓰지 않습니다.
- 옵서버는 상태를 바꾼 서비스의 트랜잭션 안에서 동기로 실행되고 같은 DB에 행만 저장합니다. 하나라도 실패하면 상태 변경까지 롤백합니다. 서명과 알림 전송처럼 실패할 수 있는 바깥 일은 커밋 뒤의 처리기가 합니다.
- 옵서버 실행 순서에 기대는 로직을 만들지 않습니다.
- 트랜잭션은 서비스 메서드 단위입니다. Repository와 옵서버는 트랜잭션을 새로 열지 않습니다.

이력을 두 번 남기거나 빠뜨리지 않도록, 행동 코드 21개를 누가 남기는지 나눕니다(순서 다이어그램 기준).

| 남기는 곳 | 행동 코드 |
| --- | --- |
| `AuditLogObserver`(상태 전이를 받아 기록, D) | UPLOAD_VERSION, REQUEST_REVIEW, CANCEL_REQUEST, SUBMIT_ANSWERS, START_REVIEW, PASS_REVIEW, REQUEST_REVISION, RESUBMIT, APPROVE, REJECT |
| 서비스가 `IAuditLog.record`를 직접 호출(상태가 바뀌지 않는 일) | A: CREATE_WORK, ADD_CONTRIBUTION / B: ASSESS_RISK, HALT_REVIEW / C: ISSUE_CERTIFICATE, ISSUE_FAILED, RETRY_ISSUE, SHARE_LINK_CREATED, SHARE_LINK_DISABLED, REVOKE, VERIFY |

알림 10종의 받는 사람은 패턴 문서 7장의 표를 따르고, 화면 문구는 클라이언트가 유형으로 만듭니다(`model.js`의 `NOTIFICATION`).

**알림 받을 사람 — 검토자 · 최종 승인자는 작업마다 한 명 (11/28 결정, `docs/design-changes.md` 열린 항목 2 · 18)**

옵서버는 받는 사람을 `StatusChange`에서 읽습니다(패턴 문서 7장 예제의 `getReviewerId()` · `getApproverId()`). 그런데 `StatusChange`를 만드는 02에는 검토자 · 최종 승인자 정보가 없습니다. 검토자는 03의 `REVIEW_REQUEST`에, 최종 승인자는 01의 `WORK_MEMBER`에만 있고, 02는 03을 부를 수 없습니다. 그래서 다음과 같이 정했습니다.

1. **한 작업의 검토자와 최종 승인자는 각각 한 명입니다.** v1의 검토 요청에서 정하고, 그 작업의 이후 버전(재제출 · 새 버전)도 같은 사람이 맡습니다.
2. **바꿀 수 있는 때는 v1의 검토 요청을 취소하고 다시 요청할 때뿐입니다.** v1이 `SUBMITTED`로 돌아왔다면 아직 검토가 진행되지 않았으므로 바꿔도 잃는 기록이 없습니다. 이전 사람은 그 작업의 구성원에서 빠집니다. v2부터 다른 사람을 고르면 409입니다.
3. **지정은 01의 `WORK_MEMBER`에 둡니다.** 버전이 아니라 작업 단위의 표라서, 한 명 규칙이 있어야 "이 작업의 검토자"가 하나로 정해집니다. DB도 조건부 유니크 인덱스 `uq_work_member_designated`로 막습니다.
4. **02가 `StatusChange`를 채웁니다.** `WorkStatusSubject`가 `IAuthorization.getMembers(workId, REVIEWER · APPROVER)`로 검토자 · 최종 승인자를 찾아 넣습니다(02 → 01은 허용된 방향). 옵서버는 설계서 그대로 `StatusChange`에서 받는 사람을 읽고, 다른 서브시스템의 테이블을 읽지 않습니다.
5. **순서: 지정 → 과제 배정 → `setWorkStatus`.** 03의 `requestReview`가 이 순서로 부릅니다. 같은 트랜잭션이라 옵서버가 방금 지정한 사람을 봅니다.
6. **같은 행을 함께 씁니다.** 04의 "지정 최종 승인자" 조건, `isAuthorized`의 REVIEW · APPROVE 확인, 작업 상세의 `reviewer` · `approver`가 모두 이 `WORK_MEMBER` 행을 봅니다.

| 누가 | 하는 일 | 항목 |
| --- | --- | --- |
| B | `getMembers` · `setMember`, `addMember`의 한 명 검사 | B2 |
| B | `requestReview`의 지정 규칙과 순서 | B5 |
| A | `StatusChange`의 검토자 · 최종 승인자 채우기 | A7 |
| A | 작업 상세의 `reviewer` · `approver`, 마법사와 다시 요청 화면의 잠금 | A6 · A11 |
| C | 지정 최종 승인자 조건 | C1 |
| D | 받는 사람을 `StatusChange`에서 읽기 | D7 |

### 5.5 저장 계약 (11/28 고정)

테이블을 만드는 SQL은 `have-server/src/main/resources/db/schema`에 있고, 이 파일들이 테이블 정의의 기준입니다. DB 문서와 다르게 둔 곳(기본값 몇 개, `review_digest`의 NULL 허용 등)은 `docs/design-changes.md` 1.1에 적혀 있습니다. 테이블과 열 이름은 소문자이고(`work_version`), `user`만 예약어라 SQL에서는 `"user"`로 씁니다.

| 항목 | 규칙 |
| --- | --- |
| 대응 | 엔티티마다 `TableMapping` 하나를 만들어 `@Component`를 붙임. 테이블 소유자가 씀. 위치는 `have.persistence.<서브시스템>`(work · auth · review · approval · audit) |
| 행의 값 형식 | BIGINT → `Long`, INT · SMALLINT → `Integer`, VARCHAR · CHAR · TEXT · JSON → `String`, BOOLEAN → `Boolean`, TIMESTAMP → `Instant`(UTC), DATE → `LocalDate`, 코드 값 → enum 이름 문자열, 없음 → `null`. 두 저장 구현이 이 형식으로 주고받음 |
| 저장(`save`) | 자동 번호 테이블에서 키가 비면 넣고 번호를 붙인 엔티티를 돌려줌(`setGeneratedKey`). 그 밖에는 기본 키가 같은 행이 있으면 고치고 없으면 넣음 |
| 조회 | `getById`(키 열 하나), `getByCondition`(같음 비교 AND, 빈 조건이면 전부). 순서는 보장하지 않으므로 정렬은 Repository에서 |
| 삭제(`delete`) | 조건에 맞는 행을 지움. 빈 조건은 거절. `audit_event`에는 쓰지 않음 |
| Repository | `Repository<T>`를 상속하고 업무 질의(`getByWork` 등)를 `getByCondition`으로 만듦. 서비스는 Repository만 씀 |
| 엔티티 | 자기 서브시스템 패키지에 getter가 있는 클래스로(record 금지). 자동 번호 키는 `Long`(아직 없으면 null) |
| 1단계 확인 | `new StubPersistence(List.of(new WorkMapping(), …))`로 자기 Repository를 테스트. 쓰는 예는 `StubPersistenceTest`(자동 번호 테이블과 복합 키 테이블) |
| DB가 지키는 제약 | UNIQUE, 복합 외래 키, CHECK, 조건부 유니크 인덱스(DB 문서 "제약을 지키는 위치"의 DB 항목) |
| 서비스가 지키는 제약 | 같은 표의 "서비스" 항목(자기 검토·자기 승인 금지, 재제출 전 모든 보완 항목 답변 등) |
| 동시 수정 | `WORK_VERSION.revision`을 낙관적 잠금 번호로 사용 |
| 두 구현의 일치 | 2단계 D12에서 모든 Repository 테스트를 `stub`과 `jdbc` 양쪽에서. `StubPersistence`는 DB 제약과 롤백을 흉내 내지 않으므로 그 확인은 `jdbc`에서 |

### 5.6 코드 값

DB 문서 부록 A가 유일한 기준입니다. 서버는 `have.common.code`의 enum 18개, 클라이언트는 `model.js`의 상수(STATUS, EFFECT, SIGNING 등), DB는 CHECK 제약을 쓰고 세 곳의 값이 같아야 합니다. enum과 CHECK가 같은지는 `CodeValueTest`가 확인하므로, 값을 바꾸면 세 곳을 함께 고칩니다. 작업 버전 상태 8개(`DRAFT`, `SUBMITTED`, `CHALLENGE_PENDING`, `REVIEW_PENDING`, `IN_REVIEW`, `REVISION_REQUIRED`, `APPROVAL_PENDING`, `APPROVED`), 승인 효력 3개(VALID·REVOKED·NONE, 저장하지 않고 계산), 위험 등급 3개(저장하지 않고 계산), 알림 10종, 행동 코드 21개입니다.

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

1.1.0은 `app.js`(925줄)에 모든 화면이 있어 네 명이 동시에 고치면 충돌이 납니다. 그래서 **화면별 파일로 미리 나눠 두었습니다(A1, 11/28)**. 코드를 옮기기만 했고, 나눈 뒤 화면 출력과 클릭 흐름이 1.1.0과 같은지 확인했습니다. ✔는 지금 있는 파일, 나머지는 만들 파일입니다.

| 파일 | 내용(패키지 다이어그램 레벨 3의 화면 클래스) | 소유 |
| --- | --- | --- |
| `scripts/api/api-client.js` | ApiClient, SessionStore | D |
| `scripts/api/work-api.js` | IWorkAPI 호출 | A |
| `scripts/api/auth-api.js` | 로그인 · 내 정보 · 사용자 찾기 호출(D19의 주소) | D |
| `scripts/api/review-api.js` | IReviewAPI 호출 | B |
| `scripts/api/approval-api.js` · `certificate-api.js` · `history-api.js` | IApprovalAPI, ICertificateAPI, IHistoryQuery 호출 | C |
| `scripts/api/notification-api.js` | INotificationQuery 호출 | D |
| ✔ `scripts/app.js` | 화면 틀(AppShell), 라우팅, 불러오기·다시 그리기, 공통 도구, 이벤트를 화면 파일로 넘기는 부분 | D |
| `scripts/screens/login.js` | 로그인 | D |
| ✔ `scripts/screens/works.js` | 작업 목록·작업 상세 개요(WorkListView, WorkDetailView) | A |
| ✔ `scripts/registration.js` · `scripts/screens/register.js` | 등록 마법사(RegisterWizardView): 그리기 / 입력·제출 처리 | A |
| ✔ `scripts/screens/revise.js` | 수정본 재제출(RevisionView) | A |
| ✔ `scripts/screens/challenge.js` | 이해 확인(GateAnswerView) | B |
| ✔ `scripts/screens/review.js` | 검토(ReviewPanelView)의 시작·저장·결정 처리 | B |
| ✔ `scripts/screens/approval.js` | 최종 승인(ApprovalView)의 승인·반려·철회 처리 | C |
| ✔ `scripts/screens/role.js` | "검토할 작업 · 승인할 작업" 화면의 틀. 결정 처리는 `review.js`와 `approval.js`가 `addRoleDecision`으로 등록 | B · C 공동(고칠 때 서로 알림) |
| ✔ `scripts/review-ui.js` | 검토 · 승인 양식 그리기. 파일은 하나이고 함수 단위로 나눠 가짐(검토 부분 B, 승인 부분 C) | B · C |
| ✔ `scripts/screens/certificate.js` · `history.js` | 작업 상세의 증명서 탭·이력 탭 | C |
| ✔ `scripts/screens/notifications.js` | 알림(NotificationView) | D |
| ✔ `scripts/screens/verify.js` | 공개 검증 화면. 서버의 공개 검증 페이지로 옮긴 뒤 삭제(D18) | D |
| ✔ `scripts/start.js` | 맨 끝에서 `init()`을 한 번 부름 | D |
| ✔ `scripts/popup.js` · `background.js` · `manifest.json` | 팝업(PopupView), 배지, 권한 | D |
| ✔ `scripts/model.js` | 코드 값·라벨·화면용 계산·입력 검사만 남김 | 전원(자기 영역만) |
| ✔ `scripts/storage.js` · `seed.js` · `review-model.js` | 전환이 끝나면 삭제(임시 저장은 SessionStore 쪽으로) | D가 정리 |
| ✔ `tests/model.test.js` | 업무 규칙 테스트 7개(`node --test tests/model.test.js`) | 규칙을 옮기는 사람 |

- 화면 파일은 전역 함수로 이어져 있고 `app.html`이 순서대로 불러옵니다. 새 파일을 만들면 `app.html`의 `<script>` 목록에 더합니다(`start.js`는 항상 맨 끝). `app.html`은 D의 파일이고, 1단계에는 D만 고칩니다. 2단계부터는 한 줄 추가를 각자 합니다.
- 화면 파일이 버튼과 입력을 받는 방법은 `app.js`의 `addAction` · `addActionPrefix` · `addHandler`입니다. 쓰는 법은 `have-chrome-extension/읽어주세요.md`에 있습니다. `app.js`에 화면별 분기를 다시 넣지 않습니다.

API 모듈의 함수 이름은 서버 오퍼레이션과 같게 씁니다(`workApi.createWork(…)`). 서버 응답을 기존 `show…` 함수가 받던 모양으로 바꾸는 일은 API 모듈 안에서 해서 화면 코드를 덜 고칩니다.

**ApiClient 사용법 (11/28 고정, D9가 이대로 만듦)** — 1단계에 다른 사람이 자기 API 모듈을 미리 쓸 수 있도록 정해 둡니다.

```js
// scripts/api/api-client.js (D) — 전역 HaveApi
HaveApi.request(method, path, { body, form } = {})
//  body: JSON으로 보낼 객체 / form: { 파트 이름: File · Blob · 객체 } (객체는 application/json 파트로 보냄)
//  → Promise<응답 JSON>, 본문이 없으면(204) null
//  실패하면 HaveApiError { status, code, message, fields }를 던진다(오류 본문 5.1). 401이면 로그인 화면으로 보낸다.
HaveApi.getSession()   // → { token, userId } 또는 null (SessionStore)

// scripts/api/work-api.js (A) — 모듈은 이런 모양으로 쓴다
const workApi = {
  createWork: body => HaveApi.request('POST', '/api/works', { body }),
  getWorks: (query = '') => HaveApi.request('GET', '/api/works' + query),
  uploadVersion: (workId, file, data) => HaveApi.request('POST', `/api/works/${workId}/versions`, { form: { file, data } }),
};
```

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

옮길 때는 해당 JavaScript 함수와 유스케이스 명세의 "대안·예외"를 나란히 놓고 조건을 하나씩 대조합니다. 11-23에 만든 모델 테스트(전체 흐름, 재제출, 반려·취소, 해시 불일치, 입력 검사)의 시나리오를 서버 테스트 이름으로 그대로 가져옵니다. 이 파일은 `have-chrome-extension/tests/model.test.js`에 있습니다.

### 6.4 화면이 데이터를 얻는 방법

- 화면(탭)마다 그 서브시스템의 API를 부릅니다. 작업 상세는 IWorkAPI, 이해 확인·검토는 IReviewAPI, 승인은 IApprovalAPI, 증명서는 ICertificateAPI, 이력은 IHistoryQuery입니다. 02가 03~05의 데이터를 대신 모아 주지 않습니다(의존 방향).
- 명령을 보낸 뒤에는 해당 작업을 서버에서 다시 불러와 그립니다. 클라이언트가 다음 상태를 추측하지 않습니다.
- 등록 마법사는 화면 순서를 그대로 두고, 마지막에 `createWork → uploadVersion → addContribution → addEvidence → assessRisk → requestReview` 순서로 호출합니다. 중간에 실패하면 어디까지 저장됐는지 보여 주고 그 단계부터 다시 시도하게 합니다.
- 검토자·최종 승인자는 작업마다 한 명입니다(5.4). 새 버전을 등록하는 마법사의 마지막 단계와 취소 뒤 다시 요청하는 화면(`screens/register.js`)은 작업 상세(`GET /api/works/{workId}`)의 `reviewer` · `approver`를 미리 골라 둡니다. v2부터는 바꿀 수 없게 잠그고, v1을 다시 요청할 때만 바꿀 수 있게 둡니다. 1.1.0 화면은 v2에서도 다시 고를 수 있으므로 A11에서 고칩니다.
- `manifest.json`: `permissions`에 `storage` 추가, `host_permissions`에 서버 주소(`http://localhost:8080/*`) 추가, 버전을 1.2.0으로 올립니다. 확장 프로그램 페이지는 `host_permissions`에 적은 주소를 CORS 설정 없이 부를 수 있으므로 서버에 CORS 설정을 넣지 않습니다. 공개 검증 페이지는 서버가 직접 내려 주므로 같은 출처입니다.
- 서버 호출로 바꾸는 동안에도 `main`의 확장 프로그램은 항상 열려야 합니다. 화면 하나를 서버로 바꿀 때 그 화면이 쓰던 `model.js` 함수 호출만 API 모듈 호출로 바꾸고, 다른 화면이 쓰는 함수는 지우지 않습니다.
- 세 역할을 한 PC에서 시연하려면 Chrome 프로필을 세 개 쓰거나 로그아웃 후 다른 계정으로 로그인합니다.

---

## 7. 일정 (11/28 토 ~ 12/4 금)

`have_4.md`의 3단계(기반·인터페이스 합의 → 병렬 구현 → 통합·예외 검증)를 두 단계 진행에 맞췄습니다. 주말을 포함한 계획입니다.

### 7.1 날짜별

| 날짜 | 단계 | A | B | C | D |
| --- | --- | --- | --- | --- | --- |
| 11/28(토) 저녁 | **착수** — 팀장이 레포에 올리고 A~D를 알림. 각자 같은 커밋에서 브랜치를 만들고 `gradlew test` 확인 | A10부터 | B3부터 | C10부터 | D8부터 |
| 11/29(일) ~ 11/30(월) 18시 | **1단계 각자 작업** — 연락 없음. 각자 1단계 목록을 위에서부터 | 4.4의 1단계 | 4.5의 1단계 | 4.6의 1단계 | 4.7의 1단계 |
| 11/30(월) 18시 ~ 밤 | **통합**(7.2) — 여기서부터 다시 연락 | 브랜치 올림, 자기 파일 충돌 해결 | 같음 | 같음 | 같음 |
| 12/1(화) 오전 | **2단계 분담 회의**(30분, 4.3) | | | | |
| 12/1(화) ~ 12/2(수) | **2단계 ①** — 화면 연동으로 S1을 화면까지 끝까지(12/2 밤), `jdbc`로 S1 | A11 · A12 | B10 · B11 | C11 · C12 | D11 · D12 |
| 12/2(수) ~ 12/3(목) 18시 | **2단계 ②** — 되돌아가는 흐름과 예외. 12/3 18시 기능 동결 | A14 · A15 | B13 ~ B16 | C14 ~ C18 | D13 · D15 · D16 |
| 12/3(목) 밤 | **통합 테스트 · 코드 검사** — S1~S13 전부, 결함 수정만 | 결함 수정 | 결함 수정 | 결함 수정 | 결함 목록 관리, 실행 안내 |
| 12/4(금) | **마감** — `jdbc`로 최종 확인, 설계 변경 기록 정리, 시연 리허설, 태그, D17 정리 | | | | |

- 2단계 칸의 항목은 기본안입니다. 12/1 회의에서 남은 일에 맞춰 다시 나눕니다.
- 12/3 18시 이후에는 새 기능을 넣지 않습니다.

### 7.2 통합 순서 (11/30 월 18시 ~)

1. **18시까지 각자** — 마지막으로 `gradlew test`가 통과하는지 확인하고 브랜치를 원격에 올립니다. `docs/phase1/<담당>.md`(못 끝낸 항목, 공용 파일 변경 요청, 설계 변경 기록, 알릴 점)를 채웁니다.
2. **합치는 사람(팀장 ★)** — D → B → A → C 순서로 `main`에 합칩니다. 기반(저장 · 토큰 · 이력)과 권한을 먼저 합쳐야 뒤의 브랜치를 합칠 때 바로 확인할 수 있습니다. 한 브랜치를 합칠 때마다 `gradlew test`를 돌립니다.
3. **충돌** — 그 파일의 소유자가 해결합니다. 공용 대역은 지우지 않습니다(진짜 구현이 들어오면 자동으로 빠짐).
4. **메모 반영** — `docs/phase1/*.md`의 공용 파일 변경 요청을 반영하고, 설계 변경 기록을 `docs/design-changes.md`로 옮깁니다.
5. **확인** — 서버를 `stub`으로 띄우고 아래 순서로 API를 불러 봅니다. 막힌 곳은 2단계 목록 맨 위에 올립니다.
6. **12/1 오전** — 2단계 분담 회의(4.3).

| 순서 | 호출(`docs/api.md`) | 기대 |
| --- | --- | --- |
| 1 | 김하늘로 로그인(3.1) → `GET /api/auth/me` | 토큰, 사용자 1 |
| 2 | `POST /api/works` → `POST /api/works/{id}/versions` | `SUBMITTED`, `UPLOAD_VERSION` 이력 |
| 3 | 위험 분석(5.1) → 검토 요청(5.2, 검토자 2 · 승인자 4) | `CHALLENGE_PENDING`, 검토자 알림 |
| 4 | 답변 제출(5.7) | `REVIEW_PENDING` |
| 5 | 김지은으로 로그인 → 검토 시작(5.9) → 검토 통과(5.11) | `APPROVAL_PENDING` |
| 6 | 박서연으로 로그인 → 승인 건 조회(6.1) → 승인(6.2) | `APPROVED`, 증명서 `PENDING` → 잠시 뒤 `READY` |
| 7 | 공유 링크(7.3) → 로그인 없이 공개 검증(8.1) | 서명 `PASS` · 효력 `VALID` · 파일 `NOT_CHECKED` |
| 8 | 알림 목록(10.1), 공개 검증 페이지 `/verify/index.html#<토큰>` | 알림이 5.4대로, 페이지에 세 판정 |

---

## 8. 협업 규칙

### 8.1 Git

- **1단계** — 같은 커밋에서 `phase1/a` · `phase1/b` · `phase1/c` · `phase1/d` 브랜치를 만듭니다. 커밋은 자주 하고, 원격에는 하루 한 번 이상 올립니다(백업용. 서로 가져다 쓰지 않음). 다른 사람의 브랜치를 합치거나 가져오지 않습니다.
- **통합** — 7.2의 순서대로 팀장이 `main`에 합칩니다.
- **2단계** — 기능 브랜치 `feat/<담당>-<항목>-<요약>`(예: `feat/b-b13-request-revision`)에서 PR을 만듭니다. PR은 작게, 하루 한 번 이상 `main`에 합칩니다. 오래 묵힌 브랜치가 통합을 막습니다.
- `main`에 직접 올리지 않습니다.
- 커밋 제목은 `[UC02] 직전 버전과 같은 파일이면 409`처럼 유스케이스(또는 `[공통]`)를 앞에 붙입니다.
- 2단계에서 자기 소유가 아닌 파일을 고치면 소유자가 검토합니다. 계약(`docs/api.md`, 인터페이스 파일, `have.common.code`, `db/schema`, `build.gradle`, `AGENTS.md`)을 바꾸는 PR은 전원에게 알립니다.
- AI 도구를 쓸 때는 저장소 루트에서 실행해 `AGENTS.md`(Claude Code는 `CLAUDE.md`)를 읽게 합니다. 자기 담당(A~D), 지금 단계(1단계 · 2단계), 항목 번호를 먼저 알려 주고 시작합니다.
- 검토 짝 ★: A ↔ B, C ↔ D. 2단계에서 검토자 한 명이 승인하면 합칩니다.
- 비밀번호, DB 접속 정보, 서명 키, 업로드된 파일은 올리지 않습니다.

### 8.2 코딩 표준 (Ch10)

- 클래스·인터페이스는 대문자로 시작하는 명사, 메소드는 소문자로 시작하는 동사구, 상수는 대문자, 패키지는 소문자.
- 오퍼레이션 이름은 설계서와 같게. 새 메소드도 `is`·`get`·`set`·`show` 규칙.
- Java `record`와 Lombok은 쓰지 않습니다(5.3). 다른 사람의 인터페이스는 테스트에서 Mockito로 대신합니다(5.3).
- 클래스 위에 용도 한 줄, 공개 메소드에 하는 일·매개변수·반환값(Javadoc). 대응하는 유스케이스 단계나 항목 번호를 적으면 추적이 쉽습니다.
- 블록에는 항상 중괄호, 들여쓰기 4칸. JavaScript는 기존 파일의 스타일을 따릅니다.
- 상태 다이어그램의 가드는 메소드 안의 조건 검사로, 순서 다이어그램의 메시지는 받는 쪽 클래스의 메소드로 구현합니다.

### 8.3 테스트와 완료 기준

테스트 최소선: 서비스 메소드마다 정상 1개와 예외 1개 이상, 진입점은 주소마다 정상 1개, Repository는 `StubPersistence`로 저장 · 조회 1개 이상. PR을 올리거나 브랜치를 넘기기 전에 `gradlew test` 전체가 통과해야 합니다(지금 뼈대 테스트 17개가 통과함).

**1단계 항목이 "끝났다"(점수를 뺀다)는 것**은 다음을 모두 만족한다는 뜻입니다.

1. 클래스·오퍼레이션·코드 값이 설계서와 같다
2. 요청 · 응답이 `docs/api.md`와 같다(진입점 테스트로 확인)
3. 자기 테스트가 통과하고 `gradlew test` 전체도 통과한다(다른 사람의 인터페이스는 Mockito)
4. 이력 · 알림을 5.4대로 부른다(Mockito로 호출을 확인)
5. 설계와 달라진 점과 막힌 점을 `docs/phase1/<담당>.md`에 적었다

**2단계 항목이 "끝났다"는 것**은 다음을 모두 만족한다는 뜻입니다.

1. 위 1단계 기준
2. 확장 프로그램 화면에서 정상 흐름과 대표 예외가 동작한다
3. 감사 이벤트와 알림이 실제로 5.4대로 남는다
4. 검토자 한 명이 PR을 승인했다
5. 설계와 달라진 점을 `docs/design-changes.md`에 적었다

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

`docs/design-changes.md`에 한 줄씩 적습니다. 뼈대를 만들며 생긴 20건, 구현하면 더하게 될 6건(10.2), 열린 항목 18건과 그 결정이 적혀 있습니다. **1단계에는 이 파일을 고치지 않고** 자기 `docs/phase1/<담당>.md`에 적었다가 통합 때 팀장이 옮깁니다(같은 자리에 네 명이 행을 더하면 번호가 겹치기 때문입니다).

| 날짜 | 무엇을 추가·변경 | 이유 | 고쳐야 할 산출물 | 반영 |
| --- | --- | --- | --- | --- |
| 11/29 | 예: `ReviewService.getReviewDigest` 추가 | 검토 내용 해시 계산을 한곳에 | 클래스 v3 | 미반영 |

### 8.6 연락 없이 일하는 1단계 규칙

1. **자기 파일만 만들고 고칩니다.** 자기 패키지(`have.work` 등), 자기 저장 하위 패키지(`have.persistence.work` 등), 자기 시드 파일, 자기 화면 파일, 자기 테스트.
2. **공용 파일은 고치지 않습니다.** 고칠 필요가 있으면 `docs/phase1/<담당>.md`의 "공용 파일 변경 요청"에 적고 통합 때 반영합니다.
   - 인터페이스와 값 객체 전부: `IWorkVersion` · `ReviewTarget` · `StatusChange` · `Subject` · `WorkStatusObserver` · `IAuthorization` · `AuthAction` · `Credential` · `User` · `TokenService` · `IReviewResult` · `ConfirmedResult` · `IApprovalStatus` · `ApprovalResult` · `ApprovalValidity` · `ICertificateData` · `CertificateData` · `IAuditLog` · `AuditPayload` · `INotification` · `IPersistence` · `Repository` · `TableMapping` · `FileStore`
   - `have.common`(코드 값 enum 포함), `have.bootstrap`, `StubPersistence`, `db/schema/*.sql`, 공용 대역 등록 파일
   - `docs/api.md` · `docs/design-changes.md` · 이 가이드라인 · `AGENTS.md` · `CLAUDE.md` · `README.md`
   - 확장 프로그램의 `model.js` · `review-ui.js` · `screens/role.js` · `registration.js`
   - D의 파일(`build.gradle` · `application*.yml` · `app.html` · `app.js` · `manifest.json` · `start.js`)은 D만 고칩니다.
   - 예외: `WorkStatusSubject`(A7)는 A가, `HaveServerApplication`은 아무도 고치지 않습니다.
3. **다른 사람의 인터페이스를 main 코드에서 구현하지 않습니다.** 공용 대역이 있고, 테스트에서는 Mockito로 대신합니다(5.3).
4. **계약에 없는 것이 필요하면 우회하지 않습니다.** 다른 서브시스템의 테이블을 직접 읽거나, 인터페이스에 메서드를 더하거나, 자기 쪽에 복사본을 만들지 않습니다. 메모에 적고 코드에는 `// TODO(통합): …`를 남긴 뒤 그 부분만 비워 두고 다음 항목으로 갑니다.
5. **정해 둔 대로 합니다.** 열린 항목은 `docs/design-changes.md` 2절의 결정대로, 요청 · 응답은 `docs/api.md`대로, 코드 값은 enum대로 합니다.
6. **스키마와 시드 ID는 그대로 씁니다.** 로컬 DB는 스키마 그대로 만들고, 테스트에서는 시드 계정 ID 1~5(`docs/api.md` 3절)를 써도 됩니다.
7. **AI 도구에도 같은 규칙을 지키게 합니다.** `AGENTS.md`를 읽게 하고 "지금은 1단계"라고 알립니다. AI가 공용 파일 수정이나 다른 사람 인터페이스의 구현을 제안하면 거절하고 메모에 적습니다.
8. **막히면 건너뜁니다.** 한 항목에서 반나절 넘게 막히면 메모에 적고 다음 항목으로 갑니다. 통합 때 함께 풉니다.

### 8.7 매일 공유 (2단계)

2단계에는 정한 시각(예: 22:00)에 15분 모입니다. 각자 **남은 점수**, 오늘 끝낸 항목, 막힌 것만 말합니다. 그 자리에서 D가 `main`을 실행해 보여 주고, 남은 점수 차이가 8점을 넘으면 4.3대로 항목을 옮깁니다. 막힌 것이 다른 사람의 산출물이면 그 자리에서 기한을 정합니다.

---

## 9. 통합 시나리오

12/3 밤에 전부 통과해야 합니다. 11/30 통합에서는 S1의 서버 부분을 API로 확인하고(7.2), 화면까지의 S1은 12/2, 나머지는 12/3 18시까지 담당자가 먼저 확인합니다.

| 번호 | 시나리오 | 확인할 것 | 주 담당 |
| --- | --- | --- | --- |
| S1 | 로그인 → UC01 → UC02 → UC03(답변 제출) → [검토자] UC04 통과 → [승인자] UC06 승인 → 발급 완료 → UC07 공유 링크 → [로그인 없이] UC08 | 상태 8개가 순서대로, 공개 검증이 "승인 유효 · 서명 통과 · 파일 일치" | 전원 |
| S2 | 수정 요청 → 재제출(근거 그대로) | 새 버전 `REVIEW_PENDING`, 답변·위험 평가 복사, 평가 초기화, 검토자에게 "재제출" 알림 | A · B |
| S3 | 수정 요청 → 재제출(근거 변경) | 새 버전 `CHALLENGE_PENDING`, 이전 답변은 "v1 답변 · 참고", 답변 제출 뒤 검토자 알림 | A · B |
| S4 | 최종 승인자 반려 → 재제출 | 사유 필수, `REVISION_REQUIRED`, 승인은 새 버전으로 넘어가지 않음 | C · A |
| S5 | 검토 요청 취소 → 다시 요청 | `SUBMITTED`로 복귀, 검토 시작 뒤에는 취소 불가, v1은 다시 요청하면서 검토자·최종 승인자를 바꿀 수 있고 이전 검토자는 구성원에서 빠짐 | B |
| S6 | 저장된 파일을 바꾼 뒤 검토 시작 | 검토 중지(`HALTED`), 위·변조 경고, `HALT_REVIEW` 이력 | B · A |
| S7 | 승인 → 철회 → 새 버전 등록 | 작업 상태는 `APPROVED` 그대로, 공개 검증에 "v1 승인 철회 · 후속 버전 v2 있음"이 함께 표시 | C |
| S8 | 공유 링크 두 개 중 하나 중지 | 중지한 링크는 "대상 미식별", 다른 링크와 승인 효력은 그대로 | C |
| S9 | 발급 실패 → 재시도 | 승인은 유지, `FAILED` → `READY`, 이력 2건 | C |
| S10 | 권한과 중복 요청 | 자기 검토·자기 승인 차단, 비구성원 403, 같은 멱등 키는 기존 결과, v2 검토 요청에서 다른 검토자·최종 승인자를 고르면 409 | B · C |
| S11 | 입력 오류 | PDF 아님·20MB 초과 400, 같은 파일 409, 답변 20자 미만, 점수 범위 | A · B |
| S12 | 이력과 알림 | 이력이 시간 역순, 해시 체인 "이상 없음", DB에서 한 행을 고치면 경고, 알림 읽음 처리 | C · D |
| S13 | 서버를 끈 상태의 공개 검증 | 세 판정 모두 "확인 불가" | C |

---

## 10. 착수 전에 정할 것과 정해 둔 것

### 10.1 결정

| 번호 | 결정할 것 | 결정 또는 추천 |
| --- | --- | --- |
| 1 | 서버 스택 | **확정**: Java 21 + Spring Boot 4.1.3 + PostgreSQL (2절) |
| 2 | A~D에 누가 들어가는가 ★ | 팀장이 정해 착수 때 알림. 확장 프로그램을 잘 아는 사람을 A 또는 D에(등록 마법사, 화면 틀 · 로그인 화면) |
| 3 | 점수가 맞는가 ★ | 4.4~4.7의 1단계 점수를 팀장이 훑어보고, 틀린 것만 고쳐 착수 때 알림 |
| 4 | 각자 2일 동안 쓸 수 있는 시간 ★ | 1단계가 한 사람당 33점 안팎. 시간이 크게 모자라는 사람이 있으면 착수 전에 그 사람의 1단계 목록 끝 항목을 2단계로 미룸 |
| 5 | 통합을 진행할 사람 ★ | 팀장(7.2) |
| 6 | 시연 환경 | 로컬(`localhost`) 기준. 배포는 P2 |
| 7 | 등록 화면 순서(v3에서 남긴 항목) | 화면은 그대로(파일 → AI 신고 → …), 서버 호출만 유스케이스 순서로(6.4) |
| 8 | QR(v3에서 남긴 항목) | P2. 공유 링크를 만든 직후 응답에 함께 주고 저장하지 않음(UC07 후행 조건) |
| 9 | 근거자료 유형 | 4종(DB 부록 A). `addEvidence` 하나로 받고 유형으로 구분 |
| 10 | 공유 링크를 만들고 중지할 수 있는 사람(v3에서 남긴 항목) | 그 작업의 구성원 전원(UC07의 주 액터) |
| 11 | ApiClient의 위치 | 측면 패널 페이지에서 직접 호출(파일 업로드가 있어서). 서비스 워커는 배지 갱신에만 같은 모듈 사용 |
| 12 | 검토 짝, 매일 공유 시각 ★ | 8.1, 8.7(2단계부터) |
| 13 | 설계서에 답이 없던 세부 항목 | **모두 결정**(11/28): `docs/design-changes.md` 2절의 18건. 1단계에는 그대로 따름 |

### 10.2 구현하려면 설계서에 더해야 하는 것

REST로 만들면 반드시 필요한데 v3 설계서에 없는 것들입니다. 1단계에 여러 사람이 함께 써야 하는 것(사용자 찾기 `getUsers`, 토큰 `TokenService` 등)은 이미 계약으로 넣었고 `docs/design-changes.md` 1.1에 있습니다. 나머지는 1.2에 같은 목록이 있고, 구현한 사람이 날짜를 적습니다. 마감 뒤 산출물에 반영합니다. 유스케이스는 늘어나지 않습니다.

| 번호 | 없는 것 | 제안 | 고칠 산출물 |
| --- | --- | --- | --- |
| 1 | 01 · 04 · 05 · 06 · 07의 요청 진입점. Controller가 02(4개)·03(2개)에만 있음 | AuthController(D), ApprovalController · CertificateController · VerificationController · HistoryController(C), NotificationController(D) | 클래스 v3 아래 패널 ⑤, 패키지 레벨 3, 구조유형 5절, 서버 타입 수(79개) |
| 2 | 검토자·최종 승인자를 고를 사용자 목록 | `IAuthorization.getUsers(keyword)` — 계약으로 넣음 | 컴포넌트 표, 클래스 v3, UC03 순서 다이어그램 |
| 3 | 검토자·승인자가 결과물 PDF를 여는 방법 | `IWorkAPI.getVersionFile(versionId)`(구성원만) | 컴포넌트 표, UC04·UC06 순서 다이어그램 |
| 4 | 버전 ID로 진행 중인 검토 요청을, 승인 ID로 증명서를 찾는 조회 | `IReviewAPI.getReviewRequest(versionId)`, `ICertificateAPI.getCertificate`에 승인 ID 조회 | 컴포넌트 표 |
| 5 | 서명 작업자(Outbox 처리기)와 토큰 확인의 클래스 | 서명 작업자를 클래스로(예: OutboxProcessor). 토큰은 `TokenService`로 계약을 넣었고 구현 클래스는 D19 | 클래스 v3, 패키지 레벨 3 |

### 10.3 설계서 안에서 서로 다른 곳

아래 다섯 가지와, `docs/api.md`를 쓰면서 더 찾은 것(파일 이름을 둘 곳, 알림 받을 사람을 찾는 방법 등)을 합쳐 `docs/design-changes.md` 2절에 적었고, 11/28에 모두 결정했습니다. 1단계에는 그 결정대로 합니다.

| 곳 | 내용 | 결정 |
| --- | --- | --- |
| DB 문서 "수정본 재제출 때의 행" | `REVISION.base_version_id`로 이전 답변을 찾는다고 적혀 있으나 최종 스키마에는 그 열이 없음(정규화 때 삭제) | 최종 스키마. 수정 전 버전은 REVISION → REVIEW → REVIEW_REQUEST.version_id(반려면 APPROVAL_CASE.version_id)로 찾음 |
| 근거자료 등록 | 컴포넌트 표는 `addEvidence` 하나, 클래스 v3은 `addWebSource`·`addSupportFile` 둘, DB는 유형 4종 | 10.1의 9번 |
| 승인 대상 생성 | APPROVAL_CASE(PENDING)를 만드는 메시지가 UC04·UC06 순서 다이어그램에 없음 | 04가 처음 조회할 때 만듦(4.6의 C1) |
| ApiClient | 구조유형 3절은 서비스 워커, 패키지 레벨 3은 "background · common-ui" | 10.1의 11번 |
| 증명서 발급 알림 | 알림 유형에 `CERTIFICATE_ISSUED`가 있는데 컴포넌트 표의 `INotification` 사용처(02 · 03 · 04)에 05가 없음 | 05가 발급 완료 뒤 `notify`를 호출하고 사용처에 05를 더함 |

---

## 11. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 1단계 분량(한 사람당 33점 안팎)을 2일에 못 끝냄 | 1단계 목록은 앞쪽이 통합 때 다른 사람이 부르는 것이므로 위에서부터. 못 끝낸 항목은 메모하고 통합 때 2단계로 넘겨 다시 나눔(4.3) |
| 연락 없이 각자 해석해 합칠 때 안 맞음 | 맞물리는 곳을 모두 코드로 고정(4.8, 5.3, 5.5), 열린 항목 모두 결정, 1단계에는 계약을 바꾸지 않고 메모만(8.6) |
| 합칠 때 같은 인터페이스의 구현이 둘이 되어 서버가 안 뜸 | 다른 사람의 인터페이스는 main에서 구현하지 않음. 공용 대역은 진짜 구현이 있으면 자동으로 빠짐(`PlaceholderConfigurationTest`) |
| 각자 만든 저장 대응이 `jdbc`에서 안 맞음 | `TableMapping`의 값 형식을 고정하고 1단계에 `StubPersistence`로 확인, D3이 같은 계약으로 구현, 2단계 D12에서 양쪽 확인 |
| 같은 파일을 여럿이 고쳐 충돌 | 담당별 하위 패키지, 공용 파일은 1단계에 고치지 않음, 설계 변경 기록도 사람별 메모에 따로 적음 |
| 처음 끝까지 돌려 보는 날이 늦음 | 통합 순서와 확인할 API 호출을 미리 정함(7.2). 막힌 곳은 2단계 목록 맨 위로 |
| AI 도구가 Spring Boot 3 기준 코드를 내거나 공용 파일을 고치려 함 | `AGENTS.md`의 Spring Boot 4 주의점과 1단계 규칙을 읽힘, 넘기기 전에 `gradlew test`로 확인 |
| JavaScript 규칙을 Java로 옮기며 조건이 달라짐 | 6.3의 대응표로 함수 단위 이식, 기존 테스트 시나리오를 서버 테스트로, 9절로 최종 확인 |
| `stub`에서는 되는데 DB에서는 안 됨 | 2단계 D12에서 Repository 테스트를 두 구현에 실행, 12/2부터 `jdbc`로 S1 |
| 승인만 저장되고 발급 요청이 빠짐 | 5.4의 트랜잭션 규칙, D3의 연결 주의, C2를 코드 검사 대상으로 지정 |
| 설계와 코드가 어긋남 | 이름은 설계서 그대로, 달라지면 8.5대로 기록하고 마감 뒤 반영 |
| 서버 연동판이 시연 때 불안정 | 로컬 시연판(1.1.0)이 `팀원공유용_v3/10_HCI`에 그대로 있어 대체 시연 가능 |
