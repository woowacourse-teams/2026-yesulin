package art.yesulin.application.file;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class FileUsageServiceTest {

    @Test
    void startsUnusedPeriodAfterWaitingForAnotherFileUpdate() {
        // given
        Instant beforeLock = Instant.parse("2026-09-30T00:00:00Z");
        Instant afterLock = beforeLock.plusSeconds(60);
        AtomicReference<Instant> currentTime = new AtomicReference<>(beforeLock);
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(invocation -> currentTime.get());
        FileAsset file = new FileAsset("private/actor-photos/photo", 1L,
                new FileMetadata("photo.png", "image/png", 10L));
        file.completeUpload("image/png", 10L, beforeLock.minusSeconds(60));
        FileAssetRepository repository = mock(FileAssetRepository.class);
        when(repository.findByIdForUpdate(1L)).thenAnswer(invocation -> {
            currentTime.set(afterLock);
            return Optional.of(file);
        });
        FileUsageService service = new FileUsageService(repository, clock);

        // when
        service.markReferencesRemoved(List.of(1L));

        // then
        assertEquals(afterLock, file.getUnreferencedAt());
    }
}
