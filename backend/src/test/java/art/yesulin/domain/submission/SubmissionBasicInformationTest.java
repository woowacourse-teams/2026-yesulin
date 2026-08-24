package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SubmissionBasicInformationTest {

    @Test
    void normalizesOptionalTextValues() {
        SubmissionBasicInformation information = new SubmissionBasicInformation(
                " 김하린 ", 166, 52, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                "010-1234-5678", " harin@example.com ", " "
        );

        assertEquals("김하린", information.name());
        assertEquals("harin@example.com", information.email());
        assertNull(information.address());
    }

    @Test
    void rejectsInvalidPhoneFormat() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionBasicInformation(
                        null, null, null, null, null, "01012345678", null, null
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsTextOverMaximumLengths() {
        assertAll(
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionBasicInformation(
                                "이".repeat(SubmissionBasicInformation.MAX_NAME_LENGTH + 1),
                                null, null, null, null, null, null, null
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionBasicInformation(
                                null, null, null, null, null, null,
                                "a".repeat(SubmissionBasicInformation.MAX_EMAIL_LENGTH + 1), null
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionBasicInformation(
                                null, null, null, null, null, null, null,
                                "가".repeat(SubmissionBasicInformation.MAX_ADDRESS_LENGTH + 1)
                        )
                )
        );
    }
}
