package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import art.yesulin.domain.submission.SubmissionErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionInformationValidatorTest {

    private final SubmissionInformationValidator validator = new SubmissionInformationValidator();

    @Test
    void requiresConfiguredBasicInformation() {
        SubmissionFormDefinition form = form(
                List.of(BasicInformationField.NAME),
                List.of()
        );

        assertInvalid(emptyBasicInformation(), emptyAdditionalInformation(), form);
    }

    @Test
    void rejectsBasicInformationThatWasNotConfigured() {
        SubmissionBasicInformation information = new SubmissionBasicInformation(
                "김하린", null, null, null, null, null, null, null
        );

        assertInvalid(information, emptyAdditionalInformation(), emptyForm());
    }

    @Test
    void allowsConfiguredAdditionalInformationToRemainEmpty() {
        SubmissionFormDefinition form = form(
                List.of(),
                List.of(AdditionalInformationField.SPECIALTY)
        );

        assertDoesNotThrow(() -> validator.validate(
                emptyBasicInformation(), emptyAdditionalInformation(), form
        ));
    }

    @Test
    void rejectsAdditionalInformationThatWasNotConfigured() {
        SubmissionAdditionalInformation information = new SubmissionAdditionalInformation(
                null, List.of(), null, null, "현대무용", null, null, List.of()
        );

        assertInvalid(emptyBasicInformation(), information, emptyForm());
    }

    @Test
    void rejectsEducationWhenTheSchoolFieldWasNotConfigured() {
        SubmissionAdditionalInformation information = new SubmissionAdditionalInformation(
                SubmissionEducationLevel.UNIVERSITY,
                "한국예술종합학교",
                "연기과",
                List.of(),
                null,
                null,
                null,
                null,
                null,
                List.of()
        );

        assertInvalid(emptyBasicInformation(), information, emptyForm());
    }

    private void assertInvalid(
            SubmissionBasicInformation basicInformation,
            SubmissionAdditionalInformation additionalInformation,
            SubmissionFormDefinition form
    ) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validate(basicInformation, additionalInformation, form)
        );
        assertEquals(SubmissionErrorCode.INVALID_FORM_ANSWER, exception.getErrorCode());
    }

    private SubmissionFormDefinition form(
            List<BasicInformationField> basicFields,
            List<AdditionalInformationField> additionalFields
    ) {
        return new SubmissionFormDefinition(
                basicFields, additionalFields, List.of(), List.of(), List.of()
        );
    }

    private SubmissionFormDefinition emptyForm() {
        return form(List.of(), List.of());
    }

    private SubmissionBasicInformation emptyBasicInformation() {
        return new SubmissionBasicInformation(null, null, null, null, null, null, null, null);
    }

    private SubmissionAdditionalInformation emptyAdditionalInformation() {
        return new SubmissionAdditionalInformation(null, List.of(), null, null, null, null, null, List.of());
    }
}
