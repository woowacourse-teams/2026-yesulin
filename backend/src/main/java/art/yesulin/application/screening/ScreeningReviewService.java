package art.yesulin.application.screening;

import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningReviews;
import art.yesulin.domain.screening.ScreeningRound;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScreeningReviewService {

    private final ScreeningReviewTargetFinder targetFinder;
    private final ScreeningReviewRepository reviewRepository;

    @Transactional
    public ScreeningReviewsResult save(long ownerId, long roleId, int round, SaveScreeningReviewsCommand command) {
        ScreeningReviewTarget target = targetFinder.findForUpdate(ownerId, roleId, new ScreeningRound(round));
        ScreeningReviews reviews = findReviews(target, command.applicationIds());
        List<ScreeningReview> changedReviews = reviews.apply(
                command.applicationIds(), target.roleId(), target.stageId(), command.toChange()
        );
        List<ScreeningReview> savedReviews = reviewRepository.saveAll(changedReviews);
        return ScreeningReviewsResult.from(target, savedReviews);
    }

    private ScreeningReviews findReviews(ScreeningReviewTarget target, List<UUID> applicationIds) {
        List<ScreeningReview> reviews = reviewRepository.findAllByAuditionRoleIdAndScreeningStageIdAndApplicationIdIn(
                target.roleId(), target.stageId(), applicationIds
        );
        return new ScreeningReviews(reviews);
    }
}
