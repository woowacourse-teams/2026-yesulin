package art.yesulin.auth.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.admin.AdminMemberService;
import art.yesulin.auth.application.admin.MemberStatusResult;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/members")
@RequiredArgsConstructor
@LoginRequired
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    @PatchMapping("/{memberId}/status")
    public ResponseEntity<MemberStatusResult> changeStatus(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long memberId,
            @Valid @RequestBody ChangeMemberStatusRequest request
    ) {
        MemberStatusResult result = adminMemberService.changeStatus(
                request.toCommand(principal.memberId(), memberId));
        return ResponseEntity.ok(result);
    }
}
