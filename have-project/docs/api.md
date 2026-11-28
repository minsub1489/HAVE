# HAVE REST API 계약

2026-11-28 고정 · 관리 D · 기준 `HAVE_최종_개발_가이드라인.md` 5.1 · 5.2

서버(`have-server`)와 클라이언트(`have-chrome-extension`, 공개 검증 페이지)가 주고받는 요청과 응답입니다. 서버를 만드는 사람과 화면을 붙이는 사람이 이 문서 하나를 보고 따로 작업할 수 있게 예시 JSON을 모두 적었습니다.

- **1단계(각자 작업, 11/30 18시까지)에는 이 문서를 고치지 않습니다.** 고칠 곳은 `docs/phase1/<담당>.md`에 적고 통합 때 반영합니다. 2단계에 바꾸면 전원에게 알리고 PR에 이 파일을 함께 넣습니다.
- 주소와 오퍼레이션 이름은 가이드라인 5.2와 같습니다. 본문 필드 이름은 클래스 다이어그램 v3의 속성(= DB 열 이름의 camelCase)을 썼습니다.
- 설계서에 답이 없던 곳은 11/28에 모두 결정했고(`design-changes.md` 2절), 그 결정대로 적었습니다.
- 지금 서버에 구현된 것은 `GET /api/health` 하나입니다. 나머지는 계약만 있습니다.
- 절 제목 끝에 "2단계"라고 적은 주소는 통합 뒤(2단계)에 만듭니다. 나머지는 1단계에 만듭니다(가이드라인 5.2의 "단계" 열).

## 목차

