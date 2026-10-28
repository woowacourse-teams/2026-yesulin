package art.yesulin.actor.application.profileimport;

import art.yesulin.pdfextraction.application.PdfExtractionStorage;

/** 브라우저가 PDF를 저장소에 바로 올릴 주소. 올린 뒤 completion으로 업로드를 확인한다. */
public record PreparedProfileImport(String jobId, PdfExtractionStorage.UploadTarget upload) {
}
