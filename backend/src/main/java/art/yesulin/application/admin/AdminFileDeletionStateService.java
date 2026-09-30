package art.yesulin.application.admin;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;
import static art.yesulin.domain.file.FileErrorCode.STILL_IN_USE;
import static art.yesulin.domain.file.FileErrorCode.TOO_RECENT;

import art.yesulin.application.file.report.UnusedFileCandidate;
import art.yesulin.application.file.report.UnusedFileCandidateReader;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileStatus;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminFileDeletionStateService {

    private static final int UNUSED_DAYS = 7;

    private final FileAssetRepository fileAssetRepository;
    private final UnusedFileCandidateReader candidateReader;
    private final AdminAuditLogRepository auditLogRepository;
    private final Clock clock;

    @Transactional
    public Optional<FileDeletionTarget> prepare(long fileId) {
        FileAsset file = fileAssetRepository.findByIdForUpdate(fileId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        if (file.getStatus() == FileStatus.DELETED) {
            return Optional.empty();
        }
        UnusedFileCandidate candidate = candidateReader.findById(fileId)
                .orElseThrow(() -> new BusinessException(STILL_IN_USE, "사용 중인 파일은 삭제할 수 없습니다."));
        if (file.getStatus() != FileStatus.DELETING
                && clock.instant().isBefore(candidate.unusedSince().plus(UNUSED_DAYS, ChronoUnit.DAYS))) {
            throw new BusinessException(TOO_RECENT, "미사용 기간이 7일 지나야 삭제할 수 있습니다.");
        }
        file.beginDeletion();
        return Optional.of(new FileDeletionTarget(fileId, file.getObjectKey()));
    }

    @Transactional
    public void finish(long actorMemberId, long fileId) {
        FileAsset file = fileAssetRepository.findByIdForUpdate(fileId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        if (file.getStatus() == FileStatus.DELETED) {
            return;
        }
        file.finishDeletion(clock.instant());
        auditLogRepository.save(new AdminAuditLog(
                actorMemberId, AdminAction.FILE_DELETED, "FILE", fileId, "unused file object deleted"
        ));
    }
}
