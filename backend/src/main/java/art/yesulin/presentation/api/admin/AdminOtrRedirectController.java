package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.log.AdminOtrRedirectService;
import art.yesulin.application.admin.log.OtrRedirectReport;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.member.MemberType;
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
