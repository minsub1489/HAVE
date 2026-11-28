package have.common.code;

/**
 * 근거자료의 유형 (EVIDENCE_ITEM.type).
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum EvidenceType {
    WEB_SOURCE,
    REFERENCE,
    PROMPT_LOG,
    SUPPORT_FILE
}
