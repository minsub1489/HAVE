package have.audit;

import have.common.code.AuditAction;

/**
 * 07 Audit이 02~06에 제공하는 이력 기록 인터페이스 (컴포넌트 다이어그램 v2). 구현: AuditLogService. 담당 D.
 * 상태가 바뀌는 일은 AuditLogObserver가 대신 기록하므로 서비스가 이것을 직접 부르지 않는다.
 * 직접 부르는 것은 상태가 바뀌지 않는 일뿐이다(가이드라인 5.4의 표):
 * CREATE_WORK · ADD_CONTRIBUTION(A), ASSESS_RISK · HALT_REVIEW(B), ISSUE_* · RETRY_ISSUE · SHARE_LINK_* · REVOKE · VERIFY(C).
 */
public interface IAuditLog {

    /**
     * 감사 이벤트를 해시 체인에 이어 붙인다. 호출한 쪽의 트랜잭션 안에서 저장한다.
     *
     * @param actorId 행위자. 공개 검증(VERIFY)은 null
     * @param payload 버전 번호와 사유. 둘 다 없으면 AuditPayload.none()
     */
    void record(long workId, Long actorId, AuditAction action, AuditPayload payload);
}
