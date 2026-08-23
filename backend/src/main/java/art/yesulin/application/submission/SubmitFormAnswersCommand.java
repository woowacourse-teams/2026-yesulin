package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import java.util.List;

public record SubmitFormAnswersCommand(
        List<SubmitQuestionAnswerCommand> questionAnswers,
        List<SubmitPhotoRequirementAnswerCommand> photoRequirementAnswers,
        List<SubmitVideoRequirementAnswerCommand> videoRequirementAnswers
) {

    public SubmitFormAnswersCommand {
        questionAnswers = List.copyOf(requireNonNull(questionAnswers, "추가 질문 답변 목록은 필수입니다."));
        photoRequirementAnswers = List.copyOf(
                requireNonNull(photoRequirementAnswers, "사진 요구사항 답변 목록은 필수입니다.")
        );
        videoRequirementAnswers = List.copyOf(
                requireNonNull(videoRequirementAnswers, "영상 요구사항 답변 목록은 필수입니다.")
        );
    }
}
