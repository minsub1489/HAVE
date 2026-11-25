# HAVE UC01~UC10 통합 클래스 모델

2026-11-03. 사용자 첨부 UC01~UC09 자료와 저장소 UC06·UC10 설계를 대조해 동일 개념을 통합했다. 기준 번호는 **최신 10개 유스케이스**다. 이전 MVP 9개 UC 번호와 혼용하지 않는다. 전체 서비스의 분석·운영 설계이며, 서버·인증·서명 등이 현재 구현되었다는 뜻이 아니다.

2026-11-04. 아키텍처 패턴을 검토하기 위한 통합 패키지와 통합 컴포넌트를 추가했다. 패키지는 통합 모델의 55개 타입을 기존 분류에 따라 묶고, 응용과 인프라 어댑터가 저장·파일·알림 계약에 의존하는 방향을 보여준다. 컴포넌트는 기존 운영 문서의 모듈형 단일 API 제안을 후보로 삼아 UC01~UC10의 호출 경계와 저장소·서명 작업자 연계를 표시한다. 승인·감사·Outbox의 원자 저장과 서명 작업의 재시도가 핵심 경계다. 실제 배포 단위와 패턴은 후속 설계에서 결정한다. 소스는 `architecture-render.cjs`이며 통합 클래스 생성과 같은 환경에서 실행한다.

두 뷰는 동일한 JSON 원본을 사용한다. 핵심 도메인 뷰는 25개 타입의 연관과 다중도를, 전체 설계 뷰는 이를 포함한 55개 타입(도메인 25, 서비스·정책 15, 인터페이스 7, 기존 사용자 접점 8)의 사용 의존까지 표현한다. 모두 같은 클래스 ID를 쓰므로 별개의 모형 둘이 아니다. 화면에선 SVG로 확대하는 것이 가장 선명하다.

공유용 통합 클래스와 패턴 상세는 [클래스 다이어그램 모음](class-views/index.html), 현재 패키지 번호와 책임은 [서버 서브시스템 결정](../../subsystem-decision.md)에서 확인한다. 초기 다섯 서브시스템을 사용한 자료는 해당 버전의 설계를 보여준다.

## 자료 선택과 보존

2026-11-11 가독성 개정에서는 통합 도메인 25개와 연관·합성 35개를 네 영역에 배치했다. 구획 간 관계와 Revision–WorkVersion의 겹치는 두 연결은 R01~R12 대응표에서 양 끝과 다중도를 읽는다. Revision은 Work, Certificate는 증명서 관리 패키지에 둔다. 첨부 이미지 `HAVE__.png`의 패턴 타입 24개는 편집 원본 없이 이미지에서 옮겼으며, 공유 타입과의 연결은 패턴별 그림과 설명에서 확인할 수 있다. `render-class-views.cjs`로 이 보기들을 생성한다. [통합 그림과 6개 패턴 상세](class-views/index.html)

- UC01~UC03: `HAVE_v2_UC01_02_03.zip`의 클래스 그림을 구조 기준으로 사용했다. `HAVE_UC01_02_03.zip`의 상세판도 비교해 AI 도구 사용 내역, 작업 멤버십, 감사 기록, 해시·정책 버전의 보완 근거로 사용했다. 두 ZIP의 클래스 PNG 해시가 각각 달라 동일 사본으로 취급하지 않았다.
- UC04·UC05: 제공된 PDF의 3쪽 클래스 그림·텍스트 및 앞뒤 동적 흐름을 확인했다. 검토와 최종 승인 분리, 보완 후 **새 버전+새 검토 회차** 원자 생성, 실패 시 초안 유지 원칙을 보존했다.
- UC07·UC08·UC09: 첨부 통합 PNG의 클래스 뷰를 직접 확인했다. 증명서·공유 링크·QR·검증 결과·이력 조회 책임을 반영했다.
- UC06·UC10: [이전 담당 범위 모델](../uc06-uc10/model.json)의 ApprovalCase·Approval·Receipt·Revocation·Outbox·감사·업무 조정·권한·저장 책임을 통합했다.
- 원본 자료 안의 설명·생성 지시는 근거로 읽었으며 현재 사용자 요청으로 취급하지 않았다. 기존 그림·프로토타입·발표자료는 수정하지 않았다.

