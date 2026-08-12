package art.yesulin.infrastructure.application;

import art.yesulin.application.application.ApplicantApplicationDetail;
import art.yesulin.application.application.ApplicantApplicationNotFoundException;
import art.yesulin.application.application.ApplicantApplicationQueryService;
import art.yesulin.application.application.ApplicantApplicationSummary;
import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.infrastructure.account.ApplicantJpaEntity;
import art.yesulin.infrastructure.account.ApplicantJpaRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ApplicantApplicationQueryServiceAdapter implements ApplicantApplicationQueryService {

    private final ApplicantJpaRepository applicantRepository;
    private final ApplicationJpaRepository applicationRepository;
    private final ApplicationSnapshotJpaRepository snapshotRepository;

    public ApplicantApplicationQueryServiceAdapter(
            ApplicantJpaRepository applicantRepository,
            ApplicationJpaRepository applicationRepository,
            ApplicationSnapshotJpaRepository snapshotRepository) {
        this.applicantRepository = applicantRepository;
        this.applicationRepository = applicationRepository;
        this.snapshotRepository = snapshotRepository;
    }

    @Override
    public List<ApplicantApplicationSummary> findAll(long accountId) {
        ApplicantJpaEntity applicant = findApplicant(accountId);
        return applicationRepository.findAllByApplicantIdOrderBySubmittedAtDesc(applicant.id()).stream()
                .map(application -> new ApplicantApplicationSummary(
                        application.id(), application.postingId(), application.submittedAt()))
                .toList();
    }

    @Override
    public ApplicantApplicationDetail findOne(long accountId, long applicationId) {
        ApplicantJpaEntity applicant = findApplicant(accountId);
        ApplicationJpaEntity application = applicationRepository
                .findByIdAndApplicantId(applicationId, applicant.id())
                .orElseThrow(() -> new ApplicantApplicationNotFoundException(applicationId));
        ApplicationSnapshotJpaEntity snapshot = snapshotRepository.findByApplicationId(application.id())
                .orElseThrow(() -> new IllegalStateException("지원서 스냅샷이 없습니다."));
        return new ApplicantApplicationDetail(
                application.id(), application.postingId(), application.submittedAt(),
                snapshot.schemaVersion(), snapshot.snapshotJson());
    }

    private ApplicantJpaEntity findApplicant(long accountId) {
        return applicantRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ApplicationSubmissionException(
                        "APPLICANT_REQUIRED", "지원자 계정이 필요합니다."));
    }
}
