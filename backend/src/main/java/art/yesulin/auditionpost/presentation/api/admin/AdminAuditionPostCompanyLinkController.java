package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AuditionPostCompanyAuthorOverview;
import art.yesulin.auditionpost.application.AuditionPostCompanyLinkResult;
import art.yesulin.auditionpost.application.AuditionPostCompanyLinkService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자가 원문 공고를 작성자별로 보고, 같은 작성자의 공고를 한 공연사로 묶는다. 묶으면 그 작성자의 기존 공고와 이후 가져오는
 * 공고가 그 공연사에 연결된다.
 */
@RestController
@RequestMapping("/api/v1/admin/audition-post-company-links")
@RequiredArgsConstructor
@LoginRequired
public class AdminAuditionPostCompanyLinkController {

    private final AuditionPostCompanyLinkService linkService;

    @GetMapping
    public ResponseEntity<AuditionPostCompanyAuthorOverview> findOverview(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(linkService.findOverview());
    }

    /** 원문 작성자를 이미 있는 공연사로 묶는다. 다른 공연사로 묶여 있었으면 그 작성자의 공고와 함께 옮긴다. */
    @PostMapping
    public ResponseEntity<AuditionPostCompanyLinkResult> link(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody LinkRequest request
    ) {
        return ResponseEntity.ok(linkService.link(
                principal.memberId(), request.source(), request.sourceAuthorId(), request.companyId()
        ));
    }

    /** 원문 작성자의 닉네임으로 검토 전 공연사를 새로 만들고 묶는다. */
    @PostMapping("/companies")
    public ResponseEntity<AuditionPostCompanyLinkResult> createCompany(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody AuthorRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(linkService.createCompany(principal.memberId(), request.source(), request.sourceAuthorId()));
    }

    /** 번호가 있고 아직 묶지 않은 원문 작성자마다 검토 전 공연사를 만든다. */
    @PostMapping("/companies/bulk")
    public ResponseEntity<BulkResult> createCompanies(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new BulkResult(linkService.createCompaniesForUnlinkedAuthors(principal.memberId())));
    }

    @DeleteMapping("/{linkId}")
    public ResponseEntity<Void> unlink(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long linkId
    ) {
        linkService.unlink(principal.memberId(), linkId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 원문 작성자 한 명을 고른다.
     *
     * @param source 원문 출처(예: {@code OTR})
     * @param sourceAuthorId 원문 작성자 회원 번호
     */
    public record AuthorRequest(@NotBlank String source, @NotBlank String sourceAuthorId) {
    }

    public record LinkRequest(
            @NotBlank String source,
            @NotBlank String sourceAuthorId,
            @NotNull @Positive Long companyId
    ) {
    }

    public record BulkResult(int createdCount) {
    }
}
