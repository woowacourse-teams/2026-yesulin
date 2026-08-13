package art.yesulin.presentation.error;

import art.yesulin.application.account.AccountConflictException;
import art.yesulin.application.applicant.ApplicantAccessException;
import art.yesulin.application.application.ApplicantApplicationNotFoundException;
import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.company.ActiveCompanyAccessException;
import art.yesulin.application.publication.PublicPostingNotFoundException;
import art.yesulin.application.recruitment.RecruitmentException;
import art.yesulin.application.screening.ScreeningException;
import art.yesulin.domain.common.DomainException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomain(DomainException exception) {
        HttpStatus status = switch (exception.error()) {
            case DRAFT_VERSION_CONFLICT, DRAFT_NOT_ACTIVE -> HttpStatus.CONFLICT;
            case COMPANY_ACCESS_DENIED, DRAFT_ALREADY_OWNED -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(new ErrorResponse(
                exception.error().code(), exception.getMessage(), null));
    }

    @ExceptionHandler(AccountConflictException.class)
    public ResponseEntity<ErrorResponse> handleAccountConflict(
            AccountConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ACCOUNT_ALREADY_EXISTS", exception.getMessage(), null));
    }

    @ExceptionHandler({
        ApplicantAccessException.class,
        ApplicantApplicationNotFoundException.class,
        PublicPostingNotFoundException.class
    })
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("RESOURCE_NOT_FOUND", exception.getMessage(), null));
    }

    @ExceptionHandler(ApplicationSubmissionException.class)
    public ResponseEntity<ErrorResponse> handleSubmission(
            ApplicationSubmissionException exception) {
        HttpStatus status = switch (exception.code()) {
            case "APPLICATION_ALREADY_SUBMITTED", "DRAFT_REVISION_REQUIRED" -> HttpStatus.CONFLICT;
            case "DRAFT_ACCESS_DENIED" -> HttpStatus.FORBIDDEN;
            case "DRAFT_NOT_FOUND", "POSTING_NOT_FOUND", "ROLE_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.code(), exception.getMessage(), null));
    }

    @ExceptionHandler(ActiveCompanyAccessException.class)
    public ResponseEntity<ErrorResponse> handleCompanyAccess(
            ActiveCompanyAccessException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("COMPANY_ACCESS_DENIED", exception.getMessage(), null));
    }

    @ExceptionHandler(RecruitmentException.class)
    public ResponseEntity<ErrorResponse> handleRecruitment(RecruitmentException exception) {
        HttpStatus status = exception.code().endsWith("NOT_FOUND")
                ? HttpStatus.NOT_FOUND
                : HttpStatus.CONFLICT;
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.code(), exception.getMessage(), null));
    }

    @ExceptionHandler(ScreeningException.class)
    public ResponseEntity<ErrorResponse> handleScreening(ScreeningException exception) {
        HttpStatus status = exception.code().endsWith("NOT_FOUND")
                ? HttpStatus.NOT_FOUND
                : exception.code().endsWith("ACCESS_DENIED")
                        ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT;
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.code(), exception.getMessage(), null));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.", null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception) {
        Map<String, String> detail = exception.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage() == null
                                ? "올바르지 않은 값입니다."
                                : error.getDefaultMessage(),
                        (first, second) -> first));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("INVALID_REQUEST", "요청 값이 올바르지 않습니다.", detail));
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MissingServletRequestParameterException.class,
        MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorResponse> handleMalformedRequest(Exception exception) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("INVALID_REQUEST", "요청 형식이 올바르지 않습니다.", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        LOGGER.error("처리하지 못한 서버 오류가 발생했습니다.", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(
                        "INTERNAL_SERVER_ERROR",
                        "서버에서 요청을 처리하지 못했습니다.",
                        null));
    }
}
