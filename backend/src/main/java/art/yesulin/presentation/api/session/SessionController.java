package art.yesulin.presentation.api.session;

import art.yesulin.application.auth.AuthService;
import art.yesulin.application.auth.MemberPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
}
