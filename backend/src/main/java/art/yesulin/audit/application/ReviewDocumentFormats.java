package art.yesulin.audit.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfFileMetadata;
import art.yesulin.pdfextraction.domain.PdfSourceFileType;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ReviewDocumentFormats {

    private final List<String> extensions;

    public ReviewDocumentFormats(@Value("${yesulin.pdf-extraction.review-document-extensions:}") String enabled) {
        List<String> configured = Arrays.stream(enabled.split(",")).map(String::strip).toList();
        extensions = Arrays.stream(PdfSourceFileType.values()).map(PdfSourceFileType::getExtension)
                .filter(extension -> extension.equals("pdf") || configured.contains(extension)).toList();
    }

    public List<String> extensions() {
        return extensions;
    }

    public void requireEnabled(String filename) {
        String sanitized = PdfFileMetadata.requireOriginalFilename(filename).stripTrailing();
        if (!extensions.contains(PdfSourceFileType.fromFilename(sanitized).getExtension())) {
            throw new BusinessException(INVALID_PDF, "이 심사함에서 지원하는 파일 형식을 확인해 주세요.");
        }
    }
}
