package art.yesulin.operation.infrastructure.thumbnail;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.admin.PosterThumbnailSources;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RepositoryPosterThumbnailSources implements PosterThumbnailSources {

    private final AuditionPostRepository auditions;
    private final ShowRepository shows;
    private final FileService files;

    @Override
    public Optional<String> auditionPost(long id) {
        return auditions.findById(id).filter(AuditionPost::isPublished)
                .flatMap(post -> post.images().stream().findFirst()).map(AuditionPostFile::getObjectKey);
    }

    @Override
    public Optional<String> show(UUID id) {
        return shows.findByPublicId(id).filter(Show::isPublic)
                .map(show -> files.readPublicObjectKey(show.getOwnerId(), show.getPosterFileId()));
    }
}
