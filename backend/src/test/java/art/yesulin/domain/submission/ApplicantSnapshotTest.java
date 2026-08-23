package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ApplicantSnapshotTest {

    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-01T00:00:00Z");

    @Test
    void calculatesFullAgeBeforeBirthdayAtRecruitmentDeadline() {
        ApplicantSnapshot snapshot = snapshot(
                LocalDate.of(2000, 8, 24),
                Instant.parse("2026-08-23T14:59:59Z")
        );

        assertEquals(25, snapshot.getAgeAtRecruitmentDeadline());
    }

    @Test
    void calculatesFullAgeUsingKoreanDateAtRecruitmentDeadline() {
        ApplicantSnapshot snapshot = snapshot(
                LocalDate.of(2000, 8, 24),
                Instant.parse("2026-08-23T15:00:00Z")
        );

        assertEquals(26, snapshot.getAgeAtRecruitmentDeadline());
    }

    @Test
    void handlesLeapDayBirthDate() {
        ApplicantSnapshot snapshot = snapshot(
                LocalDate.of(2000, 2, 29),
                Instant.parse("2026-03-01T00:00:00Z")
        );

        assertEquals(26, snapshot.getAgeAtRecruitmentDeadline());
    }

    @Test
    void storesNullAgeWhenBirthDateWasNotCollected() {
        ApplicantSnapshot snapshot = snapshot(null, Instant.parse("2026-08-31T14:59:00Z"));

        assertNull(snapshot.getAgeAtRecruitmentDeadline());
    }

    @Test
    void allowsApplicantUnderFourteenInFirstImplementation() {
        ApplicantSnapshot snapshot = snapshot(
                LocalDate.of(2013, 9, 1),
                Instant.parse("2026-08-31T14:59:00Z")
        );

        assertEquals(12, snapshot.getAgeAtRecruitmentDeadline());
    }

    @Test
    void rejectsBirthDateAfterSubmissionDate() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> snapshot(
                        LocalDate.of(2026, 8, 2),
                        Instant.parse("2026-08-31T14:59:00Z")
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    private ApplicantSnapshot snapshot(LocalDate birthDate, Instant recruitmentEndAt) {
        SubmissionBasicInformation basicInformation = new SubmissionBasicInformation(
                null, null, null, birthDate, null, null, null, null
        );
        SubmissionAdditionalInformation additionalInformation = new SubmissionAdditionalInformation(
                null, List.of(), null, null, null, null, null, List.of()
        );
        SubmissionFieldSnapshot fields = new SubmissionFieldSnapshot(
                List.of(SubmissionBasicInformationField.BIRTH),
                List.of()
        );
        return new ApplicantSnapshot(basicInformation, additionalInformation, fields, SUBMITTED_AT, recruitmentEndAt);
    }
}
