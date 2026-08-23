package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

public record SubmissionFormResponses(
        QuestionResponses questionResponses,
        PhotoResponses photoResponses,
        VideoResponses videoResponses
) {

    public SubmissionFormResponses {
        requireNonNull(questionResponses, "추가 질문 응답 목록은 필수입니다.");
        requireNonNull(photoResponses, "사진 응답 목록은 필수입니다.");
        requireNonNull(videoResponses, "영상 응답 목록은 필수입니다.");
    }
}
