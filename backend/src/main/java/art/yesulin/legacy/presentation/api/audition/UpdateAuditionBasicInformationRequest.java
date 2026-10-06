package art.yesulin.legacy.presentation.api.audition;

import art.yesulin.legacy.application.audition.UpdateAuditionBasicInformationCommand;
import art.yesulin.legacy.application.audition.schedule.AuditionVenueCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAuditionBasicInformationRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String rehearsalVenue,
        @jakarta.validation.Valid AuditionVenueAddressRequest rehearsalVenueAddress
) {

    @jakarta.validation.constraints.AssertTrue(message = "연습 장소명과 도로명주소를 함께 입력해 주세요.")
    public boolean isRehearsalVenueValid() {
        boolean noVenue = rehearsalVenueAddress == null && (rehearsalVenue == null || rehearsalVenue.isBlank());
        return noVenue || (rehearsalVenueAddress != null && rehearsalVenue != null && !rehearsalVenue.isBlank());
    }

    public UpdateAuditionBasicInformationCommand toCommand() {
        return new UpdateAuditionBasicInformationCommand(
                title,
                null,
                null,
                rehearsalVenueAddress == null
                        ? new AuditionVenueCommand("", "", "", "", null, null)
                        : rehearsalVenueAddress.toCommand(rehearsalVenue)
        );
    }
}
