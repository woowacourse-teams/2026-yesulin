package art.yesulin.application.publication;

import java.util.List;

public interface PublicPostingQueryService {

    PublicPostingResult findPosting(long postingId);

    List<RecommendedPostingResult> findRecommended(Long excludePostingId, int limit);
}
