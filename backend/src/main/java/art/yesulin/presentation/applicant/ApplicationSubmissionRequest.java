package art.yesulin.presentation.applicant;

import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.application.SubmissionAnswer;
import art.yesulin.application.application.SubmitApplicationCommand;
import art.yesulin.domain.application.BasicInformation;
import art.yesulin.domain.application.ConsentEvidence;
import art.yesulin.domain.application.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;

public record ApplicationSubmissionRequest(
        @Positive long draftId,
        @Positive long postingId,
        @NotEmpty List<@Positive Long> roleIds,
        @NotEmpty List<@Valid Answer> answers,
        @NotNull @Valid Consent consent) {

    public record Answer(@NotNull String key, @NotNull JsonNode value) {
    }

    public record Consent(
            boolean collectionAndUse,
            boolean thirdPartyProvision,
            boolean profileSave) {
    }

    SubmitApplicationCommand toCommand() {
        Map<String, JsonNode> values = answers.stream().collect(Collectors.toMap(
                Answer::key, Answer::value, (first, second) -> second));
        BasicInformation basicInformation = new BasicInformation(
                text(values, "NAME"), integer(values, "BODY", "height"),
                integer(values, "BODY", "weight"), date(values, "BIRTH"),
                gender(values, "GENDER"), text(values, "PHONE"),
                text(values, "EMAIL"), text(values, "RESIDENCE"));
        List<SubmissionAnswer> submissionAnswers = answers.stream()
                .map(answer -> new SubmissionAnswer(
                        answer.key(), answer.key(), answer.value().toString(), 0))
                .toList();
        return new SubmitApplicationCommand(
                draftId, postingId, basicInformation, roleIds, submissionAnswers,
                new ConsentEvidence(
                        consent.collectionAndUse(), consent.thirdPartyProvision(),
                        consent.profileSave(), "", ""));
    }

    private static String text(Map<String, JsonNode> values, String key) {
        JsonNode value = values.get(key);
        return value == null || !value.isTextual() ? null : value.textValue();
    }

    private static int integer(Map<String, JsonNode> values, String key, String part) {
        JsonNode value = values.get(key);
        JsonNode child = value == null ? null : value.get(part);
        return child == null || !child.canConvertToInt() ? 0 : child.intValue();
    }

    private static LocalDate date(Map<String, JsonNode> values, String key) {
        String value = text(values, key);
        try {
            return value == null ? null : LocalDate.parse(value);
        } catch (java.time.format.DateTimeParseException exception) {
            throw invalidBasicInformation();
        }
    }

    private static Gender gender(Map<String, JsonNode> values, String key) {
        String value = text(values, key);
        if (value == null) {
            return null;
        }
        return switch (value) {
            case "FEMALE", "여성" -> Gender.FEMALE;
            case "MALE", "남성" -> Gender.MALE;
            case "NOT_DISCLOSED", "응답하지 않음" -> Gender.NOT_DISCLOSED;
            default -> throw invalidBasicInformation();
        };
    }

    private static ApplicationSubmissionException invalidBasicInformation() {
        return new ApplicationSubmissionException(
                "INVALID_BASIC_INFORMATION", "기본 정보 형식이 올바르지 않습니다.");
    }
}
