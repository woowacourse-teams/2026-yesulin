package art.yesulin.community.application;

import java.util.List;

public record CommunityPage(List<EntryResult> items, Long nextCursor) {

    public CommunityPage {
        items = List.copyOf(items);
    }

    public static CommunityPage of(List<EntryResult> entries) {
        if (entries.size() > 20) {
            return new CommunityPage(entries.subList(0, 20), entries.get(19).id());
        }
        return new CommunityPage(entries, null);
    }
}
