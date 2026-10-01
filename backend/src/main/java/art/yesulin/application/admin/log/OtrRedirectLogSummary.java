package art.yesulin.application.admin.log;

import java.util.List;

public record OtrRedirectLogSummary(List<OtrRedirectCount> links, boolean available, boolean truncated) {
}
