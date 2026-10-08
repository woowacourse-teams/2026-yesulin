package art.yesulin.show.application;

import art.yesulin.show.domain.ShowLink;

public record ShowLinkResult(String label, String url) {

    static ShowLinkResult from(ShowLink link) {
        return new ShowLinkResult(link.getLabel(), link.getUrl());
    }
}
