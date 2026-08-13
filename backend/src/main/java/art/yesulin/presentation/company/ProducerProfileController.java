package art.yesulin.presentation.company;

import art.yesulin.application.company.ProducerProfileResult;
import art.yesulin.application.company.ProducerProfileService;
import art.yesulin.infrastructure.security.ActiveCompanySession;
import art.yesulin.infrastructure.security.SessionPrincipal;
import art.yesulin.infrastructure.security.SessionPrincipalResolver;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/producers/me")
public class ProducerProfileController {

    private final ProducerProfileService profileService;
    private final SessionPrincipalResolver principalResolver;

    public ProducerProfileController(
            ProducerProfileService profileService,
            SessionPrincipalResolver principalResolver) {
        this.profileService = profileService;
        this.principalResolver = principalResolver;
    }

    @GetMapping
    public ProducerProfileResult get(Authentication authentication, HttpSession session) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return profileService.get(
                principal.accountId(), ActiveCompanySession.require(session));
    }

    @PatchMapping
    public ProducerProfileResult update(
            Authentication authentication,
            HttpSession session,
            @Valid @RequestBody ProducerProfileRequest request) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        return profileService.update(
                principal.accountId(), ActiveCompanySession.require(session),
                request.companyName(), request.contactName(), request.contactRole(),
                request.description());
    }
}
