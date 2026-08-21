package art.yesulin.domain.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ScreeningRoundTest {

    @Test
    void convertsRoundToStageOrder() {
        ScreeningRound round = new ScreeningRound(3);

        assertEquals(3, round.value());
        assertEquals(2, round.stageOrder());
    }

    @Test
    void rejectsRoundOutsideOneToFive() {
        BusinessException exception = assertThrows(BusinessException.class, () -> new ScreeningRound(6));

        assertEquals(ScreeningReviewErrorCode.INVALID_REVIEW, exception.getErrorCode());
    }
}
