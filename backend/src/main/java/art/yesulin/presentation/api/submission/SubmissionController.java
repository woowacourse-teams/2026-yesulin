package art.yesulin.presentation.api.submission;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.submission.SubmissionService;
import art.yesulin.application.submission.SubmittedSubmissionResult;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/auditions/{auditionId}/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping
    public ResponseEntity<SubmitSubmissionResponse> submit(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody SubmitSubmissionRequest request
    ) {
        SubmittedSubmissionResult result = submissionService.submit(
                principal.memberId(), auditionId, request.toCommand()
        );
        URI location = URI.create("/api/v1/applicants/me/submissions/" + result.submissionId());
        return ResponseEntity.created(location).body(SubmitSubmissionResponse.from(result));
    }
}
