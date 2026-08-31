package art.yesulin.application.admin;

import static art.yesulin.domain.submission.SubmissionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminSubmissionDeletionService {

    private static final String TARGET_TYPE = "SUBMISSION";
    private static final List<String> SUBMISSION_REFERENCE_TYPES = List.of(
            "SUBMISSION_PHOTO", "SUBMISSION_POSTER"
    );

    private final SubmissionRepository submissionRepository;
    private final SubmissionConsentRepository consentRepository;
    private final ScreeningReviewRepository reviewRepository;
    private final ScreeningCompletionRepository completionRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminDeletionConfirmation deletionConfirmation;

    @Transactional
    public void delete(DeleteSubmissionCommand command) {
        deletionConfirmation.verify(command.actorMemberId(), command.confirmationPassword());
        Submission submission = submissionRepository.findBySubmissionIdForUpdate(command.submissionId())
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "지원서를 찾을 수 없습니다."));
        final long internalSubmissionId = submission.getId();
        final UUID auditionId = submission.getAuditionSnapshot().publicAuditionId();
        final List<Long> roleIds = submission.getSelectedRoles().values().stream()
                .map(SelectedRole::auditionRoleId)
                .toList();

        reviewRepository.deleteBySubmissionId(submission.getSubmissionId());
        completionRepository.deleteByAuditionRoleIdIn(roleIds);
        consentRepository.deleteBySubmissionId(submission.getSubmissionId());
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(
                SUBMISSION_REFERENCE_TYPES, internalSubmissionId
        );
        submissionRepository.delete(submission);
        submissionRepository.flush();
        auditLogRepository.save(new AdminAuditLog(
                command.actorMemberId(),
                AdminAction.SUBMISSION_DELETED,
                TARGET_TYPE,
                internalSubmissionId,
                "audition=%s submission=%s".formatted(auditionId, submission.getSubmissionId())
        ));
    }
}