입력 파일과 보관한 클래스 그림의 출처·SHA-256은 [sources-manifest.json](sources-manifest.json)에 기록한다. `references/`는 이번 통합에 사용한 클래스 부분 뷰다. PDF 전체를 재작성하지 않았다.

## UC와 통합 클래스 대응

| UC | 핵심 클래스 | 서비스·정책 |
| --- | --- | --- |
| UC01 AI 작업 및 사용 내역 등록 | Work, AiDisclosure, AiToolUsage, Contribution, User | WorkService, ContributionService, AuditLogService |
| UC02 결과물 및 근거자료 등록 | WorkVersion, EvidenceItem, AiDisclosure | VersionService, EvidenceService |
| UC03 검토 요청 | ReviewRequest, RiskAssessment, Challenge, WorkMember | ReviewRequestService, RiskService, GatePolicy |
| UC04 결과물 검토 및 피드백 | Review, Feedback, ChallengeResponse, Evaluation | ReviewService |
| UC05 결과물 수정 및 재제출 | Revision, WorkVersion, Review | RevisionService |
| UC06 최종 승인 및 반려 | ApprovalCase, Approval, Certificate, OutboxEvent | ApprovalService, AuthorizationPolicy |
| UC07 승인 증명서 조회 및 공유 | Certificate, ShareLink, QRCode | CertificateService |
| UC08 승인 증명서 진위 검증 | Certificate, VerificationResult, Approval, Revocation | VerificationService |
| UC09 승인 이력 및 상태 조회 | AuditEvent, Work, WorkVersion, Approval | HistoryService |
| UC10 승인 철회 | Approval, Revocation, AuditEvent | ApprovalService, AuthorizationPolicy |

## 통합·이름 변경 결정

| 자료별 이름·표현 | 통합 결과 | 이유 |
| --- | --- | --- |
| Version / WorkVersion / VersionSnapshot | WorkVersion | Work와 구분하고 모든 검토·승인을 특정 버전에 연결. 제출 시 불변 값과 해시를 유지 |
| ReviewSnapshot | 확정된 Review + reviewDigest | 기존 UC04의 회차와 연결하고 동일 검토를 별도 엔티티로 중복 저장하지 않음. 확정 뒤 불변이며 승인 payload에 digest 고정 |
| Evidence / EvidenceItem | EvidenceItem | 웹 출처·보조 파일을 유형으로 구분. 여러 버전에서 같은 불변 자료를 참조할 수 있음 |
| AIUsage / AiDisclosure | AiDisclosure + AiToolUsage | 신고 전체와 그 안의 개별 도구 사용 내역을 구분. UC04 AIUsage를 도구 항목으로 대응 |
| Receipt / Certificate | Certificate | UC06 발급 레코드와 UC07·08의 증명서를 동일 ID로 연결. 서명 전 레코드도 존재 |
| ApprovalHistory / AuditEvent | AuditEvent | 승인 이력은 전 구간 append-only 감사 사건의 조회 뷰. 이력 객체와 감사 객체를 중복 생성하지 않음 |
| Verifier / User | 사용자 식별은 User, 비로그인 검증은 요청 문맥 | 검증자 역할만으로 별도 상속 계층을 만들지 않음. 공개 검증에 계정 생성을 강제하지 않음 |
| User.role 한 개 | WorkMember.roles | 같은 사람이 작업마다 작성자·검토자·승인자 역할을 달리 가질 수 있음. 역할과 자기 승인 금지 정책을 함께 적용 |
| FileStoragePort / FileStore | FileStore 인터페이스 | UC02 업로드와 UC05 재제출·보상 정리의 저장 계약 통합 |
| WorkRegistrationService / VersionRegistrationService | WorkService / VersionService | v2 명칭을 기준으로 상세판의 동일 등록 책임 통합 |
| RiskAssessmentService / RiskService | RiskService | 동일 위험 평가 책임 통합 |
| HistoryService.getLatestStatus(workId) | getVersionState(versionId) | 최신 이벤트 하나로 과거 승인·철회·후속 버전 관계를 덮지 않음 |

