package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminDashboardService;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.admin.query.AdminOverview;
import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@LoginRequired
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/overview")
    public ResponseEntity<AdminOverview> findOverview(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(adminDashboardService.findOverview());
    }

    @GetMapping("/producers")
    public ResponseEntity<AdminProducersResponse> findProducers(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) MemberStatus status
    ) {
        return ResponseEntity.ok(new AdminProducersResponse(adminDashboardService.findProducers(status)));
    }

    @GetMapping("/auditions")
    public ResponseEntity<AdminAuditionsResponse> findAuditions(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) AuditionStatus status
    ) {
        return ResponseEntity.ok(new AdminAuditionsResponse(adminDashboardService.findAuditions(status)));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<AdminAuditLogsResponse> findAuditLogs(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        List<AdminAuditLogResponse> logs = adminDashboardService.findRecentAuditLogs().stream()
                .map(AdminAuditLogResponse::from)
                .toList();
        return ResponseEntity.ok(new AdminAuditLogsResponse(logs));
    }
}
