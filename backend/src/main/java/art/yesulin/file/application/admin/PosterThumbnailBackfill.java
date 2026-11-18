package art.yesulin.file.application.admin;

import art.yesulin.file.application.thumbnail.PosterThumbnails;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PosterThumbnailBackfill {

    private final PosterThumbnailSources sources;
    private final PosterThumbnails thumbnails;

    @Transactional
    public List<Item> submit(List<Long> auditionPostIds, List<UUID> showIds, boolean retryFailed) {
        return Stream.concat(
                auditionPostIds.stream().distinct().map(id -> audition(id, retryFailed)),
                showIds.stream().distinct().map(id -> show(id, retryFailed))
        ).toList();
    }

    private Item audition(long id, boolean retry) {
        return enqueue("AUDITION_POST", Long.toString(id), sources.auditionPost(id), retry);
    }

    private Item show(UUID id, boolean retry) {
        return enqueue("SHOW", id.toString(), sources.show(id), retry);
    }

    private Item enqueue(String type, String id, Optional<String> source, boolean retry) {
        if (source.isEmpty()) {
            return new Item(type, id, "NO_PUBLIC_POSTER");
        }
        String key = source.orElseThrow();
        thumbnails.enqueue(key);
        if (retry) {
            thumbnails.retryFailed(key);
        }
        return new Item(type, id, thumbnails.stateOf(key));
    }

    public record Item(String type, String id, String state) {
    }
}
