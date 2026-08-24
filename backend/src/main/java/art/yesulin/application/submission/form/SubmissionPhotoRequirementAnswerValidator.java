package art.yesulin.application.submission.form;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_FORM_ANSWER;

import art.yesulin.application.submission.SubmitPhotoRequirementAnswerCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class SubmissionPhotoRequirementAnswerValidator {

    PhotoRequirementAnswers validateAndCreate(
            List<SubmitPhotoRequirementAnswerCommand> commands,
            List<SubmissionPhotoRequirementDefinition> definitions
    ) {
        validateUniqueAssociations(commands);
        Map<Long, List<SubmitPhotoRequirementAnswerCommand>> commandsByRequirementId = commands.stream()
                .collect(Collectors.groupingBy(SubmitPhotoRequirementAnswerCommand::photoRequirementId));
        validateKnownRequirementIds(commandsByRequirementId.keySet(), definitions);
        return new PhotoRequirementAnswers(definitions.stream()
                .flatMap(definition -> createAnswers(
                        definition,
                        commandsByRequirementId.getOrDefault(definition.id(), List.of())
                ).stream())
                .toList());
    }

    private void validateUniqueAssociations(List<SubmitPhotoRequirementAnswerCommand> commands) {
        Set<PhotoAssociation> associations = new HashSet<>();
        boolean duplicated = commands.stream()
                .map(command -> new PhotoAssociation(command.photoRequirementId(), command.fileId()))
                .anyMatch(association -> !associations.add(association));
        if (duplicated) {
            throw invalid("같은 사진 요구사항에 같은 파일을 중복해서 제출할 수 없습니다.");
        }
    }

    private void validateKnownRequirementIds(
            Set<Long> submittedIds,
            List<SubmissionPhotoRequirementDefinition> definitions
    ) {
        Set<Long> configuredIds = definitions.stream()
                .map(SubmissionPhotoRequirementDefinition::id)
                .collect(Collectors.toSet());
        if (!configuredIds.containsAll(submittedIds)) {
            throw invalid("현재 지원 폼에 없는 사진 요구사항입니다.");
        }
    }

    private List<PhotoRequirementAnswer> createAnswers(
            SubmissionPhotoRequirementDefinition definition,
            List<SubmitPhotoRequirementAnswerCommand> commands
    ) {
        if (commands.size() != definition.count()) {
            throw invalid("사진 요구사항별 제출 개수가 공고 설정과 일치해야 합니다.");
        }
        return commands.stream()
                .map(command -> new PhotoRequirementAnswer(
                        definition.id(), definition.description(), command.fileId()
                ))
                .toList();
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_FORM_ANSWER, message);
    }

    private record PhotoAssociation(long requirementId, long fileId) {
    }
}
