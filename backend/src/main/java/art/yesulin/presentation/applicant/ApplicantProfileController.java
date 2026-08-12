package art.yesulin.presentation.applicant;

import art.yesulin.application.applicant.ApplicantProfileResult;
import art.yesulin.application.applicant.ApplicantProfileService;
import art.yesulin.infrastructure.security.SessionPrincipal;
import art.yesulin.infrastructure.security.SessionPrincipalResolver;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/profile")
public class ApplicantProfileController {

    private final ApplicantProfileService profileService;
    private final SessionPrincipalResolver principalResolver;

    public ApplicantProfileController(
            ApplicantProfileService profileService, SessionPrincipalResolver principalResolver) {
        this.profileService = profileService;
        this.principalResolver = principalResolver;
    }

    @GetMapping
    public ApplicantProfileResult get(Authentication authentication) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return profileService.get(principal.accountId());
    }

    @PatchMapping
    public ApplicantProfileResult update(
            Authentication authentication, @Valid @RequestBody ApplicantProfileRequest request) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return profileService.update(principal.accountId(), request.toCommand());
    }
}
