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
 * 운영자가 직접 등록하는 공연이다. 기획사 계정이 없어 대신 보여 줄 회사명이 없으므로 주최 이름이 필수이고,
 * 외부 링크로만 예매받으므로 외부 예매 링크도 필수다. 잔여석 공개 설정은 쓰지 않는다.
 */
public record AdminSaveShowRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull ShowGenre genre,
        @Size(max = 2000) String description,
        @NotNull @Valid ShowVenueRequest venue,
        @NotBlank @Size(max = 50) String hostName,
        @Min(1) @Max(1440) int runningMinutes,
        @Size(max = 50) String ageRating,
        @NotBlank @Pattern(regexp = "\\d{2,4}-\\d{3,4}(-\\d{4})?") String inquiryPhone,
        @Size(max = 3) List<@NotNull @Valid ShowLinkRequest> links,
        @Size(max = 5) List<@NotNull @Valid ShowGuideRequest> guides,
        @NotBlank @Size(max = 500) String externalReservationUrl,
        @Positive long posterFileId,
        @NotNull @Size(max = 3) List<@NotNull @Positive Long> imageFileIds
) {

    SaveShowCommand toCommand() {
        return new SaveShowCommand(
                title, genre, description, venue.toCommand(), runningMinutes, ageRating, inquiryPhone,
                posterFileId, imageFileIds,
                hostName,
                links == null ? List.of() : links.stream().map(ShowLinkRequest::toCommand).toList(),
                guides == null ? List.of() : guides.stream().map(ShowGuideRequest::toCommand).toList(),
                true
        );
    }
}
