package have.common.code;

/**
 * 알림의 유형 (NOTIFICATION.type). 화면 문구는 클라이언트가 유형으로 만든다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum NotificationType {
    REVIEW_REQUESTED,
    REQUEST_CANCELED,
    ANSWERS_SUBMITTED,
    REVISION_REQUESTED,
    RESUBMITTED,
    REVIEW_PASSED,
    APPROVED,
    REJECTED,
    CERTIFICATE_ISSUED,
    APPROVAL_REVOKED
}
