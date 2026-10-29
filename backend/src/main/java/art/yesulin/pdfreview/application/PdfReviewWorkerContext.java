package art.yesulin.pdfreview.application;

import java.util.List;

/**
 * AI 분석 worker가 읽는 작업 맥락. 원본 PDF 접근 정보는 담지 않는다.
 *
 * @param purpose {@code PDF_REVIEW} 또는 {@code ACTOR_PROFILE}. 배우 프로필 가져오기는 배역 없이 이름·프로필만 정리한다.
 */
public record PdfReviewWorkerContext(String jobId, String purpose, String reviewId, String sourceFileKey,
                                     boolean resultStored, List<Role> roles) {

    public record Role(String id, String name) {
    }
}
