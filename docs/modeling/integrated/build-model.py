"""Initial authoring helper. model.json is the editable rendering source afterwards."""
import json
from pathlib import Path
root=Path(__file__).parent
classes=[]; relations=[]
def c(id,label,group,attrs,ops,ucs,kind='entity'):
    classes.append(dict(id=id,label=label,group=group,attrs=attrs.split('|') if attrs else [],ops=ops.split('|') if ops else [],ucs=ucs.split(','),kind=kind))
def r(a,b,am,bm,label,kind='association'):
    relations.append(dict(a=a,b=b,am=am,bm=bm,label=label,kind=kind))
c('User','사용자','identity','userId: ID|name: String','', '01,03,04,05,06,07,08,09,10')
c('WorkMember','작업별 참여 권한','identity','roles: Set<MemberRole>','can(action): Boolean','03,04,06,07,09,10')
c('Work','작업','artifact','workId: ID / title: String|/currentVersion: WorkVersion?','registerVersion(): WorkVersion','01,02,05,09')
c('WorkVersion','결과물 버전','artifact','versionId: ID / versionNo: Integer|fileHash: SHA256 / fileUri: URI|createdAt: Instant / revision: Integer','freeze() / hasSuccessor(): Boolean','01,02,03,04,05,06,07,08,09,10')
c('AiDisclosure','AI 사용 신고 사본','artifact','usageScope: String / noAiUsed: Boolean','canonicalHash(): SHA256','01,02,04,06','value object')
c('AiToolUsage','AI 도구 사용 내역','artifact','toolName / modelName: String|usageMethod / contribution: String','','01,04','value object')
c('Contribution','버전별 기여 사본','artifact','recordId / stage / actorType|note: String / createdAt: Instant','','01,02,04,06')
c('EvidenceItem','근거자료','artifact','evidenceId: ID / type: EvidenceType|title / uri / fileHash?','','02,04,05')
c('RiskAssessment','위험도 평가 사본','review','assessmentId: ID / scores[4]|total / level / policyVersion','','03','value object')
c('ReviewRequest','검토 요청','review','requestId: ID / state: RequestState|requestedAt: Instant','request() / cancel()','03')
c('Challenge','이해 확인 과제','review','challengeId: ID / kind: ChallengeType|prompt / rubric / policyVersion','','03,04')
c('ChallengeResponse','과제 답변','review','responseId: ID / answer: String|submittedAt: Instant?','submit(answer)','04')
c('Evaluation','과제 평가','review','score: Integer / reason: String|critical: Boolean','','04,06')
c('Review','검토 회차','review','reviewId: ID / state: ReviewState|checks[4] / memo / reviewDigest','startReview() / recordFeedback()|requestChanges() / completeReview()|passes(policy): Boolean','03,04,05,06')
c('Feedback','검토 의견·판정','review','evaluationSummary / comment: String|decision: ReviewDecision','','04,05')
c('Revision','수정 초안 회차','review','revisionId: ID / state: RevisionState|draftFiles / changeNote / response','startRevision() / updateDraft()|beginValidation() / isValid(): Boolean|resubmit() / markSubmitted()|validationFailed() / submissionFailed()','05')
c('ApprovalCase','최종 결정 대상','approval','caseId: ID / state: DecisionState|rejectionReason? / decidedAt?','approve(actor): Approval|reject(actor, reason)','06')
c('Approval','승인 기록','approval','approvalId: ID / approverId: ID|approvedAt: Instant / reviewDigest|/revokedAt: Instant?','revoke(actor, reason): Revocation','06,07,08,09,10')
c('Certificate','승인 증명서','approval','certificateId: ID / payloadHash: SHA256|fileHash: SHA256 / immutablePayload|signingState: SigningState|signature? / keyId? / issuedAt?','publicSummary(): PublicSummary','06,07,08,10')
c('Revocation','철회 기록','approval','revocationId: ID / actorId: ID|reason: String / revokedAt: Instant','','10')
c('OutboxEvent','서명 요청','approval','eventId: ID / payloadHash: SHA256|deliveryState / retryCount','','06')
c('ShareLink','공유 링크','public','linkId: ID / tokenHash: String|expiresAt? / disabledAt?','create() / invalidate()','07')
c('QRCode','QR 표현','public','url: URI / image: Binary','generate() / download()','07','value object')
c('VerificationResult','검증 결과','public','resultId: ID / checkedAt: Instant|signature: PASS / FAIL / UNKNOWN|effect: VALID / REVOKED / UNKNOWN|file: MATCH / DIFFERENT / NOT_CHECKED','','08')
c('AuditEvent','업무·승인 감사 이력','history','eventId: ID / actorId: ID / action|versionId? / occurredAt / reason?|prevHash / eventHash','', '01,02,03,04,05,06,09,10')
r('User','WorkMember','1','0..*','사용자별 참여')
r('Work','WorkMember','1','1..*','멤버십 {userId, workId 유일}')
r('User','Work','1','0..*','작성자 / owner')
r('Work','WorkVersion','1','0..*','버전 {제출 시 1개 이상}')
r('WorkVersion','WorkVersion','0..1','0..1','직전 버전 / 후속 버전 {비순환}')
r('WorkVersion','AiDisclosure','1','1','제출 시 고정 사본','composition')
r('AiDisclosure','AiToolUsage','1','0..*','도구 목록 {noAiUsed와 일관}','composition')
r('WorkVersion','Contribution','1','0..*','기여 사본 {버전 내 recordId 유일}','composition')
r('WorkVersion','EvidenceItem','0..*','0..*','불변 자료 참조')
r('WorkVersion','RiskAssessment','1','0..*','평가 사본 보존')
r('WorkVersion','ReviewRequest','1','0..*','요청 {진행 중 최대 1개}')
r('User','ReviewRequest','1','0..*','지정 검토자 {요청자와 다름}')
r('ReviewRequest','RiskAssessment','0..*','1','요청에 사용한 위험 근거')
r('ReviewRequest','Challenge','1','1..*','정책에 따른 과제','composition')
r('ReviewRequest','Review','1','0..1','취소 전 검토 개시')
r('WorkVersion','Review','1','0..*','검토 회차')
r('Challenge','ChallengeResponse','1','0..1','현재 회차 답변','composition')
r('ChallengeResponse','Evaluation','1','0..1','현재 평가','composition')
r('Review','Evaluation','1','0..*','해당 회차 평가')
r('Review','Feedback','1','0..1','판정 확정 후 불변','composition')
r('Revision','Review','0..1','0..1','보완 근거 {아래 XOR 조건}')
r('Revision','WorkVersion','0..*','1','수정 전 버전')
r('Revision','WorkVersion','0..1','0..1','재제출 버전 {SUBMITTED이면 1}')
r('WorkVersion','ApprovalCase','1','0..1','최종 결정 {검토 완료 후}')
r('ApprovalCase','Review','0..1','1','고정된 승인 근거 회차')
r('Revision','ApprovalCase','0..1','0..1','최종 반려 근거 {Review와 XOR}')
r('ApprovalCase','Approval','1','0..1','승인 시에만 생성')
r('Approval','Certificate','1','1','발급 레코드 {서명 전에도 존재}')
r('Approval','Revocation','1','0..1','단방향 철회 {기록 보존}','composition')
r('Certificate','OutboxEvent','1','1','동일 서명 요청 재전달')
r('Certificate','ShareLink','1','0..*','공유 {링크 만료 ≠ 승인 철회}')
r('ShareLink','QRCode','1','0..1','동일 링크의 QR 표현','composition')
r('Certificate','VerificationResult','0..1','0..*','형식 오류 시 대상 미식별 허용')
r('Work','AuditEvent','1','0..*','변경 이력 {append-only}')
r('WorkVersion','AuditEvent','0..1','0..*','버전 대상 {동일 Work}')
services=[
 ('WorkService','작업 등록','createWork()','01',['Work']),
 ('ContributionService','기여 등록','addContribution()','01',['Contribution','WorkVersion']),
 ('VersionService','버전 등록','createVersion()','02',['WorkVersion','AiDisclosure']),
 ('EvidenceService','근거 등록','addWebSource() / addSupportFile()','02',['EvidenceItem']),
 ('RiskService','위험 평가','assess()','03',['RiskAssessment']),
 ('GatePolicy','과제·평가 정책','recommend() / passes()','03,04,06',['Challenge','Evaluation']),
 ('ReviewRequestService','검토 요청','request() / cancel()','03',['ReviewRequest']),
 ('ReviewService','검토·피드백','openReview() / submitFeedback()','04',['Review','Feedback']),
 ('RevisionService','수정·재제출','openRevision() / updateDraft() / resubmit()','05',['Revision']),
 ('ApprovalService','승인·반려·철회','decide() / revoke()','06,10',['ApprovalCase','Approval','Revocation']),
 ('CertificateService','증명서 조회·공유','getDetail() / generateShareLink() / getQRCode()','07',['Certificate','ShareLink','QRCode']),
 ('VerificationService','진위·효력·파일 비교','verify() / verifyByQR()','08',['Certificate','VerificationResult']),
 ('HistoryService','이력·상태 조회','getHistory() / getVersionState()','09',['AuditEvent','WorkVersion','Approval']),
 ('AuthorizationPolicy','작업 권한','authorize()','01,02,03,04,05,06,07,09,10',['WorkMember']),
 ('AuditLogService','감사 기록','append()','01,02,03,04,05,06,10',['AuditEvent'])]
