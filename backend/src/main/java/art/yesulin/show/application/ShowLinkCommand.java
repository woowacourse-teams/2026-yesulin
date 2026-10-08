package art.yesulin.show.application;

import art.yesulin.show.domain.ShowLink;

public record ShowLinkCommand(String label, String url) {

    ShowLink toLink() {
        return new ShowLink(label, url);
    }
}
