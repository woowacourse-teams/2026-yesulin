package art.yesulin.legacy.application.photolibrary;

import java.util.List;

public record PhotoLibraryResult(List<PhotoLibraryItemResult> photos) {

    public PhotoLibraryResult {
        photos = List.copyOf(photos);
    }
}