1. [공통 규칙](#1-공통-규칙) · 2. [공통 객체](#2-공통-객체) · 3. [인증 — D · B](#3-인증--d--b) · 4. [작업 — A](#4-작업--a) · 5. [검토 — B](#5-검토--b) · 6. [승인 — C](#6-승인--c) · 7. [증명서 — C](#7-증명서--c) · 8. [공개 검증 — C](#8-공개-검증--c) · 9. [이력 — C](#9-이력--c) · 10. [알림 — D](#10-알림--d) · 11. [화면별 호출 조합](#11-화면별-호출-조합)

---

## 1. 공통 규칙

| 항목 | 규칙 |
| --- | --- |
| 기본 주소 | `http://localhost:8080` |
| 형식 | JSON, UTF-8, 필드는 camelCase. 파일이 있는 요청만 `multipart/form-data` |
| ID | 숫자(BIGINT). 예시의 숫자는 지어낸 값 |
| 시각 | UTC ISO-8601 문자열(`2026-11-30T05:12:44Z`). 화면에서 KST로 바꿔 보여 줌 |
| 날짜 | `YYYY-MM-DD`(검토 기한, 보완 기한) |
| 없는 값 | `null`. 목록이 비면 `[]` |
| 코드 값 | `have.common.code`의 enum 이름 그대로(`"APPROVAL_PENDING"`) |
| 인증 | `Authorization: Bearer <토큰>`. 없거나 틀리거나 만료되면 401. 토큰 없이 열리는 주소는 `POST /api/auth/login`, `POST /api/public/verifications`, `GET /api/health`, 공개 검증 페이지(`/verify/…`)뿐 |
| 사용자 | 요청 본문에 "누가 했는지"를 적지 않습니다. 서버가 토큰에서 얻습니다 |
| 멱등 키 | 승인 · 반려 · 철회는 `Idempotency-Key: <UUID>` 헤더 필수. 같은 키로 다시 오면 새로 기록하지 않고 처음 결과를 200으로 돌려줌 |
| 성공 코드 | 조회와 명령은 200, 새로 만들면 201, 본문이 없으면 204 |
| 명령의 응답 | 바뀐 자원을 돌려줍니다. 화면은 그 뒤 필요한 조회를 다시 해서 그립니다(다음 상태를 추측하지 않음) |

### 오류 응답

모든 오류는 같은 모양입니다(`have.common.ApiError`). 서비스에서 `throw ApiException.conflict("…")`처럼 던지면 이 모양으로 나갑니다.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "작업명을 1~100자로 입력해 주세요.",
  "fields": { "title": "작업명을 1~100자로 입력해 주세요." }
}
```

| HTTP | code | 언제 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력 오류, 조건 미충족(통과 조건 · 승인 조건). `fields`에 칸별 문장. 칸과 무관하면 `{}` |
| 401 | `UNAUTHENTICATED` | 토큰 없음 · 틀림 · 만료, 로그인 실패 |
| 403 | `FORBIDDEN` | 그 작업의 구성원이 아님, 역할이 맞지 않음, 자기 검토 · 자기 승인. 대상의 내용은 싣지 않음 |
| 404 | `NOT_FOUND` | 대상 없음. 공개 검증의 "대상 미식별"(없음 · 만료 · 공유 중지)도 구분 없이 이것 |
| 409 | `CONFLICT` | 허용되지 않는 상태 전이, 직전 버전과 같은 파일, 진행 중인 검토 요청 있음, 이미 결정됨, 잠금 번호 불일치 |
| 500 | `INTERNAL_ERROR` | 서버 오류. 원인은 서버 로그에만 |

`message`는 화면에 그대로 보여 줍니다. 문장은 확장 프로그램의 기존 문구(`model.js` · `review-model.js`의 `requireThat` 메시지)를 그대로 씁니다. 자주 쓰는 것:

| 상황 | 코드 | 문장 |
| --- | --- | --- |
| PDF가 아님 | 400 | PDF 파일만 등록할 수 있어요. 파일 형식을 확인해 주세요. |
| 20MB 초과 | 400 | 20 MB 이하의 PDF를 선택해 주세요. |
| 같은 파일 | 409 | 직전 버전과 같은 파일이에요. 수정한 파일을 선택해 주세요. |
| 검토 시작 뒤 취소 | 409 | 검토가 시작되기 전에만 요청을 취소할 수 있어요. |
| 제출한 답변 수정 | 409 | 이미 제출한 답변은 수정할 수 없어요. |
| 잠금 번호 불일치 | 409 | 다른 창에서 이 버전이 바뀌었어요. 다시 열어 주세요. |
| 재제출 불가 상태 | 409 | 수정 요청을 받은 버전만 재제출할 수 있어요. |
| 공개 검증 대상 없음 | 404 | 승인 기록을 찾을 수 없어요 |

### 상태 확인 (구현됨)

`GET /api/health` — 토큰 없음.

```json
{ "status": "UP", "profile": "stub" }
```

---

## 2. 공통 객체

여러 응답에 같은 모양으로 들어가는 객체입니다. 아래 절에서는 이름으로만 가리킵니다.

### 2.1 UserRef — 사용자 요약

```json
{ "userId": 2, "name": "김지은" }
```

비밀번호 해시는 어떤 응답에도 싣지 않습니다. 이메일은 `/api/auth/…`와 `/api/users`에서만 줍니다.

### 2.2 Version — 작업 버전 (02, A)

```json
{
  "versionId": 21,
  "workId": 12,
  "versionNo": 1,
  "status": "CHALLENGE_PENDING",
  "fileName": "HAVE_설계_보고서_v1.pdf",
  "fileHash": "9f2c1e…(64자)",
  "changeReason": null,
  "createdAt": "2026-11-30T05:12:44Z",
  "revision": 2,
  "aiDisclosure": {
    "noAiUsed": false,
    "usageScope": "문서 구조와 초안 작성에 사용했습니다. 사실 확인과 최종 수정은 직접 수행했습니다.",
    "tools": [
      { "toolSeq": 1, "toolName": "ChatGPT", "modelName": "GPT-4o", "usageMethod": "초안 작성, 자료 조사·요약", "contribution": "목차와 1차 초안" }
    ]
  },
  "contributions": [
    { "recordId": 1, "stage": "DRAFT", "actorType": "AI", "note": "목차와 1차 초안을 생성했어요.", "createdAt": "2026-11-30T05:12:50Z" }
  ],
  "evidences": [
    { "evidenceId": 7, "type": "WEB_SOURCE", "title": "Chrome 확장 프로그램 공식 문서", "uri": "https://developer.chrome.com/docs/extensions", "fileHash": null },
    { "evidenceId": 8, "type": "SUPPORT_FILE", "title": "실험 결과 표", "uri": null, "fileHash": "41ab07…(64자)" }
  ],
  "revisionRound": null
}
```

- `revision`은 낙관적 잠금 번호(`WORK_VERSION.revision`)입니다. 상태가 바뀔 때마다 1씩 늘고, 승인 · 반려 요청의 `expectedRevision`과 비교합니다.
- `revisionRound`는 이 버전에 걸린 수정 회차(`REVISION`)입니다. 이름이 잠금 번호와 겹치지 않게 `revisionRound`로 부릅니다. 없으면 `null`.

```json
"revisionRound": {
  "revisionId": 5,
  "source": "REVIEW",
  "state": "OPEN",
  "dueDate": "2026-12-02",
  "changeNote": "",
  "response": "",
  "submittedVersionId": null
}
```

- `source`는 저장하지 않고 계산합니다: `review_id`가 있으면 `REVIEW`(검토자의 수정 요청), `case_id`가 있으면 `REJECTION`(최종 승인자의 반려).
- `state`는 `OPEN` · `IN_PROGRESS` · `SUBMITTED` · `EXPIRED`. 기한이 지났고 제출하지 않았으면 `EXPIRED`로 계산해 돌려줍니다.
- 보완 항목(`FEEDBACK_ITEM`)과 반려 사유는 03 · 04의 데이터라 여기에 없습니다. 5.3과 6.1에서 받습니다.
- `fileName`: `WORK_VERSION`에는 파일 이름 열이 없습니다. 저장 키(`file_uri`)의 마지막 구간에 원래 이름을 두고 거기서 꺼냅니다(11/28 결정, 열린 항목 3). `file_uri` 자체는 응답에 싣지 않습니다.
- `aiDisclosure.tools`: 화면에는 "AI 도구·모델" 한 칸과 사용 방식 선택(초안 작성 등)이 있습니다. 화면 값은 이렇게 담습니다(11/28 결정, 열린 항목 4): `toolName`에 입력값, `modelName`에 같은 값, `usageMethod`에 고른 사용 방식을 쉼표로 이은 값, `contribution`에 빈 문자열.
- `SUPPORT_FILE` 근거의 `uri`는 내부 저장 키라 `null`로 줍니다.

### 2.3 ReviewRequest — 검토 요청 (03, B)

```json
{
  "requestId": 31,
  "workId": 12,
  "versionId": 21,
  "versionNo": 1,
  "state": "REQUESTED",
  "reviewer": { "userId": 2, "name": "김지은" },
  "approver": { "userId": 4, "name": "박서연" },
  "message": "3장 근거를 중심으로 봐 주세요.",
  "dueDate": "2026-12-02",
  "requestedAt": "2026-11-30T05:14:02Z",
  "risk": {
    "assessmentSeq": 1,
    "policyVersion": "GP-2026-1",
    "aiUsageScore": 2,
    "importanceScore": 2,
    "evidenceGapScore": 1,
    "pastFailureScore": 0,
    "rationale": "핵심 장의 초안을 AI가 작성했고, 팀 제출 문서라 중요도가 높아요.",
    "total": 5,
    "level": "MEDIUM",
    "gate": { "strategy": "MediumRiskGate", "kinds": ["TEACH_BACK", "WHAT_IF"], "minScore": 3, "maxScore": 4 }
  },
  "review": null
}
```

- `state`: `REQUESTED` · `IN_REVIEW` · `CLOSED` · `CANCELED`.
- `risk.total` · `risk.level` · `risk.gate`는 저장하지 않고 계산합니다. 경계(4 · 7)는 `GATE_POLICY` 행에서 읽습니다.
- `approver`: 최종 승인자는 `REVIEW_REQUEST`에 열이 없고 `WORK_MEMBER(APPROVER)`에만 있습니다. 검토자 · 최종 승인자는 작업마다 한 명이라(11/28 결정, 가이드라인 5.4) 그 작업의 APPROVER가 곧 이 요청의 최종 승인자입니다. `reviewer`도 그 작업의 REVIEWER와 같습니다.
- `review`는 검토를 시작한 뒤에 채워집니다(2.4).

### 2.4 Review — 검토 회차 (03, B)

```json
{
  "reviewId": 35,
  "state": "COMPLETED",
  "memo": "근거와 답변이 결과물 내용과 맞아요.",
  "reviewDigest": "c07d55…(64자)",
  "checks": [
    { "itemId": 1, "criterion": "등록된 버전의 파일을 직접 열어 확인했어요", "required": true, "checked": true },
    { "itemId": 2, "criterion": "AI 사용 신고 범위와 결과물 내용을 대조했어요", "required": true, "checked": true },
    { "itemId": 3, "criterion": "근거자료(출처·기록)를 확인했어요", "required": true, "checked": true },
    { "itemId": 4, "criterion": "이해 확인 답변이 결과물 내용과 맞는지 확인했어요", "required": true, "checked": true }
  ],
  "feedback": {
    "decision": "PASS",
    "evaluationSummary": "4/4점 · 치명 오류 없음",
    "comment": "근거와 답변이 결과물 내용과 맞아요.",
    "items": []
  }
}
```

- `state`: `IN_PROGRESS` · `COMPLETED` · `HALTED`. `reviewDigest`는 끝난 뒤에만 값이 있습니다.
- `feedback`은 결정(통과 · 수정 요청) 뒤에만 있습니다. 수정 요청이면 `decision`이 `REVISION_REQUIRED`이고 `items`에 보완 항목이 들어갑니다: `{ "feedbackItemId": 9, "targetSection": "3장 2절", "content": "출처 표기가 빠졌어요." }`
- 화면에는 메모 한 칸뿐입니다. `memo`를 `REVIEW.memo`와 `FEEDBACK.comment`에 같이 넣고, `evaluationSummary`는 서버가 `총점/만점 · 치명 오류 …`로 만듭니다(11/28 결정, 열린 항목 5).
- 과제별 평가(점수 · 근거 · 치명 오류)는 과제 목록(5.5)에 과제와 함께 들어 있습니다.

### 2.5 ApprovalCase — 승인 건 (04, C)

```json
{
  "caseId": 41,
  "workId": 12,
  "versionId": 21,
  "versionNo": 1,
  "reviewId": 35,
  "state": "PENDING",
  "rejectionReason": null,
  "decidedAt": null,
  "revision": 5,
  "conditions": [
    { "key": "actor", "ok": true, "label": "지정 최종 승인자이고 작성자·검토자가 아님" },
    { "key": "review", "ok": true, "label": "검토 통과 · 4/4점 (기준 3점) · 치명 오류 없음 · 체크리스트 4/4" },
    { "key": "revision", "ok": true, "label": "검토한 버전과 승인 대상 버전이 같음 (최신 버전 · 잠금 번호 일치)" },
    { "key": "file", "ok": true, "label": "파일 해시가 등록 당시 값과 일치" },
    { "key": "single", "ok": true, "label": "이 버전에 기존 최종 결정이 없음" }
  ],
  "approval": null,
  "certificateId": null
}
```

- `state`: `PENDING` · `APPROVED` · `REJECTED`. `revision`은 그 버전의 지금 잠금 번호이고, 승인 · 반려 요청의 `expectedRevision`으로 그대로 돌려보냅니다.
- `conditions`는 조회한 사용자 기준으로 계산합니다(`actor`가 사람마다 다름). 결정이 끝난 건에서는 `[]`.
- 승인되면 `approval`과 `certificateId`가 채워집니다.

```json
"approval": {
  "approvalId": 45,
  "approver": { "userId": 4, "name": "박서연" },
  "approvedAt": "2026-12-01T02:40:11Z",
  "effect": "VALID",
  "revocation": null
}
```

- `effect`는 저장하지 않고 계산합니다: 철회 기록이 있으면 `REVOKED`, 없으면 `VALID`. 후속 버전이 있는지는 효력과 별개입니다.
- 철회되면 `revocation`: `{ "revocationId": 3, "actor": { "userId": 4, "name": "박서연" }, "reason": "…", "revokedAt": "…" }`

### 2.6 Certificate — 증명서 (05, C)

```json
{
  "certificateId": 51,
  "approvalId": 45,
  "workId": 12,
  "versionId": 21,
  "versionNo": 1,
  "title": "HAVE 설계 보고서",
  "fileName": "HAVE_설계_보고서_v1.pdf",
  "fileHash": "9f2c1e…(64자)",
  "signingState": "READY",
  "serial": "HAVE-2612-9F3A1C",
  "keyId": "have-key-1",
  "issuedAt": "2026-12-01T02:40:15Z",
  "payloadHash": "9f3a1c…(64자)",
  "approver": { "userId": 4, "name": "박서연" },
  "approvedAt": "2026-12-01T02:40:11Z",
  "reviewer": { "userId": 2, "name": "김지은" },
  "effect": "VALID",
  "latestVersionNo": 1,
  "isLatest": true,
  "revocation": null,
  "retryCount": 0,
  "shareLinks": [
    { "linkId": 61, "state": "ACTIVE", "expiresAt": "2026-12-08T02:45:00Z", "disabledAt": null }
  ]
}
```

- `signingState`: `PENDING`(발급 중) · `READY`(발급 완료) · `FAILED`(발급 실패). 발급 전에는 `serial` · `keyId` · `issuedAt` · `payloadHash`가 `null`.
- `serial`(증명서 번호)과 `payloadHash`는 저장하지 않고 계산합니다. `payloadHash` = SHA-256(`immutable_payload`), `serial` = `HAVE-` + 발급 연월(YYMM) + `-` + `payloadHash` 앞 6자 대문자(1.1.0 화면과 같은 규칙).
- `title` · `fileName` · `fileHash` · `approver` · `approvedAt` · `reviewer`는 `immutable_payload`에서 읽습니다. 발급 뒤에 작업 제목이 바뀌어도 증명서의 값은 그대로입니다. `immutable_payload`의 키는 1.1.0과 같은 구성으로 정했습니다(11/28 결정, 열린 항목 6): `certificateId, workId, title, versionId, n, fileName, fileHash, approver, approvedAt, reviewer, reviewDigest`.
- `effect` · `latestVersionNo` · `isLatest`는 `IApprovalStatus.getCurrentValidity`의 값입니다.
- 공유 링크의 `state`는 계산합니다: `disabledAt`이 있으면 `DISABLED`, `expiresAt`이 지났으면 `EXPIRED`, 아니면 `ACTIVE`. 토큰 원문은 목록에 없습니다(만들 때 한 번만 줌).

---

## 3. 인증 — D · B

주소(`AuthController`)와 토큰(`TokenService`)은 D(D19), 비밀번호 확인 · 내 정보 · 사용자 찾기(`IAuthorization`)는 B가 만듭니다.

시드 계정(11/28 고정, B3이 넣음). 역할은 계정이 아니라 작업마다 정해지므로 누구든 작성자 · 검토자 · 최종 승인자가 될 수 있습니다. 아래 "시연 역할"은 1.1.0 화면의 구성을 옮긴 것입니다.

| userId | 이름 | 이메일 | 시연 역할 |
| --- | --- | --- | --- |
| 1 | 김하늘 | `haneul@have.test` | 작성자 |
| 2 | 김지은 | `jieun@have.test` | 검토자 |
| 3 | 이도현 | `dohyun@have.test` | 검토자 |
| 4 | 박서연 | `seoyeon@have.test` | 최종 승인자 |
| 5 | 정우진 | `woojin@have.test` | 최종 승인자 |

다섯 계정의 시연 비밀번호는 모두 `have-demo-1128`입니다. 시드 파일에는 BCrypt 해시로만 넣습니다. 시연용 값이라 문서에 적어 두었고, 실제 서비스라면 이렇게 하지 않습니다.

### 3.1 로그인 — `POST /api/auth/login` · IAuthorization.login · 토큰 없음

```json
{ "email": "haneul@have.test", "password": "have-demo-1128" }
```

200

```json
{
  "token": "eyJ1c2VySWQiOjEsImV4cCI6MTc5…",
  "expiresAt": "2026-11-30T17:00:00Z"
}
```

- 401 `UNAUTHENTICATED` "이메일 또는 비밀번호가 맞지 않아요." 어느 쪽이 틀렸는지 구분하지 않습니다.
- 사용자 정보는 이어서 3.3으로 받습니다(로그인 화면은 3.1 → 3.3 순서로 부름).
- 토큰은 D가 만듭니다(D19, HMAC 서명, 12시간). 서명 비밀 값은 설정 `have.token.secret`(환경 변수 `HAVE_TOKEN_SECRET`)에서 읽습니다. 처리 순서: `AuthController` → `IAuthorization.login`(B, 비밀번호 대조 후 `TokenService.createToken`) → `TokenService.getExpiresAt`.

### 3.2 로그아웃 — `POST /api/auth/logout` · IAuthorization.logout

본문 없음 → 204. 세션 테이블이 없으므로 서버는 기록하지 않고 클라이언트가 토큰을 지웁니다.

### 3.3 내 정보 — `GET /api/auth/me` · IAuthorization.getCurrentUser

200

```json
{ "userId": 1, "name": "김하늘", "email": "haneul@have.test" }
```

확장 프로그램을 열 때 저장해 둔 토큰이 아직 유효한지 확인하는 데도 씁니다(401이면 로그인 화면으로).

### 3.4 사용자 찾기 — `GET /api/users?keyword=` · (추가) IAuthorization.getUsers

검토자 · 최종 승인자를 고르는 목록입니다. `keyword`는 이름이나 이메일의 일부이고, 비우면 전체입니다. 본인은 빼고 최대 20명.

200

```json
[
  { "userId": 2, "name": "김지은", "email": "jieun@have.test" },
  { "userId": 3, "name": "이도현", "email": "dohyun@have.test" }
]
```

---

## 4. 작업 — A

권한: 작업 생성은 로그인한 누구나. 그 밖에는 그 작업의 구성원만(아니면 403). 쓰기는 작성자(`AUTHOR`)만.

### 4.1 작업 생성 — `POST /api/works` · IWorkAPI.createWork · UC01

```json
{
  "title": "HAVE 설계 보고서",
  "aiDisclosureDraft": {
    "noAiUsed": false,
    "usageScope": "문서 구조와 초안 작성에 사용했습니다. 사실 확인과 최종 수정은 직접 수행했습니다.",
    "tools": [
      { "toolName": "ChatGPT", "modelName": "GPT-4o", "usageMethod": "초안 작성, 자료 조사·요약", "contribution": "목차와 1차 초안" }
    ]
  }
}
```

201 — 4.3과 같은 Work 객체(`versions`는 `[]`, `reviewer` · `approver`는 `null`).

- 요청한 사람이 작성자가 되고 `AUTHOR` 멤버로 등록됩니다. `CREATE_WORK` 이력.
- AI 사용 신고는 아직 버전이 없으므로 `WORK.ai_disclosure_draft`에 초안으로 두고, 버전을 등록할 때 `AI_DISCLOSURE` · `AI_TOOL_USAGE`로 고정합니다.
- "AI 미사용"이면 `{ "noAiUsed": true, "usageScope": "", "tools": [] }`.
- 400: `title`(1~100자), `usageScope`(1~5,000자), `tools[i].toolName`(1~100자).

### 4.2 작업 목록 — `GET /api/works?role=&status=&keyword=` · IWorkAPI.getWorks · UC09

로그인한 사용자가 구성원인 작업만 나옵니다. 조건은 모두 선택입니다.

| 조건 | 값 |
| --- | --- |
| `role` | `AUTHOR` · `REVIEWER` · `APPROVER` — 내가 그 역할인 작업 |
| `status` | 최신 버전의 상태. 쉼표로 여러 개(`REVIEW_PENDING,IN_REVIEW`) |
| `keyword` | 제목에 들어 있는 글자 |

200 — 최신 버전이 만들어진 시각의 역순

```json
[
  {
    "workId": 12,
    "title": "HAVE 설계 보고서",
    "owner": { "userId": 1, "name": "김하늘" },
    "myRoles": ["AUTHOR"],
    "latestVersion": { "versionId": 21, "versionNo": 1, "status": "CHALLENGE_PENDING", "createdAt": "2026-11-30T05:12:44Z" },
    "versions": [ { "versionId": 21, "versionNo": 1, "status": "CHALLENGE_PENDING" } ]
  }
]
```

- 버전이 아직 없는 작업은 `latestVersion`이 `null`, `versions`가 `[]`.
- `versions`(모든 버전의 ID · 번호 · 상태)는 알림 화면이 `versionId`로 작업 제목과 버전 번호를 찾는 데 씁니다(10절).
- "승인할 작업" 목록은 `role=APPROVER&status=APPROVAL_PENDING`, "승인 완료" 목록은 `status=APPROVED`로 얻습니다.

### 4.3 작업 상세 — `GET /api/works/{workId}` · IWorkAPI.getWork

200

```json
{
  "workId": 12,
  "title": "HAVE 설계 보고서",
  "owner": { "userId": 1, "name": "김하늘" },
  "myRoles": ["AUTHOR"],
  "reviewer": { "userId": 2, "name": "김지은" },
  "approver": { "userId": 4, "name": "박서연" },
  "aiDisclosureDraft": null,
  "versions": [ { "…": "2.2의 Version, 버전 번호 순" } ]
}
```

02의 데이터만 줍니다. 검토 요청 · 승인 건 · 증명서 · 이력은 각각의 주소에서 받습니다(11절).

`reviewer` · `approver`는 이 작업의 지정 검토자 · 최종 승인자입니다. 작업마다 한 명이고, 첫 검토 요청 전이면 `null`입니다. 02가 `IAuthorization.getMembers`로 채웁니다. 새 버전 등록 마법사와 취소 뒤 다시 요청하는 화면이 이 값을 미리 골라 둡니다(5.2).

### 4.4 버전 등록 — `POST /api/works/{workId}/versions` · IWorkAPI.uploadVersion · UC02 · multipart

| 파트 | 내용 |
| --- | --- |
| `file` | PDF 한 개(20MB 이하) |
| `data` | `application/json` |

```json
{ "fileHash": "9f2c1e…(64자)", "changeReason": null }
```

201 — 2.2의 Version(`status`는 `SUBMITTED`)

- 서버가 PDF인지(확장자와 앞 5바이트 `%PDF-`), 크기, SHA-256을 다시 확인합니다. 보낸 `fileHash`와 서버가 계산한 값이 다르면 400 "파일이 전송 중에 바뀌었어요. 다시 선택해 주세요."
- 첫 버전이 아니면 `changeReason`(1~2,000자) 필수. 직전 버전이 `APPROVED`가 아니면 409 "승인 완료된 작업에만 새 버전을 등록할 수 있어요. 수정 요청은 수정본 재제출로 진행해 주세요."
- 1.1.0에는 "이전 승인의 증명서 발급이 끝난 뒤 새 버전을 등록해 주세요."라는 확인도 있습니다. 서버에서 하려면 02가 05의 상태를 알아야 하므로, 화면이 증명서 상태(7.1)를 보고 막습니다(11/28 결정, 열린 항목 7).
- 직전 버전과 해시가 같으면 409.
- AI 사용 신고: 첫 버전은 작업의 초안을, 그다음 버전은 직전 버전의 신고를 복사해 고정합니다. 새 버전에서 신고를 바꾸려면 `data`에 `aiDisclosure`(4.1의 `aiDisclosureDraft`와 같은 모양)를 넣습니다.
- 상태는 `setWorkStatus`가 `SUBMITTED`로 만들고, 그 통지로 `UPLOAD_VERSION` 이력이 남습니다.

### 4.5 기여 기록 추가 — `POST /api/versions/{versionId}/contributions` · IWorkAPI.addContribution · UC01

```json
{ "stage": "DRAFT", "actorType": "AI", "note": "목차와 1차 초안을 생성했어요." }
```

201

```json
{ "recordId": 1, "stage": "DRAFT", "actorType": "AI", "note": "목차와 1차 초안을 생성했어요.", "createdAt": "2026-11-30T05:12:50Z" }
```

- `stage`: `IDEA` · `DRAFT` · `REVISION` · `SOURCE_VERIFICATION`. `actorType`: `AI` · `HUMAN` · `MIXED`. `note` 1~2,000자.
- "AI 미사용"으로 신고한 버전이면 `actorType`은 `HUMAN`만 → 아니면 400 "AI를 사용하지 않았다면 기여 기록 1의 수행 주체는 ‘사람’이어야 해요."
- 승인된 버전이면 409. `ADD_CONTRIBUTION` 이력은 서비스가 직접 남깁니다.

### 4.6 근거자료 추가 — `POST /api/versions/{versionId}/evidences` · IWorkAPI.addEvidence · UC02 · multipart

| 파트 | 내용 |
| --- | --- |
| `data` | `application/json` |
| `file` | `type`이 `SUPPORT_FILE`일 때만 |

```json
{ "type": "WEB_SOURCE", "title": "Chrome 확장 프로그램 공식 문서", "uri": "https://developer.chrome.com/docs/extensions" }
```

201

```json
{ "evidenceId": 7, "type": "WEB_SOURCE", "title": "Chrome 확장 프로그램 공식 문서", "uri": "https://developer.chrome.com/docs/extensions", "fileHash": null }
```

- `type`: `WEB_SOURCE` · `REFERENCE` · `PROMPT_LOG` · `SUPPORT_FILE`. `title` 1~200자.
- `WEB_SOURCE`의 `uri`는 `http` · `https`만(계정 정보가 든 주소는 거절). `SUPPORT_FILE`은 `file` 필수이고 서버가 `fileHash`를 계산합니다.
- 버전이 `CHALLENGE_PENDING` 이후면 409 "검토 요청 뒤에는 근거자료를 바꿀 수 없어요."(근거자료 · AI 신고 잠금)

### 4.7 수정본 재제출 — `POST /api/works/{workId}/resubmissions` · IWorkAPI.resubmit · UC05 · multipart · 2단계

| 파트 | 내용 |
| --- | --- |
| `file` | 수정한 PDF |
| `data` | `application/json` |
| `evidenceFiles` | 새로 더하는 `SUPPORT_FILE` 근거의 파일들(있을 때만) |

```json
{
  "fileHash": "77a0b3…(64자)",
  "changeNote": "3장 2절의 출처를 보완했어요.",
  "response": "",
  "responses": [
    { "feedbackItemId": 9, "applied": true, "response": "출처 두 곳을 더하고 각주로 표시했어요." }
  ],
  "basis": null
}
```

201

```json
{ "basisChanged": false, "version": { "…": "2.2의 Version (새 버전)" } }
```

- 최신 버전이 `REVISION_REQUIRED`일 때만(아니면 409). 같은 파일이면 409.
- `responses`: 검토자의 수정 요청으로 열린 회차는 보완 항목 전부에 `applied`와 `response`(1~1,000자)가 있어야 합니다 → 아니면 400 "모든 피드백 항목에 반영 여부와 답변을 입력해 주세요." 반려로 열린 회차는 보완 항목이 없으므로 `responses`는 `[]`, 답변은 `response`(1~2,000자)에 적습니다.
- `basis`가 `null`이면 직전 버전의 AI 사용 신고와 근거자료를 그대로 이어받습니다. 바꿀 때만 전체를 다시 보냅니다:

```json
"basis": {
  "aiDisclosure": { "noAiUsed": false, "usageScope": "…", "tools": [ { "toolName": "…", "modelName": "…", "usageMethod": "…", "contribution": "…" } ] },
  "evidences": [
    { "evidenceId": 7 },
    { "type": "SUPPORT_FILE", "title": "보완 실험 결과", "fileHash": "5e11c9…(64자)" }
  ]
}
```

  이미 있는 근거는 `evidenceId`로 가리키고, 새 파일 근거는 `evidenceFiles` 파트의 파일과 `fileHash`로 짝을 맞춥니다.
- 서버가 직전 버전과 비교해(`isBasisChanged`: 근거자료의 유형 · 주소 · 파일 해시 집합과 AI 사용 신고) 그대로면 새 버전은 `REVIEW_PENDING`, 바뀌었으면 `CHALLENGE_PENDING`이 됩니다. 판정 결과는 응답의 `basisChanged`와 `RESUBMIT` 이력의 사유에 남습니다.

### 4.8 결과물 파일 내려받기 — `GET /api/versions/{versionId}/file` · (추가) IWorkAPI.getVersionFile

200 — `Content-Type: application/pdf`, `Content-Disposition: attachment; filename*=UTF-8''<파일 이름>`. 본문은 파일 바이트.

구성원만(검토자와 최종 승인자가 결과물을 여는 데 씁니다). 저장 위치는 어떤 응답에도 나오지 않습니다.

---

## 5. 검토 — B

권한: 위험 분석 · 검토 요청 · 취소 · 답변은 작성자. 검토 시작 · 평가 · 결정은 그 요청의 지정 검토자. 조회는 구성원.

### 5.1 위험 분석 — `POST /api/versions/{versionId}/risk-assessments` · IReviewAPI.assessRisk · UC03

```json
{
  "aiUsageScore": 2,
  "importanceScore": 2,
  "evidenceGapScore": 1,
  "pastFailureScore": 0,
  "rationale": "핵심 장의 초안을 AI가 작성했고, 팀 제출 문서라 중요도가 높아요."
}
```

201 — 2.3의 `risk`와 같은 모양(`assessmentSeq`가 붙음)

- 점수 범위: `aiUsageScore` 0~3, `importanceScore` 0~3, `evidenceGapScore` 0~2, `pastFailureScore` 0~2 → 벗어나면 400 "위험 분석 4개 지표를 모두 선택해 주세요." `rationale` 1~2,000자.
- "AI 미사용"으로 신고한 버전이면 서버가 `aiUsageScore`를 0으로 바꿉니다.
- 버전이 `SUBMITTED`일 때만(아니면 409). 다시 분석하면 `assessmentSeq`가 늘어납니다. `ASSESS_RISK` 이력은 서비스가 직접 남깁니다(사유 예: `5/10점 · 보통`).

### 5.2 검토 요청 — `POST /api/versions/{versionId}/review-requests` · IReviewAPI.requestReview · UC03

```json
{ "reviewerId": 2, "approverId": 4, "message": "3장 근거를 중심으로 봐 주세요.", "dueDate": "2026-12-02" }
```

201 — 2.3의 ReviewRequest(`state`는 `REQUESTED`)

- 가장 최근 위험 분석이 있어야 함(없으면 400). 버전이 `SUBMITTED`일 때만(409). 진행 중인 요청이 있으면 409.
- 검토자 ≠ 작성자, 최종 승인자 ≠ 작성자 · 검토자 → 아니면 400(`fields.reviewerId` · `fields.approverId`).
- 검토자 · 최종 승인자는 작업마다 한 명입니다(11/28 결정, 가이드라인 5.4).
  - 아직 정해지지 않은 작업이면 이 요청의 사람으로 정합니다.
  - 이미 정해진 작업이면 같은 사람이어야 합니다. 다르면 409 "이 작업의 검토자와 최종 승인자는 바꿀 수 없어요. 처음 지정한 사람에게 요청해 주세요."
  - 예외로 v1을 취소한 뒤 다시 요청할 때는 바꿀 수 있습니다. 아직 검토가 진행되지 않았기 때문입니다. 이전 사람은 그 작업의 구성원에서 빠집니다.
  - 화면은 4.3의 `reviewer` · `approver`를 미리 골라 두고, v2부터는 바꿀 수 없게 잠급니다.
- `message` 0~1,000자, `dueDate`는 오늘 이후 → 아니면 400 "검토 기한은 오늘 이후 날짜로 선택해 주세요."
- 검토자 · 최종 승인자를 지정하고, 등급에 맞는 이해 확인 과제를 배정하고, 상태를 `CHALLENGE_PENDING`으로 바꿉니다. 이 순서여야 상태 변경 통지를 받은 옵서버가 방금 지정한 검토자에게 알림(`REVIEW_REQUESTED`)을 보냅니다. `REQUEST_REVIEW` 이력도 그 통지로 남습니다.

### 5.3 버전의 검토 요청 조회 — `GET /api/versions/{versionId}/review-request` · (추가) IReviewAPI.getReviewRequest

200 — 2.3의 ReviewRequest. 그 버전의 가장 최근 요청(취소된 것 포함)입니다. 요청이 한 번도 없었으면 404.

작성자의 이해 확인 화면, 수정본 재제출 화면(`review.feedback.items`가 보완 항목), 작업 상세가 씁니다.

### 5.4 검토 요청 취소 — `POST /api/review-requests/{requestId}/cancel` · IReviewAPI.cancelRequest · 2단계

```json
{ "reason": "파일을 잘못 올렸어요." }
```

200 — ReviewRequest(`state`는 `CANCELED`). 버전은 `SUBMITTED`로 돌아갑니다.

- `reason` 1~500자 → 아니면 400 "취소 사유를 500자 이내로 입력해 주세요."
- 검토가 시작된 뒤(`IN_REVIEW`)면 409.

### 5.5 이해 확인 과제 조회 — `GET /api/review-requests/{requestId}/challenges` · IReviewAPI.getChallenges · UC03

200

```json
[
  {
    "challengeId": 71,
    "kind": "TEACH_BACK",
    "prompt": "이 결과물의 핵심 주장과 근거를, 결과물을 보지 않은 팀원에게 설명하듯 적어 주세요.",
    "rubric": null,
    "response": { "responseId": 81, "answer": "버전 ID는 승인 대상을 식별하고, SHA-256은 파일 바이트가 같은지 비교해요.", "confidence": "HIGH", "submittedAt": null },
    "evaluation": null,
    "reference": null
  }
]
```

- `kind`: `TEACH_BACK` · `FAULT_INJECTION` · `WHAT_IF`. 낮음은 1개, 보통은 2개, 높음은 3개.
- `rubric`(채점 기준)은 검토자에게만 값을 주고 작성자에게는 `null`.
- `response`는 답변이 없으면 `null`. `submittedAt`이 `null`이면 임시 저장 상태입니다.
- `evaluation`은 검토자가 평가한 뒤 `{ "score": 2, "reason": "핵심 주장과 근거를 정확히 설명했어요.", "critical": false }`. 작성자에게는 검토가 끝난 뒤에만 보여 줍니다.
- `reference`(2단계): 근거를 바꿔 재제출한 버전에서 이전 버전의 답변을 참고로 보여 줄 때 `{ "versionNo": 1, "answer": "…" }`.

### 5.6 답변 임시 저장 — `PUT /api/review-requests/{requestId}/answers` · IReviewAPI.saveAnswers · 2단계

```json
{
  "answers": [
    { "challengeId": 71, "answer": "버전 ID는 승인 대상을…", "confidence": "HIGH" },
    { "challengeId": 72, "answer": "", "confidence": null }
  ]
}
```

200 — 5.5와 같은 목록. 길이 하한은 검사하지 않고 상한(10,000자)만 봅니다. 이미 제출했으면 409.

### 5.7 답변 제출 — `POST /api/review-requests/{requestId}/answers/submit` · IReviewAPI.submitAnswers · UC03

본문은 5.6과 같습니다.

200 — ReviewRequest. 버전은 `REVIEW_PENDING`이 됩니다.

- 과제마다 답변 20자 이상 · 확신 정도(`LOW` · `MEDIUM` · `HIGH`) 필수 → 아니면 400. `fields`의 키는 `answers[0]`처럼 순서로 적습니다: "1번 답변을 20자 이상 입력해 주세요.", "1번 답변의 확신 정도를 선택해 주세요."
- 버전이 `CHALLENGE_PENDING`일 때만(409). 그 통지로 `SUBMIT_ANSWERS` 이력과 검토자 알림(`ANSWERS_SUBMITTED`)이 남습니다.

### 5.8 내게 온 검토 요청 — `GET /api/review-requests?assignee=me` · IReviewAPI.getAssignedRequests · UC04

로그인한 사용자가 지정 검토자인 요청입니다. `state=`로 걸러 낼 수 있습니다(쉼표로 여러 개, 기본은 `REQUESTED,IN_REVIEW`).

200 — 요청 시각의 역순

```json
[
  {
    "requestId": 31,
    "workId": 12,
    "title": "HAVE 설계 보고서",
    "versionId": 21,
    "versionNo": 1,
    "status": "REVIEW_PENDING",
    "state": "REQUESTED",
    "author": { "userId": 1, "name": "김하늘" },
    "level": "MEDIUM",
    "dueDate": "2026-12-02",
    "requestedAt": "2026-11-30T05:14:02Z"
  }
]
```

`status`가 `CHALLENGE_PENDING`이면 작성자의 답변을 기다리는 중이라 아직 검토를 시작할 수 없습니다.

### 5.9 검토 시작 — `POST /api/review-requests/{requestId}/review/start` · IReviewAPI.startReview · UC04

본문 없음.

200

```json
{ "halted": false, "request": { "…": "2.3의 ReviewRequest (state는 IN_REVIEW, review.state는 IN_PROGRESS)" } }
```

- 저장된 파일의 SHA-256을 다시 계산해 등록 당시 값과 비교합니다. 다르면 검토를 시작하지 않고 중지를 기록한 뒤 **200**으로 알립니다(중지 기록이 커밋돼야 하므로 오류 코드가 아닙니다).

```json
{ "halted": true, "message": "등록된 파일의 해시가 등록 당시 값과 달라요.", "request": { "…": "review.state는 HALTED" } }
```

- 버전이 `REVIEW_PENDING`이고 요청이 `REQUESTED`일 때만 → 아니면 409 "검토를 시작할 수 있는 상태가 아니에요."
- 지정 검토자가 아니거나 작성자 본인이면 403.

### 5.10 검토 임시 저장 — `PUT /api/review-requests/{requestId}/review/draft` · IReviewAPI.saveReviewDraft · 2단계

```json
{
  "evaluations": [ { "challengeId": 71, "score": 2, "reason": "핵심 주장과 근거를 정확히 설명했어요.", "critical": false } ],
  "checks": [ { "itemId": 1, "checked": true }, { "itemId": 2, "checked": false } ],
  "memo": ""
}
```

200 — ReviewRequest. 평가 · 체크리스트 · 메모만 저장합니다. 보완 항목은 수정 요청(5.12) 때 한 번에 보냅니다.

### 5.11 검토 통과 — `POST /api/review-requests/{requestId}/review/submit` · IReviewAPI.submitReview · UC04

```json
{
  "evaluations": [
    { "challengeId": 71, "score": 2, "reason": "핵심 주장과 근거를 정확히 설명했어요.", "critical": false },
    { "challengeId": 72, "score": 2, "reason": "조건이 바뀔 때의 영향을 구체적으로 적었어요.", "critical": false }
  ],
  "checks": [ { "itemId": 1, "checked": true }, { "itemId": 2, "checked": true }, { "itemId": 3, "checked": true }, { "itemId": 4, "checked": true } ],
  "memo": "근거와 답변이 결과물 내용과 맞아요."
}
```

200 — ReviewRequest(`state`는 `CLOSED`, `review.state`는 `COMPLETED`, `review.feedback.decision`은 `PASS`). 버전은 `APPROVAL_PENDING`이 됩니다.

통과 조건이 모자라면 400이고 `fields`에 사유를 모두 담습니다. `message`는 첫 사유입니다.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "통과하려면 4점 중 3점 이상이어야 해요 (위험 보통).",
  "fields": {
    "score": "통과하려면 4점 중 3점 이상이어야 해요 (위험 보통).",
    "checks": "체크리스트 4항목을 모두 확인해 주세요."
  }
}
```

