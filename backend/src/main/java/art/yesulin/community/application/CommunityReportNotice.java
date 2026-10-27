package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityReport;
import art.yesulin.community.domain.ReportReason;
import java.time.Instant;

public record CommunityReportNotice(long reportId, long postId, long entryId, ReportReason reason, Instant createdAt) {

    public static CommunityReportNotice from(CommunityReport report) {
        return new CommunityReportNotice(report.getId(), report.getPostId(), report.getEntryId(),
                report.getReason(), report.getCreatedAt());
    }
}
