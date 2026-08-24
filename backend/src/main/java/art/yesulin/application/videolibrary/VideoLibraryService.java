package art.yesulin.application.videolibrary;

import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.INVALID_VIDEO_URL;
import static art.yesulin.domain.videolibrary.VideoLibraryErrorCode.VIDEO_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.video.YouTubeVideoUrl;
import art.yesulin.domain.videolibrary.VideoLibrary;
import art.yesulin.domain.videolibrary.VideoLibraryItem;
import art.yesulin.domain.videolibrary.VideoLibraryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VideoLibraryService {

    private final VideoLibraryRepository videoLibraryRepository;

    @Transactional(readOnly = true)
    public VideoLibraryResult findVideos(long ownerId) {
        List<VideoLibraryItem> videos = videoLibraryRepository.findByOwnerId(ownerId)
                .map(VideoLibrary::getVideos)
                .orElseGet(List::of);
        return toResult(videos);
    }

    @Transactional
    public VideoLibraryItemResult addVideo(long ownerId, AddVideoToLibraryCommand command) {
        YouTubeVideoUrl video = YouTubeVideoUrl.parse(command.url())
                .orElseThrow(() -> new BusinessException(INVALID_VIDEO_URL, "올바른 YouTube 영상 URL을 입력해 주세요."));
        VideoLibrary library = videoLibraryRepository.findByOwnerIdForUpdate(ownerId)
                .orElseGet(() -> new VideoLibrary(ownerId));
        library.addVideo(video);
        VideoLibrary savedLibrary = videoLibraryRepository.saveAndFlush(library);
        return VideoLibraryItemResult.from(savedLibrary.getVideos().getLast());
    }

    @Transactional
    public VideoLibraryResult moveVideo(long ownerId, long videoId, int displayOrder) {
        VideoLibrary library = findOwnedLibraryForUpdate(ownerId);
        library.moveVideo(videoId, displayOrder);
        return toResult(library.getVideos());
    }

    @Transactional
    public void deleteVideo(long ownerId, long videoId) {
        VideoLibrary library = findOwnedLibraryForUpdate(ownerId);
        library.deleteVideo(videoId);
    }

    private VideoLibrary findOwnedLibraryForUpdate(long ownerId) {
        return videoLibraryRepository.findByOwnerIdForUpdate(ownerId)
                .orElseThrow(() -> new BusinessException(VIDEO_NOT_FOUND, "영상보관함에서 영상을 찾을 수 없습니다."));
    }

    private VideoLibraryResult toResult(List<VideoLibraryItem> videos) {
        return new VideoLibraryResult(videos.stream().map(VideoLibraryItemResult::from).toList());
    }
}