| `fields` 키 | 문장 |
| --- | --- |
| `evaluations` | 모든 답변에 점수(0~2)와 근거를 입력해 주세요. |
| `score` | 통과하려면 N점 중 M점 이상이어야 해요 (위험 …). |
| `critical` | 치명 오류가 있는 답변이 있으면 통과할 수 없어요. 수정을 요청해 주세요. |
| `checks` | 체크리스트 4항목을 모두 확인해 주세요. |
| `memo` | 검토 메모를 2,000자 이내로 적어 주세요. |

- 등급별 기준: 낮음 2/2, 보통 3/4, 높음 5/6. 치명 오류가 하나라도 있으면 통과할 수 없습니다.
- 버전이 `IN_REVIEW`이고 검토가 `IN_PROGRESS`일 때만 → 아니면 409 "검토를 시작한 버전만 결정할 수 있어요."
- 그 통지로 `PASS_REVIEW` 이력, 최종 승인자와 작성자 알림(`REVIEW_PASSED`)이 남습니다.

### 5.12 수정 요청 — `POST /api/review-requests/{requestId}/review/revision-request` · IReviewAPI.requestRevision · UC04 · 2단계

5.11의 본문에 두 가지를 더합니다.

```json
{
  "evaluations": [ { "challengeId": 71, "score": 1, "reason": "근거 설명이 부족해요.", "critical": false } ],
  "checks": [ { "itemId": 1, "checked": true } ],
  "memo": "3장의 출처를 보완해 주세요.",
  "feedbackItems": [ { "targetSection": "3장 2절", "content": "출처 표기가 빠졌어요." } ],
  "dueDate": "2026-12-02"
}
```

