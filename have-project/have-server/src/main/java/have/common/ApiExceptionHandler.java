package have.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** 모든 진입점(Controller)의 예외를 ApiError 응답 하나의 모양으로 바꾼다. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** 서비스가 던진 거절 */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new ApiError(e.getCode(), e.getMessage(), e.getFields()));
    }

    /** 업로드 크기 초과 — 문구는 확장 프로그램의 기존 문구와 같다 */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", "20 MB 이하의 PDF를 선택해 주세요.", null));
    }

    /** 본문 JSON을 읽을 수 없음 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", "요청 형식을 확인해 주세요.", null));
    }

    /** 그 밖의 예외. 스프링이 상태 코드를 정한 것(없는 주소 404, 틀린 메서드 405 등)은 그 코드를 따르고, 나머지는 500 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception e) {
        if (e instanceof ErrorResponse response) {
            int status = response.getStatusCode().value();
            String code = status == 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR";
            String message = status == 404 ? "요청한 대상을 찾을 수 없어요." : status >= 500 ? "서버에서 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." : "요청 형식을 확인해 주세요.";
            return ResponseEntity.status(status).body(new ApiError(code, message, null));
        }
        log.error("처리하지 못한 예외", e);
        return ResponseEntity.internalServerError().body(new ApiError("INTERNAL_ERROR", "서버에서 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.", null));
    }
}
