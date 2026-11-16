# HAVE · 9개 유스케이스에서 도출한 UML

2026-10-28 갱신. [프로젝트 맥락](../../../project-context.md)과 기준 유스케이스에 맞춰 클래스·시퀀스·상태·활동 모델을 연결했다. 강의의 요구 모델링 순서와 모델 간 일관성 검증을 적용했다.

전체 그림 보기 · 전체 UML PDF · 14쪽 · 상태·다중도 상세 PDF · 7쪽 · [수정 원본](model.json) · 기계 검사 결과

## 범위와 읽는 순서

이 묶음은 **현재 MVP의 사용자 목표 9개를 대상으로 한 요구·분석 설계 모델**이다. 실제 코드를 대조했지만 그림의 클래스·메서드가 그대로 JS에 구현되었다는 뜻은 아니다. UI/저장 이벤트를 책임별로 분해해 구현을 논의할 수 있게 했다. 실제 계정·서버·전자서명은 모델의 현재 구현 범위에 넣지 않았다. 전체 제품 요구와 미구현 계획은 [원본 52개 항목 대응표](../use-cases.json)와 프로젝트 맥락에 유지한다.

| 구분 | 그림 | 목적 |
| --- | --- | --- |
| Class | C01 핵심 도메인 | Work → Version → Approval → Receipt, 기여·감사와 다중성 |
| Class | C02 검토 상세 | 현재 답변·평가와 과거 회차 스냅샷 분리 |
| Class | C03 협력 책임 | 시퀀스의 업무 조정·기여 수집·검증·저장 참여자 정의 |
| Sequence | SQ01 등록·기여 | UC-01, UC-08; 선택적 기여 연결과 저장 후 성공 표시 |
| Sequence | SQ02 답변·검토 | UC-02, UC-03; 3개 과제 반복과 선택적 수정 요청 |
| Sequence | SQ03 최종 승인 | UC-04; 차단·commit·충돌·저장 실패의 분기 |
| Sequence | SQ04 버전·철회·조회 | UC-05, UC-06, UC-09; 사용자 요청별 처리와 이력 보존 |
| Sequence | SQ05 수신자 확인 | UC-07; QR 형식·로컬 확인 범위·선택 파일 비교 |
| State | ST01 검토·승인 절차 | 단일 Version의 미승인 하위 상태와 승인 저장 후 절차 종료 |
| State | ST02 승인 효력 | 미철회 승인 → 철회, 효력 변경 종료 후에도 기록 보존 |
| Activity | AC01 업무 흐름 | 작성자·시스템·검토자·수신자 책임과 보완·실패 경로 |

네 종류를 한 장씩 과밀하게 그리는 대신, **클래스 3개 뷰·시퀀스 5개 시나리오·상태 2장·활동 1장**으로 나눴다. 클래스 14개는 서로 다른 책임/자료 개념이며 추가 기능 14개를 도입한 것이 아니다. C01~C03은 동일 모델을 다른 관점으로 펼친 뷰다.

## 1. 클래스 모델의 구조

- **업무 중심축**은 Work, Version, Review, Approval, Receipt다. 파일명보다 버전 ID와 SHA-256, AI 신고, 검토 스냅샷을 승인 대상으로 삼는다.
- Work 하나는 버전 1개 이상, Version 하나는 현재 Review 1개와 Approval 0..1개를 가진다. 현재 MVP에서 저장된 Approval은 Receipt 1개와 연결된다. 운영 설계의 비동기 서명 영수증 0..1 관계와는 범위가 다르다.
- Review에는 현재 GateResponse 3개가 있고 답변마다 Evaluation이 0..1개다. 비어 있는 초안도 답변 슬롯으로 표현한다. 과제 종류는 enum 값으로 두어 불필요한 상속 계층을 만들지 않았다.
- ReviewRound는 당시 답변·평가·체크·메모의 값 복사다. 현재 Evaluation과 과거 평가를 같은 객체로 연결하지 않는다.
- Contribution은 작성자 신고 근거, AuditEvent는 업무 변경의 기록이다. 기여 근거의 진실성을 시스템이 자동 보증한다고 모델링하지 않았다.
- 역할은 작업별로 달라질 수 있어 작성자/검토자를 User의 상속 클래스로 만들지 않았다. 현재는 실제 계정이 없으므로 계정 클래스와 권한 서버를 완료된 구성으로 추가하지 않았다.
- 삭제·보존 정책이 확정되지 않았으므로 기본 연관과 다중성을 사용했다. 단순히 배열에 담겨 있다는 이유로 합성의 삭제 의미를 부여하지 않았다.

