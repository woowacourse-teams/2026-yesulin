package art.yesulin.domain.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ScreeningReviewStatusTest {

    @Test
    void rejectsMissingStatusAsBusinessException() {
        assertRequiredStatus(null);
        assertRequiredStatus("");
        assertRequiredStatus(" ");
    }

    private void assertRequiredStatus(String value) {
        BusinessException exception = assertThrows(BusinessException.class, () -> ScreeningReviewStatus.from(value));

        assertEquals(ScreeningReviewErrorCode.INVALID_REVIEW, exception.getErrorCode());
        assertEquals("심사 상태는 필수입니다.", exception.getMessage());
    }
}
