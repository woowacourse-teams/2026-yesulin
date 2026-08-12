package art.yesulin.presentation.error;

import art.yesulin.application.account.AccountConflictException;
import art.yesulin.application.applicant.ApplicantAccessException;
import art.yesulin.application.application.ApplicantApplicationNotFoundException;
import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.company.ActiveCompanyAccessException;
import art.yesulin.application.recruitment.RecruitmentException;
import art.yesulin.domain.common.DomainException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomain(DomainException exception) {
        return ResponseEntity.badRequest().body(new ErrorResponse(
                exception.error().code(), exception.getMessage(), null));
    }

    @ExceptionHandler(AccountConflictException.class)
    public ResponseEntity<ErrorResponse> handleAccountConflict(
            AccountConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ACCOUNT_ALREADY_EXISTS", exception.getMessage(), null));
    }

    @ExceptionHandler({ApplicantAccessException.class, ApplicantApplicationNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("RESOURCE_NOT_FOUND", exception.getMessage(), null));
    }

    @ExceptionHandler(ApplicationSubmissionException.class)
    public ResponseEntity<ErrorResponse> handleSubmission(
            ApplicationSubmissionException exception) {
        return ResponseEntity.badRequest()
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
}
