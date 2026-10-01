package art.yesulin.application.show;

import art.yesulin.domain.show.ShowGuide;

public record ShowGuideCommand(String title, String content) {

    ShowGuide toGuide() {
        return new ShowGuide(title, content);
    }
}
