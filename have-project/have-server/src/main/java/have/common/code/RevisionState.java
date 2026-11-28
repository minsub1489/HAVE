package have.common.code;

/**
 * 수정 회차의 상태 (REVISION.state).
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum RevisionState {
    OPEN,
    IN_PROGRESS,
    SUBMITTED,
    EXPIRED
}
