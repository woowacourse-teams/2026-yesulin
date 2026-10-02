package art.yesulin.application.admin.log;

import java.time.Instant;

public record OtrRedirectCount(String otrId, long clicks, Instant lastClickedAt) {
}
