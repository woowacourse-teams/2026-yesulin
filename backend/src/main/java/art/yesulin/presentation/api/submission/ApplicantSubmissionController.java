package art.yesulin.presentation.api.submission;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.annotation.LoginMember;
import art.yesulin.application.auth.annotation.LoginRequired;
import art.yesulin.application.file.FileService;
import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionQueryService;
import art.yesulin.application.submission.SubmissionSummaryResult;
import art.yesulin.domain.member.MemberType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applicants/me/submissions")
@RequiredArgsConstructor
@LoginRequired
public class ApplicantSubmissionController {

    private final SubmissionQueryService submissionQueryService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ApplicantSubmissionListResponse> findAll(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal
    ) {
        List<SubmissionSummaryResult> results = submissionQueryService.findAll(principal.memberId());
        Map<Long, String> posterUrlsByFileId = new HashMap<>();
        for (SubmissionSummaryResult result : results) {
            posterUrlsByFileId.computeIfAbsent(
                    result.posterFileId(), fileId -> fileService.readPublicUrl(result.posterOwnerId(), fileId)
            );
        }
        return ResponseEntity.ok(ApplicantSubmissionListResponse.from(results, posterUrlsByFileId));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<ApplicantSubmissionDetailResponse> find(
            @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal principal,
            @PathVariable UUID submissionId
    ) {
        long applicantId = principal.memberId();
        SubmissionDetailResult result = submissionQueryService.find(applicantId, submissionId);
        String posterUrl = fileService.readPublicUrl(result.posterOwnerId(), result.posterFileId());
        Map<Long, String> photoUrlsByFileId = new HashMap<>();
        for (SubmissionDetailResult.PhotoRequirementAnswerResult answer
                : result.formAnswers().photoRequirementAnswers()) {
            photoUrlsByFileId.computeIfAbsent(
                    answer.fileId(), fileService::privateContentUrl
            );
        }
        return ResponseEntity.ok(ApplicantSubmissionDetailResponse.from(result, posterUrl, photoUrlsByFileId));
    }
}
