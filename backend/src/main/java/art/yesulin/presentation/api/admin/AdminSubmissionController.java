package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminSubmissionDeletionService;
import art.yesulin.application.admin.AdminSubmissionQueryService;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.domain.member.MemberType;
import art.yesulin.presentation.api.submission.ApplicantSubmissionDetailResponse;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@LoginRequired
public class AdminSubmissionController {

    private final AdminSubmissionQueryService queryService;
    private final AdminSubmissionDeletionService deletionService;
    private final FileService fileService;

    @GetMapping("/auditions/{auditionId}/submissions")
    public ResponseEntity<AdminSubmissionsResponse> findAll(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID auditionId
    ) {
        return ResponseEntity.ok(new AdminSubmissionsResponse(queryService.findAll(auditionId)));
    }

    @GetMapping("/submissions/{submissionId}")
    public ResponseEntity<ApplicantSubmissionDetailResponse> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID submissionId
    ) {
        SubmissionDetailResult result = queryService.find(submissionId);
        String posterUrl = fileService.readPublicUrl(result.posterOwnerId(), result.posterFileId());
        Map<Long, String> photoUrlsByFileId = new HashMap<>();
        for (SubmissionDetailResult.PhotoRequirementAnswerResult answer
                : result.formAnswers().photoRequirementAnswers()) {
            photoUrlsByFileId.computeIfAbsent(answer.fileId(), fileService::privateContentUrl);
        }
        return ResponseEntity.ok(ApplicantSubmissionDetailResponse.from(result, posterUrl, photoUrlsByFileId));
    }

    @DeleteMapping("/submissions/{submissionId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID submissionId,
            @Valid @RequestBody DeleteAdminSubmissionRequest request
    ) {
        deletionService.delete(request.toCommand(principal.memberId(), submissionId));
        return ResponseEntity.noContent().build();
    }
}
