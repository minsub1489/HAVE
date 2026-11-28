package have.common.code;

/**
 * 승인 효력. 저장하지 않고 계산한다: 철회 기록이 있으면 REVOKED, 승인이 있으면 VALID, 없으면 NONE. 후속 버전 여부는 효력이 아니라 최신 버전 번호로 따로 알린다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum ApprovalEffect {
    VALID,
    REVOKED,
    NONE
}
