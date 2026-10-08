package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AdminAuditionPostResult;
import art.yesulin.auditionpost.application.AuditionPostImportResult;
import art.yesulin.auditionpost.application.AuditionPostImportService;
import art.yesulin.auditionpost.application.AuditionPostService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 OTR 공고를 숨김으로 가져오고, 지원서를 준비한 뒤 공개하거나 제작사 요청으로 다시 숨긴다. */
@RestController
@RequestMapping("/api/v1/admin/audition-posts")
@RequiredArgsConstructor
@LoginRequired
public class AdminAuditionPostController {

    private final AuditionPostService auditionPostService;
    private final AuditionPostImportService importService;

    @GetMapping
    public ResponseEntity<AdminAuditionPostsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new AdminAuditionPostsResponse(auditionPostService.findAllForAdmin()));
    }

    /** 처음 가져오면 201, 이미 있던 공고를 원문으로 교체하면 200이다. */
    @PostMapping("/otr-imports")
    public ResponseEntity<AuditionPostImportResult> importOtr(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody ImportOtrAuditionPostRequest request
    ) {
        AuditionPostImportResult result = importService.importPost(principal.memberId(), request.otrId().trim());
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result);
    }

    @PatchMapping("/{postId}/status")
    public ResponseEntity<AdminAuditionPostResult> changeStatus(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId,
            @Valid @RequestBody ChangeAuditionPostStatusRequest request
    ) {
        return ResponseEntity.ok(auditionPostService.changeStatus(principal.memberId(), postId, request.status()));
    }
}