HAVEWorkflow는 유스케이스를 조정하고 WorkspaceRepository는 원자적 저장을 담당한다. ContributionRecorder와 EvidenceVerifier는 수집·검증의 별도 책임이다. 이 분석 책임을 기존 함수/모듈과 연결하는 기준은 다음과 같다.

| 분석 책임 | 현재 코드의 대응 |
| --- | --- |
| Work / Version | `db.versions`, `makeVersion`, `registrationForm`, `historyScreen` |
| Review / GateResponse / Evaluation | `version.gates[]`, `checks`, `memo`, `returned`, `gatesPassed`, `approvalReasons`, 답변/평가 이벤트 |
| ReviewRound | `version.reviewRounds[]`, `returnForm`, `confirmContributions` |
| Approval / Receipt | `db.approvals[]`, `approve`, 승인 객체의 `payload`, `payloadHash`, `reviewDigest`, `certScreen`, `publicRecord` |
| Contribution / AuditEvent | `version.contributions[]`, `audit`, `db.events[]`, 확장 JSON 규칙 |
| HAVEWorkflow | `app.js`의 이벤트·`transaction`·조회와 모달 흐름 |
| WorkspaceRepository | `repository.js`의 `load`, `commit` |
| ContributionRecorder | `extension/popup.js`, `records.js`, `chrome.storage.local` |
| EvidenceVerifier | `verifyScreen`, `parseRecord`, `compare`, `domain.js:publicRecord`, SHA-256 |

클래스의 연산 이름은 분석 모델 내부의 공통 어휘다. 기존 코드에 같은 이름의 메서드가 없다는 이유로 제품 코드를 이번 작업에서 리팩터링하지 않았다. 새 구현에서는 이 책임을 클래스로 만들지 모듈/함수로 유지할지 선택할 수 있다.

## 2. 시퀀스 모델의 의미

클래스 인스턴스는 `workflow:HAVEWorkflow`처럼 표현했다. 사용자 액터를 제외한 모든 참여자 타입은 클래스 모델에 있고, `call`로 기록한 모든 호출은 수신 클래스의 연산에 연결된다. 그림에 필요한 주요 메시지만 표현하며 내부 함수 호출 전체를 나열하지 않았다.

- `loop`는 세 과제의 제출 반복, `opt`는 기여 연결·수정 요청·파일 선택, `alt`는 조건에 따른 택일이다. 비동기 JavaScript라는 이유로 `par`를 사용하지 않았다.
- SQ03에서 승인/Receipt 값을 준비하는 단계는 commit 성공과 다르다. 성공 표시와 지속 상태의 전이는 commit 이후다. 충돌 시 복원·최신 기록 확인을 하고 승인을 자동 재시도하지 않는다.
- SQ01/SQ02/SQ04의 모든 쓰기에도 같은 저장 실패 원칙을 적용한다. 공통 실패 분기를 모든 그림에 반복하지 않고 SQ03을 참조한다.
- SQ04의 `alt`는 **사용자 요청 한 건의 종류**를 구분한다. 후속 버전 존재와 승인 철회가 서로 배타적인 상태라는 뜻이 아니다. 현재 시연은 검토자가 최근 승인을 철회하며 운영 서비스의 권한과 승인 ID 선택은 별도 설계다.
- SQ05의 형식 검사는 전자서명 진위 확인이 아니다. 로컬 기록이 없으면 발급 당시 요약만 표시한다. 파일 미선택은 미확인이며 해시 일치와 현재 승인 효력을 동일하게 취급하지 않는다.
- UC-09의 내부 증명서·검토·감사 이력과 UC-07의 공개 최소 요약은 다른 정보 범위다. 비공개 답변·메모를 수신자 화면에 노출하지 않는다.

## 3. 상태 모델의 기준과 전이

2026-10-28 보조 PDF의 다섯 단계에 따라 범위를 다시 명시했다. **ST01은 단일 Version의 검토·승인 절차**, ST02는 승인 이후 Approval의 효력 변경 절차다. 두 절차의 최종 노드는 상태기계의 실행 종료이며 객체·저장 데이터 삭제를 뜻하지 않는다. 기존 설명에서 조회 가능하다는 이유만으로 종료 기호를 배제했던 해석을 바로잡았다.

ST01은 미승인 복합 상태 안에 답변 작성 중·검토 대기·평가 통과·수정 요청을 둔다. 승인·증명·감사 commit이 성공하면 승인 완료를 거쳐 해당 버전의 검토·승인 절차를 종료한다. 평가 통과·수정 요청·저장 실패는 종료가 아니다. 신규 버전은 새 절차의 시작이며 이전 버전 상태를 초기화하지 않는다.

