package art.yesulin.application.submission;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_FORM_ANSWER;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionBasicInformationField;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
class SubmissionFormAnswerValidator {

    ValidatedSubmissionForm validateAndCreate(SubmitSubmissionCommand command, SubmissionFormDefinition form) {
        SubmissionBasicInformation basicInformation = command.toBasicInformation();
        SubmissionAdditionalInformation additionalInformation = command.toAdditionalInformation();
        validateInformationFields(basicInformation, additionalInformation, form);
        SubmissionFieldSnapshot fieldSnapshot = createFieldSnapshot(form);
        SubmissionFormAnswers answers = new SubmissionFormAnswers(
                validateQuestionAnswers(command.formAnswers().questionAnswers(), form.questions()),
                validatePhotoAnswers(command.formAnswers().photoRequirementAnswers(), form.photoRequirements()),
                validateVideoAnswers(command.formAnswers().videoRequirementAnswers(), form.videoRequirements())
        );
        return new ValidatedSubmissionForm(basicInformation, additionalInformation, fieldSnapshot, answers);
    }

    private void validateInformationFields(
            SubmissionBasicInformation basicInformation,
            SubmissionAdditionalInformation additionalInformation,
            SubmissionFormDefinition form
    ) {
        Set<BasicInformationField> basicFields = Set.copyOf(form.basicFields());
        validateBasicField(basicFields, BasicInformationField.NAME, basicInformation.name());
        validateBasicField(basicFields, BasicInformationField.HEIGHT, basicInformation.height());
        validateBasicField(basicFields, BasicInformationField.WEIGHT, basicInformation.weight());
        validateBasicField(basicFields, BasicInformationField.BIRTH, basicInformation.birthDate());
        validateBasicField(basicFields, BasicInformationField.GENDER, basicInformation.gender());
        validateBasicField(basicFields, BasicInformationField.PHONE, basicInformation.phone());
        validateBasicField(basicFields, BasicInformationField.EMAIL, basicInformation.email());
        validateBasicField(basicFields, BasicInformationField.ADDRESS, basicInformation.address());

        Set<AdditionalInformationField> additionalFields = Set.copyOf(form.additionalFields());
        validateAdditionalField(additionalFields, AdditionalInformationField.SCHOOL, additionalInformation.school());
        validateAdditionalField(additionalFields, AdditionalInformationField.LINK, additionalInformation.links());
        validateAdditionalField(
                additionalFields, AdditionalInformationField.NATIONALITY, additionalInformation.nationality()
        );
        validateAdditionalField(
                additionalFields, AdditionalInformationField.COVER_LETTER, additionalInformation.coverLetter()
        );
        validateAdditionalField(
                additionalFields, AdditionalInformationField.SPECIALTY, additionalInformation.specialty()
        );
        validateAdditionalField(
                additionalFields, AdditionalInformationField.HOBBIES, additionalInformation.hobbies()
        );
        validateAdditionalField(
                additionalFields, AdditionalInformationField.MILITARY, additionalInformation.military()
        );
        validateAdditionalField(additionalFields, AdditionalInformationField.CAREER, additionalInformation.careers());
    }

    private void validateBasicField(Set<BasicInformationField> fields, BasicInformationField field, Object value) {
        if (fields.contains(field) && value == null) {
            throw invalid("공고에서 요구하는 기본 정보를 모두 입력해야 합니다.");
        }
        if (!fields.contains(field) && hasValue(value)) {
            throw invalid("공고에서 요구하지 않은 기본 정보는 제출할 수 없습니다.");
        }
    }

    private void validateAdditionalField(
            Set<AdditionalInformationField> fields,
            AdditionalInformationField field,
            Object value
    ) {
        if (!fields.contains(field) && hasValue(value)) {
            throw invalid("공고에서 요구하지 않은 추가 정보는 제출할 수 없습니다.");
        }
    }

    private boolean hasValue(Object value) {
        if (value instanceof List<?> values) {
            return !values.isEmpty();
        }
        return value != null;
    }

    private SubmissionFieldSnapshot createFieldSnapshot(SubmissionFormDefinition form) {
        return new SubmissionFieldSnapshot(
                form.basicFields().stream()
                        .map(field -> SubmissionBasicInformationField.valueOf(field.name()))
                        .toList(),
                form.additionalFields().stream()
                        .map(field -> SubmissionAdditionalInformationField.valueOf(field.name()))
                        .toList()
        );
    }

    private QuestionAnswers validateQuestionAnswers(
            List<SubmitQuestionAnswerCommand> commands,
            List<SubmissionQuestionDefinition> definitions
    ) {
        validateUniqueIds(commands.stream().map(SubmitQuestionAnswerCommand::questionId).toList(),
                "같은 추가 질문에 여러 번 답변할 수 없습니다.");
        Map<Long, SubmitQuestionAnswerCommand> commandsById = commands.stream()
                .collect(Collectors.toMap(SubmitQuestionAnswerCommand::questionId, Function.identity()));
        validateKnownIds(commandsById.keySet(), definitions.stream().map(SubmissionQuestionDefinition::id).toList(),
                "현재 지원 폼에 없는 추가 질문입니다.");

        List<QuestionAnswer> answers = definitions.stream()
                .filter(definition -> commandsById.containsKey(definition.id()))
                .map(definition -> createQuestionAnswer(definition, commandsById.get(definition.id())))
                .toList();
        definitions.stream()
                .filter(SubmissionQuestionDefinition::required)
                .filter(definition -> !commandsById.containsKey(definition.id()))
                .findFirst()
                .ifPresent(definition -> {
                    throw invalid("필수 추가 질문에 모두 답변해야 합니다.");
                });
        return new QuestionAnswers(answers);
    }

