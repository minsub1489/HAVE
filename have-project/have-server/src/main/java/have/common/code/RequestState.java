package have.common.code;

/**
 * 검토 요청의 상태 (REVIEW_REQUEST.state). 검토 결과는 FEEDBACK.decision에 있다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum RequestState {
    REQUESTED,
    IN_REVIEW,
    CLOSED,
    CANCELED
}
