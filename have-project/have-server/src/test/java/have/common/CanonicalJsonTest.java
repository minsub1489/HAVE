package have.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import have.common.code.AuditAction;

import org.junit.jupiter.api.Test;

/** CanonicalJson이 확장 프로그램 core.js의 getCanonical과 같은 문자열을 내는지 확인한다. 기대 값은 node로 계산했다. */
class CanonicalJsonTest {

    @Test
    void 키를_정렬하고_공백_없이_쓴다() {
        Map<String, Object> nested = new HashMap<>();
        nested.put("b", List.of(3, 1, 2));
        nested.put("a", null);
        nested.put("가", true);
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("workId", 12L);
        value.put("action", AuditAction.APPROVE);
        value.put("reason", "줄\n바꿈 \"따옴표\" \\ 탭\t");
        value.put("nested", nested);
        value.put("versionNo", 2);
        value.put("Z", "z");
        value.put("_x", false);

        String canonical = CanonicalJson.getCanonical(value);

        assertEquals("{\"Z\":\"z\",\"_x\":false,\"action\":\"APPROVE\",\"nested\":{\"a\":null,\"b\":[3,1,2],\"가\":true},"
                + "\"reason\":\"줄\\n바꿈 \\\"따옴표\\\" \\\\ 탭\\t\",\"versionNo\":2,\"workId\":12}", canonical);
        assertEquals("0ffe41bf09903bbd4542808037771f142c50830cec22fd0e72692dcf6da29614", HashTool.getTextSha256(canonical));
    }

    @Test
    void 목록의_순서는_그대로_두고_제어_문자는_u로_쓴다() {
        Map<String, Object> value = Map.of("list", List.of(Map.of("y", 1, "x", 2)), "c", "\u0001");
        assertEquals("{\"c\":\"\\u0001\",\"list\":[{\"x\":2,\"y\":1}]}", CanonicalJson.getCanonical(value));
    }

    @Test
    void 같은_내용이면_넣은_순서와_상관없이_같은_문자열이다() {
        Map<String, Object> first = new LinkedHashMap<>();
        first.put("a", 1);
        first.put("b", "x");
        Map<String, Object> second = new LinkedHashMap<>();
        second.put("b", "x");
        second.put("a", 1);
        assertEquals(CanonicalJson.getCanonical(first), CanonicalJson.getCanonical(second));
    }

    @Test
    void 실수는_받지_않는다() {
        assertThrows(IllegalArgumentException.class, () -> CanonicalJson.getCanonical(Map.of("score", 4.5)));
    }
}
