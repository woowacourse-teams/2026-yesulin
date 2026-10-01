package art.yesulin.application.show;

import art.yesulin.application.performance.PerformanceVenueCommand;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowGenre;
import java.util.List;

public record SaveShowCommand(
        String title,
        ShowGenre genre,
        String description,
        PerformanceVenueCommand venue,
        int runningMinutes,
        String ageRating,
        String inquiryPhone,
        long posterFileId,
        List<Long> imageFileIds,
        String hostName,
        List<ShowLinkCommand> links,
        List<ShowGuideCommand> guides,
        boolean remainingSeatsVisible
) {

    Show toShow(long ownerId) {
        Show show = new Show(
                ownerId, title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
        applyAudienceGuideTo(show);
        return show;
    }

    void applyTo(Show show) {
        show.update(
                title, genre, description, venue.toVenue(), runningMinutes, ageRating,
                inquiryPhone, posterFileId, imageFileIds
        );
        applyAudienceGuideTo(show);
    }

    /**
     * 주최 이름과 추가 안내가 생기기 전 클라이언트는 두 값을 보내지 않는다. 그런 요청으로 수정해도 옮겨 둔 안내가
     * 지워지지 않도록 값이 없으면(null) 지금 값을 유지한다. 새 공연의 지금 값은 빈 이름·빈 목록이다.
     */
    private void applyAudienceGuideTo(Show show) {
        List<ShowLinkCommand> linkValues = links == null ? List.of() : links;
        show.updateAudienceGuide(
                hostName == null ? show.getHostName() : hostName,
                linkValues.stream().map(ShowLinkCommand::toLink).toList(),
                guides == null ? show.getGuides() : guides.stream().map(ShowGuideCommand::toGuide).toList(),
                remainingSeatsVisible
        );
    }
}
