package art.yesulin.operation.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.operation.application.log.AdminOtrRedirectService;
import art.yesulin.operation.application.log.OtrRedirectReport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/otr-redirects")
@RequiredArgsConstructor
@LoginRequired
public class AdminOtrRedirectController {

    private final AdminOtrRedirectService redirectService;

    @GetMapping
    public ResponseEntity<OtrRedirectReport> findStatistics(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "14") int days
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(redirectService.findStatistics(days));
    }
}