DTO·예외 타입·JSON 직렬화·해시 유틸·스토리지 공급자 어댑터 등 상세판의 구현 보조 타입은 핵심 설계 클래스에 모두 펼치지 않았다. UC07~09의 서비스는 유지하되 UI·QR·공유 전용 서비스 후보를 독립 배포나 별도 필수 클래스로 확정하지 않았다. 이 통합 모델은 자료를 그대로 합집합으로 복사한 것이 아니라 도메인과 서비스 책임을 정규화한 모델이다. 이전 부분 모델은 출처로 유지하며, 이후 전체 설계의 기준은 이 폴더다.

## 관계·다중도 및 조건

1. **Work — WorkVersion**: 작업 1개에 버전 0..*개, 버전은 작업 1개에 속한다. UC01 등록 직후 파일이 없을 수 있어 초안은 0개를 허용한다. 검토 제출 시 1개 이상이다. `(workId, versionNo)`는 유일하고 직전 버전 관계는 비순환·비분기 선형 이력으로 가정했다. `/currentVersion`은 이 관계에서 계산하며 별도 승인 상태가 아니다.
2. **AI 신고·기여**: 제출 버전에는 AiDisclosure 사본 1개, 도구 항목 0..*개, 기여 사본 0..*개가 있다. 미사용이면 도구 목록은 비어 있어야 한다. 신고 임시 초안은 Work의 입력 데이터이고 제출 시 값 복사한다. 같은 사본을 Work와 Version이 동시에 합성 소유하지 않는다. 기여 원본 ID는 다른 버전에 재사용 가능하나 한 버전 안에서는 유일하다.
3. **EvidenceItem**: 버전과 자료는 0..* 대 0..* 일반 연관이다. UC02 단독 그림의 합성을 UC04의 자료 공유 요구와 맞춰 수정했다. 자료 URI가 같아도 파일·내용이 바뀌면 새 항목/해시로 취급한다. 자료 변경으로 과거 승인 범위가 변하면 안 된다.
4. **검토 요청·회차**: 버전당 요청·검토 회차는 0..*개이며 활성 요청은 최대 1개다. 요청마다 지정 검토자 1명, 위험 근거 1개, 과제 1..*개를 고정한다. 취소한 요청은 Review가 없을 수 있으므로 요청→검토는 0..1이다. 검토는 요청 1개 및 그 요청과 동일 버전 1개에 대응한다. 요청자·검토자는 작업 권한을 검사하고 서로 달라야 한다.
5. **과제·답변·평가**: 과제당 현재 답변 0..1개, 답변당 현재 평가 0..1개. 미제출·미평가 구간을 허용한다. Evaluation은 Review 회차 1개에 속하며 답변과 검토 요청의 버전이 같아야 한다. 현재 프로젝트의 3종 과제·5/6 프로필은 GatePolicy의 정책 사본으로 적용한다. 다른 위험도별 과제 수는 원본 UC03의 확장 설계이며 현 프로토타입 구현으로 주장하지 않는다.
6. **검토·피드백**: 검토당 Feedback 0..1개. Feedback은 Review에 합성 소유된다. 보완요청에는 사유가 필수이며 판정 확정 뒤 내용은 변경하지 않는다. 반복 보완은 새 버전·새 회차로 남긴다. 검토 완료가 최종 승인은 아니다.
7. **Revision**: 수정 전 버전은 정확히 1개, 재제출 버전은 0..1개며 SUBMITTED일 때만 정확히 1개다. 새 버전은 최대 수정 회차 1개에서 생성된다. 새 버전·새 Review/요청 연결·제출 상태를 원자 확정한다. 파일·DB 실패는 초안을 유지하고 미확정 파일만 정리한다.
8. **반려→보완 연결 보완**: UC05 자료는 CHANGES_REQUESTED인 Review만 수정 근거로 뒀지만 UC06에는 최종 반려도 있다. 통합안에서는 Revision이 **보완 Review 또는 REJECTED ApprovalCase 중 정확히 하나**를 참조하도록 XOR 조건을 추가했다. 두 참조는 각각 0..1이고 동시에 비거나 동시에 채워질 수 없다. 한 보완 판정당 수정 회차는 최대 1개다. 최종 반려를 보완 가능한 것으로 해석한 설계 가정이며, 반려가 영구 종료라는 제품 정책을 정하면 이 추가 경로는 제거해야 한다.
9. **ApprovalCase·Approval**: 버전당 최종 결정 대상 0..1개, 대상은 확정 Review 1개를 고정한다. 그 Review도 최종 결정 대상 최대 1개에 대응한다. 승인 시에만 Approval 1개가 생기므로 대상당 Approval은 0..1이다. `case.versionId = case.review.versionId = approval.versionId`를 검사한다. 반려 후에는 새 버전을 제출하고 철회 후 같은 버전을 재승인하지 않는 단일 승인 정책을 사용한다.
10. **Certificate**: 승인마다 증명서 발급 레코드 1개. fileHash·검토 digest·승인자·서버 시각 등의 payload를 고정하고 서명 상태 PENDING/READY/FAILED를 별도 저장한다. Certificate→Work의 직접 모호한 관계를 없애고 `Certificate → Approval → ApprovalCase → WorkVersion → Work` 경로로 연결한다. 아직 서명되지 않았어도 발급 요청 레코드는 존재한다.
11. **철회·서명 요청**: 승인당 Revocation 0..1개, 철회자는 존재하는 User다. `/revokedAt`은 철회 기록에서 계산한다. 승인·증명서와 원래 서명을 지우지 않는다. Certificate당 논리적 OutboxEvent 1개를 재전달하며 전달 시도마다 새 증명서를 만들지 않는다. 실제 서명 작업·키 관리의 내부 클래스는 이번 통합 범위에서 생략했다.
12. **공유**: 증명서당 링크 0..*개로 수정했다. 사람별·기간별 링크를 발급할 수 있고 아무도 공유하지 않은 증명서를 허용한다. 링크당 캐시된 QR 표현은 0..1개다. QR은 해당 링크를 인코딩하므로 별도 증명서를 생성하지 않는다. 공유 링크 만료/비활성은 승인 철회가 아니다.
13. **검증**: Certificate당 결과 0..*개, 결과의 식별 가능한 Certificate는 0..1개다. 잘못된 QR·링크에서도 실패 결과를 만들 수 있다. 서명 진위, 현재 승인 효력, 선택 파일 일치를 독립 결과로 반환하고 조회 실패는 UNKNOWN으로 표시한다. 원본의 단일 `isValid` 또는 `CertStatus` 하나로 세 의미를 합치지 않는다.
14. **감사·상태 조회**: 감사는 작업 1개에 속하고 버전 대상은 0..1개다. 작업 생성 사건은 아직 버전이 없을 수 있기 때문이다. 버전 ID가 있으면 반드시 같은 Work의 기존 버전을 가리킨다. actorId는 User를 참조하고 이름 변경과 별개로 사건 시점 표시 정보를 보존할 수 있다. UC09는 사건 목록과 현재 버전별 검토·승인·철회·후속 버전 관계를 함께 조회한다. 최신 사건의 문자열만 현재 효력으로 취급하지 않는다.