기존 데이터의 상태 판정 순서는 returned/치명 오류 → 과제 통과 → 세 답변 제출 → 작성 중이다. 부분 제출 상태의 평가, 치명 오류 해제, 기여 추가 후 returned 유지도 전이표에 반영했다. 단순히 점수가 낮다는 이유로 자동 반려하지 않는다. 최종 승인은 과제 통과 외에도 체크·메모·역할·기존 승인·저장 결과를 검사한다.

[다섯 단계·전이표·다중도 감사](state-and-multiplicity.md)에서 T01~T15의 이벤트·조건·액션과 자기 전이/거부를 확인할 수 있다. [9개 유스케이스 상세 조건](../use-case-specs.md)은 사전·사후·예외와 R01~R10을 연결한다. 코드의 실제 status enum을 새로 도입한 것이 아니라 현재 데이터와 이벤트를 분석 모델로 정리했다.

## 3a. 다중도 확인 결과

핵심 다중도는 유지했다. Work 1개당 Version 1..*, Version당 Review 1개·Approval 0..1개, Review당 답변 슬롯 3개, 슬롯당 현재 Evaluation 0..1개, 현재 로컬 Approval당 Receipt 1개다.

누락된 Version–AuditEvent 연관을 추가했다. 사건은 Work 1개에 속하면서 그 안의 Version 1개를 대상으로 한다. Contribution은 전역 원본이 아닌 **버전별 사본**임을 명시해, 같은 recordId를 다른 버전에 가져올 수 있는 구현과 모순되지 않게 했다. `/key=(versionId,recordId)`는 개념 식별자이며 저장 형식에 새 필드를 추가한 것이 아니다.

현재 검토와 과거 회차를 구분하고, 새 기여·수정 요청은 현재 Review나 슬롯을 늘리지 않고 과거 회차를 1개 추가한다는 조건을 UC-03/08에 적었다. 구조적 `*`는 유지하되 현재 스키마의 버전 10000개·기여 100개·회차 1000개 상한은 별도 제약으로 기록했다. 감사 실행 결과와 재실행 도구 `audit_constraints.cjs`를 제공한다.

## 4. 활동 모델의 책임과 재작업

AC01은 대표 승인·수신자 확인 시나리오다. 시스템 내부의 직렬 제어 흐름을 작성자·시스템·검토자·검증자 스윔레인으로 나눴다. 빈 마름모는 택일 흐름의 병합이며 병렬 fork/join이 아니다.

승인 조건이 안 맞으면 작성자 보완을 먼저 확인하고, 그 외 평가·체크·메모 보완은 검토자에게 돌린다. 파일·신고·위험 입력 변경은 UC-05 새 버전 등록, 같은 파일의 답변 보완은 검토자의 수정 요청 등록과 시스템의 회차 보존·초기화·저장 후 재제출로 돌아간다. 이전 답변을 임의로 덮어쓰는 경로가 아니다.

저장 실패/충돌은 복원·최신 기록 확인 뒤 새 승인 요청으로 돌아가며 승인 조건을 다시 검사한다. 승인이 성공한 뒤 조회와 QR 확인으로 이어지고 파일 선택 여부에 따라 일치 비교/미확인으로 분기한다. UC-06 철회는 별도 사용자 요청이므로 SQ04와 ST01로 연결한다. 모든 유스케이스를 한 실행 경로에 강제로 이어 붙이지 않았다.

## 5. 유스케이스 추적성

| UC | 핵심 클래스 | 대응 시퀀스 | 상태 / 활동 |
| --- | --- | --- | --- |
| UC-01 등록 | Work, Version, Review | SQ01 | 새 Review 시작 / AC01 등록 |
| UC-02 답변 | Review, GateResponse | SQ02 | ST01 제출·재제출 / AC01 답변 |
| UC-03 검토 | Review, Evaluation, ReviewRound | SQ02 | ST01 평가·수정 / AC01 검토·보완 |
| UC-04 승인 | Version, Review, Approval, Receipt | SQ03 | ST01 승인 생성 / AC01 조건·commit |
| UC-05 새 버전 | Work, Version, Review | SQ04 | ST01 독립 관계 / AC01 새 버전 보완 |
| UC-06 철회 | Approval, AuditEvent | SQ04 | ST02 철회 / 별도 요청 시나리오 |
| UC-07 수신자 확인 | Receipt, Work, EvidenceVerifier | SQ05 | 승인/버전 관계 참조 / AC01 QR·파일 |
| UC-08 기여 | Contribution, Version, Review, ContributionRecorder | SQ01 | ST01 평가 초기화 / AC01 선택적 연결 |
| UC-09 조회 | Work, ReviewRound, Approval, Receipt, AuditEvent | SQ04 | 읽기이며 상태 변경 없음 / AC01 조회 |

