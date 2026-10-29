package art.yesulin.auth.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.application.memberlink.MemberLinkCodeResult;
import art.yesulin.auth.application.memberlink.MemberLinkCodeService;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/member-link-code")
@LoginRequired
@RequiredArgsConstructor
public class ApplicantMemberLinkCodeController {

    private final MemberLinkCodeService service;

    @PostMapping
    public ResponseEntity<MemberLinkCodeResult> issue(
            @LoginMember(roles = MemberType.APPLICANT, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.issue(principal.memberId()));
    }
}
