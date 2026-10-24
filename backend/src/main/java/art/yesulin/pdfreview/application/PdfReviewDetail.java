package art.yesulin.pdfreview.application;

import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewEntry;
import art.yesulin.pdfreview.domain.PdfReviewRole;
import java.time.Instant;
import java.util.List;

public record PdfReviewDetail(
        String id,
        String title,
        Instant createdAt,
        List<RoleView> roles,
        List<PdfReviewEntryView> entries
) {

    public static PdfReviewDetail of(PdfReview review, List<PdfReviewEntry> entries) {
        return new PdfReviewDetail(review.getId(), review.getTitle(), review.getCreatedAt(),
                review.getRoles().stream().map(RoleView::of).toList(),
                entries.stream().map(PdfReviewEntryView::of).toList());
    }

    public record RoleView(String id, String name) {

        public static RoleView of(PdfReviewRole role) {
            return new RoleView(role.getId(), role.getName());
        }
    }
}
