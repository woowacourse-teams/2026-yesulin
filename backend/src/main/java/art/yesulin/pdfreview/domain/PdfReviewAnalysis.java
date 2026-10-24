package art.yesulin.pdfreview.domain;

public record PdfReviewAnalysis(
        String applicantName,
        String roleId,
        PdfReviewMatchStatus matchStatus,
        String evidence
) {
}
