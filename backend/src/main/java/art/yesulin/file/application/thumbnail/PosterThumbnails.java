package art.yesulin.file.application.thumbnail;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.domain.thumbnail.PosterThumbnailJob;
import art.yesulin.file.domain.thumbnail.PosterThumbnailRepository;
import java.time.Clock;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PosterThumbnails {

    private static final Pattern SOURCE = Pattern.compile(
            "public/(files|audition-posts)/[0-9]{8}/[0-9a-f-]{36}"
    );
    private static final int MAX_ATTEMPTS = 3;

    private final PosterThumbnailRepository jobs;
    private final ObjectStorage storage;
    private final Clock clock;

    public void enqueue(String key) {
        if (!SOURCE.matcher(key).matches()) {
            return;
        }
        jobs.enqueue(key, clock.instant());
    }

    public void retryFailed(String key) {
        jobs.changeState(key, "FAILED", "PENDING", 0, clock.instant());
    }

    public void retire(String key) {
        if (!SOURCE.matcher(key).matches()) {
            return;
        }
        jobs.retire(key, clock.instant());
    }

    public Function<String, String> publicUrls(Collection<String> keys) {
        Set<String> ready = new HashSet<>(readyKeys(keys));
        return key -> storage.toPublicUrl(displayKey(ready, key));
    }

    private List<String> readyKeys(Collection<String> keys) {
        if (keys.isEmpty()) {
            return List.of();
        }
        return jobs.readyKeys(keys);
    }

    Optional<PosterThumbnailJob> next() {
        return jobs.findFirstByStateInAndAvailableAtLessThanEqualOrderByAvailableAtAscSourceKeyAsc(
                List.of("PENDING", "REMOVING"), clock.instant()
        );
    }

    void markGenerated(PosterThumbnailJob work, boolean generated) {
        if (generated) {
            jobs.changeState(work.getSourceKey(), work.getState(), "READY", work.getAttempts(), clock.instant());
            return;
        }
        jobs.changeState(work.getSourceKey(), work.getState(), "SKIPPED", work.getAttempts(), clock.instant());
    }

    void finishRemoval(PosterThumbnailJob work) {
        jobs.changeState(work.getSourceKey(), work.getState(), "REMOVED", 0, clock.instant());
    }

    void retry(PosterThumbnailJob work) {
        int attempts = work.getAttempts() + 1;
        jobs.changeState(work.getSourceKey(), work.getState(), retryState(work, attempts), attempts,
                clock.instant().plusSeconds(retryDelay(attempts)));
    }

    private String retryState(PosterThumbnailJob work, int attempts) {
        if (work.removing() || attempts < MAX_ATTEMPTS) {
            return work.getState();
        }
        return "FAILED";
    }

    private long retryDelay(int attempts) {
        return Math.min(3600L, 60L * attempts);
    }

    public String stateOf(String key) {
        return jobs.stateOf(key).orElse("UNQUEUED");
    }

    static String thumbnailKey(String original) {
        return original + "/card-v1.jpg";
    }

    private String displayKey(Set<String> ready, String key) {
        if (ready.contains(key)) {
            return thumbnailKey(key);
        }
        return key;
    }

}
