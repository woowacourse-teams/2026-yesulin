package art.yesulin.presentation.api.submission;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionQueryService;
import java.util.List;
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
        List<String> photoUrls = result.formAnswers().photoRequirementAnswers().stream()
                .map(answer -> fileService.readUrl(applicantId, answer.fileId()))
                .toList();
        return ResponseEntity.ok(ApplicantSubmissionDetailResponse.from(result, photoUrls));
    }
}
