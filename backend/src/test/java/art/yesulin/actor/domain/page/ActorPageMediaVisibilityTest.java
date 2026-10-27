package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryItem;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import art.yesulin.global.validation.YouTubeVideoUrl;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ActorPageMediaVisibilityTest {

    @Test
    void privateFirstPhotoRemainsApplicationRepresentativeButNeverPageRepresentative() {
        PhotoLibrary photos = new PhotoLibrary(1L);
        PhotoLibraryItem first = photos.addPhoto(1L);
        PhotoLibraryItem second = photos.addPhoto(2L);
        PhotoLibraryItem third = photos.addPhoto(3L);
        ReflectionTestUtils.setField(first, "id", 1L);
        ReflectionTestUtils.setField(second, "id", 2L);
        ReflectionTestUtils.setField(third, "id", 3L);
        assertEquals(PhotoVisibility.PRIVATE, first.getVisibility());
        assertTrue(photos.getPageRepresentativePhoto().isEmpty());
        photos.changeVisibility(2L, PhotoVisibility.PUBLIC);
        photos.changeVisibility(3L, PhotoVisibility.PUBLIC);
        assertEquals(first, photos.getRepresentativePhoto().orElseThrow());
        assertEquals(second, photos.getPageRepresentativePhoto().orElseThrow());
        photos.movePhotoToFront(3L);
        assertEquals(third, photos.getPageRepresentativePhoto().orElseThrow());
        photos.deletePhoto(3L, Instant.now());
        assertEquals(second, photos.getPageRepresentativePhoto().orElseThrow());
        photos.changeVisibility(2L, PhotoVisibility.PRIVATE);
        assertTrue(photos.getPageRepresentativePhoto().isEmpty());
    }

    @Test
    void newVideosDefaultToProducerVisibility() {
        VideoLibrary videos = new VideoLibrary(1L);
        VideoLibraryItem video = videos.addVideo(YouTubeVideoUrl.parse("https://youtu.be/aqz-KE-bpKQ").orElseThrow());
        assertEquals(VideoVisibility.PRODUCER, video.getVisibility());
    }
}
