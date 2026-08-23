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
public class SubmissionFormAnswers {

    @Embedded
    private QuestionAnswers questionAnswers;

    @Embedded
    private PhotoRequirementAnswers photoRequirementAnswers;

    @Embedded
    private VideoRequirementAnswers videoRequirementAnswers;

    public SubmissionFormAnswers(
            QuestionAnswers questionAnswers,
            PhotoRequirementAnswers photoRequirementAnswers,
            VideoRequirementAnswers videoRequirementAnswers
    ) {
        this.questionAnswers = requireNonNull(questionAnswers, "추가 질문 답변 목록은 필수입니다.");
        this.photoRequirementAnswers = requireNonNull(photoRequirementAnswers, "사진 답변 목록은 필수입니다.");
        this.videoRequirementAnswers = requireNonNull(videoRequirementAnswers, "영상 답변 목록은 필수입니다.");
    }

    public QuestionAnswers questionAnswers() {
        return questionAnswers;
    }

    public PhotoRequirementAnswers photoRequirementAnswers() {
        return photoRequirementAnswers;
    }

    public VideoRequirementAnswers videoRequirementAnswers() {
        return videoRequirementAnswers;
    }
}
