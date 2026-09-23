package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.otraudition.OtrSubmissionResult;
import art.yesulin.application.otraudition.OtrSubmissionService;
import art.yesulin.domain.member.MemberType;
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

@RestController
@RequestMapping("/api/v1/otr-auditions/{auditionId}/submissions")
@RequiredArgsConstructor
@LoginRequired
public class OtrSubmissionController {

    private final OtrSubmissionService service;

    @PostMapping
    public ResponseEntity<OtrSubmissionResult> submit(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable UUID auditionId,
            @Valid @RequestBody SubmitOtrSubmissionRequest request
    ) {
        OtrSubmissionResult result = service.submit(principal.memberId(), auditionId, request.toInput());
        return ResponseEntity.created(URI.create("/api/v1/otr-auditions/" + auditionId + "/submissions/"
                + result.submissionId())).body(result);
    }
}
