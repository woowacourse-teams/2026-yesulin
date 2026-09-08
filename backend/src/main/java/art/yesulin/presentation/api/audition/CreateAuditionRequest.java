package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.CreateAuditionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateAuditionRequest(
        @NotNull UUID id,
        @Positive(message = "공연을 선택해 주세요.") long performanceId,
        @NotBlank(message = "공고명을 입력해 주세요.")
        @Size(max = 200, message = "공고명은 200자 이내로 입력해 주세요.")
        String title,
        @Size(max = 200) String rehearsalVenue,
        @jakarta.validation.Valid AuditionVenueAddressRequest rehearsalVenueAddress
) {

    @jakarta.validation.constraints.AssertTrue(message = "연습 장소명과 도로명주소를 함께 입력해 주세요.")
    public boolean isRehearsalVenueValid() {
        boolean noVenue = rehearsalVenueAddress == null && (rehearsalVenue == null || rehearsalVenue.isBlank());
        return noVenue || (rehearsalVenueAddress != null && rehearsalVenue != null && !rehearsalVenue.isBlank());
    }

    public CreateAuditionCommand toCommand() {
        return new CreateAuditionCommand(
                id,
                performanceId,
                title,
                null,
                null,
                rehearsalVenueAddress == null
                        ? new art.yesulin.application.audition.schedule.AuditionVenueCommand("", "", "", "", null, null)
                        : rehearsalVenueAddress.toCommand(rehearsalVenue)
        );
    }
}
