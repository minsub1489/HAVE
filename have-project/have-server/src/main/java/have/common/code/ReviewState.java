package have.common.code;

/**
 * 검토 회차의 상태 (REVIEW.state). HALTED는 검토 시작 때 파일 해시 불일치로 중지된 것이다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum ReviewState {
    IN_PROGRESS,
    COMPLETED,
    HALTED
}
