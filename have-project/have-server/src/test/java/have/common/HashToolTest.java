package have.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class HashToolTest {

    @Test
    void 빈_입력의_SHA256은_알려진_값이다() {
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", HashTool.getSha256(new byte[0]));
    }

    @Test
    void 문자열은_UTF8로_해시한다() {
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", HashTool.getTextSha256("abc"));
        // 확장 프로그램 core.js의 getTextSha256('한글')과 같은 값이어야 한다 (node로 계산한 값)
        assertEquals("bd87f9bb68b67d2fa1cb82b6751820e946d5b1316d25d5fd96512fb4be44a2a8", HashTool.getTextSha256("한글"));
    }

    @Test
    void 체인의_첫_해시는_0이_64자다() {
        assertEquals(64, HashTool.ZERO_HASH.length());
        assertEquals("0", HashTool.ZERO_HASH.replace("00", "0").replaceAll("0+", "0"));
    }
}
