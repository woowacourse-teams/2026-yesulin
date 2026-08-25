package art.yesulin.application.audition;

import art.yesulin.application.audition.form.AuditionFormResult;
import art.yesulin.application.audition.role.AuditionRolesResult;
import art.yesulin.application.audition.schedule.AuditionScheduleResult;

public record PublicAuditionResult(
        long ownerId,
        long posterFileId,
        String performanceTitle,
        String roadAddress,
        PublicProducerResult producer,
        AuditionResult audition,
        AuditionRolesResult roles,
        AuditionScheduleResult schedule,
        AuditionFormResult applicationForm
) {
}
