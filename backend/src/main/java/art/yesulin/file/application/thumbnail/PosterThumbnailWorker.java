package art.yesulin.file.application.thumbnail;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.application.storage.PublicObjectCache;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.domain.thumbnail.PosterThumbnailJob;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class PosterThumbnailWorker {

    private static final int MAX_SOURCE_BYTES = 30 * 1024 * 1024;
    private static final Duration STORAGE_TIMEOUT = Duration.ofSeconds(45);
    private static final Duration MAX_TIME_BEFORE_PUT = Duration.ofMinutes(3);

    private final PosterThumbnails thumbnails;
    private final PosterImageConverter converter;
    private final ObjectStorage storage;
    private final PublicObjectCache publicCache;

    public void runNext() {
        thumbnails.next().ifPresent(this::process);
    }

    private void process(PosterThumbnailJob work) {
        try {
            if (work.removing()) {
                remove(work);
                return;
            }
            thumbnails.markGenerated(work, generate(work.getSourceKey()));
        } catch (IOException | RuntimeException exception) {
            log.warn("Poster thumbnail task failed for key={} attempt={}", work.getSourceKey(), work.getAttempts() + 1,
                    exception);
            thumbnails.retry(work);
        }
    }

    private void remove(PosterThumbnailJob work) {
        String key = PosterThumbnails.thumbnailKey(work.getSourceKey());
        storage.delete(key);
        publicCache.evict(List.of(key));
        thumbnails.finishRemoval(work);
    }

    private boolean generate(String key) throws IOException {
        long start = System.nanoTime();
        Optional<StoredObjectContent> object = storage.read(key, MAX_SOURCE_BYTES, STORAGE_TIMEOUT);
        if (object.isEmpty()) {
            return false;
        }
        Optional<byte[]> thumbnail = converter.convert(object.orElseThrow().bytes());
        if (System.nanoTime() - start > MAX_TIME_BEFORE_PUT.toNanos()) {
            throw new IOException("Poster thumbnail conversion exceeded worker time limit");
        }
        return store(key, thumbnail);
    }

    private boolean store(String key, Optional<byte[]> thumbnail) {
        if (thumbnail.isEmpty()) {
            return false;
        }
        byte[] bytes = thumbnail.orElseThrow();
        storage.put(PosterThumbnails.thumbnailKey(key),
                new ObjectUpload("image/jpeg", null, bytes.length, new ByteArrayInputStream(bytes),
                        "public, max-age=600"), STORAGE_TIMEOUT);
        return true;
    }
}
