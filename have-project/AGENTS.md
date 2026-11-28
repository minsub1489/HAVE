# HAVE — AI 도구가 먼저 읽는 안내

이 파일은 Claude Code · Codex · Cursor 같은 AI 코딩 도구가 작업을 시작하기 전에 읽는 안내입니다. 사람이 읽어도 됩니다. 경로는 모두 **이 파일이 있는 폴더** 기준입니다.

## 1. 무엇을 만드는가

HAVE(AI 협업 결과물 인간 승인 증명 시스템)의 실제 제품입니다. 소프트웨어공학 팀 프로젝트(9조, 4명)이고 마감은 2026-12-04입니다. 클라이언트–서버 구조입니다.

| 만드는 것 | 폴더 | 지금 상태 |
| --- | --- | --- |
| 서버 | `have-server/` | Java 21 + Spring Boot 4.1.3 + JDBC + PostgreSQL. 뼈대만 있고 빌드 · 실행됨 |
| 크롬 확장 프로그램 | `have-chrome-extension/` | 순수 JavaScript(Manifest V3). 브라우저 로컬 시연 상태. 서버 호출로 바꾸는 중 |
| 공개 검증 페이지 | `have-server/src/main/resources/static/verify/` | 자리만 있음 |

**두 단계로 진행합니다.** 11/30(월) 18시까지는 **1단계**입니다. 네 명이 연락하거나 중간 결과를 나누지 않고 각자 브랜치(`phase1/a` 등)에서 일합니다. 11/30 저녁에 한 번에 합친 뒤부터는 **2단계**이고, 평소처럼 작은 PR로 매일 합칩니다. 1단계에는 이 문서 4절의 규칙에 더해 **바로 아래의 1단계 규칙**을 반드시 지킵니다.

### 1단계 규칙 (11/30 18시까지)

자세한 내용은 가이드라인 8.6입니다. 사용자가 단계를 말하지 않았고 날짜가 11/30 18시 전이면 1단계로 보고, 확실하지 않으면 묻습니다.

1. **사용자 담당의 파일만 만들고 고칩니다.** 자기 패키지(예: `have.work`), 자기 저장 하위 패키지(예: `have.persistence.work`), 자기 시드 파일, 자기 화면 파일, 자기 테스트, 자기 메모(`docs/phase1/<담당>.md`).
2. **공용 파일은 고치지 않습니다.** 인터페이스와 값 객체 전부(`IWorkVersion` · `ReviewTarget` · `StatusChange` · `IAuthorization` · `TokenService` · `IReviewResult` · `IApprovalStatus` · `ICertificateData` · `IAuditLog` · `INotification` · `IPersistence` · `Repository` · `TableMapping` · `FileStore` 등), `have.common`, `have.bootstrap`, `StubPersistence`, `db/schema`, `docs/api.md`, `docs/design-changes.md`, 가이드라인, 이 파일, `README.md`, 확장 프로그램의 `model.js` · `review-ui.js` · `screens/role.js` · `registration.js`. D의 파일(`build.gradle` · `application*.yml` · `app.html` · `app.js` · `manifest.json` · `start.js`)은 D만 고칩니다. 고칠 필요가 있으면 고치지 말고 사용자에게 알린 뒤 `docs/phase1/<담당>.md`의 "공용 파일 변경 요청"에 적습니다.
3. **다른 사람의 인터페이스를 main 코드에서 구현하지 않습니다.** 공용 대역(`PlaceholderConfiguration`)이 이미 그 자리를 채웁니다. 구현을 만들면 합칠 때 같은 인터페이스의 빈이 둘이 되어 서버가 뜨지 않습니다. 테스트에서는 Mockito(`mock(…)`, `@Mock`, `@MockitoBean`)로 대신합니다.
4. **계약에 없는 것이 필요하면 우회하지 않습니다.** 다른 서브시스템의 테이블을 직접 읽거나, 인터페이스에 메서드를 더하거나, 다른 사람의 엔티티 · Repository를 자기 쪽에 복사하지 않습니다. 그 부분만 비워 `// TODO(통합): …`를 남기고, 메모에 적고, 다음 항목으로 갑니다.
5. **정해 둔 대로 합니다.** 요청 · 응답은 `docs/api.md`, 설계서에 답이 없던 곳은 `docs/design-changes.md` 2절의 결정, 저장은 `TableMapping` 계약(가이드라인 5.5).
6. **넘기기 전에** `gradlew test` 전체가 통과해야 합니다. 설계와 달라진 점과 막힌 점은 `docs/design-changes.md`가 아니라 `docs/phase1/<담당>.md`에 적습니다.


