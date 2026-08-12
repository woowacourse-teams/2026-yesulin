package art.yesulin.presentation.applicant;

import art.yesulin.application.application.ApplicantApplicationDetail;
import art.yesulin.application.application.ApplicantApplicationQueryService;
import art.yesulin.application.application.ApplicantApplicationSummary;
import art.yesulin.infrastructure.security.SessionPrincipal;
import art.yesulin.infrastructure.security.SessionPrincipalResolver;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/applications")
public class ApplicantApplicationController {

    private final ApplicantApplicationQueryService queryService;
    private final SessionPrincipalResolver principalResolver;

    public ApplicantApplicationController(
            ApplicantApplicationQueryService queryService,
            SessionPrincipalResolver principalResolver) {
        this.queryService = queryService;
        this.principalResolver = principalResolver;
    }

    @GetMapping
    public List<ApplicantApplicationSummary> findAll(Authentication authentication) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return queryService.findAll(principal.accountId());
    }

    @GetMapping("/{applicationId}")
    public ApplicantApplicationDetail findOne(
            Authentication authentication, @PathVariable long applicationId) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return queryService.findOne(principal.accountId(), applicationId);
    }
}
