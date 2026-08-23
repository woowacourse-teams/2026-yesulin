package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionCollectionsTest {

    @Test
    void requiresAtLeastOneRole() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SelectedRoles(List.of())
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsDuplicateRoleIds() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SelectedRoles(List.of(
                        new SelectedRole(1L, "햄릿"),
                        new SelectedRole(1L, "오래된 배역명")
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsDuplicateQuestionIds() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new QuestionResponses(List.of(
                        new QuestionResponse(1L, "지원 동기는?", "답변 1"),
                        new QuestionResponse(1L, "다른 문구", "답변 2")
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void allowsDifferentPhotosForSameRequirement() {
        PhotoResponses photos = new PhotoResponses(List.of(
                new PhotoResponse(1L, "전신 사진", 10L),
                new PhotoResponse(1L, "전신 사진", 11L)
        ));

        assertEquals(2, photos.values().size());
    }

    @Test
    void rejectsDuplicatePhotoAssociation() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new PhotoResponses(List.of(
                        new PhotoResponse(1L, "전신 사진", 10L),
                        new PhotoResponse(1L, "오래된 문구", 10L)
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsDuplicateVideoRequirementIds() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new VideoResponses(List.of(
                        new VideoResponse(1L, "자유 연기", "https://youtu.be/abcdefghijk"),
                        new VideoResponse(1L, "지정 연기", "https://youtu.be/lmnopqrstuv")
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void normalizesEmptyOptionalQuestionAnswer() {
        QuestionResponse answer = new QuestionResponse(1L, "추가로 하고 싶은 말은?", null);

        assertEquals("", answer.answer());
    }
}