200 — ReviewRequest(`state`는 `CLOSED`, `review.feedback.decision`은 `REVISION_REQUIRED`). 버전은 `REVISION_REQUIRED`가 되고 수정 회차(`REVISION`, `OPEN`)가 열립니다.

- 보완 항목 1개 이상, `targetSection` 1~100자, `content` 1~1,000자 → 아니면 400 "보완 요청 항목을 한 개 이상, 대상 구간과 내용을 함께 적어 주세요."
- `dueDate`는 오늘 이후 → 아니면 400 "보완 기한을 오늘 이후 날짜로 선택해 주세요."
- 평가와 체크리스트는 채운 만큼만 저장합니다(통과 조건을 보지 않음).

---

## 6. 승인 — C

권한: 조회는 구성원. 승인 · 반려는 지정 최종 승인자(작성자 · 검토자 본인이면 403). 철회는 그 승인을 한 사람.

### 6.1 승인 건 조회 — `GET /api/versions/{versionId}/approval-case` · IApprovalAPI.getApprovalCase · UC06

200 — 2.5의 ApprovalCase

- 버전이 `APPROVAL_PENDING`인데 승인 건이 아직 없으면 이때 `PENDING`으로 만들어 돌려줍니다(가이드라인 4.6의 C1).
- 검토를 통과한 적이 없는 버전이면 404.
- 반려된 건이면 `state`가 `REJECTED`이고 `rejectionReason`에 사유가 있습니다. 수정본 재제출 화면이 이 값을 보여 줍니다.

