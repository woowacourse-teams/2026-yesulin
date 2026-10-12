package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AdminAuditionPostResult;
import art.yesulin.auditionpost.application.AuditionPostEditResult;
import art.yesulin.auditionpost.application.AuditionPostImportResult;
import art.yesulin.auditionpost.application.AuditionPostImportService;
import art.yesulin.auditionpost.application.AuditionPostService;
import art.yesulin.auditionpost.application.AuditionPostUploadResult;
import art.yesulin.auditionpost.application.AuditionPostUploadService;
import art.yesulin.auditionpost.application.AuditionPostWriteService;
import art.yesulin.auditionpost.presentation.api.PrepareAuditionPostUploadRequest;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자가 OTR 공고를 숨김으로 가져오거나 직접 쓰고, 내용을 고친 뒤 공개하거나 제작사 요청으로 다시 숨긴다.
 * 공고를 기획사 계정에 연결하면 그 기획사가 직접 고칠 수 있다.
 */
@RestController
@RequestMapping("/api/v1/admin/audition-posts")
@RequiredArgsConstructor
@LoginRequired
public class AdminAuditionPostController {

    private final AuditionPostService auditionPostService;
    private final AuditionPostImportService importService;
    private final AuditionPostWriteService writeService;
    private final AuditionPostUploadService uploadService;

    @GetMapping
    public ResponseEntity<AdminAuditionPostsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new AdminAuditionPostsResponse(auditionPostService.findAllForAdmin()));
    }

    /** 원문 없이 쓴 공고는 숨김으로 만든다. */
    @PostMapping
    public ResponseEntity<AdminAuditionPostResult> write(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody WriteAuditionPostRequest request
    ) {
        AdminAuditionPostResult result = writeService.write(principal.memberId(), request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /** 사진·첨부를 브라우저가 저장소로 바로 올릴 주소를 준다. 공고를 저장할 때 공개 주소로 이 업로드를 확정한다. */
    @PostMapping("/uploads")
    public ResponseEntity<AuditionPostUploadResult> prepareUpload(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody PrepareAuditionPostUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadService.prepare(
                principal.memberId(), request.kind(), request.filename(), request.contentType(), request.size()
        ));
    }

    /** 처음 가져오면 201, 이미 있던 공고를 원문으로 교체하면 200이다. */
    @PostMapping("/otr-imports")
    public ResponseEntity<AuditionPostImportResult> importOtr(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody ImportOtrAuditionPostRequest request
    ) {
        AuditionPostImportResult result = importService.importPost(
                principal.memberId(), request.otrId().trim(), request.shouldOverwriteEdited()
        );
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result);
    }

    @GetMapping("/{postId}")
    public ResponseEntity<AuditionPostEditResult> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId
    ) {
        return ResponseEntity.ok(writeService.findForEdit(postId));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<AdminAuditionPostResult> edit(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId,
            @Valid @RequestBody WriteAuditionPostRequest request
    ) {
        return ResponseEntity.ok(writeService.edit(principal.memberId(), postId, request.toCommand()));
    }

    /** 연결을 끊으려면 {@code ownerId}를 null로 보낸다. */
    @PatchMapping("/{postId}/owner")
    public ResponseEntity<AdminAuditionPostResult> changeOwner(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long postId,
            @RequestBody ChangeAuditionPostOwnerRequest request
    ) {
        return ResponseEntity.ok(writeService.changeOwner(principal.memberId(), postId, request.ownerId()));
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
