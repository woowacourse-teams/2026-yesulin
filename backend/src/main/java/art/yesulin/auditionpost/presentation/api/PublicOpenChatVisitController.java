package art.yesulin.auditionpost.presentation.api;

import art.yesulin.auditionpost.application.OpenChatVisitService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicOpenChatVisitController {

    private final OpenChatVisitService service;

    @PostMapping("/audition-posts/{postId}/openchat-visits")
    public ResponseEntity<Void> recordPost(
            @PathVariable long postId,
            HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            service.recordPost(postId);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/otr/{externalId}/openchat-visits")
    public ResponseEntity<Void> recordOtr(
            @PathVariable String externalId,
            HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            service.recordOtr(externalId);
        }
        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object value = session == null ? null : session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        return value instanceof MemberPrincipal principal && principal.role() == MemberType.ADMIN;
    }

}
