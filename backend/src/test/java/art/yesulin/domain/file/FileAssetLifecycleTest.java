package art.yesulin.domain.file;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class FileAssetLifecycleTest {

    private static final Instant COMPLETED_AT = Instant.parse("2026-09-20T00:00:00Z");
    private static final Instant UNLINKED_AT = Instant.parse("2026-09-25T00:00:00Z");

    @Test
    void readyFileStartsUnusedPeriodWhenUploadCompletes() {
        FileAsset file = new FileAsset("private/actor-photos/photo", 1L, metadata());

        // given
        // when
        file.completeUpload("image/png", 10L, COMPLETED_AT);

        // then
        assertEquals(FileStatus.READY, file.getStatus());
        assertEquals(COMPLETED_AT, file.getUnreferencedAt());
    }

    @Test
    void lastUnlinkRestartsUnusedPeriod() {
        FileAsset file = new FileAsset("private/actor-photos/photo", 1L, metadata());
        file.completeUpload("image/png", 10L, COMPLETED_AT);

        // when
        file.markUnreferenced(UNLINKED_AT);

        // then
        assertEquals(UNLINKED_AT, file.getUnreferencedAt());
    }

    @Test
    void deletionBlocksLaterUploadCompletion() {
        FileAsset file = new FileAsset("private/actor-photos/photo", 1L, metadata());
        file.beginDeletion();

        // when
        BusinessException exception = assertThrows(BusinessException.class,
                () -> file.completeUpload("image/png", 10L, COMPLETED_AT));

        // then
        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
    }

    private FileMetadata metadata() {
        return new FileMetadata("photo.png", "image/png", 10L);
    }
}
