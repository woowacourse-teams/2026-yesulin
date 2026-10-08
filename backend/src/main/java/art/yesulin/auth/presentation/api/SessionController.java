package art.yesulin.auth.presentation.api;

import art.yesulin.auth.application.AuthService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final AuthService authService;

    @PostMapping
    public ResponseEntity<SessionResponse> login(
            HttpServletRequest request,
            @Valid @RequestBody LoginRequest loginRequest
    ) {
        MemberPrincipal principal = authService.login(loginRequest.email(), loginRequest.password());

        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, principal);

        return ResponseEntity.ok(SessionResponse.from(principal));
    }

    @GetMapping("/current")
    @LoginRequired
    public ResponseEntity<SessionResponse> findCurrent(@LoginMember MemberPrincipal principal) {
        return ResponseEntity.ok(SessionResponse.from(principal));
    }

    @DeleteMapping("/current")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }
}
