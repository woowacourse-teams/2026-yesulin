package art.yesulin.presentation.session;

import art.yesulin.application.company.CompanyContextService;
import art.yesulin.infrastructure.security.ActiveCompanySession;
import art.yesulin.infrastructure.security.SessionPrincipal;
import art.yesulin.infrastructure.security.SessionPrincipalResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {

    private final AuthenticationManager authenticationManager;
    private final SessionPrincipalResolver principalResolver;
    private final CompanyContextService companyContextService;
    private final HttpSessionSecurityContextRepository contextRepository;

    public SessionController(
            AuthenticationManager authenticationManager,
            SessionPrincipalResolver principalResolver,
            CompanyContextService companyContextService) {
        this.authenticationManager = authenticationManager;
        this.principalResolver = principalResolver;
        this.companyContextService = companyContextService;
        this.contextRepository = new HttpSessionSecurityContextRepository();
    }

    @PostMapping
    public SessionResponse login(
            @Valid @RequestBody LoginRequest request,
            CsrfToken csrfToken,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        request.email().toLowerCase(), request.password()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        HttpSession session = httpRequest.getSession();
        httpRequest.changeSessionId();
        contextRepository.saveContext(context, httpRequest, httpResponse);
        SessionPrincipal principal = principalResolver.resolve(authentication);
        Long activeCompanyId = companyContextService.initialCompanyId(principal.accountId());
        if (activeCompanyId != null) {
            ActiveCompanySession.select(session, activeCompanyId);
        } else {
            ActiveCompanySession.clear(session);
        }
        return SessionResponse.authenticated(
                principal.accountId(), principal.email(), activeCompanyId, csrfToken.getToken());
    }

    @GetMapping("/current")
    public SessionResponse current(
            Authentication authentication, CsrfToken csrfToken, HttpServletRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return SessionResponse.anonymous(csrfToken.getToken());
        }
        SessionPrincipal principal = principalResolver.resolve(authentication);
        HttpSession session = request.getSession();
        return SessionResponse.authenticated(
                principal.accountId(), principal.email(),
                ActiveCompanySession.find(session), csrfToken.getToken());
    }

    @PutMapping("/current/active-company")
    public SessionResponse selectActiveCompany(
            @Valid @RequestBody ActiveCompanyRequest request,
            Authentication authentication,
            CsrfToken csrfToken,
            HttpServletRequest httpRequest) {
        SessionPrincipal principal = principalResolver.resolve(authentication);
        companyContextService.requireMembership(principal.accountId(), request.companyId());
        ActiveCompanySession.select(httpRequest.getSession(), request.companyId());
        return SessionResponse.authenticated(
                principal.accountId(), principal.email(), request.companyId(), csrfToken.getToken());
    }

    @DeleteMapping("/current")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }
}
