package have.common.code;

/**
 * 감사 이벤트의 행동 코드 (AUDIT_EVENT.action). VERIFY는 행위자 없이 기록한다. 누가 어느 코드를 남기는지는 가이드라인 5.4.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum AuditAction {
    CREATE_WORK,
    ADD_CONTRIBUTION,
    UPLOAD_VERSION,
    ASSESS_RISK,
    REQUEST_REVIEW,
    CANCEL_REQUEST,
    SUBMIT_ANSWERS,
    START_REVIEW,
    HALT_REVIEW,
    PASS_REVIEW,
    REQUEST_REVISION,
    RESUBMIT,
    APPROVE,
    REJECT,
    ISSUE_CERTIFICATE,
    ISSUE_FAILED,
    RETRY_ISSUE,
    SHARE_LINK_CREATED,
    SHARE_LINK_DISABLED,
    REVOKE,
    VERIFY
}
