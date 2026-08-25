package art.yesulin.application.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.screening.AuditionScreening;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningRound;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScreeningReviewService {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final SubmissionRepository submissionRepository;
    private final ScreeningReviewRepository reviewRepository;
    private final ScreeningCompletionRepository completionRepository;
    private final Clock clock;

    @Transactional
    public ScreeningReviewsResult save(long ownerId, long roleId, int round, SaveScreeningReviewsCommand command) {
        ScreeningRound screeningRound = new ScreeningRound(round);
        long auditionId = findAuditionId(roleId);
        Audition audition = findAuditionForUpdate(ownerId, auditionId);
        AuditionScreening screening = findScreening(audition.getId(), roleId);
        List<ScreeningReview> changedReviews = screening.review(
                command.submissionIds(), screeningRound, command.toChange()
        );
        List<ScreeningReview> savedReviews = reviewRepository.saveAll(changedReviews);
        return ScreeningReviewsResult.from(roleId, screeningRound, savedReviews);
    }

    @Transactional
    public void complete(long ownerId, long roleId) {
        long auditionId = findAuditionId(roleId);
        Audition audition = findAuditionForUpdate(ownerId, auditionId);
        AuditionScreening screening = findScreening(audition.getId(), roleId);
        screening.complete(Instant.now(clock)).ifPresent(completionRepository::save);
    }

    private long findAuditionId(long roleId) {
        return roleSectionRepository.findAuditionIdByRoleId(roleId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고 배역이 없습니다."));
    }

    private Audition findAuditionForUpdate(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고를 찾을 수 없습니다."));
    }

    private AuditionScreening findScreening(long auditionId, long roleId) {
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(auditionId)
                .orElseThrow(() -> new IllegalStateException("공고의 일정 정보를 찾을 수 없습니다."));
        List<Submission> submissions = submissionRepository.findAllForScreening(auditionId, roleId);
        List<ScreeningReview> reviews = submissions.isEmpty()
                ? List.of()
                : reviewRepository.findAllByAuditionRoleIdAndSubmissionIdIn(roleId, submissionIds(submissions));
        boolean completed = completionRepository.existsByAuditionRoleId(roleId);
        return new AuditionScreening(roleId, submissions, schedule.getStages(), reviews, completed);
    }

    private List<UUID> submissionIds(List<Submission> submissions) {
        return submissions.stream().map(Submission::getSubmissionId).toList();
    }
}
