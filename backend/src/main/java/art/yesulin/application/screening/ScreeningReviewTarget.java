package art.yesulin.application.screening;

import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.screening.ScreeningRound;

record ScreeningReviewTarget(Audition audition, long roleId, long stageId, ScreeningRound round) {
}
