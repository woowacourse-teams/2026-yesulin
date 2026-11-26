package art.yesulin.pdfextraction.domain;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PdfSourceFileType {

    PDF("pdf", "application/pdf"),
    DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    PPTX("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    HWP("hwp", "application/x-hwp"),
    HWPX("hwpx", "application/hwp+zip");

    private final String extension;
    private final String contentType;

    public static PdfSourceFileType fromFilename(String filename) {
        String normalized = filename.toLowerCase(Locale.ROOT);
        for (PdfSourceFileType type : values()) {
            if (normalized.endsWith("." + type.extension)) {
                return type;
            }
        }
        throw new BusinessException(INVALID_PDF, "지원하지 않는 파일 형식입니다.");
    }
}
