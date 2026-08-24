package art.yesulin.presentation.api.auth;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.social.SocialIdentity;
import art.yesulin.application.auth.social.SocialLoginService;
import art.yesulin.application.auth.social.SocialProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/local/social-sessions")
@Profile("local")
@ConditionalOnProperty(
        prefix = "yesulin.local-social-login",
        name = "enabled",
        havingValue = "true"
)
@RequiredArgsConstructor
public class LocalSocialSessionController {

    private static final URI LOCAL_ISSUER = URI.create("https://local.yesulin.test");

    private final SocialLoginService socialLoginService;

    @PostMapping("/{provider}")
    public ResponseEntity<SessionResponse> login(
            @PathVariable String provider,
            HttpServletRequest request
    ) {
        SocialProvider socialProvider;
        try {
            socialProvider = SocialProvider.fromRegistrationId(provider);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 소셜 로그인입니다.");
        }
        MemberPrincipal principal = socialLoginService.login(new SocialIdentity(
                socialProvider,
                LOCAL_ISSUER,
                "local-" + socialProvider.name().toLowerCase(Locale.ROOT)
        ));

        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, principal);

        return ResponseEntity.ok(SessionResponse.from(principal));
    }
}
