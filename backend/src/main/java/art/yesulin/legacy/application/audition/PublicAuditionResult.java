package art.yesulin.legacy.application.audition;

import art.yesulin.legacy.application.audition.form.AuditionFormResult;
import art.yesulin.legacy.application.audition.role.AuditionRolesResult;
import art.yesulin.legacy.application.audition.schedule.AuditionScheduleResult;
import java.time.LocalDate;

public record PublicAuditionResult(
        String postingSnapshotVersion,
        long ownerId,
        long posterFileId,
        String performanceTitle,
        String roadAddress,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        PublicProducerResult producer,
        AuditionResult audition,
        AuditionRolesResult roles,
        AuditionScheduleResult schedule,
        AuditionFormResult applicationForm
) {
}
