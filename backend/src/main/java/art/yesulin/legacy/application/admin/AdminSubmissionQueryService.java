package art.yesulin.legacy.application.admin;

import static art.yesulin.legacy.domain.submission.SubmissionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.legacy.application.submission.SubmissionDetailResult;
import art.yesulin.legacy.domain.submission.Submission;
import art.yesulin.legacy.domain.submission.SubmissionConsent;
import art.yesulin.legacy.domain.submission.SubmissionConsentRepository;
import art.yesulin.legacy.domain.submission.SubmissionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminSubmissionQueryService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionConsentRepository consentRepository;

    @Transactional(readOnly = true)
    public List<AdminSubmissionSummaryResult> findAll(UUID auditionId) {
        return submissionRepository
                .findAllByAuditionSnapshotPublicAuditionIdOrderBySubmittedAtDescIdDesc(auditionId)
                .stream()
                .map(AdminSubmissionSummaryResult::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionDetailResult find(UUID submissionId) {
        Submission submission = submissionRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "지원서를 찾을 수 없습니다."));
        List<SubmissionConsent> consents = consentRepository.findAllBySubmissionId(submissionId);
        return SubmissionDetailResult.from(submission, consents);
    }
}
