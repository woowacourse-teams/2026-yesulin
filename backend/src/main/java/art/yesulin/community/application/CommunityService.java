package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityAuthorMode;
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
import org.springframework.transaction.TransactionDefinition;
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
        return publishPost(CommunityDigest.owner(secret), null, CommunityAuthorMode.ANONYMOUS, requestId, title, body);
    }

    EntryResult publishPost(String owner, Long member, CommunityAuthorMode mode, UUID requestId, String title,
                String body) {
        try {
            return transactions.execute(status -> createOrReplayPost(owner, member, mode, requestId, title, body));
        } catch (DataIntegrityViolationException exception) {
            return transactions.execute(status -> replayPost(owner, mode, requestId, title, body));
        }
    }

    @Transactional
    public EntryResult editPost(long id, String secret, String title, String body) {
        return editOwnedPost(id, CommunityDigest.owner(secret), title, body);
    }

    EntryResult editOwnedPost(long id, String owner, String title, String body) {
        CommunityEntry post = lockPost(id);
        post.edit(owner, title, body, clock.instant());
        return result(post, owner);
    }

    @Transactional
    public void deletePost(long id, String secret) {
        deleteOwnedPost(id, CommunityDigest.owner(secret));
    }

    void deleteOwnedPost(long id, String owner) {
        lockPost(id).delete(owner, clock.instant());
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
        return publishComment(new CommentTarget(postId, null), CommunityDigest.owner(secret), null,
                CommunityAuthorMode.ANONYMOUS, requestId, body);
    }

    EntryResult publishComment(CommentTarget target, String owner, Long member, CommunityAuthorMode mode,
                UUID requestId, String body) {
        TransactionTemplate current = new TransactionTemplate(transactions.getTransactionManager());
        current.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        try {
            return current.execute(status -> createOrReplayComment(target, owner, member, mode, requestId, body));
        } catch (DataIntegrityViolationException exception) {
            return current.execute(status -> replayComment(target, owner, mode, requestId, body));
        }
    }

    private EntryResult createOrReplayComment(CommentTarget target, String owner, Long member,
                                             CommunityAuthorMode mode, UUID requestId, String body) {
        CommunityEntry post = lockPost(target.postId());
        repository.participation(target.postId(), owner, PageRequest.of(0, 1))
                .forEach(entry -> entry.requireMode(mode));
        return repository.findByRequestKey(requestId.toString())
                .map(entry -> replayComment(entry, target, owner, mode, body))
                .orElseGet(() -> addComment(post, owner, member, mode, requestId, body, target.replyToId()));
    }

    @Transactional
    public EntryResult editComment(long postId, long id, String secret, String body) {
        return editOwnedComment(postId, id, CommunityDigest.owner(secret), body);
    }

    EntryResult editOwnedComment(long postId, long id, String owner, String body) {
        lockPost(postId);
        CommunityEntry comment = comment(postId, id);
        comment.edit(owner, null, body, clock.instant());
        return result(comment, owner);
    }

    @Transactional
    public void deleteComment(long postId, long id, String secret) {
        deleteOwnedComment(postId, id, CommunityDigest.owner(secret));
    }

    void deleteOwnedComment(long postId, long id, String owner) {
        CommunityEntry post = lockPost(postId);
        comment(postId, id).delete(owner, clock.instant());
        post.removeComment();
    }

    private EntryResult createOrReplayPost(String owner, Long member, CommunityAuthorMode mode,
                                          UUID requestId, String title, String body) {
        return repository.findByRequestKey(requestId.toString())
                .map(entry -> replay(entry, owner, mode, null, title, body))
                .orElseGet(() -> result(repository.saveAndFlush(
                        CommunityEntry.post(owner, requestId, title, body, clock.instant()).authoredBy(member,
                mode)), owner));
    }

    private EntryResult replayPost(String owner, CommunityAuthorMode mode, UUID requestId, String title, String body) {
        CommunityEntry entry = repository.findByRequestKey(requestId.toString())
                .orElseThrow(() -> new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "요청이 충돌했어요."));
        return replay(entry, owner, mode, null, title, body);
    }

    private EntryResult replay(CommunityEntry entry, String owner, CommunityAuthorMode mode,
                               Long parent, String title, String body) {
        entry.requireMode(mode);
        entry.verifyRetry(owner, parent, title, body);
        return result(entry, owner);
    }

    private EntryResult replayComment(CommentTarget target, String owner, CommunityAuthorMode mode, UUID requestId,
                String body) {
        lockPost(target.postId());
        CommunityEntry entry = repository.findByRequestKey(requestId.toString())
                .orElseThrow(() -> new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "요청이 충돌했어요."));
        return replayComment(entry, target, owner, mode, body);
    }

    private EntryResult replayComment(CommunityEntry entry, CommentTarget target, String owner,
                                      CommunityAuthorMode mode, String body) {
        entry.requireReplyTarget(target.replyToId());
        return replay(entry, owner, mode, target.postId(), null, body);
    }

    private EntryResult addComment(CommunityEntry post, String owner, Long member, CommunityAuthorMode mode,
                                   UUID requestId, String body, Long replyToId) {
        CommunityEntry comment = CommunityEntry.comment(post.getId(), owner, requestId, body, clock.instant())
                .authoredBy(member, mode);
        if (replyToId != null) {
            comment.replyTo(find(replyToId));
        }
        repository.save(comment);
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
