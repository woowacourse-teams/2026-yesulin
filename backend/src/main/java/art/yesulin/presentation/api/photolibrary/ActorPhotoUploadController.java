package art.yesulin.presentation.api.photolibrary;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.domain.member.MemberType;
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

@RestController
@RequestMapping("/api/v1/actor-photos")
@RequiredArgsConstructor
@LoginRequired
public class ActorPhotoUploadController {

    private final FileService fileService;

    @PostMapping("/upload-requests")
    public ResponseEntity<FileUploadResult> upload(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @Valid @RequestBody ActorPhotoUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileService.requestUpload(principal.memberId(), request.toCommand()));
    }

    @PatchMapping("/{fileId}/completion")
    public ResponseEntity<Void> complete(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable long fileId
    ) {
        fileService.completeUpload(principal.memberId(), fileId);
        return ResponseEntity.noContent().build();
    }
}