### 6.2 최종 승인 — `POST /api/approval-cases/{caseId}/approve` · IApprovalAPI.approve · UC06

헤더 `Idempotency-Key: 7b1f6c1e-…`

```json
{ "expectedRevision": 5 }
```

200 — ApprovalCase(`state`는 `APPROVED`, `approval`과 `certificateId`가 채워짐). 버전은 `APPROVED`가 됩니다.

- 승인 조건 5개를 다시 확인합니다. 하나라도 어긋나면 400 "승인 조건을 충족하지 않아요: (어긋난 조건의 label을 쉼표로)". `fields`의 키는 조건의 `key`입니다.
- `expectedRevision`이 지금 잠금 번호와 다르면 409 "다른 창에서 이 버전이 바뀌었어요. 다시 열어 주세요."
- 같은 키로 다시 오면 새 기록 없이 같은 결과를 200으로 돌려줍니다. 이미 결정된 건에 다른 키로 오면 409.
- 승인 기록 · 증명서(`PENDING`) · 상태 변경 · 이력(`APPROVE`) · 알림(`APPROVED`) · 발급 요청이 한 트랜잭션입니다. 증명서 서명은 커밋 뒤에 서명 작업자가 하므로, 화면은 7.1을 다시 조회해 발급 상태를 확인합니다.

