package have.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 도구. 확장 프로그램 core.js의 getSha256 · getTextSha256과 같은 결과(16진수 소문자 64자)를 낸다.
 * 파일 해시(WORK_VERSION.file_hash), 감사 이력 해시 체인, 공유 링크 토큰 해시가 모두 이것을 쓴다.
 */
public final class HashTool {

    /** 해시 체인의 첫 행이 prev_hash로 쓰는 값(0 64자) */
    public static final String ZERO_HASH = "0".repeat(64);

    private HashTool() {
    }

    /** 바이트의 SHA-256 (16진수 64자) */
    public static String getSha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 쓸 수 없습니다", e);
        }
    }

    /** UTF-8 문자열의 SHA-256 (16진수 64자) */
    public static String getTextSha256(String text) {
        return getSha256(text.getBytes(StandardCharsets.UTF_8));
    }
}
