package art.yesulin.pdfreview.presentation.api;

import art.yesulin.pdfreview.domain.PdfReviewDecision;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdatePdfReviewEntryRequest(
        @NotNull @Size(max = 2000) String memo,
        @NotNull PdfReviewDecision decision
) {
}
