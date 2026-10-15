package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AuditionPostCompanyLinkService;
import art.yesulin.auditionpost.application.AuditionPostCompanyProfile;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.presentation.api.admin.WriteCompanyRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자가 공고 목록에서 그 공고를 올린 공연사의 정보를 바로 쓴다. 같은 원문 작성자의 공고는 같은 공연사 정보를 함께 쓴다.
 */
@RestController
@RequestMapping("/api/v1/admin/audition-posts/{postId}/company-profile")
@RequiredArgsConstructor
@LoginRequired
public class AdminAuditionPostCompanyProfileController {

    private final AuditionPostCompanyLinkService linkService;

    @GetMapping
    public ResponseEntity<AuditionPostCompanyProfile> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId
    ) {
        return ResponseEntity.ok(linkService.findPostCompany(postId));
    }

    @PutMapping
    public ResponseEntity<AdminCompanyResult> save(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId,
            @Valid @RequestBody SaveRequest request
    ) {
        return ResponseEntity.ok(linkService.savePostCompany(
                principal.memberId(), postId, request.company().toProfile(), request.publish()
        ));
    }

    /**
     * 공고의 공연사 정보를 저장한다.
     *
     * @param publish 저장하면서 공연사를 공개할지
     */
    public record SaveRequest(@Valid @NotNull WriteCompanyRequest company, boolean publish) {
    }
}
