package art.yesulin.presentation.api;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.presentation.config.RequestLogContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "art.yesulin.presentation.api")
public class ApiExceptionHandler {

    private static final String INVALID_REQUEST = "INVALID_REQUEST";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException exception,
            HttpServletRequest request
    ) {
        RequestLogContext.setErrorCode(request, exception.getErrorCode().code());
        ErrorResponse response = new ErrorResponse(exception.getErrorCode().code(), exception.getMessage(), null);
        HttpStatus status = switch (exception.getErrorCode().type()) {
            case BAD_REQUEST -> HttpStatus.BAD_REQUEST;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
        };
        return ResponseEntity.status(status).body(response);
    }

    /**
     * 화면이 detail을 읽지 않아도 무엇이 잘못됐는지 알 수 있도록 첫 위반 메시지를 message에 함께 담는다.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> detail = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            detail.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        exception.getBindingResult().getGlobalErrors()
                .forEach(error -> detail.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));
        return badRequest(request, firstMessage(detail), detail);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        Map<String, String> detail = new LinkedHashMap<>();
        for (ConstraintViolation<?> violation : exception.getConstraintViolations()) {
            detail.putIfAbsent(String.valueOf(violation.getPropertyPath()), violation.getMessage());
        }
        return badRequest(request, firstMessage(detail), detail);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException exception,
            HttpServletRequest request
    ) {
        return badRequest(request, "요청 형식이 올바르지 않습니다. 입력한 값을 다시 확인해 주세요.", null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        return badRequest(
                request,
                "%s 값의 형식이 올바르지 않습니다.".formatted(exception.getName()),
                Map.of(exception.getName(), "형식이 올바르지 않습니다.")
        );
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException exception,
            HttpServletRequest request
    ) {
        return badRequest(
                request,
                "%s 값이 필요합니다.".formatted(exception.getParameterName()),
                Map.of(exception.getParameterName(), "필수 값입니다.")
        );
    }

    /**
     * 도메인 검증기가 던지는 IllegalArgumentException은 잘못된 요청이므로 500이 아니라 400으로 돌려준다.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {
        return badRequest(request, exception.getMessage(), null);
    }

    private ResponseEntity<ErrorResponse> badRequest(
            HttpServletRequest request,
            String message,
            Map<String, String> detail
    ) {
        RequestLogContext.setErrorCode(request, INVALID_REQUEST);
        return ResponseEntity.badRequest().body(new ErrorResponse(INVALID_REQUEST, message, detail));
    }

    private String firstMessage(Map<String, String> detail) {
        return detail.values().stream()
                .filter(message -> message != null && !message.isBlank())
                .findFirst()
                .orElse("요청 값을 확인해 주세요.");
    }
}
