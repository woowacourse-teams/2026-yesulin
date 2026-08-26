package art.yesulin.presentation.api.performance;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.domain.member.MemberStatus;
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
@RequestMapping("/api/v1/performance-posters")
@RequiredArgsConstructor
@LoginRequired
public class PerformancePosterUploadController {

    private final FileService fileService;

    @PostMapping("/upload-requests")
    public ResponseEntity<FileUploadResult> upload(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody PerformancePosterUploadRequest request
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
