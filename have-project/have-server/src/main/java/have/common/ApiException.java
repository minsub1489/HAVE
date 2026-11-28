package have.common;

import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * 서비스가 요청을 거절할 때 던지는 예외. ApiExceptionHandler가 ApiError 응답으로 바꾼다.
 * 상태 코드의 뜻(가이드라인 5.1):
 * 400 입력 오류·조건 미충족 / 401 로그인 필요 / 403 권한 없음 / 404 없음 / 409 상태 충돌·같은 파일·진행 중 요청·이미 결정됨
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fields;

    private ApiException(HttpStatus status, String code, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields == null ? Map.of() : Map.copyOf(fields);
    }

    /** 400 — 입력 오류, 조건 미충족 */
    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, null);
    }

    /** 400 — 입력 칸별 오류를 함께 돌려줄 때 */
    public static ApiException badRequest(String message, Map<String, String> fields) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, fields);
    }

    /** 401 — 로그인하지 않았거나 토큰이 틀림 */
    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", message, null);
    }

    /** 403 — 권한 없음(작업 구성원이 아닌 경우 포함). 내용은 드러내지 않는다 */
    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message, null);
    }

    /** 404 — 대상 없음. 공개 검증의 "대상 미식별"도 이것 */
    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message, null);
    }

    /** 409 — 상태 충돌, 직전 버전과 같은 파일, 진행 중 요청 있음, 이미 결정됨 */
    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLICT", message, null);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Map<String, String> getFields() {
        return fields;
    }
}
