/**
 * 04 승인 관리 (Approval). 담당 C. UC06 · UC10.
 * 만들 것(클래스 다이어그램 v3): ApprovalService, ApprovalCase · Approval · Revocation · OutboxEvent.
 * 설계서에 없어 더할 것: 진입점 ApprovalController.
 * 승인 · 증명서(PENDING) · 상태 변경 · 이력 · 발급 요청은 한 트랜잭션이다(UC06 순서 다이어그램의 critical 영역).
 * "지정 최종 승인자" 조건은 IAuthorization.getMembers(workId, APPROVER)의 사람으로 확인한다(작업마다 한 명, 가이드라인 5.4).
 */
package have.approval;
