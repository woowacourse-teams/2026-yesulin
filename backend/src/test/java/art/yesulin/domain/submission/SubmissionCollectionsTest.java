package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionCollectionsTest {

    @Test
    void copiesSubmissionFieldSnapshot() {
        List<SubmissionBasicInformationField> basicFields = new ArrayList<>(List.of(
                SubmissionBasicInformationField.NAME
        ));
        SubmissionFieldSnapshot fields = new SubmissionFieldSnapshot(basicFields, List.of());

        basicFields.add(SubmissionBasicInformationField.EMAIL);

        assertEquals(List.of(SubmissionBasicInformationField.NAME), fields.basicFields());
    }

    @Test
    void rejectsDuplicateSubmissionFieldSnapshotValues() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionFieldSnapshot(
                        List.of(SubmissionBasicInformationField.NAME, SubmissionBasicInformationField.NAME),
                        List.of()
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

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
                () -> new QuestionAnswers(List.of(
                        new QuestionAnswer(1L, "지원 동기는?", "답변 1"),
                        new QuestionAnswer(1L, "다른 문구", "답변 2")
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void allowsDifferentPhotosForSameRequirement() {
        PhotoRequirementAnswers photos = new PhotoRequirementAnswers(List.of(
                new PhotoRequirementAnswer(1L, "전신 사진", 10L),
                new PhotoRequirementAnswer(1L, "전신 사진", 11L)
        ));

        assertEquals(2, photos.values().size());
    }

    @Test
    void rejectsDuplicatePhotoAssociation() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new PhotoRequirementAnswers(List.of(
                        new PhotoRequirementAnswer(1L, "전신 사진", 10L),
                        new PhotoRequirementAnswer(1L, "오래된 문구", 10L)
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsDuplicateVideoRequirementIds() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new VideoRequirementAnswers(List.of(
                        new VideoRequirementAnswer(1L, "자유 연기", "https://youtu.be/abcdefghijk"),
                        new VideoRequirementAnswer(1L, "지정 연기", "https://youtu.be/lmnopqrstuv")
                ))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsVideoUrlOverMaximumLength() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new VideoRequirementAnswer(1L, "자유 연기", "a".repeat(2_049))
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void normalizesEmptyOptionalAnswer() {
        QuestionAnswer answer = new QuestionAnswer(1L, "추가로 하고 싶은 말은?", null);

        assertEquals("", answer.answer());
    }
}
