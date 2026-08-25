package art.yesulin.domain.audition.query;

import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.AuditionRoleRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.AuditionRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.CompletionRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.PerformanceRoleRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.PerformanceRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.ReviewRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.ScheduleRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.StageRow;
import static art.yesulin.domain.audition.query.AuditionManagementQueryRows.SubmissionRoleRow;

import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.audition.QAudition;
import art.yesulin.domain.audition.role.QAuditionRole;
import art.yesulin.domain.audition.role.QAuditionRoleSection;
import art.yesulin.domain.audition.schedule.QAuditionSchedule;
import art.yesulin.domain.audition.schedule.QScreeningStage;
import art.yesulin.domain.performance.QPerformance;
import art.yesulin.domain.performance.QPerformanceRole;
import art.yesulin.domain.screening.QScreeningCompletion;
import art.yesulin.domain.screening.QScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.submission.QSelectedRole;
import art.yesulin.domain.submission.QSubmission;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class AuditionRepositoryCustomImpl implements AuditionRepositoryCustom {

    private static final QPerformance PERFORMANCE = QPerformance.performance;
    private static final QPerformanceRole PERFORMANCE_ROLE = QPerformanceRole.performanceRole;
    private static final QAudition AUDITION = QAudition.audition;
    private static final QAuditionSchedule SCHEDULE = QAuditionSchedule.auditionSchedule;
    private static final QScreeningStage STAGE = QScreeningStage.screeningStage;
    private static final QAuditionRoleSection ROLE_SECTION = QAuditionRoleSection.auditionRoleSection;
    private static final QAuditionRole AUDITION_ROLE = QAuditionRole.auditionRole;
    private static final QSubmission SUBMISSION = QSubmission.submission;
    private static final QSelectedRole SELECTED_ROLE = new QSelectedRole("selectedRole");
    private static final QScreeningReview REVIEW = QScreeningReview.screeningReview;
    private static final QScreeningCompletion COMPLETION = QScreeningCompletion.screeningCompletion;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<PerformanceManagementResult> findPerformances(long ownerId, Instant currentTime) {
        return toPerformanceResults(load(ownerId, null, null), currentTime);
    }

    @Override
    public Optional<PerformanceManagementResult> findPerformance(
            long ownerId,
            long performanceId,
            Instant currentTime
    ) {
        return toPerformanceResults(load(ownerId, performanceId, null), currentTime).stream().findFirst();
    }

    @Override
    public Optional<AuditionManagementListResult> findAuditions(
            long ownerId,
            long performanceId,
            Instant currentTime,
            AuditionSearchCondition condition
    ) {
        return findPerformance(ownerId, performanceId, currentTime)
                .map(performance -> AuditionManagementListResult.from(performance.postings(), condition));
    }

    @Override
    public Optional<AuditionManagementResult> findAudition(long ownerId, UUID auditionId, Instant currentTime) {
        return toPerformanceResults(load(ownerId, null, auditionId), currentTime).stream()
                .flatMap(performance -> performance.postings().stream())
                .findFirst();
    }

    private AuditionManagementQueryRows load(long ownerId, Long performanceId, UUID auditionId) {
        List<PerformanceRow> performances = fetchPerformances(ownerId, performanceId, auditionId);
        List<Long> performanceIds = performances.stream().map(PerformanceRow::id).toList();
        if (performanceIds.isEmpty()) {
            return emptyRows();
        }
        List<AuditionRow> auditions = fetchAuditions(ownerId, performanceIds, auditionId);
        List<Long> auditionIds = auditions.stream().map(AuditionRow::databaseId).toList();
        List<AuditionRoleRow> auditionRoles = findAuditionRoles(auditionIds);
        List<Long> roleIds = auditionRoles.stream().map(AuditionRoleRow::id).toList();
        return new AuditionManagementQueryRows(
                performances,
                findPerformanceRoles(performanceIds),
                auditions,
                findSchedules(auditionIds),
                findStages(auditionIds),
                auditionRoles,
                findSubmissionRoles(auditionIds),
                findReviews(roleIds),
                findCompletions(roleIds)
        );
    }

    private List<PerformanceRow> fetchPerformances(long ownerId, Long performanceId, UUID auditionId) {
        BooleanBuilder condition = new BooleanBuilder(PERFORMANCE.ownerId.eq(ownerId));
        if (performanceId != null) {
            condition.and(PERFORMANCE.id.eq(performanceId));
        }
        if (auditionId != null) {
            condition.and(PERFORMANCE.id.in(JPAExpressions.select(AUDITION.performanceId).from(AUDITION)
                    .where(AUDITION.ownerId.eq(ownerId), AUDITION.publicId.eq(auditionId))));
        }
        return queryFactory.select(
                        PERFORMANCE.id,
                        PERFORMANCE.posterFileId,
                        PERFORMANCE.title,
                        PERFORMANCE.venue.roadAddress,
                        PERFORMANCE.createdAt
                )
                .from(PERFORMANCE)
                .where(condition)
                .orderBy(PERFORMANCE.createdAt.desc(), PERFORMANCE.id.desc())
                .fetch()
                .stream()
                .map(this::toPerformanceRow)
                .toList();
    }

    private List<PerformanceRoleRow> findPerformanceRoles(List<Long> performanceIds) {
        return queryFactory.select(
                        PERFORMANCE_ROLE.performance.id,
                        PERFORMANCE_ROLE.id,
                        PERFORMANCE_ROLE.name,
                        PERFORMANCE_ROLE.description,
                        PERFORMANCE_ROLE.roleOrder
                )
                .from(PERFORMANCE_ROLE)
                .where(PERFORMANCE_ROLE.performance.id.in(performanceIds))
                .orderBy(PERFORMANCE_ROLE.performance.id.asc(), PERFORMANCE_ROLE.roleOrder.asc())
                .fetch()
                .stream()
                .map(this::toPerformanceRoleRow)
                .toList();
    }

    private List<AuditionRow> fetchAuditions(long ownerId, List<Long> performanceIds, UUID auditionId) {
        BooleanBuilder condition = new BooleanBuilder(AUDITION.ownerId.eq(ownerId))
                .and(AUDITION.performanceId.in(performanceIds));
        if (auditionId != null) {
            condition.and(AUDITION.publicId.eq(auditionId));
        }
        return queryFactory.select(
                        AUDITION.id,
                        AUDITION.publicId,
                        AUDITION.performanceId,
                        AUDITION.title,
                        AUDITION.performancePeriod.startDate,
                        AUDITION.performancePeriod.endDate,
                        AUDITION.status,
                        AUDITION.createdAt,
                        AUDITION.publishedAt
                )
                .from(AUDITION)
                .where(condition)
                .orderBy(AUDITION.createdAt.desc(), AUDITION.id.desc())
                .fetch()
                .stream()
                .map(this::toAuditionRow)
                .toList();
    }

    private List<ScheduleRow> findSchedules(List<Long> auditionIds) {
        if (auditionIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(
                        SCHEDULE.auditionId,
                        SCHEDULE.recruitmentPeriod.startAt,
                        SCHEDULE.recruitmentPeriod.endAt
                )
                .from(SCHEDULE)
                .where(SCHEDULE.auditionId.in(auditionIds))
                .fetch()
                .stream()
                .map(tuple -> new ScheduleRow(
                        tuple.get(SCHEDULE.auditionId),
                        tuple.get(SCHEDULE.recruitmentPeriod.startAt),
                        tuple.get(SCHEDULE.recruitmentPeriod.endAt)
                ))
                .toList();
    }

    private List<StageRow> findStages(List<Long> auditionIds) {
        if (auditionIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(SCHEDULE.auditionId, STAGE.id, STAGE.order)
                .from(SCHEDULE)
                .join(SCHEDULE.stages.values, STAGE)
                .where(SCHEDULE.auditionId.in(auditionIds))
                .orderBy(SCHEDULE.auditionId.asc(), STAGE.order.asc())
                .fetch()
                .stream()
                .map(tuple -> new StageRow(
                        tuple.get(SCHEDULE.auditionId), tuple.get(STAGE.id), tuple.get(STAGE.order)
                ))
                .toList();
    }

    private List<AuditionRoleRow> findAuditionRoles(List<Long> auditionIds) {
        if (auditionIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(
                        ROLE_SECTION.auditionId,
                        AUDITION_ROLE.id,
                        AUDITION_ROLE.performanceRoleId,
                        PERFORMANCE_ROLE.name,
                        PERFORMANCE_ROLE.description,
                        AUDITION_ROLE.condition.recruitmentCount,
                        AUDITION_ROLE.condition.gender,
                        AUDITION_ROLE.condition.minimumAge,
                        AUDITION_ROLE.condition.maximumAge,
                        ROLE_SECTION.multipleRoleApplicationsAllowed,
                        AUDITION_ROLE.order
                )
                .from(AUDITION_ROLE)
                .join(AUDITION_ROLE.roleSection, ROLE_SECTION)
                .join(PERFORMANCE_ROLE).on(PERFORMANCE_ROLE.id.eq(AUDITION_ROLE.performanceRoleId))
                .where(ROLE_SECTION.auditionId.in(auditionIds))
                .orderBy(ROLE_SECTION.auditionId.asc(), AUDITION_ROLE.order.asc())
                .fetch()
                .stream()
                .map(this::toAuditionRoleRow)
                .toList();
    }

    private List<SubmissionRoleRow> findSubmissionRoles(List<Long> auditionIds) {
        if (auditionIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(
                        SUBMISSION.auditionSnapshot.auditionId,
                        SUBMISSION.submissionId,
                        SELECTED_ROLE.auditionRoleId
                )
                .from(SUBMISSION)
                .join(SUBMISSION.selectedRoles.values, SELECTED_ROLE)
                .where(SUBMISSION.auditionSnapshot.auditionId.in(auditionIds))
                .fetch()
                .stream()
                .map(tuple -> new SubmissionRoleRow(
                        tuple.get(SUBMISSION.auditionSnapshot.auditionId),
                        tuple.get(SUBMISSION.submissionId),
                        tuple.get(SELECTED_ROLE.auditionRoleId)
                ))
                .toList();
    }

    private List<ReviewRow> findReviews(List<Long> roleIds) {
        if (roleIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(
                        REVIEW.submissionId,
                        REVIEW.auditionRoleId,
                        REVIEW.screeningStageId,
                        REVIEW.status
                )
                .from(REVIEW)
                .where(REVIEW.auditionRoleId.in(roleIds))
                .fetch()
                .stream()
                .map(tuple -> new ReviewRow(
                        tuple.get(REVIEW.submissionId),
                        tuple.get(REVIEW.auditionRoleId),
                        tuple.get(REVIEW.screeningStageId),
                        tuple.get(REVIEW.status)
                ))
                .toList();
    }

    private List<CompletionRow> findCompletions(List<Long> roleIds) {
        if (roleIds.isEmpty()) {
            return List.of();
        }
        return queryFactory.select(COMPLETION.auditionRoleId)
                .from(COMPLETION)
                .where(COMPLETION.auditionRoleId.in(roleIds))
                .fetch()
                .stream()
                .map(CompletionRow::new)
                .toList();
    }

    private PerformanceRow toPerformanceRow(Tuple tuple) {
        return new PerformanceRow(
                tuple.get(PERFORMANCE.id),
                tuple.get(PERFORMANCE.posterFileId),
                tuple.get(PERFORMANCE.title),
                tuple.get(PERFORMANCE.venue.roadAddress),
                tuple.get(PERFORMANCE.createdAt)
        );
    }

    private PerformanceRoleRow toPerformanceRoleRow(Tuple tuple) {
        return new PerformanceRoleRow(
                tuple.get(PERFORMANCE_ROLE.performance.id),
                tuple.get(PERFORMANCE_ROLE.id),
                tuple.get(PERFORMANCE_ROLE.name),
                tuple.get(PERFORMANCE_ROLE.description),
                tuple.get(PERFORMANCE_ROLE.roleOrder)
        );
    }

    private AuditionRow toAuditionRow(Tuple tuple) {
        return new AuditionRow(
                tuple.get(AUDITION.id),
                tuple.get(AUDITION.publicId),
                tuple.get(AUDITION.performanceId),
                tuple.get(AUDITION.title),
                tuple.get(AUDITION.performancePeriod.startDate),
                tuple.get(AUDITION.performancePeriod.endDate),
                tuple.get(AUDITION.status),
                tuple.get(AUDITION.createdAt),
                tuple.get(AUDITION.publishedAt)
        );
    }

    private AuditionRoleRow toAuditionRoleRow(Tuple tuple) {
        return new AuditionRoleRow(
                tuple.get(ROLE_SECTION.auditionId),
                tuple.get(AUDITION_ROLE.id),
                tuple.get(AUDITION_ROLE.performanceRoleId),
                tuple.get(PERFORMANCE_ROLE.name),
                tuple.get(PERFORMANCE_ROLE.description),
                tuple.get(AUDITION_ROLE.condition.recruitmentCount),
                tuple.get(AUDITION_ROLE.condition.gender),
                tuple.get(AUDITION_ROLE.condition.minimumAge),
                tuple.get(AUDITION_ROLE.condition.maximumAge),
                tuple.get(ROLE_SECTION.multipleRoleApplicationsAllowed),
                tuple.get(AUDITION_ROLE.order)
        );
    }

    private List<PerformanceManagementResult> toPerformanceResults(
            AuditionManagementQueryRows rows,
            Instant currentTime
    ) {
        Map<Long, List<PerformanceRoleRow>> performanceRoles = groupBy(
                rows.performanceRoles(), PerformanceRoleRow::performanceId
        );
        Map<Long, List<AuditionRow>> auditions = groupBy(rows.auditions(), AuditionRow::performanceId);
        Map<Long, ScheduleRow> schedules = rows.schedules().stream()
                .collect(Collectors.toMap(ScheduleRow::auditionId, Function.identity()));
        Map<Long, List<StageRow>> stages = groupBy(rows.stages(), StageRow::auditionId);
        Map<Long, List<AuditionRoleRow>> auditionRoles = groupBy(rows.auditionRoles(), AuditionRoleRow::auditionId);
        Map<Long, Set<UUID>> submissionsByRole = submissionsByRole(rows.submissionRoles());
        Map<ReviewKey, ScreeningReviewStatus> reviews = reviewsByKey(rows.reviews());
        Set<Long> completedRoleIds = rows.completions().stream()
                .map(CompletionRow::auditionRoleId)
                .collect(Collectors.toSet());
        return rows.performances().stream()
                .map(performance -> toPerformanceResult(
                        performance,
                        performanceRoles.getOrDefault(performance.id(), List.of()),
                        auditions.getOrDefault(performance.id(), List.of()),
                        schedules,
                        stages,
                        auditionRoles,
                        submissionsByRole,
                        reviews,
                        completedRoleIds,
                        currentTime
                ))
                .toList();
    }

    private PerformanceManagementResult toPerformanceResult(
            PerformanceRow performance,
            List<PerformanceRoleRow> performanceRoles,
            List<AuditionRow> auditionRows,
            Map<Long, ScheduleRow> schedules,
            Map<Long, List<StageRow>> stages,
            Map<Long, List<AuditionRoleRow>> roles,
            Map<Long, Set<UUID>> submissionsByRole,
            Map<ReviewKey, ScreeningReviewStatus> reviews,
            Set<Long> completedRoleIds,
            Instant currentTime
    ) {
        List<AuditionManagementResult> postings = auditionRows.stream()
                .map(audition -> toAuditionResult(
                        audition,
                        schedules.get(audition.databaseId()),
                        stages.getOrDefault(audition.databaseId(), List.of()),
                        roles.getOrDefault(audition.databaseId(), List.of()),
                        submissionsByRole,
                        reviews,
                        completedRoleIds,
                        currentTime
                ))
                .toList();
        return new PerformanceManagementResult(
                performance.id(),
                performance.posterFileId(),
                performance.title(),
                performance.roadAddress(),
                performance.createdAt(),
                performanceRoles.stream().map(this::toPerformanceRoleSummary).toList(),
                postings.size(),
                (int) postings.stream().filter(posting -> posting.phase().equals("OPEN")).count(),
                postings.stream().mapToInt(AuditionManagementResult::applicantCount).sum(),
                postings.stream().mapToInt(AuditionManagementResult::pendingReviewCount).sum(),
                postings
        );
    }

    private AuditionManagementResult toAuditionResult(
            AuditionRow audition,
            ScheduleRow schedule,
            List<StageRow> stages,
            List<AuditionRoleRow> roleRows,
            Map<Long, Set<UUID>> submissionsByRole,
            Map<ReviewKey, ScreeningReviewStatus> reviews,
            Set<Long> completedRoleIds,
            Instant currentTime
    ) {
        List<AuditionRoleManagementResult> roles = roleRows.stream()
                .map(role -> toRoleResult(role, submissionsByRole.getOrDefault(role.id(), Set.of()), stages,
                        reviews, completedRoleIds.contains(role.id())))
                .toList();
        boolean allRoundsClosed = !roles.isEmpty()
                && roles.stream().allMatch(AuditionRoleManagementResult::allRoundsClosed);
        Set<UUID> submissionIds = new HashSet<>();
        roleRows.forEach(role -> submissionIds.addAll(submissionsByRole.getOrDefault(role.id(), Set.of())));
        int done = roles.stream().mapToInt(role -> role.progress().done()).sum();
        int total = roles.stream().mapToInt(role -> role.progress().total()).sum();
        return new AuditionManagementResult(
                audition.publicId(),
                audition.performanceId(),
                audition.title(),
                audition.performanceStartDate(),
                audition.performanceEndDate(),
                audition.performanceEndDate() == null,
                audition.status().name(),
                audition.createdAt(),
                audition.publishedAt(),
                schedule == null ? null : schedule.recruitmentStartAt(),
                schedule == null ? null : schedule.recruitmentEndAt(),
                resolvePhase(audition.status(), schedule, currentTime),
                roleRows.stream().findFirst().map(AuditionRoleRow::multipleRoleApplicationsAllowed).orElse(false),
                roles.size(),
                roles.stream().mapToInt(AuditionRoleManagementResult::recruitmentCount).sum(),
                submissionIds.size(),
                roles.stream().mapToInt(role -> role.counts().pending()).sum(),
                allRoundsClosed,
                ReviewProgressResult.of(done, total),
                roles
        );
    }

    private AuditionRoleManagementResult toRoleResult(
            AuditionRoleRow role,
            Set<UUID> submissionIds,
            List<StageRow> stages,
            Map<ReviewKey, ScreeningReviewStatus> reviews,
            boolean screeningCompleted
    ) {
        ActiveReview activeReview = activeReview(role.id(), submissionIds, stages, reviews);
        return new AuditionRoleManagementResult(
                role.id(), role.performanceRoleId(), role.name(), role.description(), role.recruitmentCount(),
                role.gender().name(), role.minimumAge(), role.maximumAge(), submissionIds.size(),
                activeReview.round(), screeningCompleted,
                ReviewProgressResult.of(activeReview.counts().done(), activeReview.counts().all()),
                activeReview.counts()
        );
    }

    private ActiveReview activeReview(
            long roleId,
            Set<UUID> submissionIds,
            List<StageRow> stages,
            Map<ReviewKey, ScreeningReviewStatus> reviews
    ) {
        Set<UUID> candidates = new HashSet<>(submissionIds);
        ActiveReview active = new ActiveReview(1, countReviews(roleId, candidates, null, reviews));
        for (StageRow stage : stages) {
            ReviewCountsResult counts = countReviews(roleId, candidates, stage.stageId(), reviews);
            active = new ActiveReview(stage.order(), counts);
            if (counts.pending() > 0) {
                return active;
            }
            candidates.removeIf(id -> reviewStatus(roleId, id, stage.stageId(), reviews) != ScreeningReviewStatus.PASS);
        }
        return active;
    }

    private ReviewCountsResult countReviews(
            long roleId,
            Set<UUID> submissionIds,
            Long firstStageId,
            Map<ReviewKey, ScreeningReviewStatus> reviews
    ) {
        Map<ScreeningReviewStatus, Integer> counts = new HashMap<>();
        submissionIds.forEach(submissionId -> counts.merge(
                reviewStatus(roleId, submissionId, firstStageId, reviews), 1, Integer::sum
        ));
        int pending = counts.getOrDefault(ScreeningReviewStatus.PENDING, 0);
        int pass = counts.getOrDefault(ScreeningReviewStatus.PASS, 0);
        int fail = counts.getOrDefault(ScreeningReviewStatus.FAIL, 0);
        int etc = counts.getOrDefault(ScreeningReviewStatus.ETC, 0);
        int done = pass + fail + etc;
        return new ReviewCountsResult(submissionIds.size(), pending, done, pass, fail, etc);
    }

    private ScreeningReviewStatus reviewStatus(
            long roleId,
            UUID submissionId,
            Long firstStageId,
            Map<ReviewKey, ScreeningReviewStatus> reviews
    ) {
        if (firstStageId == null) {
            return ScreeningReviewStatus.PENDING;
        }
        return reviews.getOrDefault(
                new ReviewKey(submissionId, roleId, firstStageId), ScreeningReviewStatus.PENDING
        );
    }

    private String resolvePhase(AuditionStatus status, ScheduleRow schedule, Instant currentTime) {
        if (status == AuditionStatus.DRAFT) {
            return "DRAFT";
        }
        if (status == AuditionStatus.CLOSED) {
            return "FINISHED";
        }
        if (schedule == null || currentTime.isBefore(schedule.recruitmentStartAt())) {
            return "UPCOMING";
        }
        return currentTime.isBefore(schedule.recruitmentEndAt()) ? "OPEN" : "RECRUIT_CLOSED";
    }

    private PerformanceRoleSummary toPerformanceRoleSummary(PerformanceRoleRow role) {
        return new PerformanceRoleSummary(role.id(), role.name(), role.description());
    }

    private Map<Long, Set<UUID>> submissionsByRole(List<SubmissionRoleRow> rows) {
        Map<Long, Set<UUID>> result = new HashMap<>();
        rows.forEach(row -> result.computeIfAbsent(row.auditionRoleId(), key -> new HashSet<>())
                .add(row.submissionId()));
        return result;
    }

    private Map<ReviewKey, ScreeningReviewStatus> reviewsByKey(List<ReviewRow> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> new ReviewKey(row.submissionId(), row.auditionRoleId(), row.screeningStageId()),
                ReviewRow::status
        ));
    }

    private <T> Map<Long, List<T>> groupBy(List<T> values, Function<T, Long> classifier) {
        return values.stream().collect(Collectors.groupingBy(classifier));
    }

    private AuditionManagementQueryRows emptyRows() {
        return new AuditionManagementQueryRows(
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of()
        );
    }

    private record ReviewKey(UUID submissionId, long roleId, long stageId) {
    }

    private record ActiveReview(int round, ReviewCountsResult counts) {
    }
}
