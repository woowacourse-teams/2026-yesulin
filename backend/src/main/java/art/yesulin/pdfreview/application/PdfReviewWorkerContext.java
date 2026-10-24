package art.yesulin.pdfreview.application;

import java.util.List;

/** AI 분석 worker가 읽는 작업 맥락. 원본 PDF 접근 정보는 담지 않는다. */
public record PdfReviewWorkerContext(String jobId, String reviewId, String sourceFileKey, boolean resultStored,
                                   List<Role> roles) {

    public record Role(String id, String name) {
    }
}
