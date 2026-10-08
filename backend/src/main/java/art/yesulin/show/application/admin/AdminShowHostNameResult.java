package art.yesulin.show.application.admin;

import java.util.UUID;

/** {@code hostName}이 비어 있으면 관객에게는 {@code companyName}이 보인다. */
public record AdminShowHostNameResult(UUID showId, String hostName, String companyName) {
}
