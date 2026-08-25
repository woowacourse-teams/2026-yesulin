package art.yesulin.domain.audition.query;

import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

record AuditionManagementQueryRows(
        List<PerformanceRow> performances,
        List<PerformanceRoleRow> performanceRoles,
        List<AuditionRow> auditions,
        List<ScheduleRow> schedules,
        List<StageRow> stages,
        List<AuditionRoleRow> auditionRoles,
        List<SubmissionRoleRow> submissionRoles,
        List<ReviewRow> reviews
) {

    record PerformanceRow(long id, long posterFileId, String title, String roadAddress, Instant createdAt) {
    }

    record PerformanceRoleRow(long performanceId, long id, String name, String description, int order) {
    }

    record AuditionRow(
            long databaseId,
            UUID publicId,
            long performanceId,
            String title,
            LocalDate performanceStartDate,
            LocalDate performanceEndDate,
            AuditionStatus status,
            Instant createdAt,
            Instant publishedAt
    ) {
    }

    record ScheduleRow(long auditionId, Instant recruitmentStartAt, Instant recruitmentEndAt) {
    }

    record StageRow(long auditionId, long stageId, int order) {
    }

    record AuditionRoleRow(
            long auditionId,
            long id,
            long performanceRoleId,
            String name,
            String description,
            int recruitmentCount,
            RoleGender gender,
            int minimumAge,
            int maximumAge,
            boolean multipleRoleApplicationsAllowed,
            int order
    ) {
    }

    record SubmissionRoleRow(long auditionId, UUID submissionId, long auditionRoleId) {
    }

    record ReviewRow(
            UUID submissionId,
            long auditionRoleId,
            long screeningStageId,
            ScreeningReviewStatus status
    ) {
    }
}