## 2. 먼저 읽을 문서

| 순서 | 문서 | 무엇이 있나 |
| --- | --- | --- |
| 1 | `HAVE_최종_개발_가이드라인.md` | 누가 무엇을 맡는지(4절), 서브시스템 사이의 계약(5절), 확장 프로그램 전환(6절), 일정(7절), 협업 규칙(8절) |
| 2 | `docs/api.md` | 모든 REST 주소의 요청 · 응답 예시 JSON, 검사 규칙, 오류 문장 |
| 3 | `docs/design-changes.md` | 설계와 달라진 점의 기록, 설계서에 답이 없던 18건과 그 결정 |
| 4 | `팀원공유용_v3/` | 제출한 설계 산출물. 클래스 · 오퍼레이션 · 테이블 · 상태의 **이름과 규칙의 기준** |

문서끼리 어긋나면 `팀원공유용_v3` → 가이드라인 · `docs/api.md` → 그 밖의 순서로 따릅니다. 어긋난 곳을 찾으면 임의로 한쪽을 고르지 말고 **멈추고 사용자에게 알립니다.**

`팀원공유용_v3`에서 자주 여는 곳: 유스케이스 단계와 예외 `01_유스케이스/HAVE_유스케이스_명세.md`, 디자인 패턴 4개와 Java 예제 `09_디자인패턴/HAVE_디자인패턴_적용분석_v2.md`, 테이블 · 제약 · 코드 값 `11_DB/HAVE_데이터베이스_설계_검토반영.md`. 다이어그램은 PNG라 읽기 어려우면 `_소스/`의 `.mmd` · `.py`를 봅니다. 용어와 상태 이름은 `docs/reference/HAVE_용어_상태_통일표.md`에도 정리돼 있습니다.

이 폴더의 위나 옆에 옛 문서(`docs/project-context.md`, `prototype/`, `extension/`, 옛 `AGENTS.md`)가 남아 있을 수 있습니다. 설계 이전의 시제품이므로 참고하지 않습니다.

## 3. 작업을 시작하기 전에

1. 사용자가 **A · B · C · D 중 누구인지, 지금 1단계인지 2단계인지, 어느 항목(예: B5)을 하려는지** 확인합니다. 말하지 않았으면 먼저 묻습니다.
2. 가이드라인 4절에서 그 항목의 설명을, `docs/api.md`에서 해당 주소를, `팀원공유용_v3`에서 해당 유스케이스를 읽습니다.
3. 그 사람의 파일만 고칩니다. 1단계에는 1절의 1단계 규칙대로 공용 파일과 다른 사람의 파일을 고치지 않습니다. 2단계에 다른 사람의 파일을 고쳐야 하면 고치기 전에 사용자에게 알립니다.

| 담당 | 서버 패키지 | 확장 프로그램 파일 |
| --- | --- | --- |
| A | `have.work`(`WorkStatusSubject` 포함, 인터페이스와 값 객체 제외), `have.persistence.work`(`StorageFileStore` · `WorkRepository` · `RevisionRepository` · 대응) | `screens/works.js` · `register.js` · `revise.js`, `api/work-api.js`(2단계에 `registration.js`) |
| B | `have.review`, `have.auth`(`have.auth.token`과 인터페이스 제외), `have.persistence.auth` · `have.persistence.review` | `screens/challenge.js` · `review.js`, `api/review-api.js` |
| C | `have.approval`, `have.certificate`, `have.verification`(인터페이스와 값 객체 제외), `have.persistence.approval`, 2단계에 `audit`의 `HistoryService` | `screens/approval.js` · `certificate.js` · `history.js`, `api/approval-api.js` · `certificate-api.js` · `history-api.js` |
| D | `have.audit`(기록 · 알림), `have.auth.token`(`TokenService` 구현 · 인터셉터 · `AuthController`), `have.persistence`의 `JdbcPersistence` · `DatabaseConnectionPool`, `have.persistence.audit`, `build.gradle` · `application*.yml`. 2단계에 `have.bootstrap` · `have.common` 정리 | `app.html` · `app.js`, `start.js`, `screens/notifications.js` · `verify.js` · `login.js`, `api/api-client.js` · `auth-api.js` · `notification-api.js`, `popup.js`, `background.js`, `manifest.json`, 공개 검증 페이지 |
| 공용(1단계에는 아무도 고치지 않음, 2단계에는 고치기 전에 알림) | 인터페이스와 값 객체, `have.common`(코드 값 포함), `have.bootstrap`, `TableMapping` · `IPersistence` · `Repository` · `StubPersistence` · `FileStore`, `db/schema` | `screens/role.js`(B · C), `review-ui.js`(B · C), `model.js`, `registration.js` |

