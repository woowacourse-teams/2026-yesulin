package art.yesulin.dormant.presentation.api.otraudition;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.application.otraudition.OtrSubmissionResult;
import art.yesulin.dormant.application.otraudition.OtrSubmissionService;
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
