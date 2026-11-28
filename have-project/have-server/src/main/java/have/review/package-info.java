/**
 * 03 검토 관리 (Review). 담당 B. UC03 · UC04.
 * 만들 것(클래스 다이어그램 v3):
 *  진입점 RiskController · ReviewRequestController
 *  서비스·정책 RiskService · GatePolicy · ReviewRequestService · ReviewService
 *  모델 RiskAssessment · ReviewRequest · Challenge · ChallengeResponse · Evaluation · Review · ChecklistItem · ReviewCheck · Feedback · FeedbackItem
 *  전략(디자인 패턴 문서 8장) GateStrategy · LowRiskGate · MediumRiskGate · HighRiskGate
 *  옵서버 ReReviewObserver
 * 02는 IWorkVersion으로만 부르고, 04에는 IReviewResult만 내놓는다.
 * requestReview 순서: 검토자 · 최종 승인자 지정(IAuthorization.addMember, v1 재요청에서 바꿀 때만 setMember) → 과제 배정 → setWorkStatus.
 * 지정이 먼저여야 옵서버가 새 검토자에게 알림을 보낸다(가이드라인 5.4).
 */
package have.review;
