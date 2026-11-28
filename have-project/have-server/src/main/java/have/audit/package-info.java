/**
 * 07 이력 관리 (Audit). 기록과 알림은 D, 조회는 C. UC09.
 * 만들 것(클래스 다이어그램 v3):
 *  D — AuditLogService(IAuditLog) · AuditLogObserver · AuditEvent, NotificationGateway(INotification · INotificationQuery) · NotificationObserver · Notification
 *  C — HistoryService(IHistoryQuery: getHistory · getLatestStatus · isChainValid)
 * 설계서에 없어 더할 것: 진입점 HistoryController(C) · NotificationController(D).
 * 이력은 추가만 한다. event_hash = SHA-256(prev_hash + CanonicalJson(이벤트 내용)).
 * NotificationObserver는 받는 사람을 StatusChange의 작성자 · 검토자 · 최종 승인자에서 읽는다. 03 · 01의 테이블을 직접 읽지 않는다.
 */
package have.audit;