모든 제출 버전의 PDF·AI 신고·근거·검토 범위는 승인 후 고정한다. 점수뿐 아니라 자기 승인 금지·담당 권한·전체 제출·평가 근거·치명 오류 없음·체크·메모·revision·기존 승인 유무를 검사한다. 승인·반려·철회·감사·멱등 결과는 commit 이후에만 성공으로 표시한다. 알림 실패는 이미 확정된 결정을 취소하지 않는다.

## 상태·역할 타입

- `MemberRole`: AUTHOR, REVIEWER, APPROVER, VIEWER. 익명 검증자는 멤버십이 필수 아님.
- `RequestState`: REQUESTED, IN_REVIEW, COMPLETED, CANCELLED.
- `ReviewState`: PENDING, IN_PROGRESS, CHANGES_REQUESTED, COMPLETED. `ReviewDecision`: CHANGES_REQUESTED, REVIEW_COMPLETED.
- `RevisionState`: READY, EDITING, VALIDATING, SUBMITTING, SUBMITTED.
- `DecisionState`: PENDING, REJECTED, APPROVED. `SigningState`: PENDING, READY, FAILED.
- `EvidenceType`: WEB_SOURCE, SUPPORT_FILE. `ChallengeType`: TEACH_BACK, FAULT_INJECTION, WHAT_IF(추가 유형은 정책 확장).
- Contribution의 actorType과 stage는 제공 자료의 AI/HUMAN/MIXED 및 IDEA/DRAFT/SOURCE_VERIFICATION/REVISION을 따른다. UUID/Long ID 차이는 분석 타입 ID로 추상화했다.

