package have.auth;

import have.common.code.MemberRole;

/**
 * IAuthorization.isAuthorized에 넘기는 행동과 그 행동에 필요한 역할. 11/28 고정. 1단계 동안 바꾸지 않는다(가이드라인 4.8).
 * 이름은 순서 다이어그램의 isAuthorized(…, REQUEST_REVIEW) · (…, APPROVE) 표기를 따랐다.
 */
public enum AuthAction {

    /** 작업 · 증명서 · 이력 조회, 공유 링크 만들기와 중지 — 구성원이면 누구나 */
    VIEW(null),
    /** 버전 등록, 기여 · 근거자료 추가, 위험 분석, 재제출 */
    EDIT_WORK(MemberRole.AUTHOR),
    /** 검토 요청과 취소, 이해 확인 답변 */
    REQUEST_REVIEW(MemberRole.AUTHOR),
    /** 검토 시작 · 평가 · 통과 · 수정 요청 */
    REVIEW(MemberRole.REVIEWER),
    APPROVE(MemberRole.APPROVER),
    REJECT(MemberRole.APPROVER),
    REVOKE(MemberRole.APPROVER);

    private final MemberRole requiredRole;

    AuthAction(MemberRole requiredRole) {
        this.requiredRole = requiredRole;
    }

    /** 이 행동에 필요한 역할. null이면 그 작업의 구성원이기만 하면 된다 */
    public MemberRole getRequiredRole() {
        return requiredRole;
    }
}
