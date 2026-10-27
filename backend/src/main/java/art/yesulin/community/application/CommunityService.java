package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityAuthors;
import art.yesulin.community.domain.CommunityDigest;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityErrorCode;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityEntryRepository repository;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final CommunityLikeService likes;

    @Transactional(readOnly = true)
    public CommunityPage posts(long before) {
        return posts(before, null);
    }

    @Transactional(readOnly = true)
    public CommunityPage posts(long before, String secret) {
        List<EntryResult> results = repository.posts(before, PageRequest.of(0, 21)).stream()
                .map(EntryResult::summary).toList();
        return CommunityPage.of(likes.enrich(results, CommunityDigest.viewer(secret)));
    }

    @Transactional(readOnly = true)
    public EntryResult post(long id, String secret) {
        CommunityEntry post = find(id);
        post.requirePost();
        return result(post, CommunityDigest.viewer(secret));
    }

    public EntryResult createPost(String secret, UUID requestId, String title, String body) {
        String owner = CommunityDigest.owner(secret);
        try {
            return transactions.execute(status -> createOrReplayPost(owner, requestId, title, body));
        } catch (DataIntegrityViolationException exception) {
            return transactions.execute(status -> replayPost(owner, requestId, title, body));
        }
    }

    @Transactional
    public EntryResult editPost(long id, String secret, String title, String body) {
        CommunityEntry post = lockPost(id);
        String owner = CommunityDigest.owner(secret);
        post.edit(owner, title, body, clock.instant());
        return result(post, owner);
    }

    @Transactional
    public void deletePost(long id, String secret) {
        lockPost(id).delete(CommunityDigest.owner(secret), clock.instant());
    }

    @Transactional(readOnly = true)
    public CommunityPage comments(long postId, long after, String secret) {
        find(postId).requirePost();
        String owner = CommunityDigest.viewer(secret);
        CommunityAuthors authors = new CommunityAuthors(repository.authors(postId));
        return CommunityPage.of(repository.comments(postId, after, PageRequest.of(0, 21)).stream()
                .map(entry -> EntryResult.from(entry, owner, authors.nameOf(entry.getOwnerHash()))).toList());
    }

    public EntryResult createComment(long postId, String secret, UUID requestId, String body) {
        String owner = CommunityDigest.owner(secret);
        try {
            return transactions.execute(status -> createOrReplayComment(postId, owner, requestId, body));
        } catch (DataIntegrityViolationException exception) {
            return transactions.execute(status -> replayComment(postId, owner, requestId, body));
        }
    }

    private EntryResult createOrReplayComment(long postId, String owner, UUID requestId, String body) {
        CommunityEntry post = lockPost(postId);
        return repository.findByRequestKey(requestId.toString())
                .map(entry -> replay(entry, owner, postId, null, body))
                .orElseGet(() -> addComment(post, owner, requestId, body));
    }

    @Transactional
    public EntryResult editComment(long postId, long id, String secret, String body) {
        lockPost(postId);
        CommunityEntry comment = comment(postId, id);
        String owner = CommunityDigest.owner(secret);
        comment.edit(owner, null, body, clock.instant());
        return result(comment, owner);
    }

    @Transactional
    public void deleteComment(long postId, long id, String secret) {
        CommunityEntry post = lockPost(postId);
        comment(postId, id).delete(CommunityDigest.owner(secret), clock.instant());
        post.removeComment();
    }

    private EntryResult createOrReplayPost(String owner, UUID requestId, String title, String body) {
        return repository.findByRequestKey(requestId.toString())
                .map(entry -> replay(entry, owner, null, title, body))
                .orElseGet(() -> result(repository.saveAndFlush(
                        CommunityEntry.post(owner, requestId, title, body, clock.instant())), owner));
    }

    private EntryResult replayPost(String owner, UUID requestId, String title, String body) {
        CommunityEntry entry = repository.findByRequestKey(requestId.toString())
                .orElseThrow(() -> new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "요청이 충돌했어요."));
        return replay(entry, owner, null, title, body);
    }

    private EntryResult replay(CommunityEntry entry, String owner, Long parent, String title, String body) {
        entry.verifyRetry(owner, parent, title, body);
        return result(entry, owner);
    }

    private EntryResult replayComment(long postId, String owner, UUID requestId, String body) {
        lockPost(postId);
        CommunityEntry entry = repository.findByRequestKey(requestId.toString())
                .orElseThrow(() -> new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "요청이 충돌했어요."));
        return replay(entry, owner, postId, null, body);
    }

    private EntryResult addComment(CommunityEntry post, String owner, UUID requestId, String body) {
        CommunityEntry comment = repository.save(CommunityEntry.comment(
                post.getId(), owner, requestId, body, clock.instant()));
        post.addComment();
        return result(comment, owner);
    }

    private EntryResult result(CommunityEntry entry, String owner) {
        if (entry.getParentId() == null) {
            return likes.enrich(List.of(EntryResult.from(entry, owner)), owner).getFirst();
        }
        CommunityAuthors authors = new CommunityAuthors(repository.authors(entry.getParentId()));
        return EntryResult.from(entry, owner, authors.nameOf(entry.getOwnerHash()));
    }

    private CommunityEntry comment(long postId, long id) {
        CommunityEntry comment = find(id);
        comment.requireCommentOf(postId);
        return comment;
    }

    private CommunityEntry find(long id) {
        return repository.findById(id).orElseThrow(this::notFound);
    }

    private CommunityEntry lockPost(long id) {
        CommunityEntry post = repository.lockById(id).orElseThrow(this::notFound);
        post.requirePost();
        return post;
    }

    private BusinessException notFound() {
        return new BusinessException(CommunityErrorCode.NOT_FOUND, "글이나 댓글을 찾을 수 없어요.");
    }
}
