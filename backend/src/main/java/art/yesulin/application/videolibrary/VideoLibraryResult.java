package art.yesulin.application.videolibrary;

import java.util.List;

public record VideoLibraryResult(List<VideoLibraryItemResult> videos) {

    public VideoLibraryResult {
        videos = List.copyOf(videos);
    }
}
