package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityDigest;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityErrorCode;
import art.yesulin.community.domain.CommunityReport;
import art.yesulin.community.domain.CommunityReportRepository;
import art.yesulin.community.domain.ReportReason;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class CommunityReportService {

    private final CommunityEntryRepository entries;
    private final CommunityReportRepository reports;
    private final Clock clock;
    private final TransactionTemplate transactions;

    public void report(long entryId, String secret, UUID requestId, ReportReason reason, String detail) {
        String owner = CommunityDigest.owner(secret);
        try {
            transactions.executeWithoutResult(status -> createOrReplay(entryId, owner, requestId, reason, detail));
        } catch (DataIntegrityViolationException exception) {
            transactions.executeWithoutResult(status -> replay(entryId, owner, requestId, reason, detail));
        }
    }

    private void createOrReplay(long entryId, String owner, UUID requestId, ReportReason reason, String detail) {
        CommunityEntry target = lockTarget(entryId);
        reports.findByRequestKey(requestId.toString()).ifPresentOrElse(
                report -> report.verifyRetry(entryId, owner, reason, detail),
                () -> save(target, owner, requestId, reason, detail));
    }

    private void replay(long entryId, String owner, UUID requestId, ReportReason reason, String detail) {
        lockTarget(entryId);
        CommunityReport report = reports.findByRequestKey(requestId.toString())
                .orElseThrow(() -> new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "신고 요청이 충돌했어요."));
        report.verifyRetry(entryId, owner, reason, detail);
    }

    private CommunityEntry lockTarget(long entryId) {
        long rootId = entries.findRootId(entryId).orElseThrow(this::notFound);
        entries.lockById(rootId).orElseThrow(this::notFound).requirePost();
        CommunityEntry entry = entries.lockById(entryId).orElseThrow(this::notFound);
        entry.requireVisible();
        return entry;
    }

    private void save(CommunityEntry target, String owner, UUID requestId, ReportReason reason, String detail) {
        long postId = target.getId();
        if (target.getParentId() != null) {
            postId = target.getParentId();
        }
        CommunityReport report = new CommunityReport(target.getId(), postId, owner, requestId,
                reason, detail, clock.instant());
        report.queueNotification(target.recordFirstReport());
        reports.save(report);
    }

    private BusinessException notFound() {
        return new BusinessException(CommunityErrorCode.NOT_FOUND, "신고할 글이나 댓글을 찾을 수 없어요.");
    }
}
