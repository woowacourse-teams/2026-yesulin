package art.yesulin.application.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRole;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import java.time.Period;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

record ScreeningBoardContext(
        ScreeningReviewTarget target,
        Performance performance,
        PerformanceRole performanceRole,
        AuditionRole role,
        AuditionSchedule schedule,
        List<ScreeningSubmissionView> submissions,
        List<ScreeningReview> reviews
) {

    ScreeningBoardResult toBoardResult() {
        int round = target.round().value();
        List<ScreeningApplicantResult> roundSubmissions = submissionsFor(round).stream().map(this::toResult).toList();
        ScreeningReviewCountsResult counts = countsFor(round);
        return new ScreeningBoardResult(
                performanceResult(), postingResult(), roleResult(counts), round, roundResults(), roundSubmissions
        );
    }

    ScreeningSubmissionDetailResult toDetailResult(UUID submissionId) {
        ScreeningSubmissionView submission = submissionsFor(target.round().value()).stream()
                .filter(candidate -> candidate.id().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 지원서를 찾을 수 없습니다."));
        ScreeningReviewCountsResult counts = countsFor(target.round().value());
        return new ScreeningSubmissionDetailResult(
                performanceResult(),
                postingResult(),
                roleResult(counts),
                target.round().value(),
                roundResults(),
                toResult(submission)
        );
    }

    private List<ScreeningSubmissionView> submissionsFor(int round) {
        return submissions.stream().filter(submission -> qualifiesFor(submission.id(), round)).toList();
    }

    private ScreeningApplicantResult toResult(ScreeningSubmissionView submission) {
        int round = target.round().value();
        int age = Period.between(submission.birthDate(), target.audition().getPerformanceStartDate()).getYears();
        return new ScreeningApplicantResult(
                submission.id(),
                submission.name(),
                submission.gender(),
                age,
                submission.height(),
                submission.weight(),
                target.roleId(),
                performanceRole.getName(),
                submission.birthDate(),
                submission.phone(),
                submission.email(),
                submission.school(),
                submission.submittedAt(),
                submission.career().stream()
                        .map(career -> new ScreeningApplicantResult.Career(
                                career.year(), career.title(), career.part()
                        ))
                        .toList(),
                submission.coverLetter(),
                submission.motivation(),
                submission.photos().stream()
                        .map(photo -> new ScreeningApplicantResult.Photo(photo.label(), photo.url()))
                        .toList(),
                submission.videos().stream()
                        .map(video -> new ScreeningApplicantResult.Video(video.label(), video.url()))
                        .toList(),
                reviewFor(submission.id(), round),
                reviewHistory(submission.id()),
                mismatchReasons(submission.gender(), age)
        );
    }

    private ScreeningPerformanceResult performanceResult() {
        return new ScreeningPerformanceResult(
                performance.getId(), performance.getPosterFileId(), performance.getTitle()
        );
    }

    private ScreeningPostingResult postingResult() {
        Audition audition = target.audition();
        return new ScreeningPostingResult(audition.getPublicId(), audition.getTitle(), false);
    }

    private ScreeningRoleResult roleResult(ScreeningReviewCountsResult counts) {
        AuditionRoleCondition condition = role.getCondition();
        return new ScreeningRoleResult(
                target.roleId(),
                target.audition().getPublicId(),
                performanceRole.getName(),
                performanceRole.getDescription(),
                condition.getRecruitmentCount(),
                condition.getGender().name(),
                condition.getMinimumAge(),
                condition.getMaximumAge(),
                submissions.size(),
                activeRound(),
                false,
                ScreeningReviewProgressResult.from(counts),
                counts
        );
    }

    private List<ScreeningRoundResult> roundResults() {
        List<ScreeningStage> stages = schedule.getStages();
        List<ScreeningRoundResult> results = new ArrayList<>(stages.size());
        for (int index = 0; index < stages.size(); index++) {
            ScreeningStage stage = stages.get(index);
            int round = index + 1;
            results.add(ScreeningRoundResult.open(round, stage.getName(), countsFor(round)));
        }
        return List.copyOf(results);
    }

    private int activeRound() {
        int stageCount = schedule.getStages().size();
        for (int round = 1; round <= stageCount; round++) {
            if (countsFor(round).pending() > 0) {
                return round;
            }
        }
        return stageCount;
    }

    private ScreeningReviewCountsResult countsFor(int round) {
        List<ScreeningReviewStatus> statuses = submissionsFor(round).stream()
                .map(submission -> reviewStatus(submission.id(), round))
                .toList();
        return ScreeningReviewCountsResult.from(statuses);
    }

    private Map<Integer, ScreeningApplicantResult.Review> reviewHistory(UUID submissionId) {
        Map<Integer, ScreeningApplicantResult.Review> history = new LinkedHashMap<>();
        int stageCount = schedule.getStages().size();
        for (int round = 1; round <= stageCount; round++) {
            ScreeningApplicantResult.Review review = qualifiesFor(submissionId, round)
                    ? reviewFor(submissionId, round)
                    : null;
            history.put(round, review);
        }
        return history;
    }

    private ScreeningApplicantResult.Review reviewFor(UUID submissionId, int round) {
        ScreeningReview review = findReview(submissionId, round);
        if (review == null) {
            return new ScreeningApplicantResult.Review(ScreeningReviewStatus.PENDING.name(), "", "");
        }
        return new ScreeningApplicantResult.Review(
                review.getStatus().name(), review.getOtherReason(), review.getInternalMemo()
        );
    }

    private ScreeningReviewStatus reviewStatus(UUID submissionId, int round) {
        ScreeningReview review = findReview(submissionId, round);
        return review == null ? ScreeningReviewStatus.PENDING : review.getStatus();
    }

    private ScreeningReview findReview(UUID submissionId, int round) {
        long stageId = schedule.getStages().get(round - 1).getId();
        return reviews.stream()
                .filter(review -> review.getSubmissionId().equals(submissionId))
                .filter(review -> review.getScreeningStageId() == stageId)
                .findFirst()
                .orElse(null);
    }

    private boolean qualifiesFor(UUID submissionId, int round) {
        for (int previousRound = 1; previousRound < round; previousRound++) {
            if (reviewStatus(submissionId, previousRound) != ScreeningReviewStatus.PASS) {
                return false;
            }
        }
        return true;
    }

    private List<String> mismatchReasons(String gender, int age) {
        List<String> reasons = new ArrayList<>(2);
        AuditionRoleCondition condition = role.getCondition();
        if (condition.getGender() != RoleGender.ANY && !condition.getGender().name().equals(gender)) {
            reasons.add("GENDER");
        }
        if (age < condition.getMinimumAge() || age > condition.getMaximumAge()) {
            reasons.add("AGE");
        }
        return List.copyOf(reasons);
    }
}
