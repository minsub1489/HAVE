package have.auth;

import java.util.List;
import java.util.Set;

import have.common.code.MemberRole;

/**
 * 01 Auth가 02~05와 확장 프로그램에 제공하는 인터페이스 (컴포넌트 다이어그램 v2). 구현: AuthorizationPolicy. 담당 B. 11/28 고정.
 * 진입점 AuthController(/api/auth/* · /api/users)와 토큰(TokenService)은 D가 만든다.
 * 사용자 ID와 역할은 로그인 토큰과 WORK_MEMBER에서만 얻는다. 요청 본문에 적힌 사용자 · 역할은 믿지 않는다.
 * 검토자(REVIEWER)와 최종 승인자(APPROVER)는 작업마다 한 명이다(가이드라인 5.4, 11/28 결정).
 */
public interface IAuthorization {

    /** 이메일과 비밀번호(BCrypt)를 확인하고 TokenService.createToken으로 만든 토큰을 돌려준다. 틀리면 401. */
    String login(Credential credential);

    void logout();

    /** 지금 요청의 로그인 사용자(TokenService.getCurrentUserId로 찾은 사용자). 로그인하지 않았으면 401. */
    User getCurrentUser();

    /**
     * 사용자가 그 작업에서 그 행동을 할 수 있는가. target은 작업 ID다
     * (버전 · 검토 요청 · 승인 건을 다루는 쪽이 작업 ID로 바꿔 넘긴다).
     * 자기 검토 · 자기 승인 금지처럼 버전의 내용을 봐야 하는 규칙은 각 서비스가 따로 확인한다.
     */
    boolean isAuthorized(long userId, long target, AuthAction action);

    /** 사용자가 그 작업에서 가진 역할. 구성원이 아니면 빈 집합. */
    Set<MemberRole> getMemberRole(long workId, long userId);

    /**
     * 작업에 역할을 준다. 작업 생성 때 AUTHOR(A2), 첫 검토 요청 때 REVIEWER · APPROVER(B5). 같은 사람이 이미 그 역할이면 그대로 둔다.
     * REVIEWER · APPROVER는 작업마다 한 명이라, 다른 사람이 이미 그 역할이면 409. 바꾸려면 setMember를 쓴다.
     */
    void addMember(long workId, long userId, MemberRole role);

    /**
     * 그 작업에서 그 역할을 가진 사용자. 없으면 빈 목록. REVIEWER · APPROVER는 0명 또는 1명이다.
     * 쓰는 곳: 02가 StatusChange의 검토자 · 최종 승인자를 채울 때(A7), 작업 상세의 reviewer · approver(A6),
     * 04가 "지정 최종 승인자" 조건을 확인할 때(C1).
     * 설계서에 없어 더한 오퍼레이션이다(docs/design-changes.md 1.1의 13번).
     */
    List<User> getMembers(long workId, MemberRole role);

    /**
     * 작업의 검토자(REVIEWER)나 최종 승인자(APPROVER)를 이 사람으로 바꾼다. 이전 사람의 그 역할 행은 지운다.
     * 바꿔도 되는지는 부르는 쪽이 먼저 확인한다: v1의 검토 요청을 취소하고 다시 요청할 때만(ReviewRequestService, B5).
     * AUTHOR에는 쓰지 않는다(400). 설계서에 없어 더한 오퍼레이션이다(docs/design-changes.md 1.1의 13번).
     */
    void setMember(long workId, MemberRole role, long userId);

    /**
     * 사용자가 구성원인 작업의 ID. role이 null이면 역할과 상관없이 모두. 작업 목록(A6, GET /api/works)이 쓴다.
     * 설계서에 없어 더한 오퍼레이션이다(docs/design-changes.md 1.1의 15번).
     */
    List<Long> getWorkIds(long userId, MemberRole role);

    /**
     * 이름이나 이메일에 keyword가 든 사용자. 비우면 전체, 로그인한 본인은 빼고 최대 20명. 검토자 · 최종 승인자 고르기(GET /api/users)에 쓴다.
     * 설계서에 없어 더한 오퍼레이션이다(docs/design-changes.md 1.1의 15번).
     */
    List<User> getUsers(String keyword);
}
