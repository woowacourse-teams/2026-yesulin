package art.yesulin.presentation.api.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.submission.SubmitSubmissionCommand;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionGender;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;

class SubmitSubmissionRequestTest {

    private static final ValidatorFactory VALIDATOR_FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = VALIDATOR_FACTORY.getValidator();

    @AfterAll
    static void closeValidatorFactory() {
        VALIDATOR_FACTORY.close();
    }

    @Test
    void convertsValidRequestToCommand() {
        SubmitSubmissionRequest request = validRequest();

        Set<ConstraintViolation<SubmitSubmissionRequest>> violations = VALIDATOR.validate(request);
        SubmitSubmissionCommand command = request.toCommand();

        assertTrue(violations.isEmpty());
        assertEquals(List.of(11L, 12L), command.selectedRoleIds());
        assertEquals(SubmissionGender.FEMALE, command.basicInformation().gender());
        assertEquals(MilitaryServiceStatus.NOT_APPLICABLE, command.additionalInformation().militaryServiceStatus());
        assertEquals(21L, command.formAnswers().questionAnswers().getFirst().questionId());
        assertEquals(31L, command.formAnswers().photoRequirementAnswers().getFirst().photoRequirementId());
        assertEquals(51L, command.formAnswers().videoRequirementAnswers().getFirst().videoRequirementId());
        assertTrue(command.consents().privacyCollectionAndUseAgreed());
        assertTrue(command.consents().thirdPartyProvisionAgreed());
    }

    @Test
    void requiresSubmissionContainersAndSelectedRole() {
        SubmitSubmissionRequest request = new SubmitSubmissionRequest(null, null, List.of(), null, null);

        Set<String> invalidProperties = invalidProperties(request);

        assertEquals(
                Set.of("basicInformation", "additionalInformation", "selectedRoleIds", "formAnswers", "consents"),
                invalidProperties
        );
    }

    @Test
    void requiresBothPrivacyConsents() {
        SubmitConsentsRequest consents = new SubmitConsentsRequest(false, false);

        Set<String> messages = VALIDATOR.validate(consents).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());

        assertEquals(
                Set.of("개인정보 수집·이용 동의가 필요합니다.", "개인정보 제3자 제공 동의가 필요합니다."),
                messages
        );
    }

    @Test
    void validatesNestedInputFormats() {
        SubmitSubmissionRequest request = new SubmitSubmissionRequest(
                new SubmitBasicInformationRequest(
                        null, 0, null, LocalDate.now().plusDays(1), "UNKNOWN",
                        "01012345678", "invalid-email", null
                ),
                new SubmitAdditionalInformationRequest(
                        null,
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        "UNKNOWN",
                        List.of(new SubmitCareerRequest(999, "햄릿", "오필리어"))
                ),
                List.of(0L),
                new SubmitFormAnswersRequest(
                        List.of(new SubmitQuestionAnswerRequest(0L, null)),
                        List.of(new SubmitPhotoRequirementAnswerRequest(0L, 0L)),
                        List.of(new SubmitVideoRequirementAnswerRequest(0L, ""))
                ),
                new SubmitConsentsRequest(true, true)
        );

        Set<String> invalidProperties = invalidProperties(request);

        assertTrue(invalidProperties.contains("basicInformation.height"));
        assertTrue(invalidProperties.contains("basicInformation.birthDate"));
        assertTrue(invalidProperties.contains("basicInformation.gender"));
        assertTrue(invalidProperties.contains("basicInformation.phone"));
        assertTrue(invalidProperties.contains("basicInformation.email"));
        assertTrue(invalidProperties.contains("additionalInformation.militaryServiceStatus"));
        assertTrue(invalidProperties.contains("additionalInformation.careers[0].year"));
        assertTrue(invalidProperties.contains("selectedRoleIds[0].<list element>"));
        assertTrue(invalidProperties.contains("formAnswers.questionAnswers[0].questionId"));
        assertTrue(invalidProperties.contains("formAnswers.photoRequirementAnswers[0].photoRequirementId"));
        assertTrue(invalidProperties.contains("formAnswers.photoRequirementAnswers[0].fileId"));
        assertTrue(invalidProperties.contains("formAnswers.videoRequirementAnswers[0].videoRequirementId"));
        assertTrue(invalidProperties.contains("formAnswers.videoRequirementAnswers[0].url"));
    }

    private SubmitSubmissionRequest validRequest() {
        return new SubmitSubmissionRequest(
                new SubmitBasicInformationRequest(
                        "김하린",
                        165,
                        50,
                        LocalDate.of(2000, 1, 1),
                        "female",
                        "010-1234-5678",
                        "harin@example.com",
                        "서울시 마포구"
                ),
                new SubmitAdditionalInformationRequest(
                        "한국예술종합학교",
                        List.of("https://example.com/harin"),
                        "대한민국",
                        "자기소개",
                        "현대무용",
                        "영화 감상",
                        "not_applicable",
                        List.of(new SubmitCareerRequest(2025, "햄릿", "오필리어"))
                ),
                List.of(11L, 12L),
                new SubmitFormAnswersRequest(
                        List.of(new SubmitQuestionAnswerRequest(21L, "작품의 주제에 공감했습니다.")),
                        List.of(new SubmitPhotoRequirementAnswerRequest(31L, 41L)),
                        List.of(new SubmitVideoRequirementAnswerRequest(51L, "https://youtu.be/abcdefghijk"))
                ),
                new SubmitConsentsRequest(true, true)
        );
    }

    private Set<String> invalidProperties(SubmitSubmissionRequest request) {
        return VALIDATOR.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }
}
