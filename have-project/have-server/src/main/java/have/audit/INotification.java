package have.audit;

import have.common.code.NotificationType;

/**
 * 07 Audit이 제공하는 알림 요청 인터페이스 (컴포넌트 다이어그램 v2). 구현: NotificationGateway. 담당 D.
 * 상태 변경에 따른 알림은 NotificationObserver가 보낸다. 직접 부르는 것은 상태가 바뀌지 않는 일뿐이다:
 * 승인 철회(04, APPROVAL_REVOKED)와 증명서 발급 완료(05, CERTIFICATE_ISSUED).
 */
public interface INotification {

    /**
     * 알림함에 한 건을 넣는다(NOTIFICATION 행 저장). 호출한 쪽의 트랜잭션 안에서 저장하고, 바깥으로 보내는 일은 커밋 뒤에 한다.
     *
     * @param targetId 대상 버전 ID (NOTIFICATION.version_id)
     */
    void notify(long userId, NotificationType type, long targetId);
}