    private QuestionAnswer createQuestionAnswer(
            SubmissionQuestionDefinition definition,
            SubmitQuestionAnswerCommand command
    ) {
        if (definition.required() && (command.answer() == null || command.answer().isBlank())) {
            throw invalid("필수 추가 질문의 답변은 비어 있을 수 없습니다.");
        }
        return new QuestionAnswer(definition.id(), definition.question(), command.answer());
    }

    private PhotoRequirementAnswers validatePhotoAnswers(
            List<SubmitPhotoRequirementAnswerCommand> commands,
            List<SubmissionPhotoRequirementDefinition> definitions
    ) {
        validatePhotoAssociations(commands);
        Set<Long> submittedRequirementIds = commands.stream()
                .map(SubmitPhotoRequirementAnswerCommand::photoRequirementId)
                .collect(Collectors.toSet());
        validateKnownIds(
                submittedRequirementIds,
                definitions.stream().map(SubmissionPhotoRequirementDefinition::id).toList(),
                "현재 지원 폼에 없는 사진 요구사항입니다."
        );

        List<PhotoRequirementAnswer> answers = definitions.stream()
                .flatMap(definition -> createPhotoAnswers(definition, commands).stream())
                .toList();
        return new PhotoRequirementAnswers(answers);
    }

    private List<PhotoRequirementAnswer> createPhotoAnswers(
            SubmissionPhotoRequirementDefinition definition,
            List<SubmitPhotoRequirementAnswerCommand> commands
    ) {
        List<SubmitPhotoRequirementAnswerCommand> matchedCommands = commands.stream()
                .filter(command -> command.photoRequirementId() == definition.id())
                .toList();
        if (matchedCommands.size() != definition.count()) {
            throw invalid("사진 요구사항별 제출 개수가 공고 설정과 일치해야 합니다.");
        }
        return matchedCommands.stream()
                .map(command -> new PhotoRequirementAnswer(
                        definition.id(), definition.description(), command.fileId()
                ))
                .toList();
    }

    private void validatePhotoAssociations(List<SubmitPhotoRequirementAnswerCommand> commands) {
        Set<PhotoAssociation> associations = new HashSet<>();
        boolean duplicated = commands.stream()
                .map(command -> new PhotoAssociation(command.photoRequirementId(), command.fileId()))
                .anyMatch(association -> !associations.add(association));
        if (duplicated) {
            throw invalid("같은 사진 요구사항에 같은 파일을 중복해서 제출할 수 없습니다.");
        }
    }

    private VideoRequirementAnswers validateVideoAnswers(
            List<SubmitVideoRequirementAnswerCommand> commands,
            List<SubmissionVideoRequirementDefinition> definitions
    ) {
        validateUniqueIds(commands.stream().map(SubmitVideoRequirementAnswerCommand::videoRequirementId).toList(),
                "같은 영상 요구사항에 여러 URL을 제출할 수 없습니다.");
        Map<Long, SubmitVideoRequirementAnswerCommand> commandsById = commands.stream()
                .collect(Collectors.toMap(
                        SubmitVideoRequirementAnswerCommand::videoRequirementId,
                        Function.identity()
                ));
        validateKnownIds(
                commandsById.keySet(),
                definitions.stream().map(SubmissionVideoRequirementDefinition::id).toList(),
                "현재 지원 폼에 없는 영상 요구사항입니다."
        );
        if (commandsById.size() != definitions.size()) {
            throw invalid("영상 요구사항에 모두 답변해야 합니다.");
        }

        List<VideoRequirementAnswer> answers = definitions.stream()
                .map(definition -> createVideoAnswer(definition, commandsById.get(definition.id())))
                .toList();
        return new VideoRequirementAnswers(answers);
    }

    private VideoRequirementAnswer createVideoAnswer(
            SubmissionVideoRequirementDefinition definition,
            SubmitVideoRequirementAnswerCommand command
    ) {
        if (!isYoutubeUrl(command.url())) {
            throw invalid("영상 답변은 올바른 YouTube URL이어야 합니다.");
        }
        return new VideoRequirementAnswer(definition.id(), definition.description(), command.url());
    }

    private boolean isYoutubeUrl(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(value.strip());
            String host = uri.getHost();
            boolean httpScheme = "http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme());
            return httpScheme && host != null && (host.equalsIgnoreCase("youtu.be")
                    || host.equalsIgnoreCase("youtube.com")
                    || host.toLowerCase().endsWith(".youtube.com"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private void validateUniqueIds(List<Long> ids, String message) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw invalid(message);
        }
    }

    private void validateKnownIds(Set<Long> submittedIds, List<Long> configuredIds, String message) {
        if (!new HashSet<>(configuredIds).containsAll(submittedIds)) {
            throw invalid(message);
        }
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_FORM_ANSWER, message);
    }

    private record PhotoAssociation(long requirementId, long fileId) {
    }
}
