package art.yesulin.operation.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.thumbnail.PosterThumbnails;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowRepository;
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

    private final AuditionPostRepository auditions;
    private final ShowRepository shows;
    private final FileService files;
    private final PosterThumbnails thumbnails;

    @Transactional
    public List<Item> submit(List<Long> auditionPostIds, List<UUID> showIds, boolean retryFailed) {
        return Stream.concat(
                auditionPostIds.stream().distinct().map(id -> audition(id, retryFailed)),
                showIds.stream().distinct().map(id -> show(id, retryFailed))
        ).toList();
    }

    private Item audition(long id, boolean retry) {
        var source = auditions.findById(id).filter(AuditionPost::isPublished)
                .flatMap(post -> post.images().stream().findFirst()).map(AuditionPostFile::getObjectKey);
        return enqueue("AUDITION_POST", Long.toString(id), source, retry);
    }

    private Item show(UUID id, boolean retry) {
        var source = shows.findByPublicId(id).filter(Show::isPublic)
                .map(show -> files.readPublicObjectKey(show.getOwnerId(), show.getPosterFileId()));
        return enqueue("SHOW", id.toString(), source, retry);
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
