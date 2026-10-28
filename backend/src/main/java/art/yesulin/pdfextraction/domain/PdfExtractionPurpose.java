package art.yesulin.pdfextraction.domain;

/** 같은 추출 흐름을 누가 무엇에 쓰는지. 목적마다 조회 API와 결과 보관 규칙이 다르다. */
public enum PdfExtractionPurpose {

    /** 공연사가 지원서 PDF를 심사하거나 확인한다. */
    PDF_REVIEW,
    /** 배우가 자기 PDF 프로필로 편집 화면을 채운다. 결과를 닫거나 24시간이 지나면 지운다. */
    ACTOR_PROFILE
}
