package art.yesulin.auth.presentation.api;

import art.yesulin.auth.application.EmailVerificationService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/email-verifications")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

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
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectUri)
                .build();
    }

    private void refreshSessionIfSameMember(HttpServletRequest request, MemberPrincipal verifiedPrincipal) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        Object currentPrincipal = session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        if (currentPrincipal instanceof MemberPrincipal principal
                && principal.memberId() == verifiedPrincipal.memberId()) {
            session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, verifiedPrincipal);
        }
    }
}
