package art.yesulin.dormant.application.admin;

import static art.yesulin.dormant.domain.submission.SubmissionErrorCode.NOT_FOUND;

import art.yesulin.auth.application.admin.AdminDeletionConfirmation;
import art.yesulin.dormant.application.auditionnotice.NoticeStore;
import art.yesulin.dormant.domain.screening.ScreeningCompletionRepository;
import art.yesulin.dormant.domain.screening.ScreeningReviewRepository;
import art.yesulin.dormant.domain.submission.SelectedRole;
import art.yesulin.dormant.domain.submission.Submission;
import art.yesulin.dormant.domain.submission.SubmissionConsentRepository;
import art.yesulin.dormant.domain.submission.SubmissionRepository;
import art.yesulin.file.application.FileUsageService;
import art.yesulin.file.domain.FileReferenceRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
    private final FileUsageService fileUsageService;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminDeletionConfirmation deletionConfirmation;
    private final NoticeStore noticeStore;

    @Transactional
    public void delete(DeleteSubmissionCommand command) {
        deletionConfirmation.verify(command.actorMemberId(), command.confirmationPassword());
        noticeStore.lock();
        Submission submission = submissionRepository.findBySubmissionIdForUpdate(command.submissionId())
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "지원서를 찾을 수 없습니다."));
        final long internalSubmissionId = submission.getId();
        final UUID auditionId = submission.getAuditionSnapshot().publicAuditionId();
        final List<Long> roleIds = submission.getSelectedRoles().values().stream()
                .map(SelectedRole::auditionRoleId)
                .toList();

        noticeStore.eraseSubmission(submission.getSubmissionId());
        reviewRepository.deleteBySubmissionId(submission.getSubmissionId());
        completionRepository.deleteByAuditionRoleIdIn(roleIds);
        consentRepository.deleteBySubmissionId(submission.getSubmissionId());
        Set<Long> removedFileIds = fileReferenceRepository
                .findAllByReferenceTypeInAndReferenceId(SUBMISSION_REFERENCE_TYPES, internalSubmissionId)
                .stream().map(reference -> reference.getFileId()).collect(Collectors.toSet());
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(
                SUBMISSION_REFERENCE_TYPES, internalSubmissionId
        );
        fileUsageService.markReferencesRemoved(removedFileIds);
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
