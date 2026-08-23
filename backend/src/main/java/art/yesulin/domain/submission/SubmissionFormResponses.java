package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionFormResponses {

    @Embedded
    private QuestionResponses questionResponses;

    @Embedded
    private PhotoResponses photoResponses;

    @Embedded
    private VideoResponses videoResponses;

    public SubmissionFormResponses(
            QuestionResponses questionResponses,
            PhotoResponses photoResponses,
            VideoResponses videoResponses
    ) {
        this.questionResponses = requireNonNull(questionResponses, "추가 질문 응답 목록은 필수입니다.");
        this.photoResponses = requireNonNull(photoResponses, "사진 응답 목록은 필수입니다.");
        this.videoResponses = requireNonNull(videoResponses, "영상 응답 목록은 필수입니다.");
    }

    public QuestionResponses questionResponses() {
        return questionResponses;
    }

    public PhotoResponses photoResponses() {
        return photoResponses;
    }

    public VideoResponses videoResponses() {
        return videoResponses;
    }
}
