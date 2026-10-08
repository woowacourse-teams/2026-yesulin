package art.yesulin.show.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.show.application.admin.AdminShowHostNameResult;
import art.yesulin.show.application.admin.AdminShowService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 무료 공연의 관객 표시 정보를 고친다. 조회는 {@code AdminDashboardController}가 맡는다. */
@RestController
@RequestMapping("/api/v1/admin/shows")
@RequiredArgsConstructor
@LoginRequired
public class AdminShowController {

    private final AdminShowService adminShowService;

    @PutMapping("/{showId}/host-name")
    public ResponseEntity<AdminShowHostNameResult> changeHostName(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId,
            @Valid @RequestBody ChangeShowHostNameRequest request
    ) {
        return ResponseEntity.ok(adminShowService.changeHostName(request.toCommand(principal.memberId(), showId)));
    }
}
