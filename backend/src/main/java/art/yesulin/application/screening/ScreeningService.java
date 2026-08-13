package art.yesulin.application.screening;

public interface ScreeningService {

    ScreeningBoardResult board(long companyId, long roleId, Integer round);

    ScreeningBoardResult review(long companyId, ScreeningReviewCommand command);

    ScreeningBoardResult closeRound(long companyId, long roleId, int round);
}