CertStatus의 EXPIRED는 원본 UC07·08에만 나타나며 증명서 자체 만료 정책이 정해져 있지 않다. 승인 수명과 공유 링크 만료를 구분하기 위해 기본 승인 상태에 EXPIRED를 넣지 않았다. 증명서 유효기간이 요구로 확정되면 Certificate.validUntil 및 별도 효력 판정을 추가한다. UC09의 DRAFT·IN_REVIEW는 WorkVersion/Review의 진행 상태이며 Certificate의 서명 상태가 아니다.

## 생성·검증

수정 원본은 [model.json](model.json), 생성기는 [render.cjs](render.cjs)다. `build-model.py`는 최초 모델 입력을 작성한 기록이며 JSON 수정 후 다시 실행하면 덮어쓰므로 일상 갱신에 사용하지 않는다. 렌더링은 저장소 루트에서 `node docs/modeling/integrated/render.cjs`로 실행한다. Playwright·Chrome·`@viz-js/viz`가 필요하고 필요 시 `DIAGRAM_NODE_MODULES`를 지정한다. DOT·PNG·SVG·HTML·PlantUML은 같은 원본에서 생성한다. PlantUML은 교환용이며 별도 엔진 검증은 하지 않았다.

validation.json은 55개 ID 유일성, 관계 끝점, 연관 다중도 표기, UC01~UC10의 클래스 포함 및 PNG 캔버스 밖 글자 검사를 기록한다. 그림의 글자·구획·관계는 별도 시각 검토했다. 이 검사는 설계 가정의 제품 확정이나 실제 서버·DB 테스트를 대신하지 않는다. 제품 코드는 변경하지 않아 제품 테스트는 새로 실행하지 않았다.

추가로 `node docs/modeling/integrated/audit.cjs`의 구조 검사 13개를 통과했다. audit.json에 별칭 중복 제거, 도메인 25개 전체 연결, 승인·철회·초안·수정 근거 다중도, 합성 소유자 중복 없음과 두 그림의 클래스 외곽 가로 넘침 없음을 기록했다. XOR·동일 버전·상태별 필수 연결은 위 명세의 도메인 제약이며 이 구조 검사만으로 실행 검증한 것은 아니다.
