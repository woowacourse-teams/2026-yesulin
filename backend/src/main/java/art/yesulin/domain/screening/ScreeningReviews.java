package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public final class ScreeningReviews {

    private Long auditionRoleId;
    private final Map<ReviewKey, ScreeningReview> values = new HashMap<>();

    public ScreeningReviews(List<ScreeningReview> reviews) {
        requireNonNull(reviews, "심사 결과 목록은 필수입니다.").forEach(this::add);
    }

    ScreeningReviews(long auditionRoleId, List<ScreeningReview> reviews) {
        this.auditionRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        requireNonNull(reviews, "심사 결과 목록은 필수입니다.").forEach(this::add);
    }

    public List<ScreeningReview> apply(
            List<UUID> submissionIds,
            long roleId,
            long stageId,
            ScreeningReviewChange change
    ) {
        ensureRole(roleId);
        return apply(submissionIds, stageId, change);
    }

    List<ScreeningReview> apply(List<UUID> submissionIds, long stageId, ScreeningReviewChange change) {
        return submissionIds.stream().map(id -> applyOne(id, stageId, change)).toList();
    }

    Optional<ScreeningReview> find(UUID submissionId, long stageId) {
        return Optional.ofNullable(values.get(new ReviewKey(submissionId, stageId)));
    }

    private ScreeningReview applyOne(UUID submissionId, long stageId, ScreeningReviewChange change) {
        ReviewKey key = new ReviewKey(submissionId, stageId);
        ScreeningReview review = values.computeIfAbsent(
                key, ignored -> new ScreeningReview(submissionId, auditionRoleId, stageId)
        );
        review.apply(change);
        return review;
    }

    private void add(ScreeningReview review) {
        if (auditionRoleId == null) {
            auditionRoleId = review.getAuditionRoleId();
        }
        if (review.getAuditionRoleId() != auditionRoleId.longValue()) {
            throw new IllegalArgumentException(
                    "다른 공고 배역의 심사 결과를 함께 관리할 수 없습니다."
            );
        }
        values.put(new ReviewKey(review.getSubmissionId(), review.getScreeningStageId()), review);
    }

    private void ensureRole(long roleId) {
        long validRoleId = requirePositive(roleId, "공고 배역 ID는 1 이상이어야 합니다.");
        if (auditionRoleId != null && auditionRoleId.longValue() != validRoleId) {
            throw new IllegalArgumentException("다른 공고 배역의 심사 결과를 변경할 수 없습니다.");
        }
        auditionRoleId = validRoleId;
    }

    private record ReviewKey(UUID submissionId, long stageId) {
    }
}
