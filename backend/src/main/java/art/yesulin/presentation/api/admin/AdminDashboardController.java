package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminDashboardService;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.query.AdminActivity;
import art.yesulin.domain.admin.query.AdminMemberStats;
import art.yesulin.domain.admin.query.AdminOverview;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.show.ShowStatus;
import art.yesulin.legacy.domain.audition.AuditionStatus;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@LoginRequired
@Validated
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/overview")
    public ResponseEntity<AdminOverview> findOverview(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(adminDashboardService.findOverview());
    }

    @GetMapping("/member-stats")
    public ResponseEntity<AdminMemberStats> findMemberStats(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(adminDashboardService.findMemberStats());
    }

    @GetMapping("/activity")
    public ResponseEntity<AdminActivity> findActivity(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(adminDashboardService.findActivity());
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

    @GetMapping("/shows")
    public ResponseEntity<AdminShowsResponse> findShows(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) ShowStatus status
    ) {
        return ResponseEntity.ok(new AdminShowsResponse(adminDashboardService.findShows(status)));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<AdminAuditLogsResponse> findAuditLogs(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(defaultValue = "0") @Min(0) int page
    ) {
        Page<AdminAuditLog> auditLogs = adminDashboardService.findAuditLogs(page);
        List<AdminAuditLogResponse> logs = auditLogs.getContent().stream()
                .map(AdminAuditLogResponse::from)
                .toList();
        return ResponseEntity.ok(new AdminAuditLogsResponse(
                logs,
                auditLogs.getNumber(),
                auditLogs.getSize(),
                auditLogs.getTotalElements(),
                auditLogs.getTotalPages()
        ));
    }
}
