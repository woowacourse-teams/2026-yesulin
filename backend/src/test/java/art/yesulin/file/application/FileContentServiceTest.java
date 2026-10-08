package art.yesulin.file.application;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.dormant.domain.submission.SubmissionRepository;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileMetadata;
import art.yesulin.global.exception.BusinessException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FileContentServiceTest {

    private static final long FILE_ID = 41L;
    private static final long APPLICANT_ID = 10L;
    private static final long PRODUCER_ID = 20L;

    private FileAssetRepository fileAssetRepository;
    private SubmissionRepository submissionRepository;
    private OtrSubmissionRepository otrSubmissionRepository;
    private ObjectStorage objectStorage;
    private FileContentService fileContentService;

    @BeforeEach
    void setUp() {
        fileAssetRepository = mock(FileAssetRepository.class);
        submissionRepository = mock(SubmissionRepository.class);
        otrSubmissionRepository = mock(OtrSubmissionRepository.class);
        objectStorage = mock(ObjectStorage.class);
        fileContentService = new FileContentService(fileAssetRepository, submissionRepository,
                otrSubmissionRepository, objectStorage);
    }

    @Test
    void readReturnsContentWhenApplicantOwnsPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        byte[] bytes = {1, 2, 3};
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(objectStorage.read(file.getObjectKey())).thenReturn(
                Optional.of(new StoredObjectContent("image/png", bytes))
        );

        FileContentResult result = fileContentService.read(APPLICANT_ID, MemberType.APPLICANT, FILE_ID);

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

        FileContentResult result = fileContentService.read(PRODUCER_ID, MemberType.PRODUCER, FILE_ID);

        assertEquals("image/png", result.contentType());
    }

    @Test
    void readThrowsBusinessExceptionWhenMemberHasNoRelationToPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, PRODUCER_ID)).thenReturn(false);

        assertThrows(BusinessException.class, () -> fileContentService.read(
                PRODUCER_ID, MemberType.PRODUCER, FILE_ID
        ));
    }

    @Test
    void readReturnsContentWhenProducerOwnsOtrSubmissionPhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(otrSubmissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, PRODUCER_ID)).thenReturn(true);
        when(objectStorage.read(file.getObjectKey())).thenReturn(
                Optional.of(new StoredObjectContent("image/png", new byte[0]))
        );

        FileContentResult result = fileContentService.read(PRODUCER_ID, MemberType.PRODUCER, FILE_ID);

        assertEquals("image/png", result.contentType());
    }

    @Test
    void readReturnsContentWhenAdminReadsSubmittedPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(submissionRepository.existsSubmittedPhoto(FILE_ID)).thenReturn(true);
        when(objectStorage.read(file.getObjectKey())).thenReturn(
                Optional.of(new StoredObjectContent("image/png", new byte[0]))
        );

        FileContentResult result = fileContentService.read(30L, MemberType.ADMIN, FILE_ID);

        assertEquals("image/png", result.contentType());
    }

    @Test
    void readThrowsBusinessExceptionWhenAdminReadsUnsubmittedPrivatePhoto() {
        FileAsset file = readyPrivatePhoto();
        when(fileAssetRepository.findById(FILE_ID)).thenReturn(Optional.of(file));
        when(submissionRepository.existsSubmittedPhoto(FILE_ID)).thenReturn(false);

        assertThrows(BusinessException.class, () -> fileContentService.read(
                30L, MemberType.ADMIN, FILE_ID
        ));
    }

    private FileAsset readyPrivatePhoto() {
        FileAsset file = new FileAsset(
                "private/actor-photos/20260826/id", APPLICANT_ID,
                new FileMetadata("profile.png", "image/png", 3L)
        );
        file.completeUpload("image/png", 3L, java.time.Instant.now());
        return file;
    }
}
