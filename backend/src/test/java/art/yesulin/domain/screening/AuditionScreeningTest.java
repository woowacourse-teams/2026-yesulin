package art.yesulin.domain.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.submission.Submission;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuditionScreeningTest {

    private static final long ROLE_ID = 7L;
    private static final UUID PASSED_SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
    private static final UUID PENDING_SUBMISSION_ID = UUID.fromString("5ba4f233-d49f-48c8-b07b-390b816beef1");

    @Test
    void includesOnlyApplicantsWhoPassedThePreviousRound() {
        AuditionScreening screening = screening();

        List<UUID> secondRound = screening.applicantsFor(new ScreeningRound(2)).stream()
                .map(Submission::getSubmissionId)
                .toList();

        assertEquals(List.of(PASSED_SUBMISSION_ID), secondRound);
    }

    @Test
    void treatsMissingReviewAsPending() {
        AuditionScreening screening = screening();

        AuditionScreening.Counts counts = screening.countsOf(new ScreeningRound(1));

        assertEquals(2, counts.all());
        assertEquals(1, counts.pending());
        assertEquals(1, counts.pass());
    }

    @Test
    void rejectsSubmissionOutsideTheRoundApplicants() {
        AuditionScreening screening = screening();
        ScreeningReviewChange change = new ScreeningReviewChange(ScreeningReviewStatus.PASS, null, null);

        assertThrows(
                BusinessException.class,
                () -> screening.review(List.of(PENDING_SUBMISSION_ID), new ScreeningRound(2), change)
        );
    }

    @Test
    void rejectsAbsentReviewForFirstRound() {
        AuditionScreening screening = screening();
        ScreeningReviewChange change = new ScreeningReviewChange(ScreeningReviewStatus.ABSENT, null, null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> screening.review(List.of(PENDING_SUBMISSION_ID), new ScreeningRound(1), change)
        );

        assertEquals(ScreeningReviewErrorCode.INVALID_REVIEW, exception.getErrorCode());
    }

    @Test
    void allowsAbsentReviewFromSecondRound() {
        AuditionScreening screening = screening();
        ScreeningReviewChange change = new ScreeningReviewChange(ScreeningReviewStatus.ABSENT, null, null);

        ScreeningReview review = screening.review(
                List.of(PASSED_SUBMISSION_ID), new ScreeningRound(2), change
        ).getFirst();

        assertEquals(ScreeningReviewStatus.ABSENT, review.getStatus());
    }

    @Test
    void createsAndChangesReviewForSelectedApplicants() {
        AuditionScreening screening = screening();
        ScreeningReviewChange change = new ScreeningReviewChange(ScreeningReviewStatus.PASS, null, "확인 완료");

        ScreeningReview review = screening.review(
                List.of(PENDING_SUBMISSION_ID), new ScreeningRound(1), change
        ).getFirst();

        assertEquals(PENDING_SUBMISSION_ID, review.getSubmissionId());
        assertEquals(ROLE_ID, review.getAuditionRoleId());
        assertEquals(11L, review.getScreeningStageId());
        assertEquals(ScreeningReviewStatus.PASS, review.getStatus());
        assertEquals("확인 완료", review.getInternalMemo());
    }

    private AuditionScreening screening() {
        Submission passed = submission(PASSED_SUBMISSION_ID);
        Submission pending = submission(PENDING_SUBMISSION_ID);
        ScreeningReview passedReview = new ScreeningReview(PASSED_SUBMISSION_ID, ROLE_ID, 11L);
        passedReview.decide(ScreeningReviewStatus.PASS, null);
        return new AuditionScreening(
                ROLE_ID,
                List.of(passed, pending),
                List.of(stage(11L, "1차 전형"), stage(12L, "2차 전형")),
                List.of(passedReview)
        );
    }

    private Submission submission(UUID submissionId) {
        Submission submission = mock(Submission.class);
        when(submission.getSubmissionId()).thenReturn(submissionId);
        return submission;
    }

    private ScreeningStage stage(long id, String name) {
        ScreeningStage stage = mock(ScreeningStage.class);
        when(stage.getId()).thenReturn(id);
        when(stage.getName()).thenReturn(name);
        return stage;
    }
}
