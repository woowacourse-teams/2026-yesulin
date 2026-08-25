package art.yesulin.application.submission;

import static art.yesulin.domain.submission.SubmissionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.domain.submission.SubmissionSelectedRoleProjection;
import art.yesulin.domain.submission.SubmissionSummaryRow;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SubmissionQueryService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionConsentRepository consentRepository;

    @Transactional(readOnly = true)
    public List<SubmissionSummaryResult> findAll(long applicantId) {
        List<SubmissionSummaryRow> summaries = submissionRepository.findSummaryRowsByApplicantId(applicantId);
        if (summaries.isEmpty()) {
            return List.of();
        }
        Map<Long, List<SubmissionSelectedRoleResult>> selectedRoles = findSelectedRoles(summaries);
        return summaries.stream()
                .map(summary -> SubmissionSummaryResult.of(
                        summary, selectedRoles.getOrDefault(summary.submissionDatabaseId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionDetailResult find(long applicantId, UUID submissionId) {
        Submission submission = submissionRepository.findBySubmissionIdAndApplicantId(submissionId, applicantId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "지원서를 찾을 수 없습니다."));
        List<SubmissionConsent> consents = consentRepository.findAllBySubmissionId(submissionId);
        return SubmissionDetailResult.from(submission, consents);
    }

    private Map<Long, List<SubmissionSelectedRoleResult>> findSelectedRoles(
            List<SubmissionSummaryRow> summaries
    ) {
        List<Long> submissionIds = summaries.stream().map(SubmissionSummaryRow::submissionDatabaseId).toList();
        Map<Long, List<SubmissionSelectedRoleResult>> selectedRoles = new LinkedHashMap<>();
        for (SubmissionSelectedRoleProjection role : submissionRepository.findSelectedRolesBySubmissionIds(
                submissionIds
        )) {
            selectedRoles.computeIfAbsent(role.getSubmissionDatabaseId(), key -> new ArrayList<>())
                    .add(new SubmissionSelectedRoleResult(role.getRoleId(), role.getRoleName()));
        }
        return selectedRoles;
    }
}
