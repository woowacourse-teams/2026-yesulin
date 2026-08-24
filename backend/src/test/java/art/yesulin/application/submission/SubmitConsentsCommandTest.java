package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionErrorCode;
import org.junit.jupiter.api.Test;

class SubmitConsentsCommandTest {

    @Test
    void requiresBothSubmissionConsents() {
        BusinessException privacyException = assertThrows(
                BusinessException.class, () -> new SubmitConsentsCommand(false, true)
        );
        BusinessException thirdPartyException = assertThrows(
                BusinessException.class, () -> new SubmitConsentsCommand(true, false)
        );

        assertEquals(SubmissionErrorCode.INVALID_CONSENT, privacyException.getErrorCode());
        assertEquals(SubmissionErrorCode.INVALID_CONSENT, thirdPartyException.getErrorCode());
    }
}
