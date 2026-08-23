package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SubmissionPhotoFileValidatorTest {

    private static final long APPLICANT_ID = 1L;

    private FileAssetRepository fileAssetRepository;
    private SubmissionPhotoFileValidator validator;

    @BeforeEach
    void setUp() {
        fileAssetRepository = mock(FileAssetRepository.class);
        validator = new SubmissionPhotoFileValidator(fileAssetRepository);
    }

    @Test
    void validatesOwnedReadyPhotosWithOneBatchQuery() {
        FileAsset first = readyFile(10L);
        FileAsset second = readyFile(11L);
        when(fileAssetRepository.findAllByIdInAndOwnerId(Set.of(10L, 11L), APPLICANT_ID))
                .thenReturn(List.of(first, second));
        PhotoRequirementAnswers answers = answers(10L, 11L);

        assertDoesNotThrow(() -> validator.validate(APPLICANT_ID, answers));

        verify(fileAssetRepository).findAllByIdInAndOwnerId(Set.of(10L, 11L), APPLICANT_ID);
    }

    @Test
    void hidesMissingOrOtherOwnersPhotoAsNotFound() {
        FileAsset first = readyFile(10L);
        when(fileAssetRepository.findAllByIdInAndOwnerId(Set.of(10L, 11L), APPLICANT_ID))
                .thenReturn(List.of(first));

        BusinessException exception = assertThrows(
                BusinessException.class, () -> validator.validate(APPLICANT_ID, answers(10L, 11L))
        );

        assertEquals(FileErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void rejectsPendingPhoto() {
        FileAsset pending = pendingFile(10L);
        when(fileAssetRepository.findAllByIdInAndOwnerId(Set.of(10L), APPLICANT_ID))
                .thenReturn(List.of(pending));

        BusinessException exception = assertThrows(
                BusinessException.class, () -> validator.validate(APPLICANT_ID, answers(10L))
        );

        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
    }

    @Test
    void skipsRepositoryWhenSubmissionHasNoPhotos() {
        validator.validate(APPLICANT_ID, new PhotoRequirementAnswers(List.of()));

        verify(fileAssetRepository, never()).findAllByIdInAndOwnerId(Set.of(), APPLICANT_ID);
    }

    private PhotoRequirementAnswers answers(Long... fileIds) {
        return new PhotoRequirementAnswers(List.of(fileIds).stream()
                .map(fileId -> new PhotoRequirementAnswer(1L, "정면 사진", fileId))
                .toList());
    }

    private FileAsset readyFile(long fileId) {
        FileAsset file = pendingFile(fileId);
        file.completeUpload("image/jpeg", 1_024L);
        return file;
    }

    private FileAsset pendingFile(long fileId) {
        FileAsset file = new FileAsset(
                "submission/%d/photo.jpg".formatted(fileId),
                APPLICANT_ID,
                new FileMetadata("photo.jpg", "image/jpeg", 1_024L)
        );
        ReflectionTestUtils.setField(file, "id", fileId);
        return file;
    }
}
