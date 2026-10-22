package art.yesulin.show.presentation.api;

import jakarta.validation.constraints.NotNull;

/** 예매 상태는 유지한 채 관객 목록·상세의 숨김 여부를 바꾼다. */
public record ChangeShowVisibilityRequest(@NotNull Boolean hidden) {
}
