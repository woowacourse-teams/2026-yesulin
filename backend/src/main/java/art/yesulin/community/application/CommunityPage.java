package art.yesulin.community.application;

import java.util.List;

public record CommunityPage(List<EntryResult> items, Long nextCursor) {

    public CommunityPage {
        items = List.copyOf(items);
    }

    public static CommunityPage of(List<EntryResult> entries, int size) {
        if (entries.size() > size) {
            return new CommunityPage(entries.subList(0, size), entries.get(size - 1).id());
        }
        return new CommunityPage(entries, null);
    }
}
