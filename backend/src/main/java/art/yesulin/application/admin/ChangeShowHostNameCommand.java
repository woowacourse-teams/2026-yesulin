package art.yesulin.application.admin;

import java.util.UUID;

public record ChangeShowHostNameCommand(long actorMemberId, UUID showId, String hostName) {
}
