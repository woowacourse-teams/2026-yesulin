package art.yesulin.application.submission.form;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_FORM_ANSWER;

import art.yesulin.application.submission.SubmitQuestionAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.QuestionAnswers;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class SubmissionQuestionAnswerValidator {

    QuestionAnswers validateAndCreate(
            List<SubmitQuestionAnswerCommand> commands,
            List<SubmissionQuestionDefinition> definitions
    ) {
        validateUniqueQuestionIds(commands);
        Map<Long, SubmitQuestionAnswerCommand> commandsById = commands.stream()
                .collect(Collectors.toMap(SubmitQuestionAnswerCommand::questionId, Function.identity()));
        validateKnownQuestionIds(commandsById.keySet(), definitions);
        validateRequiredAnswers(commandsById, definitions);
        return new QuestionAnswers(definitions.stream()
                .filter(definition -> commandsById.containsKey(definition.id()))
                .map(definition -> createAnswer(definition, commandsById.get(definition.id())))
                .toList());
    }

    private void validateUniqueQuestionIds(List<SubmitQuestionAnswerCommand> commands) {
        List<Long> questionIds = commands.stream().map(SubmitQuestionAnswerCommand::questionId).toList();
        if (new HashSet<>(questionIds).size() != questionIds.size()) {
            throw invalid("같은 추가 질문에 여러 번 답변할 수 없습니다.");
        }
    }

    private void validateKnownQuestionIds(
            Set<Long> submittedIds,
            List<SubmissionQuestionDefinition> definitions
    ) {
        Set<Long> configuredIds = definitions.stream()
                .map(SubmissionQuestionDefinition::id)
                .collect(Collectors.toSet());
        if (!configuredIds.containsAll(submittedIds)) {
            throw invalid("현재 지원 폼에 없는 추가 질문입니다.");
        }
    }

    private void validateRequiredAnswers(
            Map<Long, SubmitQuestionAnswerCommand> commandsById,
            List<SubmissionQuestionDefinition> definitions
    ) {
        definitions.stream()
                .filter(SubmissionQuestionDefinition::required)
                .filter(definition -> !commandsById.containsKey(definition.id()))
                .findFirst()
                .ifPresent(definition -> {
                    throw invalid("필수 추가 질문에 모두 답변해야 합니다.");
                });
    }

    private QuestionAnswer createAnswer(
            SubmissionQuestionDefinition definition,
            SubmitQuestionAnswerCommand command
    ) {
        if (definition.required() && (command.answer() == null || command.answer().isBlank())) {
            throw invalid("필수 추가 질문의 답변은 비어 있을 수 없습니다.");
        }
        return new QuestionAnswer(definition.id(), definition.question(), command.answer());
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_FORM_ANSWER, message);
    }
}
