package art.yesulin.pdfreview.domain;

/** 외부 AI가 제안한 지원자 정보. 근거 검증 전의 값이며 합격·불합격 판단은 담지 않는다. */
public record PdfReviewAiProposal(
        boolean completed,
        String reason,
        String applicantName,
        String applicantNameEvidence,
        String roleId,
        String roleEvidence
) {
}
