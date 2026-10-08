package art.yesulin.show.presentation.api;

import art.yesulin.show.application.SaveShowCommand;
import art.yesulin.show.domain.ShowGenre;
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
 * 주최 이름·안내 링크·추가 안내·잔여석 공개 여부는 이전 클라이언트가 보내지 않아도 저장되도록 선택 값으로 받는다.
 * 링크·잔여석 공개는 없으면 링크 없음·공개로 저장하고, 주최 이름·추가 안내는 없으면 지금 값을 유지한다
 * (새 공연은 계정 회사명으로 주최 표시, 안내 없음).
 */
public record SaveShowRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull ShowGenre genre,
        @Size(max = 2000) String description,
        @NotNull @Valid ShowVenueRequest venue,
        @Size(max = 50) String hostName,
        @Min(1) @Max(1440) int runningMinutes,
        @Size(max = 50) String ageRating,
        @NotBlank @Pattern(regexp = "\\d{2,4}-\\d{3,4}(-\\d{4})?") String inquiryPhone,
        @Size(max = 3) List<@NotNull @Valid ShowLinkRequest> links,
        @Size(max = 5) List<@NotNull @Valid ShowGuideRequest> guides,
        Boolean remainingSeatsVisible,
        @Positive long posterFileId,
        @NotNull @Size(max = 3) List<@NotNull @Positive Long> imageFileIds
) {

    SaveShowCommand toCommand() {
        return new SaveShowCommand(
                title, genre, description, venue.toCommand(), runningMinutes, ageRating, inquiryPhone,
                posterFileId, imageFileIds,
                hostName,
                links == null ? List.of() : links.stream().map(ShowLinkRequest::toCommand).toList(),
                guides == null ? null : guides.stream().map(ShowGuideRequest::toCommand).toList(),
                remainingSeatsVisible == null || remainingSeatsVisible
        );
    }
}
