package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.log.AdminLogService;
import art.yesulin.application.admin.log.LogQuery;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/logs")
@RequiredArgsConstructor
@LoginRequired
public class AdminLogController {

    private final AdminLogService adminLogService;

    @GetMapping
    public ResponseEntity<AdminLogResponse> findRecent(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "" + LogQuery.DEFAULT_LIMIT) int limit
    ) {
        return ResponseEntity.ok(AdminLogResponse.from(adminLogService.findRecent(keyword, limit)));
    }
}
