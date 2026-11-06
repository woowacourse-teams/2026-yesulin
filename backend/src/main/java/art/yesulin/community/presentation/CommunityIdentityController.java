package art.yesulin.community.presentation;

import art.yesulin.community.domain.CommunityIdentity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/community/identity")
public class CommunityIdentityController {

    public static final String COOKIE_NAME = "yesulin-community-owner";
    private static final String LEGACY_HEADER = "X-Community-Legacy-Key";
    private final Environment environment;

    @ModelAttribute
    public void preventSharedCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }

    @GetMapping
    public IdentityStatus status(@CookieValue(value = COOKIE_NAME, required = false) String current,
                                 @RequestHeader(value = LEGACY_HEADER, required = false) String legacy,
                                 HttpServletRequest request, HttpServletResponse response) {
        boolean ready = CommunityIdentity.confirmed(current, legacy);
        if (ready) {
            writeCookie(current, request, response);
        }
        return new IdentityStatus(ready);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void establish(@CookieValue(value = COOKIE_NAME, required = false) String current,
                          @RequestHeader(value = LEGACY_HEADER, required = false) String legacy,
                          HttpServletRequest request, HttpServletResponse response) {
        writeCookie(CommunityIdentity.issue(current, legacy), request, response);
    }

    private void writeCookie(String value, HttpServletRequest request, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true).secure(secure(request)).sameSite("Lax")
                .path("/api/v1/public/community").maxAge(Duration.ofDays(400)).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private boolean secure(HttpServletRequest request) {
        return request.isSecure() || !environment.acceptsProfiles(Profiles.of("local", "test"));
    }

    public record IdentityStatus(boolean ready) {
    }
}
