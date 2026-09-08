package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.submission.Submission;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public final class AuditionScreening {

    private final long auditionRoleId;
    private final List<Submission> submissions;
    private final List<ScreeningStage> stages;
    private final ScreeningReviews reviews;
    private final Set<Long> completedStageIds;

    public AuditionScreening(
            long auditionRoleId,
            List<Submission> submissions,
            List<ScreeningStage> stages,
            List<ScreeningReview> reviews
    ) {
        this(auditionRoleId, submissions, stages, reviews, List.of());
    }

    public AuditionScreening(
            long auditionRoleId,
            List<Submission> submissions,
            List<ScreeningStage> stages,
            List<ScreeningReview> reviews,
            List<ScreeningCompletion> completions
    ) {
        this.auditionRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        this.submissions = List.copyOf(Objects.requireNonNull(submissions));
        this.stages = List.copyOf(Objects.requireNonNull(stages));
        this.reviews = new ScreeningReviews(this.auditionRoleId, reviews);
        this.completedStageIds = completedStageIds(completions);
        if (stages.isEmpty()) {
            throw new IllegalArgumentException("심사 전형은 한 개 이상이어야 합니다.");
        }
    }

    public List<Submission> applicantsFor(ScreeningRound round) {
        ensureExistingRound(round);
        return eligibleApplicantsFor(round, completedStageIds);
    }

    public List<ScreeningReview> review(
            List<UUID> submissionIds,
            ScreeningRound round,
            ScreeningReviewChange change
    ) {
        if (isRoundClosed(round)) {
            throw new BusinessException(INVALID_REVIEW, "마감된 전형은 수정할 수 없습니다.");
        }
        ensureReviewable(submissionIds, round);
        return reviews.apply(submissionIds, stageId(round), change);
    }

    /**
     * 현재 차수를 마감한다. 미선택 지원자는 PENDING으로 보존하고 PASS만 다음 차수 대상으로 승격한다.
     * 다음 차수에 대상이 없으면 그 이후 빈 차수도 함께 마감해 0명 합격 마감이 전형 종료로 이어지게 한다.
     */
    public Optional<Completion> complete(ScreeningRound round, Instant completedAt) {
        ensureExistingRound(round);
        if (isRoundClosed(round)) {
            return Optional.empty();
        }
        if (round.value() != activeRound().value()) {
            throw new BusinessException(
                    ScreeningReviewErrorCode.ROUND_NOT_READY, "현재 진행 중인 전형만 마감할 수 있습니다."
            );
        }

        Counts counts = countsOf(round);
        Set<Long> closingStageIds = completedStageIds;
        List<ScreeningCompletion> completions = new ArrayList<>();
        close(round, completedAt, closingStageIds, completions);

        for (int value = round.value() + 1; value <= stages.size(); value++) {
            ScreeningRound nextRound = new ScreeningRound(value);
            if (!eligibleApplicantsFor(nextRound, closingStageIds).isEmpty()) {
                break;
            }
            close(nextRound, completedAt, closingStageIds, completions);
        }

        boolean allRoundsClosed = closingStageIds.size() == stages.size();
        Integer nextRound = allRoundsClosed ? null : round.value() + 1;
        return Optional.of(new Completion(
                List.copyOf(completions), counts.pass(), counts.pending(),
                nextRound == null ? 0 : counts.pass(), nextRound, allRoundsClosed
        ));
    }

    public boolean isEligible(UUID submissionId, ScreeningRound round) {
        ensureExistingRound(round);
        return isEligibleInCurrentScreening(submissionId, round, completedStageIds);
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
                count(statuses, ScreeningReviewStatus.ETC)
        );
    }

    public ScreeningRound activeRound() {
        for (int value = 1; value <= stages.size(); value++) {
            ScreeningRound round = new ScreeningRound(value);
            if (!isRoundClosed(round)) {
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

    public boolean isCompleted() {
        return completedStageIds.size() == stages.size();
    }

    public boolean isRoundClosed(ScreeningRound round) {
        return completedStageIds.contains(stageId(round));
    }

    private void ensureReviewable(List<UUID> submissionIds, ScreeningRound round) {
        List<UUID> applicantIds = applicantsFor(round).stream().map(Submission::getSubmissionId).toList();
        if (!applicantIds.containsAll(submissionIds)) {
            throw new BusinessException(
                    NOT_FOUND, "현재 배역과 전형에서 심사할 지원서를 찾을 수 없습니다."
            );
        }
    }

    private List<Submission> eligibleApplicantsFor(ScreeningRound round, Set<Long> closedStageIds) {
        return submissions.stream()
                .filter(submission -> isEligibleInCurrentScreening(submission.getSubmissionId(), round, closedStageIds))
                .toList();
    }

    private boolean isEligibleInCurrentScreening(
            UUID submissionId,
            ScreeningRound round,
            Set<Long> closedStageIds
    ) {
        if (submissions.stream().noneMatch(submission -> submission.getSubmissionId().equals(submissionId))) {
            return false;
        }
        for (int previous = 1; previous < round.value(); previous++) {
            ScreeningRound previousRound = new ScreeningRound(previous);
            if (!closedStageIds.contains(stageId(previousRound))
                    || statusOf(submissionId, previousRound) != ScreeningReviewStatus.PASS) {
                return false;
            }
        }
        return true;
    }

    private ScreeningReviewStatus statusOf(UUID submissionId, ScreeningRound round) {
        return reviewOf(submissionId, round).map(ScreeningReview::getStatus).orElse(ScreeningReviewStatus.PENDING);
    }

    private int count(List<ScreeningReviewStatus> statuses, ScreeningReviewStatus status) {
        return (int) statuses.stream().filter(candidate -> candidate == status).count();
    }

    private void close(
            ScreeningRound round,
            Instant completedAt,
            Set<Long> closingStageIds,
            List<ScreeningCompletion> completions
    ) {
        long stageId = stageId(round);
        closingStageIds.add(stageId);
        completions.add(new ScreeningCompletion(auditionRoleId, stageId, completedAt));
    }

    private Set<Long> completedStageIds(List<ScreeningCompletion> completions) {
        return new HashSet<>(Objects.requireNonNull(completions).stream()
                .map(ScreeningCompletion::getScreeningStageId)
                .toList());
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

    public record Counts(int all, int pending, int done, int pass, int fail, int etc) {
    }

    public record Completion(
            List<ScreeningCompletion> records,
            int acceptedCount,
            int unselectedCount,
            int promotedCount,
            Integer nextRound,
            boolean allRoundsClosed
    ) {
    }
}
