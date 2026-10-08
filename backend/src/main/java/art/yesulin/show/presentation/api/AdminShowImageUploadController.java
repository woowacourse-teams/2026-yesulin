package art.yesulin.show.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
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

/** 운영자 공연의 포스터·상세 이미지를 공개 경로에 올린다. 공연을 등록한 운영자 계정의 파일이 된다. */
@RestController
@RequestMapping("/api/v1/admin/show-images")
@RequiredArgsConstructor
@LoginRequired
public class AdminShowImageUploadController {

    private final FileService fileService;

    @PostMapping("/upload-requests")
    public ResponseEntity<FileUploadResult> upload(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody ShowImageUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileService.requestPublicUpload(principal.memberId(), request.toCommand()));
    }

    @PatchMapping("/{fileId}/completion")
    public ResponseEntity<Void> complete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long fileId
    ) {
        fileService.completeUpload(principal.memberId(), fileId);
        return ResponseEntity.noContent().build();
    }
}