### 6.3 반려 — `POST /api/approval-cases/{caseId}/reject` · IApprovalAPI.reject · UC06 · 2단계

헤더 `Idempotency-Key`

```json
{ "expectedRevision": 5, "reason": "결론의 수치가 근거자료와 달라요." }
```

200 — ApprovalCase(`state`는 `REJECTED`). 버전은 `REVISION_REQUIRED`가 되고 수정 회차(`OPEN`, 기한 없음)가 열립니다.

- `reason` 1~2,000자 → 아니면 400 "반려 사유를 2,000자 이내로 입력해 주세요."
- `PENDING`이 아니면 409 "반려할 수 있는 상태가 아니에요."

### 6.4 승인 철회 — `POST /api/approvals/{approvalId}/revoke` · IApprovalAPI.revoke · UC10 · 2단계

헤더 `Idempotency-Key`

```json
{ "reason": "승인 뒤에 원본 데이터의 오류가 확인됐어요." }
```

200 — 2.5의 `approval`(`effect`는 `REVOKED`, `revocation`이 채워짐)

- `reason` 1~2,000자 → 아니면 400 "철회 사유를 2,000자 이내로 입력해 주세요."
- 그 승인을 한 사람이 아니면 403 "이 버전을 승인한 최종 승인자만 철회할 수 있어요." 이미 철회했으면 409 "이미 철회한 승인이에요."(같은 키면 기존 결과를 200으로)
- 작업 상태는 `APPROVED` 그대로입니다. 상태 변경이 아니므로 서비스가 `REVOKE` 이력과 알림(`APPROVAL_REVOKED`)을 직접 남깁니다.

