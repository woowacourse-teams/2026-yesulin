package art.yesulin.show.application;

import art.yesulin.show.domain.ShowGuide;

public record ShowGuideResult(String title, String content) {

    static ShowGuideResult from(ShowGuide guide) {
        return new ShowGuideResult(guide.getTitle(), guide.getContent());
    }
}
