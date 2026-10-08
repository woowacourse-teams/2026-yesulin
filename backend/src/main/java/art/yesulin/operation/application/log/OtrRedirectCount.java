package art.yesulin.operation.application.log;

import java.time.Instant;

public record OtrRedirectCount(String otrId, long clicks, Instant lastClickedAt) {
}
