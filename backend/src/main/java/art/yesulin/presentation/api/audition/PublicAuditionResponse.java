package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.PublicAuditionResult;
import art.yesulin.application.audition.PublicProducerResult;
import art.yesulin.application.audition.form.AuditionFormResult;
import art.yesulin.application.audition.role.AuditionRoleResult;
import art.yesulin.application.audition.schedule.AuditionVenueResult;
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
        String rehearsalVenue,
        AuditionVenueAddressResponse rehearsalVenueAddress,
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
        AuditionVenueResult rehearsalVenue = result.audition().rehearsalVenue();
        return new PublicAuditionResponse(
                result.audition().id(),
                result.performanceTitle(),
                result.audition().title(),
                posterUrl,
                result.roadAddress(),
                rehearsalVenue == null ? null : rehearsalVenue.name(),
                AuditionVenueAddressResponse.from(rehearsalVenue),
                result.producer(),
                result.performanceStartDate(),
                result.performanceEndDate(),
                result.schedule().recruitmentStartAt(),
                result.schedule().recruitmentEndAt(),
                result.roles().multipleRoleApplicationsAllowed(),
                result.roles().roles(),
                result.schedule().stages(),
                result.applicationForm()
        );
    }
}
