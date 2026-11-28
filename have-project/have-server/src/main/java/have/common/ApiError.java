package have.common;

import java.util.Map;

/**
 * 오류 응답 본문. 모든 오류는 이 모양으로 나간다(가이드라인 5.1, docs/api.md).
 * <pre>{ "code": "CONFLICT", "message": "화면에 보일 한글 문장", "fields": { "칸 이름": "칸별 문장" } }</pre>
 */
public class ApiError {

    private final String code;
    private final String message;
    private final Map<String, String> fields;

    public ApiError(String code, String message, Map<String, String> fields) {
        this.code = code;
        this.message = message;
        this.fields = fields == null ? Map.of() : Map.copyOf(fields);
    }

    /** 오류 종류. VALIDATION_ERROR · UNAUTHENTICATED · FORBIDDEN · NOT_FOUND · CONFLICT · INTERNAL_ERROR */
    public String getCode() {
        return code;
    }

    /** 화면에 그대로 보여 줄 한글 문장 */
    public String getMessage() {
        return message;
    }

    /** 입력 칸별 오류 문장. 없으면 빈 묶음 */
    public Map<String, String> getFields() {
        return fields;
    }
}
