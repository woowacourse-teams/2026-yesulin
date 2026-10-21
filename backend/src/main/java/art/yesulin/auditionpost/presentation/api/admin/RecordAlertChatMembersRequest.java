package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.domain.alertchat.AlertChatMemberCount;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** 지금 공고 알림 오픈채팅방 인원. */
public record RecordAlertChatMembersRequest(
        @NotNull @Positive @Max(AlertChatMemberCount.MAX_MEMBER_COUNT) Integer memberCount
) {
}