for id,label,ops,ucs,targets in services:
 c(id,label,'application','',ops.replace(' / ','|'),ucs,'control')
 for target in targets:r(id,target,'','','사용','dependency')
for id,label,ops,ucs in [
 ('ReviewRepository','검토 저장 계약','loadContext()|save(review)','03,04'),
 ('RevisionRepository','재제출 저장 계약','loadOrCreate()|saveDraft()|commitResubmission()','05'),
 ('ApprovalRepository','승인 원자 저장 계약','loadForUpdate()|commit(changes, revision, key)','06,10'),
 ('FileStore','파일 저장 계약','put()|storeRevision()|discard()','02,05'),
 ('NotificationGateway','알림 계약','notify(userId, event)','03,04,05'),
 ('CertificateRepository','증명·효력 조회 계약','findById()|findCurrentEffect()','07,08'),
 ('HistoryRepository','이력 조회 계약','findByWork(workId, filter)','09')]:c(id,label,'ports','',ops,ucs,'interface')
for a,b in [('ReviewService','ReviewRepository'),('ReviewService','NotificationGateway'),('RevisionService','RevisionRepository'),('RevisionService','FileStore'),('RevisionService','NotificationGateway'),('ApprovalService','ApprovalRepository'),('ApprovalService','AuthorizationPolicy'),('VersionService','FileStore'),('EvidenceService','FileStore'),('CertificateService','CertificateRepository'),('VerificationService','CertificateRepository'),('HistoryService','HistoryRepository')]:r(a,b,'','','사용','dependency')
# Boundary details stay in the full design view. No new user goals are introduced.
for id,label,ops,ucs,target in [
 ('WorkController','작업 API','createWork()','01','WorkService'),('ContributionController','기여 API','addContribution()','01','ContributionService'),
 ('VersionController','버전 API','uploadVersion()','02','VersionService'),('EvidenceController','근거 API','addWebSource()|addSupportFile()','02','EvidenceService'),
 ('RiskController','위험 API','assess()','03','RiskService'),('ReviewRequestController','검토 요청 API','request()|cancel()','03','ReviewRequestService'),
 ('ReviewPage','검토 화면','openReview()|submitFeedback()','04','ReviewService'),('RevisionPage','수정 화면','openRevision()|updateDraft()|resubmit()','05','RevisionService')]:
 c(id,label,'boundary','',ops,ucs,'boundary');r(id,target,'','','호출','dependency')
model={'date':'2026-11-03','scope':'UC01~UC10 전체 서비스 분석·설계 / 프로토타입 구현 목록 아님','classes':classes,'relations':relations,'sources':['HAVE_v2_UC01_02_03.zip','HAVE_UC01_02_03.zip','UC04_chatGPT.pdf p3','UC05_chatGPT.pdf p3','UC07_UML_.png','HAVE_UC08_UML_.png','UC09_UML_.png','../uc06-uc10/model.json']}
(root/'model.json').write_text(json.dumps(model,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(classes),'types,',len(relations),'relations')
