package have.common.code;

/**
 * 서명 요청의 처리 상태 (OUTBOX_EVENT.delivery_state). 재시도 횟수는 retry_count.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum DeliveryState {
    PENDING,
    DELIVERED,
    FAILED
}
