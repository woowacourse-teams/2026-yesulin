package art.yesulin.application.show;

import art.yesulin.domain.show.ShowLink;

public record ShowLinkCommand(String label, String url) {

    ShowLink toLink() {
        return new ShowLink(label, url);
    }
}
