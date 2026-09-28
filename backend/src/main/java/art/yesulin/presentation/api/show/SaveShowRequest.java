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

/**
 * 안내 링크·오시는 길 추가 안내·잔여석 공개 여부는 이전 클라이언트가 보내지 않아도 저장되도록 선택 값으로 받는다.
 * 비어 있으면 링크 없음, 안내 없음, 잔여석 공개로 저장한다.
 */
public record SaveShowRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull ShowGenre genre,
        @Size(max = 2000) String description,
        @NotNull @Valid ShowVenueRequest venue,
        @Size(max = 1000) String directionsNote,
        @Min(1) @Max(1440) int runningMinutes,
        @Size(max = 50) String ageRating,
        @NotBlank @Pattern(regexp = "\\d{2,4}-\\d{3,4}(-\\d{4})?") String inquiryPhone,
        @Size(max = 3) List<@NotNull @Valid ShowLinkRequest> links,
        Boolean remainingSeatsVisible,
        @Positive long posterFileId,
        @NotNull @Size(max = 3) List<@NotNull @Positive Long> imageFileIds
) {

    SaveShowCommand toCommand() {
        return new SaveShowCommand(
                title, genre, description, venue.toCommand(), runningMinutes, ageRating, inquiryPhone,
                posterFileId, imageFileIds,
                links == null ? List.of() : links.stream().map(ShowLinkRequest::toCommand).toList(),
                directionsNote,
                remainingSeatsVisible == null || remainingSeatsVisible
        );
    }
}
