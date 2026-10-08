package art.yesulin.show.presentation.api.admin;

import art.yesulin.show.application.admin.ChangeShowHostNameCommand;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** 빈 문자열이면 기획사 계정의 회사명으로 되돌린다. */
public record ChangeShowHostNameRequest(@NotNull @Size(max = 50) String hostName) {

    ChangeShowHostNameCommand toCommand(long actorMemberId, UUID showId) {
        return new ChangeShowHostNameCommand(actorMemberId, showId, hostName);
    }
}