## 6. 강의에서 적용한 기준

첨부 `Ch06_요구 모델링_정적-동적-final (1).pdf` 63쪽을 확인했다. 페이지는 PDF 페이지와 슬라이드 표기가 같다. 문서 안의 설명·예시는 모델링 참고 자료이며 현재 사용자의 작업 지시와 구분한다.

| 페이지 | 적용 |
| --- | --- |
| 15~16 | 유스케이스 → 개념 클래스 → 시퀀스 → 연산/관계 보완 → 상태·활동의 흐름 |
| 18~40 | 도메인 후보 선별, 속성/연산 구획, 연관과 다중성, 근거 없는 상속·합성 배제 |
| 43~48 | 참여자·라이프라인·메시지·응답과 `alt`, `loop`, `opt`로 시나리오 표현 |
| 51~54 | 객체별 범위 확정, 이벤트·조건·작업에 따른 전이, 시퀀스와 상태 교차 확인 |
| 56~58 | 제어 흐름·결정·병합과 책임별 스윔레인 |
| 60~63 | 요구 추적, 유스케이스–시퀀스, 시퀀스–클래스, 상태–클래스 일관성 검사 |

## 7. 수정·생성과 검증

**수정 원본은 `model.json` 하나**다. `classes`의 속성/연산, 각 그림의 참여자·메시지·레이아웃·관계를 수정한다. `sources/*.json`, `sources/*.mmd`, SVG/PNG, HTML, PDF는 열람/배포용 생성 산출물이다. 원본과 생성 파일을 따로 고치지 않는다. `.mmd`는 별도 렌더러로 열어 볼 수 있는 보조 표현이며 화면 배치는 SVG를 기준으로 검토한다.

```sh
# Playwright 필요. 필요한 환경에서 DIAGRAM_NODE_MODULES / CHROME_EXECUTABLE 지정
node docs/modeling/optimized/uml/render.cjs

# reportlab, pillow, pypdf와 한국어 폰트 필요
python docs/modeling/optimized/uml/export_pdf.py
```

공통 SVG 함수는 `docs/modeling/render.cjs`에서 가져오며 이 모듈을 읽는 것만으로 기존 갤러리를 실행하지 않는다. 기존 명령의 직접 실행 동작은 유지했다. 이 묶음의 생성 명령은 기존 13개 그림·기존 PDF·발표 PPT를 재생성하지 않는다.

렌더러는 9개 UC의 시퀀스 포함 여부, 참여자 타입, 호출 연산의 수신 클래스 일치, 상태의 연산 참조, 프레임 균형, 화면 밖 글자를 검사한다. 그림 검토에서는 클래스 내부 글자·다중성·경계·화살표, 보완 회차와 실패 시 성공 전이 없음, 파일 선택의 선택성을 추가 확인한다. 검사 결과는 `validation.json`에 기록한다. PDF는 생성 뒤 다시 PNG로 렌더링해 확인한다.

2026-10-26 검토에서는 10개 그림과 13쪽 PDF를 렌더링해 확인했다. 9개 UC 대응·참여자/연산·상태 참조 검사와 기존 도메인 테스트 17개를 통과했고, 관련 문서의 로컬 링크 74개와 페이지 번호를 확인했다. 공통 렌더러의 함수 추출 후 기존 13개 SVG를 메모리에서 다시 생성해 저장본과 동일함을 확인했다. 제품 코드는 변경하지 않았다. Mermaid 파일은 보조 열람용으로 내보냈으며 별도 Mermaid 엔진의 파싱 검사는 수행하지 않았다.

2026-10-28 갱신: `python docs/modeling/optimized/uml/export_contracts.py`로 JSON의 유스케이스 조건과 상태·다중도 설명을 생성한다. 상태 상세 검토본은 `export_state_review.py`로 생성한다. 관련 네 그림만 갱신하려면 `node docs/modeling/optimized/uml/render.cjs C01-domain C02-review ST01-lifecycles ST02-approval`를 사용한다. 이때 기존 다른 그림은 다시 쓰지 않으며 각 렌더링 확인일을 `validation.json`에 유지한다.
