package art.yesulin.pdfreview.application;

import java.time.Instant;

public record PdfReviewSummary(String id, String title, Instant createdAt, long roleCount, long entryCount) {
}
