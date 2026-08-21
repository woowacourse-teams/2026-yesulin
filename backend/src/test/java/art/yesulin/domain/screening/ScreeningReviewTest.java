package art.yesulin.domain.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ScreeningReviewTest {

    private static final UUID APPLICATION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");

    @Test
    void keepsInternalMemoWhenStatusChanges() {
        ScreeningReview review = new ScreeningReview(APPLICATION_ID, 2L, 3L);
        review.apply(new ScreeningReviewChange(
                ScreeningReviewStatus.ETC, "추가 논의 필요", "발성 확인 후 결정"
        ));

        review.apply(new ScreeningReviewChange(ScreeningReviewStatus.PASS, null, null));

        assertEquals(ScreeningReviewStatus.PASS, review.getStatus());
        assertEquals("", review.getOtherReason());
        assertEquals("발성 확인 후 결정", review.getInternalMemo());
    }

    @Test
    void requiresReasonForEtcStatus() {
        ScreeningReview review = new ScreeningReview(APPLICATION_ID, 2L, 3L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> review.decide(ScreeningReviewStatus.ETC, " ")
        );

        assertEquals(ScreeningReviewErrorCode.INVALID_REVIEW, exception.getErrorCode());
        assertEquals(ScreeningReviewStatus.PENDING, review.getStatus());
    }

    @Test
    void rejectsOtherReasonChangeOutsideEtcStatus() {
        ScreeningReview review = new ScreeningReview(APPLICATION_ID, 2L, 3L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> review.updateOtherReason("보류")
        );

        assertEquals(ScreeningReviewErrorCode.INVALID_REVIEW, exception.getErrorCode());
    }
}