## 4. 반드시 지킬 규칙

1. **`팀원공유용_v3/`는 고치지 않습니다.** 제출한 산출물입니다. 설계와 다르게 구현해야 하면 코드를 그렇게 쓰고 기록합니다(1단계는 `docs/phase1/<담당>.md`, 2단계는 `docs/design-changes.md`).
2. **유스케이스를 늘리지 않습니다.** UC01~UC10뿐입니다. 회원 가입 · 비밀번호 찾기 · 관리자 화면 같은 것을 만들지 않습니다. 계정은 시드 데이터입니다.
3. **이름은 설계서 그대로 씁니다.** 클래스 · 인터페이스 · 오퍼레이션 · 테이블 · 열 · 코드 값을 바꾸거나 "더 좋은 이름"으로 고치지 않습니다.
4. **새 오퍼레이션의 이름 규칙:** 조건 확인은 `is…`, 읽기 · 탐색은 `get…`, 쓰기는 `set…`, 화면 출력은 `show…`, 업무 동작은 동사(`approve`, `resubmit`, `record`). `find…` · `fetch…` · `load…` · `check…` · `has…` · `update…` · `handle…` · `process…`로 시작하는 이름을 새로 만들지 않습니다.
5. **Java `record`를 쓰지 않습니다.** 접근자에 `get`이 붙지 않아 4번과 어긋납니다. getter가 있는 클래스로 씁니다. Lombok도 쓰지 않습니다.
6. **작업 버전의 상태는 `IWorkVersion.setWorkStatus`로만 바꿉니다.** 서비스가 `work_version.status`를 직접 고치지 않습니다. 이력 · 알림 · 발급 요청 · 재검토 연결은 그 통지를 받는 옵서버가 합니다.
7. **다른 서브시스템은 인터페이스로만 부릅니다**(`IWorkVersion`, `IReviewResult`, `IAuthorization`, `TokenService`, `IApprovalStatus`, `ICertificateData`, `IAuditLog`, `INotification`). 수정 요청 · 반려는 REVISION을 직접 쓰지 않고 `IWorkVersion.createRevision`을 부릅니다. 다른 사람의 서비스 클래스를 직접 만들거나 다른 서브시스템의 테이블을 읽지 않습니다. 의존 방향은 03 → 02, 04 → 02 · 03, 05 → 04, 06 → 04 · 05이고 거꾸로는 안 됩니다.
8. **사용자와 역할은 토큰과 `work_member`에서만 얻습니다.** 요청 본문에 적힌 사용자 ID나 역할을 믿지 않습니다. 역할은 계정이 아니라 작업마다 정해집니다. **검토자와 최종 승인자는 작업마다 한 명입니다.** v1의 검토 요청에서 정하고 v2부터는 그대로입니다(v1을 취소하고 다시 요청할 때만 변경). 알림 받을 사람은 `StatusChange`에서 읽고, 옵서버가 다른 서브시스템의 테이블을 읽어 찾지 않습니다(가이드라인 5.4).
9. **트랜잭션은 서비스 메서드 단위입니다**(`@Transactional`). Repository와 옵서버는 트랜잭션을 새로 열지 않고 예외를 삼키지 않습니다. 전자서명과 알림 전송처럼 실패할 수 있는 바깥 일은 커밋 뒤에 합니다.
10. **거절은 `ApiException`으로 던집니다**(`ApiException.conflict("…")`). 문장은 확장 프로그램의 기존 한글 문구를 그대로 씁니다(`docs/api.md` 1절).
11. **코드 값은 `have.common.code`의 enum을 씁니다.** 문자열로 다시 적지 않습니다. 값을 더하면 enum · `db/schema`의 CHECK · `model.js` 세 곳을 함께 고칩니다(`CodeValueTest`가 확인).
12. **시각은 UTC `Instant`**, JSON에는 ISO-8601(`2026-11-30T05:12:44Z`). 날짜만 있는 값은 `LocalDate`.
13. **저장은 `Repository`와 `TableMapping`으로만 합니다**(가이드라인 5.5). 엔티티마다 `TableMapping`을 만들어 `@Component`를 붙이고, 행 값은 정해진 형식(BIGINT → `Long`, TIMESTAMP → `Instant`, 코드 값 → 이름 문자열 등)으로 담습니다. `JdbcTemplate`을 직접 쓰는 곳은 D의 `JdbcPersistence`뿐이고 ORM(JPA · MyBatis)은 넣지 않습니다. SQL에서 `user` 테이블은 항상 `"user"`, 값은 반드시 `?` 자리 표시자로 넣습니다.
14. **감사 이력(`audit_event`)은 추가만 합니다.** UPDATE · DELETE를 쓰지 않습니다.
15. **비밀 값을 커밋하지 않습니다.** 비밀번호 원문, DB 접속 값, 서명 키, 업로드된 파일, `.env`. 응답에 `password_hash` · 파일 저장 위치 · 공유 토큰 해시를 싣지 않습니다.
16. **클라이언트는 다음 상태를 추측하지 않습니다.** 명령을 보낸 뒤 서버에서 다시 불러와 그립니다. 화면 문구와 스타일은 1.1.0 그대로 둡니다.
17. **요청받은 항목만 합니다.** 관련 없는 파일의 정리 · 이름 바꾸기 · 형식 맞추기를 하지 않습니다. 의존성을 더해야 하면 먼저 사용자에게 알립니다.

