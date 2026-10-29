package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryItem;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import art.yesulin.global.exception.BusinessException;
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
        assertTrue(photos.getPageRepresentativePhoto().isEmpty());
        photos.attachPublicCopy(2L, "public/files/actor-pages/20261027/second");
        photos.attachPublicCopy(3L, "public/files/actor-pages/20261027/third");
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
    void publicCopyBelongsOnlyToActivePublicPhoto() {
        PhotoLibrary photos = new PhotoLibrary(1L);
        PhotoLibraryItem first = photos.addPhoto(1L);
        PhotoLibraryItem second = photos.addPhoto(2L);
        ReflectionTestUtils.setField(first, "id", 1L);
        ReflectionTestUtils.setField(second, "id", 2L);
        BusinessException exception = assertThrows(BusinessException.class,
                () -> photos.attachPublicCopy(1L, "public/files/actor-pages/20261027/first"));
        assertEquals(PhotoLibraryErrorCode.PHOTO_NOT_PUBLIC, exception.getErrorCode());

        photos.changeVisibility(1L, PhotoVisibility.PUBLIC);
        photos.changeVisibility(2L, PhotoVisibility.PUBLIC);
        photos.attachPublicCopy(1L, "public/files/actor-pages/20261027/first");
        photos.attachPublicCopy(2L, "public/files/actor-pages/20261027/second");
        assertEquals(2, photos.publicCopyObjectKeys().size());

        photos.changeVisibility(1L, PhotoVisibility.PRIVATE);
        assertFalse(first.hasPublicCopy());
        photos.changeVisibility(1L, PhotoVisibility.PUBLIC);
        assertFalse(first.hasPublicCopy());
        photos.deletePhoto(2L, Instant.now());
        assertFalse(second.hasPublicCopy());
        assertTrue(photos.publicCopyObjectKeys().isEmpty());

        photos.attachPublicCopy(1L, "public/files/actor-pages/20261027/again");
        photos.removePublicCopies();
        assertTrue(photos.publicCopyObjectKeys().isEmpty());
        assertTrue(photos.getPageRepresentativePhoto().isEmpty());
    }

    @Test
    void newVideosDefaultToProducerVisibility() {
        VideoLibrary videos = new VideoLibrary(1L);
        VideoLibraryItem video = videos.addVideo(YouTubeVideoUrl.parse("https://youtu.be/aqz-KE-bpKQ").orElseThrow());
        assertEquals(VideoVisibility.PRODUCER, video.getVisibility());
    }
}
