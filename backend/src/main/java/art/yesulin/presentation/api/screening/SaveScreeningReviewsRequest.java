package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.SaveScreeningReviewsCommand;
import art.yesulin.domain.screening.ScreeningReview;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record SaveScreeningReviewsRequest(
        @NotEmpty List<@NotNull UUID> submissionIds,
        @Pattern(
                regexp = "PENDING|PASS|FAIL|ETC",
                flags = Pattern.Flag.CASE_INSENSITIVE,
                message = "지원하지 않는 심사 상태입니다."
        ) String status,
        @Size(max = ScreeningReview.MAX_OTHER_REASON_LENGTH) String memo,
        @Size(max = ScreeningReview.MAX_INTERNAL_MEMO_LENGTH) String note
) {

    @AssertTrue(message = "변경할 심사 상태나 메모를 입력해 주세요.")
    public boolean isChanged() {
        return status != null || memo != null || note != null;
    }

    public SaveScreeningReviewsCommand toCommand() {
        return new SaveScreeningReviewsCommand(submissionIds, status, memo, note);
    }
}
