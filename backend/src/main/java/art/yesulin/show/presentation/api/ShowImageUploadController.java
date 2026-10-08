package art.yesulin.show.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공연 포스터와 상세 이미지는 공개 경로에 올라가 관객 화면에서 로그인 없이 보인다. */
@RestController
@RequestMapping("/api/v1/show-images")
@RequiredArgsConstructor
@LoginRequired
public class ShowImageUploadController {

    private final FileService fileService;

    @PostMapping("/upload-requests")
    public ResponseEntity<FileUploadResult> upload(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody ShowImageUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileService.requestPublicUpload(principal.memberId(), request.toCommand()));
    }

    @PatchMapping("/{fileId}/completion")
    public ResponseEntity<Void> complete(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long fileId
    ) {
        fileService.completeUpload(principal.memberId(), fileId);
        return ResponseEntity.noContent().build();
    }
}
