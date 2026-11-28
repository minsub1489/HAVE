/**
 * 01 사용자·권한 관리 (Auth). 담당 B, 토큰과 진입점은 D.
 * B가 만들 것(클래스 다이어그램 v3): AuthorizationPolicy(IAuthorization 구현), User, WorkMember. 저장 계약은 have.persistence.auth.
 * D가 만들 것(설계서에 "토큰 확인"으로만 있던 것, D19): TokenService 구현, 토큰 확인 인터셉터(공개 검증 · 로그인 · 상태 확인 주소는 제외),
 *   진입점 AuthController(/api/auth/login · logout · me, /api/users). 파일 이름이 겹치지 않게 D의 파일은 이 패키지 안 have.auth.token에 둔다.
 * 테이블: "user", work_member.
 * 검토자 · 최종 승인자는 작업마다 한 명이다. v1의 검토 요청에서 정하고 v2부터는 그대로 따른다(가이드라인 5.4).
 * DB도 조건부 유니크 인덱스 uq_work_member_designated로 막는다.
 */
package have.auth;
