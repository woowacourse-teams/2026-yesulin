package art.yesulin.application.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.performance.PerformanceRole;
import art.yesulin.domain.screening.AuditionScreening;
import art.yesulin.domain.screening.ScreeningRound;
import art.yesulin.domain.submission.Submission;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ScreeningBoardResult(
        Performance performance,
        Posting posting,
        Role role,
        int round,
        List<Round> rounds,
        List<ScreeningApplicantResult> submissions
) {

    public ScreeningBoardResult {
        rounds = List.copyOf(rounds);
        submissions = List.copyOf(submissions);
    }

    static ScreeningBoardResult from(
            Audition audition,
            long roleId,
            ScreeningRound round,
            art.yesulin.domain.performance.Performance domainPerformance,
            PerformanceRole performanceRole,
            AuditionRole role,
            AuditionScreening screening,
            List<Submission> filteredSubmissions,
            Map<Long, String> photoUrls
    ) {
        Counts counts = toCounts(screening.countsOf(round));
        Role roleResult = toRole(audition, roleId, performanceRole, role.getCondition(), screening, counts);
        List<ScreeningApplicantResult> submissions = filteredSubmissions.stream()
                .map(submission -> ScreeningApplicantResult.from(
                        submission, roleId, performanceRole.getName(), screening, round,
                        role.getCondition(), photoUrls
                ))
                .toList();
        return new ScreeningBoardResult(
                new Performance(
                        domainPerformance.getId(), domainPerformance.getPosterFileId(), domainPerformance.getTitle()
                ),
                new Posting(audition.getPublicId(), audition.getTitle(), false),
                roleResult, round.value(), toRounds(screening), submissions
        );
    }

    ScreeningSubmissionDetailResult detail(UUID submissionId) {
        ScreeningApplicantResult submission = submissions.stream()
                .filter(candidate -> candidate.id().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 지원서를 찾을 수 없습니다."));
        return new ScreeningSubmissionDetailResult(performance, posting, role, round, rounds, submission);
    }

    ScreeningBoardResult filteredBy(ScreeningFilterCondition condition) {
        return new ScreeningBoardResult(
                performance, posting, role, round, rounds, submissions.stream().filter(condition::matches).toList()
        );
    }

    private static Role toRole(
            Audition audition,
            long roleId,
            PerformanceRole performanceRole,
            AuditionRoleCondition condition,
            AuditionScreening screening,
            Counts counts
    ) {
        return new Role(
                roleId, audition.getPublicId(), performanceRole.getName(),
                performanceRole.getDescription(), condition.getRecruitmentCount(), condition.getGender().name(),
                condition.getMinimumAge(), condition.getMaximumAge(), screening.applicantCount(),
                screening.activeRound().value(), screening.isCompleted(), Progress.from(counts), counts
        );
    }

    private static List<Round> toRounds(AuditionScreening screening) {
        List<Round> rounds = new ArrayList<>();
        for (int value = 1; value <= screening.roundCount(); value++) {
            ScreeningRound round = new ScreeningRound(value);
            Counts counts = toCounts(screening.countsOf(round));
            rounds.add(new Round(value, screening.roundName(round), counts, Progress.from(counts)));
        }
        return List.copyOf(rounds);
    }

    private static Counts toCounts(AuditionScreening.Counts counts) {
        return new Counts(
                counts.all(), counts.pending(), counts.done(), counts.pass(), counts.fail(), counts.etc()
        );
    }

    public record Performance(long id, long posterFileId, String title) {
    }

    public record Posting(UUID id, String title, boolean openCall) {
    }

    public record Role(
            long id,
            UUID postingId,
            String name,
            String description,
            int quota,
            String gender,
            int ageMin,
            int ageMax,
            int applicantCount,
            int activeRound,
            boolean allRoundsClosed,
            Progress progress,
            Counts counts
    ) {
    }

    public record Round(int round, String name, Counts counts, Progress progress) {
    }

    public record Counts(int all, int pending, int done, int pass, int fail, int etc) {
    }

    public record Progress(int done, int total, int percent) {

        static Progress from(Counts counts) {
            int percent = counts.all() == 0 ? 0 : (int) Math.round(counts.done() * 100.0 / counts.all());
            return new Progress(counts.done(), counts.all(), percent);
        }
    }
}
