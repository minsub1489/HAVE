package have.common.code;

/**
 * 이해 확인 과제의 종류 (CHALLENGE.kind).
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum ChallengeKind {
    TEACH_BACK,
    FAULT_INJECTION,
    WHAT_IF
}
