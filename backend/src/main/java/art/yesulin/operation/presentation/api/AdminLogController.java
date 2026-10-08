package art.yesulin.operation.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.operation.application.log.AdminLogService;
import art.yesulin.operation.application.log.LogQuery;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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
            @RequestParam(defaultValue = "" + LogQuery.DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(AdminLogResponse.from(adminLogService.findRecent(keyword, limit, date)));
    }
}
