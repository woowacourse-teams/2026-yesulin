package art.yesulin.auth.presentation.api;

import art.yesulin.auth.application.EmailVerificationService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/email-verifications")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    @PatchMapping
    public ResponseEntity<SessionResponse> verifyCode(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.PENDING) MemberPrincipal principal,
            @Valid @RequestBody EmailVerificationCodeRequest request,
            HttpSession session
    ) {
        MemberPrincipal verified = emailVerificationService.verifyCode(principal.memberId(), request.toCode());
        session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, verified);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(SessionResponse.from(verified));
    }

    @PostMapping
    public ResponseEntity<Void> resend(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.PENDING) MemberPrincipal principal
    ) {
        emailVerificationService.resendVerification(principal.memberId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Void> verify(
            @RequestParam String token,
            @RequestParam URI redirectUri,
            HttpServletRequest request
    ) {
        MemberPrincipal verifiedPrincipal = emailVerificationService.verify(token);
        refreshSessionIfSameMember(request, verifiedPrincipal);
        return redirectTo(redirectUri);
    }

    private ResponseEntity<Void> redirectTo(URI redirectUri) {
        return ResponseEntity.status(HttpStatus.FOUND).location(redirectUri).build();
    }

    private void refreshSessionIfSameMember(HttpServletRequest request, MemberPrincipal verifiedPrincipal) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        refreshMatchingSession(session, verifiedPrincipal);
    }

    private void refreshMatchingSession(HttpSession session, MemberPrincipal verifiedPrincipal) {
        Object currentPrincipal = session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        if (currentPrincipal instanceof MemberPrincipal principal
                && principal.memberId() == verifiedPrincipal.memberId()) {
            session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, verifiedPrincipal);
        }
    }
}
