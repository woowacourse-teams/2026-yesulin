package art.yesulin.presentation.api.submission;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionQueryService;
import art.yesulin.application.submission.SubmissionSummaryResult;
import art.yesulin.common.exception.BusinessException;
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
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/applicants/me/submissions")
@RequiredArgsConstructor
public class ApplicantSubmissionController {

    private final SubmissionQueryService submissionQueryService;
    private final FileService fileService;

    @GetMapping
    public ResponseEntity<ApplicantSubmissionListResponse> findAll(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal
    ) {
        Map<Long, String> posterUrlsByFileId = new HashMap<>();
        List<ApplicantSubmissionSummaryResponse> submissions =
                submissionQueryService.findAll(principal.memberId()).stream()
                        .map(result -> ApplicantSubmissionSummaryResponse.from(
                                result, posterUrl(result, posterUrlsByFileId)))
                        .toList();
        return ResponseEntity.ok(new ApplicantSubmissionListResponse(submissions));
    }

    /**
     * 포스터를 읽지 못한 공고 하나 때문에 배우의 지원 이력 전체가 사라지지 않도록
     * 실패한 포스터만 비워 둔다.
     */
    private String posterUrl(SubmissionSummaryResult result, Map<Long, String> posterUrlsByFileId) {
        if (result.posterFileId() == null || result.posterOwnerId() == null) {
            return null;
        }
        return posterUrlsByFileId.computeIfAbsent(result.posterFileId(), fileId -> {
            try {
                return fileService.readUrl(result.posterOwnerId(), fileId);
            } catch (BusinessException exception) {
                return null;
            }
        });
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<ApplicantSubmissionDetailResponse> find(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable UUID submissionId
    ) {
        long applicantId = principal.memberId();
        SubmissionDetailResult result = submissionQueryService.find(applicantId, submissionId);
        Map<Long, String> photoUrlsByFileId = new HashMap<>();
        for (SubmissionDetailResult.PhotoRequirementAnswerResult answer
                : result.formAnswers().photoRequirementAnswers()) {
            photoUrlsByFileId.computeIfAbsent(
                    answer.fileId(), fileId -> fileService.readUrl(applicantId, fileId)
            );
        }
        return ResponseEntity.ok(ApplicantSubmissionDetailResponse.from(result, photoUrlsByFileId));
    }
}
