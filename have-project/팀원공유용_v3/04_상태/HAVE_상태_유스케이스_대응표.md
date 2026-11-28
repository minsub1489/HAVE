# HAVE 유스케이스 ↔ 상태 다이어그램 대응표

2026-11-23 · 상태 다이어그램은 상태를 가진 객체마다 그렸다(①~⑤). 유스케이스마다 어느 그림의 어느 전이를 일으키는지를 이 표로 잇는다. UC08 · UC09는 업무 객체의 상태를 바꾸지 않는 조회 유스케이스라(UC09는 알림 읽음 시각만 기록) 대응하는 그림이 없었고, 11-23에 ⑥ · ⑦을 새로 그렸다. 유스케이스를 새로 만든 것은 아니다. 11-23 팀원 피드백으로 UC05(근거 변경 시 CHALLENGE_PENDING)와 UC10(후속 버전 여부를 효력과 분리) 행을 고쳤다. 11-23 최종 점검으로 UC07(공유 중지 전이 disableShareLink), UC08(중지된 링크는 대상 미식별), UC09(해시 체인 확인 · 알림 목록) 행을 고쳤다. UC01 · UC02의 11-04 원본 그림은 객체별로 합치기 전 유스케이스 단위 그림이라 번호 없이 "참고"로 둔다.

| 유스케이스 | 상태 다이어그램 | 대상 객체 | 이 유스케이스가 일으키는 전이 |
| --- | --- | --- | --- |
| UC01 AI 작업 및 사용 내역 등록 | ① 작업 버전, 참고: `HAVE_상태_UC01_등록.png` | Work · WorkVersion | 작업 생성 → DRAFT |
| UC02 결과물 및 근거자료 등록 | ① 작업 버전, 참고: `HAVE_상태_UC02_결과물등록.png` | WorkVersion | DRAFT → SUBMITTED |
| UC03 위험 분석 및 검토 요청 | ① 작업 버전, ② 검토 요청과 검토 | WorkVersion, ReviewRequest | SUBMITTED → CHALLENGE_PENDING → REVIEW_PENDING. 요청 취소는 SUBMITTED로. ReviewRequest는 REQUESTED 생성, REQUESTED → CANCELED |
| UC04 결과물 검토 및 피드백 | ① 작업 버전, ② 검토 요청과 검토 | WorkVersion, ReviewRequest, Review | REVIEW_PENDING → IN_REVIEW → APPROVAL_PENDING 또는 REVISION_REQUIRED. Review는 IN_PROGRESS → COMPLETED, 해시 불일치면 HALTED. ReviewRequest는 IN_REVIEW → CLOSED |
| UC05 결과물 수정 및 재제출 | ① 작업 버전, ③ 수정 | WorkVersion, Revision | REVISION_REQUIRED인 버전은 보존하고 새 버전 생성. 근거자료·AI 사용 신고가 그대로면 새 버전이 REVIEW_PENDING에서, 바뀌었으면 CHALLENGE_PENDING에서 시작해 답변 제출(UC03 흐름) 뒤 REVIEW_PENDING. Revision은 OPEN → IN_PROGRESS → SUBMITTED, 기한이 지나면 EXPIRED |
| UC06 최종 승인 및 반려 | ① 작업 버전, ④ 승인, ⑤ 증명서 | WorkVersion, ApprovalCase, Certificate | APPROVAL_PENDING → APPROVED 또는 REVISION_REQUIRED. ApprovalCase는 PENDING → APPROVED 또는 REJECTED. Certificate는 PENDING 생성 |
| UC07 승인 증명서 조회 및 공유 | ⑤ 증명서 | Certificate, ShareLink | Certificate는 PENDING → READY 또는 FAILED, 재시도로 FAILED → PENDING. ShareLink는 ACTIVE 생성, ACTIVE → EXPIRED(만료) 또는 DISABLED(공유 중지, disableShareLink) |
| UC08 승인 증명서 진위 검증 | **⑥ 진위 검증 (11-23 추가)** | 검증 조회(VerifyPage), VerificationResult | READY → VERIFYING → SHOWN · NOT_FOUND(링크 만료·공유 중지 포함) · UNKNOWN. 저장된 객체의 상태는 바꾸지 않는다 |
| UC09 승인 이력 및 상태 조회 | **⑦ 이력 조회 (11-23 추가)** | 작업 목록 · 이력 탭 · 알림 탭 화면 | LOADING → SHOWN · EMPTY · FORBIDDEN, 이력은 해시 체인 확인과 함께 표시. 업무 객체의 상태는 바꾸지 않고, 알림을 열면 읽음 시각만 기록한다 |
| UC10 승인 철회 | ④ 승인 | Approval(승인 효력) | VALID → REVOKED. 작업 버전 상태(APPROVED)는 그대로. 후속 버전 등록은 효력을 바꾸지 않고 최신 버전 여부로 따로 표시(철회와 동시에 성립) |

## 그림 파일

| 번호 | 파일 | 객체 |
| --- | --- | --- |
| ① | `HAVE_상태_01_작업버전.png` | WorkVersion.status |
| ② | `HAVE_상태_02_검토요청_검토.png` | ReviewRequest.state, Review.state |
| ③ | `HAVE_상태_03_수정.png` | Revision.state |
| ④ | `HAVE_상태_04_승인.png` | ApprovalCase.state, Approval 승인 효력 |
| ⑤ | `HAVE_상태_05_증명서.png` | Certificate.signingState, ShareLink |
| ⑥ | `HAVE_상태_06_진위검증.png` | 검증 조회, VerificationResult (UC08) |
| ⑦ | `HAVE_상태_07_이력조회.png` | 작업 목록 · 이력 탭 · 알림 탭 화면 (UC09) |
| 참고 | `HAVE_상태_UC01_등록.png`, `HAVE_상태_UC02_결과물등록.png` | UC01 · UC02 등록 과정 (유스케이스 단위). 11-04 원본(`UC01_UC02_원본(1104)`)을 11-23 v3에 다시 그림: 전이 이름을 오퍼레이션으로, 원본의 저장 전 "작성 중 · 서버 검증"은 선택 노드로, 기여 기록은 SUBMITTED 안으로(상태 ①과 같게) |
