package art.yesulin.actor.presentation.api.profile;

import art.yesulin.actor.application.profile.ApplicantProfileResult;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/profile")
@RequiredArgsConstructor
@LoginRequired
public class ApplicantProfileController {

    private final ApplicantProfileService profileService;

    @GetMapping
    public ResponseEntity<ApplicantProfileResult> find(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(profileService.find(principal.memberId()));
    }

    @PatchMapping
    public ResponseEntity<ApplicantProfileResult> update(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody UpdateApplicantProfileRequest request
    ) {
        return ResponseEntity.ok(profileService.update(principal.memberId(), request.toCommand()));
    }
}
