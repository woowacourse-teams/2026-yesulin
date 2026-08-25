package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.PublicAuditionResult;
import art.yesulin.application.audition.PublicProducerResult;
import art.yesulin.application.audition.form.AuditionFormResult;
import art.yesulin.application.audition.role.AuditionRoleResult;
import art.yesulin.application.audition.schedule.ScreeningStageResult;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PublicAuditionResponse(
        UUID id,
        String performanceTitle,
        String title,
        String posterUrl,
        String roadAddress,
        PublicProducerResult producer,
        LocalDate performanceStartDate,
        LocalDate performanceEndDate,
        Instant recruitmentStartAt,
        Instant recruitmentEndAt,
        boolean multipleRoleApplicationsAllowed,
        List<AuditionRoleResult> roles,
        List<ScreeningStageResult> stages,
        AuditionFormResult applicationForm
) {

    public static PublicAuditionResponse from(PublicAuditionResult result, String posterUrl) {
        return new PublicAuditionResponse(
                result.audition().id(),
                result.performanceTitle(),
                result.audition().title(),
                posterUrl,
                result.roadAddress(),
                result.producer(),
                result.audition().performanceStartDate(),
                result.audition().performanceEndDate(),
                result.schedule().recruitmentStartAt(),
                result.schedule().recruitmentEndAt(),
                result.roles().multipleRoleApplicationsAllowed(),
                result.roles().roles(),
                result.schedule().stages(),
                result.applicationForm()
        );
    }
}
