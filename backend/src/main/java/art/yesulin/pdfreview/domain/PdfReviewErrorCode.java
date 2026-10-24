package art.yesulin.pdfreview.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum PdfReviewErrorCode implements ErrorCode {

    INVALID_PDF_REVIEW(ErrorType.BAD_REQUEST),
    PDF_REVIEW_NOT_FOUND(ErrorType.NOT_FOUND),
    PDF_REVIEW_ENTRY_NOT_FOUND(ErrorType.NOT_FOUND);

    private final ErrorType type;

    @Override
    public String code() {
        return name();
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
