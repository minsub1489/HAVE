package have.common.code;

/**
 * 작업 버전의 상태 (WORK_VERSION.status). IWorkVersion.setWorkStatus만 이 값을 바꾼다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum WorkStatus {
    DRAFT,
    SUBMITTED,
    CHALLENGE_PENDING,
    REVIEW_PENDING,
    IN_REVIEW,
    REVISION_REQUIRED,
    APPROVAL_PENDING,
    APPROVED
}
