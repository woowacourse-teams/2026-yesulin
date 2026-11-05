package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityCommentNotice;
import art.yesulin.community.domain.CommunityCommentNoticeRepository;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityInboxItem;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityInbox {

    private final CommunityCommentNoticeRepository notices;

    void record(Long recipient, CommunityEntry comment) {
        if (recipient == null || recipient.equals(comment.getMemberId())) {
            return;
        }
        notices.save(new CommunityCommentNotice(comment.getId(), recipient));
    }

    @Transactional(readOnly = true)
    public List<CommunityInboxItem> recent(long member) {
        return notices.inbox(member, PageRequest.of(0, 20));
    }

    @Transactional
    public void markSeen(long member, long commentId) {
        notices.markSeen(member, commentId);
    }
}
