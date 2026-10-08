package art.yesulin.show.application;

import art.yesulin.show.domain.ShowGuide;

public record ShowGuideCommand(String title, String content) {

    ShowGuide toGuide() {
        return new ShowGuide(title, content);
    }
}
