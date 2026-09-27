package art.yesulin.presentation.api.show;

import art.yesulin.application.show.SaveShowCommand;
import art.yesulin.domain.show.ShowGenre;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveShowRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull ShowGenre genre,
        @Size(max = 2000) String description,
        @NotNull @Valid ShowVenueRequest venue,
        @Min(1) @Max(1440) int runningMinutes,
        @Size(max = 50) String ageRating,
        @NotBlank @Pattern(regexp = "\\d{2,4}-\\d{3,4}(-\\d{4})?") String inquiryPhone,
        @Positive long posterFileId,
        @NotNull @Size(max = 3) List<@NotNull @Positive Long> imageFileIds
) {

    SaveShowCommand toCommand() {
        return new SaveShowCommand(
                title, genre, description, venue.toCommand(), runningMinutes, ageRating, inquiryPhone,
                posterFileId, imageFileIds
        );
    }
}
