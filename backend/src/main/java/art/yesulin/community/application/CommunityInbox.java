package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityCommentNotice;
import art.yesulin.community.domain.CommunityCommentNoticeRepository;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityInboxItem;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityInbox {

    private static final int PREVIEW_MAX = 80;

    private final CommunityCommentNoticeRepository notices;
    private final CommunityEntryRepository entries;
    private final CommunityProfiles profiles;

    void record(Long recipient, CommunityEntry comment) {
        if (recipient == null || recipient.equals(comment.getMemberId())) {
            return;
        }
        notices.save(new CommunityCommentNotice(comment.getId(), recipient));
    }

    @Transactional(readOnly = true)
    public List<CommunityNoticeResult> recent(long member) {
        List<CommunityInboxItem> items = notices.inbox(member, PageRequest.of(0, 20));
        Map<Long, CommunityEntry> comments = entries.findAllById(items.stream().map(CommunityInboxItem::commentId)
                .toList()).stream().collect(Collectors.toMap(CommunityEntry::getId, Function.identity()));
        CommunityNoticeAuthors authors = new CommunityNoticeAuthors(entries, profiles);
        return items.stream().map(item -> result(item, comments.get(item.commentId()), authors)).toList();
    }

    private CommunityNoticeResult result(CommunityInboxItem item, CommunityEntry comment,
                                         CommunityNoticeAuthors authors) {
        return new CommunityNoticeResult(item.commentId(), item.postId(), item.title(), item.replyToId(),
                item.seen(), authors.nameOf(comment), preview(comment.getBody()), comment.getCreatedAt());
    }

    private static String preview(String body) {
        String line = body.replaceAll("\\s+", " ").strip();
        if (line.length() <= PREVIEW_MAX) {
            return line;
        }
        return line.substring(0, PREVIEW_MAX) + "…";
    }

    @Transactional
    public void markAllSeen(long member) {
        notices.markAllSeen(member);
    }

    @Transactional
    public void markSeen(long member, long commentId) {
        notices.markSeen(member, commentId);
    }
}
