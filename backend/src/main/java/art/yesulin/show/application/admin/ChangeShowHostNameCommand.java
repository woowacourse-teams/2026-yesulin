package art.yesulin.show.application.admin;

import java.util.UUID;

public record ChangeShowHostNameCommand(long actorMemberId, UUID showId, String hostName) {
}
