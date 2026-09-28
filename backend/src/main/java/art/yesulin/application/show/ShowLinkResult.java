package art.yesulin.application.show;

import art.yesulin.domain.show.ShowLink;

public record ShowLinkResult(String label, String url) {

    static ShowLinkResult from(ShowLink link) {
        return new ShowLinkResult(link.getLabel(), link.getUrl());
    }
}
