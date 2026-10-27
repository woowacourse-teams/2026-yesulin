package art.yesulin.community.domain;

import java.util.List;

public final class CommunityAuthors {

    private final List<String> owners;

    public CommunityAuthors(List<String> owners) {
        this.owners = List.copyOf(owners);
    }

    public String nameOf(String owner) {
        int position = owners.indexOf(owner);
        if (position < 0) {
            throw new IllegalStateException("게시글 참여 기록을 찾을 수 없습니다.");
        }
        return "익명" + (position + 1);
    }
}
