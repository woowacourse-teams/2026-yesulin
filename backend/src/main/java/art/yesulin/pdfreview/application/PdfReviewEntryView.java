package art.yesulin.pdfreview.application;

import art.yesulin.pdfreview.domain.PdfReviewDecision;
import art.yesulin.pdfreview.domain.PdfReviewEntry;
import art.yesulin.pdfreview.domain.PdfReviewMatchStatus;

public record PdfReviewEntryView(
        String id,
        String jobId,
        String originalFilename,
        String applicantName,
        String roleId,
        PdfReviewMatchStatus matchStatus,
        String matchEvidence,
        String memo,
        PdfReviewDecision decision
) {

    public static PdfReviewEntryView of(PdfReviewEntry entry) {
        return new PdfReviewEntryView(entry.getId(), entry.getJobId(), entry.getOriginalFilename(),
                entry.getApplicantName(), entry.getRoleId(), entry.getMatchStatus(), entry.getMatchEvidence(),
                entry.getMemo(), entry.getDecision());
    }
}