---

## 7. 증명서 — C

권한: 구성원만.

### 7.1 증명서 조회 — `GET /api/certificates/{certId}` · ICertificateAPI.getCertificate · UC07

200 — 2.6의 Certificate

승인 ID로 찾을 때는 `GET /api/certificates?approvalId=45`(추가). 같은 객체 하나를 돌려주고, 없으면 404.

발급 중(`PENDING`)이면 화면이 몇 초 간격으로 다시 조회합니다.

### 7.2 발급 재시도 — `POST /api/certificates/{certId}/retry-issue` · ICertificateAPI.retryIssue · 2단계

본문 없음 → 200 — Certificate(`signingState`는 `PENDING`)

`FAILED`가 아니면 409 "발급에 실패한 증명서만 다시 시도할 수 있어요." `RETRY_ISSUE` 이력.

### 7.3 공유 링크 만들기 — `POST /api/certificates/{certId}/share-links` · ICertificateAPI.createShareLink · UC07

```json
{ "expiresAt": "2026-12-08T02:45:00Z" }
```

만료 없이 만들려면 `{ "expiresAt": null }`. 화면의 "7일 · 30일 · 만료 없음"은 클라이언트가 시각으로 바꿔 보냅니다.

201

```json
{
  "linkId": 61,
  "token": "3f9c2a7d5b1e4c0f8a6d2b9e7c4f1a3d",
  "url": "http://localhost:8080/verify/index.html#3f9c2a7d5b1e4c0f8a6d2b9e7c4f1a3d",
  "state": "ACTIVE",
  "expiresAt": "2026-12-08T02:45:00Z",
  "disabledAt": null
}
```

- **`token`과 `url`은 이 응답에서 한 번만 줍니다.** 서버에는 토큰의 SHA-256(`token_hash`)만 남습니다.
- 토큰은 주소의 `#` 뒤에 둡니다. `#` 뒤는 서버로 전송되지 않아 접속 기록에 남지 않습니다. 주소에 `index.html`을 적는 이유는 스프링이 `/verify/`만으로는 그 폴더의 `index.html`을 내려 주지 않기 때문입니다.
- 발급이 끝나지 않았으면 409 "발급이 끝난 증명서만 공유할 수 있어요." `SHARE_LINK_CREATED` 이력.
- QR(P2)은 이 응답에 `qrCode`를 더해 주고 저장하지 않습니다.

### 7.4 공유 링크 중지 — `POST /api/share-links/{linkId}/disable` · ICertificateAPI.disableShareLink · 2단계

본문 없음 → 200

```json
{ "linkId": 61, "state": "DISABLED", "expiresAt": "2026-12-08T02:45:00Z", "disabledAt": "2026-12-02T01:10:00Z" }
```

이미 중지했거나 없으면 409 "이미 중지했거나 없는 링크예요." 승인 효력과 다른 링크는 그대로입니다. `SHARE_LINK_DISABLED` 이력.

---

## 8. 공개 검증 — C

### 8.1 검증 — `POST /api/public/verifications` · IVerificationAPI.verify · UC08 · 토큰 없음

로그인 없이 부릅니다. 공개 검증 페이지(`/verify/index.html`)가 주소의 `#` 뒤에서 공유 토큰을 꺼내 보냅니다.

```json
{ "token": "3f9c2a7d5b1e4c0f8a6d2b9e7c4f1a3d", "fileHash": null }
```

검증자가 PDF를 고르면 **파일은 보내지 않고** 브라우저에서 계산한 SHA-256만 `fileHash`에 넣어 다시 부릅니다.

200

```json
{
  "title": "HAVE 설계 보고서",
  "versionNo": 1,
  "fileName": "HAVE_설계_보고서_v1.pdf",
  "fileHash": "9f2c1e…(64자)",
  "serial": "HAVE-2612-9F3A1C",
  "approver": "박서연",
  "approvedAt": "2026-12-01T02:40:11Z",
  "issuedAt": "2026-12-01T02:40:15Z",
  "signature": "PASS",
  "effect": "VALID",
  "latestVersionNo": 1,
  "isLatest": true,
  "revokedAt": null,
  "revocationReason": null,
  "file": "NOT_CHECKED",
  "verifiedAt": "2026-12-02T08:00:00Z"
}
```

세 판정을 따로 계산해 따로 줍니다. 하나가 나쁘다고 다른 판정을 바꾸지 않습니다.

