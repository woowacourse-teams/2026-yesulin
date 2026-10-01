package art.yesulin.application.show;

import art.yesulin.domain.show.ShowGuide;

public record ShowGuideResult(String title, String content) {

    static ShowGuideResult from(ShowGuide guide) {
        return new ShowGuideResult(guide.getTitle(), guide.getContent());
    }
}
