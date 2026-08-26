package art.yesulin.application.file;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.StoredObjectContent;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.submission.SubmissionRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FileContentServiceTest {

    private static final long FILE_ID = 41L;
    private static final long APPLICANT_ID = 10L;
    private static final long PRODUCER_ID = 20L;

    private FileAssetRepository fileAssetRepository;
    private SubmissionRepository submissionRepository;
    private ObjectStorage objectStorage;
    private FileContentService fileContentService;

    @BeforeEach
    void setUp() {
        fileAssetRepository = mock(FileAssetRepository.class);
        submissionRepository = mock(SubmissionRepository.class);
        objectStorage = mock(ObjectStorage.class);
        fileContentService = new FileContentService(fileAssetRepository, submissionRepository, objectStorage);
    }

    @Test
    void readReturnsContentWhenApplicantOwnsPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        byte[] bytes = {1, 2, 3};
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(objectStorage.read(file.getObjectKey())).thenReturn(
                Optional.of(new StoredObjectContent("image/png", bytes))
        );

        FileContentResult result = fileContentService.read(APPLICANT_ID, FILE_ID);

        assertEquals("image/png", result.contentType());
        assertArrayEquals(bytes, result.bytes());
    }

    @Test
    void readReturnsContentWhenProducerOwnsAuditionForSubmittedPhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, PRODUCER_ID)).thenReturn(true);
        when(objectStorage.read(file.getObjectKey())).thenReturn(
                Optional.of(new StoredObjectContent("image/png", new byte[0]))
        );

        FileContentResult result = fileContentService.read(PRODUCER_ID, FILE_ID);

        assertEquals("image/png", result.contentType());
    }

    @Test
    void readThrowsBusinessExceptionWhenMemberHasNoRelationToPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, PRODUCER_ID)).thenReturn(false);

        assertThrows(BusinessException.class, () -> fileContentService.read(PRODUCER_ID, FILE_ID));
    }

    private FileAsset readyPrivatePhoto() {
        FileAsset file = new FileAsset(
                "private/actor-photos/20260826/id", APPLICANT_ID,
                new FileMetadata("profile.png", "image/png", 3L)
        );
        file.completeUpload("image/png", 3L);
        return file;
    }
}
