package art.yesulin.audit.presentation.api;

import art.yesulin.audit.application.AuditResetResult;
import art.yesulin.audit.application.AuditResetService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pdf-reviews")
@LoginRequired
@RequiredArgsConstructor
@Profile({"local", "dev"})
@ConditionalOnExpression(AuditResetService.ENABLED)
public class AuditResetController {

    private final AuditResetService service;

    @DeleteMapping
    public ResponseEntity<AuditResetResult> reset(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.resetOwned(principal.memberId()));
    }
}
