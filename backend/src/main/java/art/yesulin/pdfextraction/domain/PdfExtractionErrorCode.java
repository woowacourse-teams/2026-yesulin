package art.yesulin.pdfextraction.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum PdfExtractionErrorCode implements ErrorCode {

    INVALID_PDF(ErrorType.BAD_REQUEST),
    PDF_EXTRACTION_NOT_FOUND(ErrorType.NOT_FOUND),
    PDF_UPLOAD_NOT_READY(ErrorType.CONFLICT),
    PDF_UPLOAD_EXPIRED(ErrorType.CONFLICT),
    INVALID_PDF_EXTRACTION_RESULT(ErrorType.BAD_REQUEST),
    PDF_EXTRACTION_RESULT_CONFLICT(ErrorType.CONFLICT);

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
