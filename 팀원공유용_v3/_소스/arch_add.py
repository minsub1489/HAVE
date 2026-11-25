"""구조유형 보강 (가이드라인 10·11·12번) — 품질 속성, MVC 부분 채택, 추적표. 문서와 pptx가 같은 표를 쓴다."""
QUALITY = {  # 문제 번호 → 품질 속성 (비기능 요구)
    'P1': '사용성 — 작업 흐름을 끊지 않음',
    'P2': '사용성 · 접근성 — 설치 · 로그인 없음',
    'P3': '보안 · 무결성 — 기록의 단일 출처',
    'P4': '무결성 · 감사 가능성 — 불변 기록',
    'P5': '개발 분담성 · 통합 용이성',
    'P6': '신뢰성 — 후속 처리 누락 없음',
    'P7': '변경 용이성 (유지보수성)',
}
# 유스케이스 → 기능(오퍼레이션) → 인터페이스 · 컴포넌트 → 구조유형 요소, 그리고 대응하는 문제 번호
TRACE = [
    ('UC01 AI 작업 및 사용 내역 등록', 'createWork, addContribution', 'IWorkAPI → 02 Work (WorkController · WorkService · ContributionService) → 08 WorkRepository · 07 IAuditLog',
     '클라이언트–서버 · 서버 계층', 'P1 P5'),
    ('UC02 결과물 및 근거자료 등록', 'uploadVersion, addEvidence', 'IWorkAPI → 02 Work (VersionService · EvidenceService) → 08 FileStore · WorkRepository',
     '서버 계층 · 상태 통지(SUBMITTED)', 'P1 P4 P7'),
    ('UC03 위험 분석 및 검토 요청', 'assessRisk, requestReview, cancelRequest, getChallenges, submitAnswers', 'IReviewAPI → 03 Review (RiskService · GatePolicy · ReviewRequestService) → 02 IWorkVersion · 01 IAuthorization · 08',
     '서버 계층 · 상태 통지 · 전략 패턴', 'P5 P6'),
    ('UC04 결과물 검토 및 피드백', 'startReview, saveReviewDraft, submitReview, requestRevision', 'IReviewAPI → 03 Review (ReviewService) → 02 IWorkVersion(getVersionHash · setWorkStatus) · 08',
     '서버 계층 · 상태 통지', 'P4 P6'),
    ('UC05 결과물 수정 및 재제출', 'resubmit (isBasisChanged)', 'IWorkAPI → 02 Work (RevisionService · VersionService) → 03 ReReviewObserver(WorkStatusObserver) · 08',
     '서버 계층 · 상태 통지(재검토 연결, 근거가 바뀌면 이해 확인부터)', 'P4 P6'),
    ('UC06 최종 승인 및 반려', 'getApprovalCase, approve, reject', 'IApprovalAPI → 04 Approval (ApprovalService) → 03 IReviewResult · 02 IWorkVersion · 08 → 05 CertificateIssueObserver(Outbox)',
     '서버 계층 · 상태 통지 · Transactional Outbox', 'P3 P4 P6'),
    ('UC07 승인 증명서 조회 및 공유', 'getCertificate, retryIssue, createShareLink, createQRCode, disableShareLink', 'ICertificateAPI → 05 Certificate (CertificateService) → 04 IApprovalStatus · 08 · 07 IAuditLog',
     '클라이언트–서버 · 서버 계층', 'P3 P6'),
    ('UC08 승인 증명서 진위 검증', 'verify, verifyByQR', '공개 검증 페이지 → IVerificationAPI → 06 Verification (VerificationService) → 05 ICertificateData · 04 IApprovalStatus · 07 IAuditLog',
     '클라이언트–서버 (얇은 클라이언트) · 서버 계층', 'P2 P3'),
    ('UC09 승인 이력 및 상태 조회', 'getWorks, getHistory, isChainValid, getLatestStatus, getNotifications, setRead', 'IWorkAPI · IHistoryQuery · INotificationQuery → 02 Work · 07 Audit (HistoryService · NotificationGateway) → 08',
     '서버 계층 (기록 · 조회 분리)', 'P3 P6'),
    ('UC10 승인 철회', 'revoke', 'IApprovalAPI → 04 Approval (ApprovalService) → 07 IAuditLog · INotification · 08',
     '서버 계층 (상태 변경이 아니라 직접 기록 · 알림)', 'P3 P4'),
]
MVC = [
    ('Model', 'model.js · review-model.js · storage.js', '작업 · 버전 · 검토 · 승인 상태와 규칙(상태 전이, 입력 검사, 승인 조건), 브라우저 저장'),
    ('View', 'app.js · registration.js · review-ui.js의 show… 함수', '상태를 받아 화면 HTML을 만든다. 규칙을 직접 바꾸지 않는다'),
    ('Controller', 'app.js의 click · input · change · submit 처리', '사용자 행동을 Model 오퍼레이션으로 바꾸고, 저장한 뒤 View를 다시 그린다'),
]
