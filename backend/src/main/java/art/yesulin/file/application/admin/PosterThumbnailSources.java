package art.yesulin.file.application.admin;

import java.util.Optional;
import java.util.UUID;

public interface PosterThumbnailSources {

    Optional<String> auditionPost(long id);

    Optional<String> show(UUID id);
}
