package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AuditionPostAuthorFillResult;
import art.yesulin.auditionpost.application.AuditionPostAuthorLinkResult;
import art.yesulin.auditionpost.application.AuditionPostAuthorLinkService;
import art.yesulin.auditionpost.application.AuditionPostOwnerOverview;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자가 공고를 업체별로 보고, 원문 작성자를 기획사에 자동 연결한다. 연결하면 그 작성자의 기존 공고와 이후 가져오는 공고가
 * 그 기획사에 연결된다.
 */
@RestController
@RequiredArgsConstructor
@LoginRequired
public class AdminAuditionPostAuthorLinkController {

    private final AuditionPostAuthorLinkService linkService;

    @GetMapping("/api/v1/admin/audition-post-owners")
    public ResponseEntity<AuditionPostOwnerOverview> findOverview(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(linkService.findOverview());
    }

    @PostMapping("/api/v1/admin/audition-post-author-links")
    public ResponseEntity<AuditionPostAuthorLinkResult> link(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody LinkAuditionPostAuthorRequest request
    ) {
        AuditionPostAuthorLinkResult result = linkService.link(
                principal.memberId(), request.source(), request.sourceAuthorId(), request.ownerId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/api/v1/admin/audition-post-author-links/{linkId}")
    public ResponseEntity<Void> unlink(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long linkId
    ) {
        linkService.unlink(principal.memberId(), linkId);
        return ResponseEntity.noContent().build();
    }

    /** 원문 작성자 번호가 없는 공고의 번호를 원문에서 읽어 채운다. 한 번에 일부만 읽고 이어서 읽을 위치를 돌려준다. */
    @PostMapping("/api/v1/admin/audition-post-author-links/fills")
    public ResponseEntity<AuditionPostAuthorFillResult> fillMissingAuthors(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestBody(required = false) FillAuditionPostAuthorsRequest request
    ) {
        return ResponseEntity.ok(linkService.fillMissingAuthors(request == null ? null : request.beforeId()));
    }
}
