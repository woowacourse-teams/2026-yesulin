package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityLikeRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

final class CommunityLikes {

    private final Map<Long, Long> counts;
    private final Set<Long> likedPosts;

    CommunityLikes(List<CommunityLikeRepository.Count> counts, List<Long> likedPosts) {
        this.counts = counts.stream().collect(Collectors.toUnmodifiableMap(
                CommunityLikeRepository.Count::getPostId, CommunityLikeRepository.Count::getTotal));
        this.likedPosts = Set.copyOf(likedPosts);
    }

    EntryResult apply(EntryResult entry) {
        return entry.withLikes(counts.getOrDefault(entry.id(), 0L), likedPosts.contains(entry.id()));
    }
}
