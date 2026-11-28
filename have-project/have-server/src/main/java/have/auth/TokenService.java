package have.auth;

import java.time.Instant;

/**
 * 로그인 토큰을 만들고 확인한다. 11/28 고정. 구현 D(D19): 토큰 형식(HMAC 서명, 12시간), 요청마다 토큰을 확인하는 인터셉터.
 * B의 AuthorizationPolicy가 login · getCurrentUser에서 쓴다. 토큰을 다루는 곳은 이 구현 하나뿐이다.
 * 서명 비밀 값은 설정 have.token.secret(환경 변수 HAVE_TOKEN_SECRET)에서 읽는다.
 * 설계서에는 "토큰 확인"으로만 나와 있어 더한 인터페이스다(docs/design-changes.md 1.1의 18번).
 */
public interface TokenService {

    /** 사용자 ID를 담아 서명한 토큰. 만료 시각이 들어 있다. */
    String createToken(long userId);

    /** 토큰의 만료 시각. 로그인 응답의 expiresAt에 쓴다. 틀린 토큰이면 null. */
    Instant getExpiresAt(String token);

    /** 지금 요청의 Authorization: Bearer 헤더에서 꺼낸 사용자 ID. 토큰이 없거나 틀렸거나 만료됐으면 null. */
    Long getCurrentUserId();
}
