package art.yesulin.file.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.admin.AdminFileDeletionService;
import art.yesulin.file.application.admin.BatchFileDeletionResult;
import art.yesulin.file.application.report.UnusedFileQueryService;
import art.yesulin.file.application.report.UnusedFilesResult;
import art.yesulin.file.domain.FileStatus;
import jakarta.validation.Valid;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/files")
@RequiredArgsConstructor
@LoginRequired
public class AdminFileController {

    private final UnusedFileQueryService queryService;
    private final AdminFileDeletionService deletionService;

    @GetMapping("/unreferenced")
    public ResponseEntity<UnusedFilesResult> findUnreferenced(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @RequestParam(required = false) FileStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(queryService.find(Optional.ofNullable(status), page, size));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable long fileId,
            @Valid @RequestBody DeleteAdminFileRequest request
    ) {
        deletionService.delete(principal.memberId(), fileId, request.confirmationPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/deletions")
    public ResponseEntity<BatchFileDeletionResult> deleteSelected(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody BatchDeleteAdminFilesRequest request
    ) {
        return ResponseEntity.ok(deletionService.deleteBatch(
                principal.memberId(), request.fileIds(), request.confirmationPassword()));
    }
}