## 5. Spring Boot 4에서 주의할 것

Spring Boot 3 기준으로 쓰면 빌드가 깨집니다. 아래는 이 프로젝트(4.1.3)에서 확인한 이름입니다.

| 3에서 쓰던 것 | 4에서 |
| --- | --- |
| `spring-boot-starter-web` | `spring-boot-starter-webmvc` |
| `spring-boot-starter-test`만 | 웹 테스트는 `spring-boot-starter-webmvc-test` |
| `com.fasterxml.jackson.databind.ObjectMapper` | `tools.jackson.databind.ObjectMapper`(Jackson 3). 예외는 검사 예외가 아닌 `tools.jackson.core.JacksonException` |
| Jackson 애너테이션 | 그대로 `com.fasterxml.jackson.annotation.*`(`@JsonIgnore` 등) |
| `org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc` | `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`(`WebMvcTest`도 같은 패키지) |
| `@MockBean` | 없어짐. `org.springframework.test.context.bean.override.mockito.MockitoBean` |
| `org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration` | `org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration` |
| `javax.*` | `jakarta.*` |

- 스프링 시큐리티 전체는 넣지 않았습니다. BCrypt만 `spring-security-crypto`의 `BCryptPasswordEncoder`로 씁니다. 토큰 확인은 `HandlerInterceptor`나 서블릿 필터로 직접 만듭니다.
- 주기 작업(서명 작업자)은 `@Scheduled`를 쓰고 `@EnableScheduling`을 한 번 켭니다.
- CORS 설정을 넣지 않습니다. 확장 프로그램은 `manifest.json`의 `host_permissions`로 서버를 부르고, 공개 검증 페이지는 서버가 직접 내려 줍니다.
- 모르는 이름은 추측하지 말고 `gradlew compileJava`로 확인합니다.

## 6. 명령

`have-server` 폴더에서 실행합니다. Windows 명령 프롬프트는 `gradlew.bat`, macOS · Linux · Git Bash는 `./gradlew`. JDK 21이 필요합니다.

