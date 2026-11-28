package have.common.code;

/**
 * 답변의 확신 정도 (CHALLENGE_RESPONSE.confidence).
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum ConfidenceLevel {
    LOW,
    MEDIUM,
    HIGH
}
