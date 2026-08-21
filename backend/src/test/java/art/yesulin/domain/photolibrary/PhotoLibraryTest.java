package art.yesulin.domain.photolibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class PhotoLibraryTest {

    @Test
    void makesFirstPhotoRepresentative() {
        PhotoLibrary library = new PhotoLibrary(1L);

        PhotoLibraryItem first = library.addPhoto(1L);
        PhotoLibraryItem second = library.addPhoto(2L);

        assertTrue(first.isRepresentative());
        assertEquals(0, first.getDisplayOrder());
        assertEquals(1, second.getDisplayOrder());
        assertEquals(first, library.getRepresentativePhoto().orElseThrow());
    }

    @Test
    void allowsSameFileToBeAddedMoreThanOnce() {
        PhotoLibrary library = new PhotoLibrary(1L);

        library.addPhoto(1L);
        library.addPhoto(1L);

        assertEquals(2, library.getPhotos().size());
    }

    @Test
    void rejectsMoreThanTwentyActivePhotos() {
        PhotoLibrary library = new PhotoLibrary(1L);
        for (long fileId = 1; fileId <= PhotoLibrary.MAX_PHOTO_COUNT; fileId++) {
            library.addPhoto(fileId);
        }

        BusinessException exception = assertThrows(BusinessException.class, () -> library.addPhoto(21L));

        assertEquals(PhotoLibraryErrorCode.LIMIT_EXCEEDED, exception.getErrorCode());
    }
}
