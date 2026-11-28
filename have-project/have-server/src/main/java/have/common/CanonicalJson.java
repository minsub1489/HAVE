package have.common;

import java.util.Map;
import java.util.TreeMap;

/**
 * 키를 정렬한 JSON 문자열. 같은 내용이면 항상 같은 문자열이 나오므로 해시와 서명의 입력으로 쓴다.
 * 확장 프로그램 core.js의 getCanonical과 같은 규칙이다(묶음의 키는 정렬, 목록의 순서는 그대로, 공백 없음).
 * 감사 이벤트의 event_hash(D)와 증명서의 immutable_payload(C)가 반드시 이 한 곳을 쓴다.
 * 넣을 수 있는 값: Map(키는 문자열), Iterable, 문자열, 정수, Boolean, enum(이름), null. 실수는 넣지 않는다.
 */
public final class CanonicalJson {

    private CanonicalJson() {
    }

    /** 값을 키 정렬 JSON 문자열로 바꾼다. */
    public static String getCanonical(Object value) {
        StringBuilder out = new StringBuilder();
        write(out, value);
        return out.toString();
    }

    private static void write(StringBuilder out, Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            map.forEach((k, v) -> sorted.put(String.valueOf(k), v));
            out.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : sorted.entrySet()) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeText(out, e.getKey());
                out.append(':');
                write(out, e.getValue());
            }
            out.append('}');
        } else if (value instanceof Iterable<?> list) {
            out.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                write(out, item);
            }
            out.append(']');
        } else if (value instanceof Boolean || value instanceof Integer || value instanceof Long || value instanceof Short) {
            out.append(value);
        } else if (value instanceof Double || value instanceof Float) {
            throw new IllegalArgumentException("실수는 표기가 환경마다 달라질 수 있어 넣지 않습니다: " + value);
        } else if (value instanceof Enum<?> code) {
            writeText(out, code.name());
        } else {
            writeText(out, value.toString());
        }
    }

    private static void writeText(StringBuilder out, String text) {
        out.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        out.append('"');
    }
}
