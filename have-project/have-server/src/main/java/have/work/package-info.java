/**
 * 02 작업·결과물 관리 (Work). 담당 A. UC01 · UC02 · UC05, UC09의 작업 목록.
 * 만들 것(클래스 다이어그램 v3):
 *  진입점 WorkController · ContributionController · VersionController · EvidenceController
 *  서비스 WorkService · ContributionService · VersionService · EvidenceService · RevisionService
 *  모델 Work · WorkVersion · AiDisclosure · AiToolUsage · Contribution · EvidenceItem · Revision · FeedbackResponse
 *  상태 통지(have.work.status) Subject · WorkStatusSubject · WorkStatusObserver · StatusChange
 * 다른 서브시스템에는 IWorkVersion만 내놓는다. 03~05의 데이터를 대신 모아 주지 않는다(의존 방향).
 */
package have.work;
