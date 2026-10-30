package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.pdfextraction.application.ai.PdfAiRetryRequest;
import art.yesulin.pdfextraction.application.ai.PdfAiRetryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@LoginRequired
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiRetryController {

    private final PdfAiRetryService service;

    @PostMapping("/api/v1/pdf-extractions/{jobId}/ai-retry")
    public ResponseEntity<RetryResponse> retry(
            @LoginMember(roles = {MemberType.PRODUCER, MemberType.ADMIN}, statuses = MemberStatus.ACTIVE)
            MemberPrincipal principal, @PathVariable UUID jobId, @Valid @RequestBody RetryRequest request
    ) {
        PdfAiRetryService.Result result = service.request(new PdfAiRetryRequest(jobId.toString(),
                request.failedAttempts(), request.failedAt(), request.generation()), principal.memberId(),
                principal.role() == MemberType.ADMIN);
        HttpStatus status = switch (result) {
            case QUEUED -> HttpStatus.ACCEPTED;
            case ALREADY_PROCESSING -> HttpStatus.OK;
            case DISABLED, UNAVAILABLE -> HttpStatus.CONFLICT;
        };
        String message = switch (result) {
            case QUEUED -> "재분석 요청을 접수했습니다.";
            case ALREADY_PROCESSING -> "이미 재분석을 기다리거나 처리 중입니다.";
            case DISABLED -> "현재 지원자 분석 기능이 비활성화되어 있습니다.";
            case UNAVAILABLE -> "완료되었거나 오래된 알림입니다. 최신 처리 상태를 확인해 주세요.";
        };
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(new RetryResponse(result, message));
    }

    public record RetryRequest(@Min(1) @Max(5) int failedAttempts, @Min(0) long failedAt, @Min(0) int generation) {
    }

    public record RetryResponse(PdfAiRetryService.Result status, String message) {
    }
}
