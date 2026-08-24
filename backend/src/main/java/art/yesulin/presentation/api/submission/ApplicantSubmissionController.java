package art.yesulin.presentation.api.submission;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionQueryService;
import java.util.HashMap;
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
        return ResponseEntity.ok(new ApplicantSubmissionListResponse(
                submissionQueryService.findAll(principal.memberId())
        ));
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