| 필드 | 값 | 뜻 |
| --- | --- | --- |
| `signature` | `PASS` · `FAIL` | 저장된 `immutable_payload`와 전자서명을 공개 키로 검증한 결과 |
| `effect` + `latestVersionNo` | `VALID` · `REVOKED` | 승인 효력. 후속 버전이 있는지는 `isLatest`로 따로 알림(철회와 후속 버전은 함께 성립할 수 있음) |
| `file` | `MATCH` · `DIFFERENT` · `NOT_CHECKED` | 보낸 `fileHash`와 승인된 파일의 해시 비교. `fileHash`를 보내지 않았으면 `NOT_CHECKED` |

- 토큰이 없거나, 링크가 만료됐거나, 공유가 중지됐으면 구분 없이 404 "승인 기록을 찾을 수 없어요". 내용은 싣지 않습니다.
- 답변 원문 · 검토 의견 · 파일 저장 위치 · 사용자 ID · 이메일은 넣지 않습니다. 사람은 이름만 줍니다.
- 부를 때마다 `VERIFY` 이력이 행위자 없이 한 건 남습니다.
- 서버에 닿지 못하면 공개 검증 페이지는 세 판정을 모두 "확인 불가"로 보여 줍니다(철회 · 불일치로 바꾸지 않음).

---

## 9. 이력 — C

권한: 구성원만.

### 9.1 이력 조회 — `GET /api/works/{workId}/history?versionNo=&type=` · IHistoryQuery.getHistory · UC09 · 2단계

| 조건 | 값 |
| --- | --- |
| `versionNo` | 그 버전의 이벤트만 |
| `type` | `work` · `review` · `approval` · `verify`(아래 표) |

200 — 시간 역순

```json
[
  {
    "eventId": 108,
    "versionNo": 1,
    "action": "APPROVE",
    "actor": { "userId": 4, "name": "박서연" },
    "reason": null,
    "occurredAt": "2026-12-01T02:40:11Z",
    "eventHash": "a1b2c3…(64자)"
  }
]
```

`actor`는 서명 작업자가 남긴 발급 이력과 공개 검증(`VERIFY`)에서 `null`입니다.

| `type` | 행동 코드 |
| --- | --- |
| `work` | CREATE_WORK, ADD_CONTRIBUTION, UPLOAD_VERSION, ASSESS_RISK, REQUEST_REVIEW, CANCEL_REQUEST, SUBMIT_ANSWERS, RESUBMIT |
| `review` | START_REVIEW, HALT_REVIEW, PASS_REVIEW, REQUEST_REVISION |
| `approval` | APPROVE, REJECT, ISSUE_CERTIFICATE, ISSUE_FAILED, RETRY_ISSUE, SHARE_LINK_CREATED, SHARE_LINK_DISABLED, REVOKE |
| `verify` | VERIFY |

### 9.2 최신 상태 — `GET /api/works/{workId}/status` · IHistoryQuery.getLatestStatus · 2단계

200 — 이력의 마지막 이벤트로 알려 줍니다(02의 테이블을 읽지 않음).

```json
{ "workId": 12, "eventCount": 14, "lastEvent": { "…": "9.1의 한 건" } }
```

### 9.3 해시 체인 확인 — `GET /api/works/{workId}/history/chain` · IHistoryQuery.isChainValid · 2단계

200

```json
{ "valid": true, "eventCount": 14, "brokenEventId": null }
```

저장된 행으로 `event_hash`를 처음부터 다시 계산합니다. 어긋나면 `valid`가 `false`이고 처음 어긋난 이벤트의 ID를 줍니다.

---

## 10. 알림 — D

### 10.1 알림 목록 — `GET /api/notifications` · INotificationQuery.getNotifications · UC09

로그인한 사용자의 알림입니다. `unread=true`면 읽지 않은 것만.

200 — 시간 역순

```json
[
  { "notificationId": 91, "type": "REVIEW_REQUESTED", "versionId": 21, "createdAt": "2026-11-30T05:14:02Z", "readAt": null }
]
```

- 07은 02의 테이블을 읽지 않으므로 작업 제목과 버전 번호를 주지 않습니다. 클라이언트가 작업 목록(4.2의 `versions`)에서 `versionId`로 찾아 문구를 만듭니다. v1을 다시 요청하면서 검토자가 바뀌어 구성원에서 빠진 사람에게는 작업 목록에 그 작업이 없으므로, 1.1.0처럼 "삭제된 작업"으로 보여 줍니다. 문구는 `model.js`의 `NOTIFICATION`을 그대로 쓰고, 받는 사람에 따라 문구가 갈리는 유형(`REVIEW_PASSED` · `REJECTED`)은 4.2의 `myRoles`로 고릅니다.
- 읽지 않은 수(팝업 · 배지)는 `readAt`이 `null`인 것을 세면 됩니다.
- `type`: REVIEW_REQUESTED, REQUEST_CANCELED, ANSWERS_SUBMITTED, REVISION_REQUESTED, RESUBMITTED, REVIEW_PASSED, APPROVED, REJECTED, CERTIFICATE_ISSUED, APPROVAL_REVOKED.

### 10.2 읽음 처리 — `POST /api/notifications/{notificationId}/read` · INotificationQuery.setRead

본문 없음 → 200

```json
{ "notificationId": 91, "type": "REVIEW_REQUESTED", "versionId": 21, "createdAt": "2026-11-30T05:14:02Z", "readAt": "2026-11-30T06:00:00Z" }
```

남의 알림이면 404. 이미 읽은 알림이면 그대로 200. "모두 읽음"은 클라이언트가 읽지 않은 알림마다 부릅니다.

---

## 11. 화면별 호출 조합

화면은 서브시스템마다 따로 부릅니다. 02가 03~05의 데이터를 모아 주지 않습니다(가이드라인 6.4).

| 화면 | 부르는 것 | 담당 |
| --- | --- | --- |
| 로그인 | 3.1 → 3.3 | D |
| 작업 목록 | 4.2 | A |
| 작업 상세(개요) | 4.3 + 최신 버전의 5.3 | A |
| 등록 마법사(제출) | 4.1 → 4.4 → 4.5(기여마다) → 4.6(근거마다) → 5.1 → 5.2. 중간에 실패하면 어디까지 됐는지 보여 주고 그 단계부터 다시 | A(화면) · B(5.1 · 5.2) |
| 등록 마법사(검토자 · 승인자 선택) | 3.4. 새 버전이면 4.3의 `reviewer` · `approver`를 고른 채로 잠금 | A(화면) · D(주소) · B |
| 검토 다시 요청(취소 뒤) | 4.3 → 5.1 → 5.2. v1이면 검토자 · 승인자를 다시 고를 수 있고 v2부터는 잠금 | A(화면, `screens/register.js`) · B |
| 이해 확인 | 5.3 → 5.5, 저장 5.6, 제출 5.7 | B |
| 검토할 작업 | 5.8 | B |
| 검토 | 5.3 + 5.5 + 4.3(자료) + 4.8(파일), 시작 5.9, 저장 5.10, 결정 5.11 · 5.12 | B |
| 수정본 재제출 | 4.3(`revisionRound`) + 5.3(보완 항목) 또는 6.1(반려 사유), 제출 4.7 | A |
| 승인할 작업 | 4.2(`role=APPROVER&status=APPROVAL_PENDING`) | C |
| 최종 승인 | 6.1 + 5.3 + 5.5 + 4.3 + 4.8, 결정 6.2 · 6.3 | C |
| 증명서 탭 | 6.1(`certificateId`) → 7.1, 링크 7.3 · 7.4, 재시도 7.2, 철회 6.4 | C |
| 이력 탭 | 9.1 + 9.3 | C |
| 알림 · 팝업 · 배지 | 10.1 + 4.2, 읽음 10.2 | D |
| 공개 검증 페이지 | 8.1 | D(화면) · C(서버) |
