package art.yesulin.application.submission.form;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_FORM_ANSWER;

import art.yesulin.application.submission.SubmitVideoRequirementAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionVideoRequirementAnswerValidator {

    private final YouTubeUrlValidator youTubeUrlValidator;

    VideoRequirementAnswers validateAndCreate(
            List<SubmitVideoRequirementAnswerCommand> commands,
            List<SubmissionVideoRequirementDefinition> definitions
    ) {
        validateUniqueRequirementIds(commands);
        Map<Long, SubmitVideoRequirementAnswerCommand> commandsById = commands.stream()
                .collect(Collectors.toMap(
                        SubmitVideoRequirementAnswerCommand::videoRequirementId,
                        Function.identity()
                ));
        validateKnownRequirementIds(commandsById.keySet(), definitions);
        if (commandsById.size() != definitions.size()) {
            throw invalid("영상 요구사항에 모두 답변해야 합니다.");
        }
        return new VideoRequirementAnswers(definitions.stream()
                .map(definition -> createAnswer(definition, commandsById.get(definition.id())))
                .toList());
    }

    private void validateUniqueRequirementIds(List<SubmitVideoRequirementAnswerCommand> commands) {
        List<Long> requirementIds = commands.stream()
                .map(SubmitVideoRequirementAnswerCommand::videoRequirementId)
                .toList();
        if (new HashSet<>(requirementIds).size() != requirementIds.size()) {
            throw invalid("같은 영상 요구사항에 여러 URL을 제출할 수 없습니다.");
        }
    }

    private void validateKnownRequirementIds(
            Set<Long> submittedIds,
            List<SubmissionVideoRequirementDefinition> definitions
    ) {
        Set<Long> configuredIds = definitions.stream()
                .map(SubmissionVideoRequirementDefinition::id)
                .collect(Collectors.toSet());
        if (!configuredIds.containsAll(submittedIds)) {
            throw invalid("현재 지원 폼에 없는 영상 요구사항입니다.");
        }
    }

    private VideoRequirementAnswer createAnswer(
            SubmissionVideoRequirementDefinition definition,
            SubmitVideoRequirementAnswerCommand command
    ) {
        if (!youTubeUrlValidator.isValid(command.url())) {
            throw invalid("영상 답변은 올바른 YouTube URL이어야 합니다.");
        }
        return new VideoRequirementAnswer(definition.id(), definition.description(), command.url());
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_FORM_ANSWER, message);
    }
}
