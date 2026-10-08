package art.yesulin.dormant.presentation.api.submission;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.application.submission.IdempotentSubmissionService;
import art.yesulin.dormant.application.submission.SubmittedSubmissionResult;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auditions/{auditionId}/submissions")
@RequiredArgsConstructor
@LoginRequired
public class SubmissionController {

    private final IdempotentSubmissionService submissionService;

    @PostMapping
    public ResponseEntity<SubmitSubmissionResponse> submit(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @Valid @RequestBody SubmitSubmissionRequest request
    ) {
        SubmittedSubmissionResult result = submissionService.submit(
                principal.memberId(), auditionId, idempotencyKey, request.toCommand()
        );
        URI location = URI.create("/api/v1/applicants/me/submissions/" + result.submissionId());
        return ResponseEntity.created(location).body(SubmitSubmissionResponse.from(result));
    }
}