| 하는 일 | 명령 |
| --- | --- |
| 테스트 | `gradlew.bat test` |
| 서버 실행(DB 없이, 기본) | `gradlew.bat bootRun` |
| 서버 실행(PostgreSQL) | `gradlew.bat bootRun --args="--spring.profiles.active=jdbc"` |
| 확인 | 브라우저에서 `http://localhost:8080/api/health` |
| 확장 프로그램 규칙 테스트 | `have-chrome-extension` 폴더에서 `node --test tests/model.test.js` |

확장 프로그램은 빌드가 없습니다. `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드합니다" → `have-chrome-extension` 폴더. 파일을 고친 뒤에는 그 페이지에서 새로 고침을 누릅니다.

## 7. 코드 쓰는 법

- 패키지는 `have.<서브시스템>`. 진입점은 `…Controller`, 업무는 `…Service`, 저장은 `…Repository`(`Repository<T>`를 상속)와 `…Mapping`(`TableMapping<T>` 구현)이고 저장 쪽은 `have.persistence.<서브시스템>`에 둡니다.
- 클래스 위에 용도 한 줄, 공개 메서드에 하는 일을 한글 Javadoc으로 씁니다. 대응하는 유스케이스나 항목 번호를 적으면 좋습니다(예: `UC06, C2`).
- 들여쓰기 4칸, 블록에는 항상 중괄호. JavaScript는 기존 파일의 스타일(2칸, 세미콜론, `'use strict'`)을 따릅니다.
- 상태 다이어그램의 가드는 메서드 안의 조건 검사로, 순서 다이어그램의 메시지는 받는 쪽 클래스의 메서드로 옮깁니다.
- 테스트: 서비스 메서드마다 정상 1개와 예외 1개 이상. 테스트 메서드 이름은 한글로 써도 됩니다(`직전_버전과_같은_파일이면_409다`). 다른 사람의 인터페이스는 Mockito로 대신하고(예는 가이드라인 5.3), 자기 Repository는 `new StubPersistence(List.of(내 대응…))`로 확인합니다(예는 `StubPersistenceTest`). 진입점은 `@WebMvcTest` + `@MockitoBean`. 서버 전체를 띄우는 테스트의 예는 `HaveServerApplicationTest`.
- 확장 프로그램의 화면 파일은 `addAction` · `addActionPrefix` · `addHandler`로 이벤트를 받습니다(`have-chrome-extension/읽어주세요.md`). `app.js`에 화면별 분기를 넣지 않습니다. 서버 호출은 `scripts/api/*.js` 모듈에 모으고 함수 이름을 서버 오퍼레이션과 같게 씁니다. 모듈은 `HaveApi.request(method, path, { body, form })`를 씁니다(가이드라인 6.2).
- 화면 하나를 서버 호출로 바꿀 때 다른 화면이 쓰는 `model.js` 함수는 지우지 않습니다. 확장 프로그램은 언제나 열려야 합니다.

## 8. 끝내기 전에 확인

- [ ] `gradlew.bat test` 전체 통과(서버를 고쳤을 때)
- [ ] 1단계라면: 공용 파일과 다른 사람의 파일을 고치지 않았음, 다른 사람의 인터페이스를 main에서 구현하지 않았음, 막힌 곳은 `// TODO(통합)`과 `docs/phase1/<담당>.md`에 적었음
- [ ] `node --test tests/model.test.js` 통과(`model.js` · `review-model.js` · `seed.js`를 고쳤을 때)
- [ ] 클래스 · 오퍼레이션 · 코드 값 이름이 설계서와 같음
- [ ] 요청 · 응답이 `docs/api.md`와 같음. 다르게 해야 했다면 사용자에게 알림(1단계는 메모에 적고 `docs/api.md`는 그대로, 2단계는 `docs/api.md`를 함께 고침)
- [ ] 설계서에 없는 것을 더했거나 다르게 했으면 기록(1단계는 `docs/phase1/<담당>.md`, 2단계는 `docs/design-changes.md`)
- [ ] 다른 사람의 파일을 고쳤으면 사용자에게 무엇을 왜 고쳤는지 알림
- [ ] 확인하지 못한 것이 있으면 숨기지 않고 무엇을 못 했는지 말함
