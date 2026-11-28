package have.common.code;

/**
 * 위험 등급. 저장하지 않고 위험 점수 합계와 GATE_POLICY의 경계(4 · 7)로 계산한다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH
}
