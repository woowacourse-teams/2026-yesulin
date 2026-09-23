package art.yesulin.domain.otraudition;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OtrSubmissionTest {

    @Test
    void hasAdditionalInformationWhenValueExists() {
        SubmissionAdditionalInformation empty = new SubmissionAdditionalInformation(
                null, List.of(), null, null, null, null, null, List.of()
        );
        SubmissionAdditionalInformation present = new SubmissionAdditionalInformation(
                null, List.of(), null, "자기소개", null, null, null, List.of()
        );

        assertFalse(submission(empty).isAdditionalInformationPresent());
        assertTrue(submission(present).isAdditionalInformationPresent());
    }

    private OtrSubmission submission(SubmissionAdditionalInformation additionalInformation) {
        return new OtrSubmission(
                1L,
                2L,
                "햄릿",
                new SubmissionBasicInformation(null, null, null, null, null, null, null, null),
                additionalInformation,
                List.of(),
                List.of(),
                "극단 예술인",
                "privacy-v1",
                "third-party-v1",
                Instant.EPOCH
        );
    }
}
