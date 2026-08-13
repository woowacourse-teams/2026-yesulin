package art.yesulin.presentation.applicant;

import art.yesulin.application.draft.DraftSyncService;
import art.yesulin.infrastructure.security.SessionPrincipal;
import art.yesulin.infrastructure.security.SessionPrincipalResolver;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/applicants/me/drafts")
public class ApplicantDraftController {

    private final DraftSyncService draftService;
    private final SessionPrincipalResolver principalResolver;
    private final ObjectMapper objectMapper;

    public ApplicantDraftController(
            DraftSyncService draftService,
            SessionPrincipalResolver principalResolver,
            ObjectMapper objectMapper) {
        this.draftService = draftService;
        this.principalResolver = principalResolver;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public DraftResponse find(Authentication authentication, @RequestParam long postingId) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return DraftResponse.from(draftService.find(principal.accountId(), postingId), objectMapper);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DraftResponse synchronize(
            Authentication authentication, @Valid @RequestBody DraftSyncRequest request) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return DraftResponse.from(
                draftService.synchronize(principal.accountId(), request.toCommand()), objectMapper);
    }
}
