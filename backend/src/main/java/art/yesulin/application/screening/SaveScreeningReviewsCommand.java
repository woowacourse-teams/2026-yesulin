package art.yesulin.application.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.screening.ScreeningReviewChange;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record SaveScreeningReviewsCommand(
        List<UUID> submissionIds,
        String status,
        String otherReason,
        String internalMemo
) {

    public SaveScreeningReviewsCommand {
        if (submissionIds == null || submissionIds.isEmpty()) {
            throw new BusinessException(INVALID_REVIEW, "심사할 지원서를 한 개 이상 선택해 주세요.");
        }
        if (submissionIds.stream().anyMatch(Objects::isNull)) {
            throw new BusinessException(INVALID_REVIEW, "제출 지원서 ID는 필수입니다.");
        }
        if (new HashSet<>(submissionIds).size() != submissionIds.size()) {
            throw new BusinessException(INVALID_REVIEW, "같은 지원서를 중복해서 심사할 수 없습니다.");
        }
        submissionIds = List.copyOf(submissionIds);
    }

    public ScreeningReviewChange toChange() {
        return new ScreeningReviewChange(parseStatus(), otherReason, internalMemo);
    }

    private ScreeningReviewStatus parseStatus() {
        if (status == null) {
            return null;
        }
        return ScreeningReviewStatus.from(status);
    }
}
