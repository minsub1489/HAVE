package have.common.code;

/**
 * 증명서 발급 상태 (CERTIFICATE.signing_state). 승인 효력과는 다른 값이다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum SigningState {
    PENDING,
    READY,
    FAILED
}
