package art.yesulin.application.photolibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.photolibrary.PhotoLibrary;
import art.yesulin.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photo-library-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class PhotoLibraryServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private PhotoLibraryService photoLibraryService;

    @Autowired
    private PhotoLibraryRepository photoLibraryRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Test
    void addsReadyOwnedFileAndCreatesFileReference() {
        long fileId = requestReadyUpload(OWNER_ID);

        PhotoLibraryItemResult result = photoLibraryService.addPhoto(
                OWNER_ID, new AddPhotoToLibraryCommand(fileId)
        );

        assertEquals(fileId, result.fileId());
        assertTrue(result.imageUrl().startsWith("https://cdn.test/assets/files/"));
        assertEquals(0, result.displayOrder());
        assertTrue(result.representative());
        PhotoLibrary library = photoLibraryRepository.findByOwnerId(OWNER_ID).orElseThrow();
        assertEquals(1, library.getPhotos().size());
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                PhotoLibraryService.FILE_REFERENCE_TYPE, result.id(), fileId
        ));
    }

    @Test
    void findsActivePhotosInDisplayOrder() {
        long firstFileId = requestReadyUpload(OWNER_ID);
        long secondFileId = requestReadyUpload(OWNER_ID);
        PhotoLibraryItemResult first = photoLibraryService.addPhoto(
                OWNER_ID, new AddPhotoToLibraryCommand(firstFileId)
        );
        PhotoLibraryItemResult second = photoLibraryService.addPhoto(
                OWNER_ID, new AddPhotoToLibraryCommand(secondFileId)
        );

        PhotoLibraryResult result = photoLibraryService.findPhotos(OWNER_ID);

        assertEquals(List.of(first.id(), second.id()), result.photos().stream().map(
                PhotoLibraryItemResult::id
        ).toList());
        assertTrue(result.photos().getFirst().representative());
        assertFalse(result.photos().getLast().representative());
    }

    @Test
    void returnsEmptyPhotoListWhenLibraryDoesNotExist() {
        PhotoLibraryResult result = photoLibraryService.findPhotos(OWNER_ID);

        assertTrue(result.photos().isEmpty());
    }

    @Test
    void rejectsPendingFileWithoutCreatingLibrary() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> photoLibraryService.addPhoto(OWNER_ID, new AddPhotoToLibraryCommand(upload.fileId()))
        );

        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
        assertFalse(photoLibraryRepository.findByOwnerId(OWNER_ID).isPresent());
    }

    @Test
    void rejectsFileOwnedByAnotherMember() {
        long fileId = requestReadyUpload(2L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> photoLibraryService.addPhoto(OWNER_ID, new AddPhotoToLibraryCommand(fileId))
        );

        assertEquals(FileErrorCode.NOT_FOUND, exception.getErrorCode());
        assertFalse(photoLibraryRepository.findByOwnerId(OWNER_ID).isPresent());
    }

    private long requestReadyUpload(long ownerId) {
        FileUploadResult upload = fileService.requestUpload(
                ownerId, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(ownerId, upload.fileId());
        return upload.fileId();
    }
}
