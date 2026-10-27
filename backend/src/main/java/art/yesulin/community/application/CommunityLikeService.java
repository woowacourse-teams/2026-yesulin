package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityDigest;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityErrorCode;
import art.yesulin.community.domain.CommunityLike;
import art.yesulin.community.domain.CommunityLikeRepository;
import art.yesulin.global.exception.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityLikeService {

    private final CommunityEntryRepository entries;
    private final CommunityLikeRepository repository;

    @Transactional
    public LikeResult like(long postId, String secret) {
        String owner = CommunityDigest.owner(secret);
        lockPost(postId);
        if (!repository.existsByPostIdAndOwnerHash(postId, owner)) {
            repository.save(new CommunityLike(postId, owner));
        }
        return new LikeResult(repository.countByPostId(postId), true);
    }

    @Transactional
    public LikeResult unlike(long postId, String secret) {
        String owner = CommunityDigest.owner(secret);
        lockPost(postId);
        repository.findByPostIdAndOwnerHash(postId, owner).ifPresent(repository::delete);
        return new LikeResult(repository.countByPostId(postId), false);
    }

    @Transactional(readOnly = true)
    public List<EntryResult> enrich(List<EntryResult> results, String owner) {
        if (results.isEmpty()) {
            return results;
        }
        List<Long> ids = results.stream().map(EntryResult::id).toList();
        CommunityLikes likes = new CommunityLikes(repository.counts(ids), repository.likedPosts(ids, owner));
        return results.stream().map(likes::apply).toList();
    }

    private void lockPost(long postId) {
        entries.lockById(postId).orElseThrow(() -> new BusinessException(
                CommunityErrorCode.NOT_FOUND, "글을 찾을 수 없어요.")).requirePost();
    }
}
