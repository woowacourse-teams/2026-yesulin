package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.submission.Submission;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public final class AuditionScreening {

    private final List<Submission> submissions;
    private final List<ScreeningStage> stages;
    private final ScreeningReviews reviews;

    public AuditionScreening(
            long auditionRoleId,
            List<Submission> submissions,
            List<ScreeningStage> stages,
            List<ScreeningReview> reviews
    ) {
        this.submissions = List.copyOf(Objects.requireNonNull(submissions));
        this.stages = List.copyOf(Objects.requireNonNull(stages));
        long validRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        this.reviews = new ScreeningReviews(validRoleId, reviews);
        if (stages.isEmpty()) {
            throw new IllegalArgumentException("심사 전형은 한 개 이상이어야 합니다.");
        }
    }

    public List<Submission> applicantsFor(ScreeningRound round) {
        ensureExistingRound(round);
        return submissions.stream().filter(submission -> isEligible(submission.getSubmissionId(), round)).toList();
    }

    public List<ScreeningReview> review(
            List<UUID> submissionIds,
            ScreeningRound round,
            ScreeningReviewChange change
    ) {
        ensureReviewable(submissionIds, round);
        return reviews.apply(submissionIds, stageId(round), change);
    }

    public boolean isEligible(UUID submissionId, ScreeningRound round) {
        ensureExistingRound(round);
        if (submissions.stream().noneMatch(submission -> submission.getSubmissionId().equals(submissionId))) {
            return false;
        }
        for (int previous = 1; previous < round.value(); previous++) {
            if (statusOf(submissionId, new ScreeningRound(previous)) != ScreeningReviewStatus.PASS) {
                return false;
            }
        }
        return true;
    }

    public Optional<ScreeningReview> reviewOf(UUID submissionId, ScreeningRound round) {
        return reviews.find(submissionId, stageId(round));
    }

    public Counts countsOf(ScreeningRound round) {
        List<ScreeningReviewStatus> statuses = applicantsFor(round).stream()
                .map(submission -> statusOf(submission.getSubmissionId(), round))
                .toList();
        int pending = count(statuses, ScreeningReviewStatus.PENDING);
        return new Counts(
                statuses.size(), pending, statuses.size() - pending,
                count(statuses, ScreeningReviewStatus.PASS), count(statuses, ScreeningReviewStatus.FAIL),
                count(statuses, ScreeningReviewStatus.ABSENT), count(statuses, ScreeningReviewStatus.ETC)
        );
    }

    public ScreeningRound activeRound() {
        for (int value = 1; value <= stages.size(); value++) {
            ScreeningRound round = new ScreeningRound(value);
            if (countsOf(round).pending() > 0) {
                return round;
            }
        }
        return new ScreeningRound(stages.size());
    }

    public int applicantCount() {
        return submissions.size();
    }

    public int roundCount() {
        return stages.size();
    }

    public String roundName(ScreeningRound round) {
        return stage(round).getName();
    }

    private void ensureReviewable(List<UUID> submissionIds, ScreeningRound round) {
        List<UUID> applicantIds = applicantsFor(round).stream().map(Submission::getSubmissionId).toList();
        if (!applicantIds.containsAll(submissionIds)) {
            throw new BusinessException(
                    NOT_FOUND, "현재 배역과 전형에서 심사할 지원서를 찾을 수 없습니다."
            );
        }
    }

    private ScreeningReviewStatus statusOf(UUID submissionId, ScreeningRound round) {
        return reviewOf(submissionId, round).map(ScreeningReview::getStatus).orElse(ScreeningReviewStatus.PENDING);
    }

    private int count(List<ScreeningReviewStatus> statuses, ScreeningReviewStatus status) {
        return (int) statuses.stream().filter(candidate -> candidate == status).count();
    }

    private long stageId(ScreeningRound round) {
        Long stageId = stage(round).getId();
        if (stageId == null) {
            throw new IllegalStateException("저장되지 않은 심사 전형입니다.");
        }
        return stageId;
    }

    private ScreeningStage stage(ScreeningRound round) {
        ensureExistingRound(round);
        return stages.get(round.stageOrder());
    }

    private void ensureExistingRound(ScreeningRound round) {
        Objects.requireNonNull(round);
        if (round.value() > stages.size()) {
            throw new BusinessException(NOT_FOUND, "심사할 전형을 찾을 수 없습니다.");
        }
    }

    public record Counts(int all, int pending, int done, int pass, int fail, int absent, int etc) {
    }
}
