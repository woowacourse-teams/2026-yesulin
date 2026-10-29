package art.yesulin.pdfreview.application;

import java.time.Instant;

public interface PdfReviewProgressQuery {

    PdfReviewProgress find(long ownerId, String reviewId, Instant expiredBefore);
}
