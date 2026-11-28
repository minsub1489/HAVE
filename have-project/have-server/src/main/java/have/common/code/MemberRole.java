package have.common.code;

/**
 * 작업별 역할 (WORK_MEMBER.role). 역할은 계정이 아니라 작업마다 정해진다.
 * 값은 DB 문서 부록 A와 같다. 클라이언트(model.js)의 상수, DDL의 CHECK와 항상 같아야 한다(CodeValueTest가 확인).
 */
public enum MemberRole {
    AUTHOR,
    REVIEWER,
    APPROVER
}
