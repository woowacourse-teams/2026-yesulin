package art.yesulin.actor.presentation.api.admin;

import art.yesulin.actor.domain.page.ActorPage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 잠금 사유는 배우의 편집 화면에 그대로 보인다. */
public record LockActorPageRequest(@NotBlank @Size(max = ActorPage.MAX_LOCK_REASON_LENGTH) String reason) {
}
