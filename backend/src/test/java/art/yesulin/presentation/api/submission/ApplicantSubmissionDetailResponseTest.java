package art.yesulin.presentation.api.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.SubmissionDetailResult;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApplicantSubmissionDetailResponseTest {

    private static final long FIRST_FILE_ID = 10L;
    private static final long SECOND_FILE_ID = 20L;

    @Test
    void connectsPhotoUrlByFileIdRegardlessOfMapOrder() {
        Map<Long, String> photoUrlsByFileId = new LinkedHashMap<>();
        photoUrlsByFileId.put(SECOND_FILE_ID, "https://cdn.test/second.jpg");
        photoUrlsByFileId.put(FIRST_FILE_ID, "https://cdn.test/first.jpg");

        ApplicantSubmissionDetailResponse response = ApplicantSubmissionDetailResponse.from(
                submissionDetail(), "https://cdn.test/poster.jpg", photoUrlsByFileId
        );

        final List<ApplicantSubmissionDetailResponse.PhotoRequirementAnswerResponse> photoAnswers =
                response.formAnswers().photoRequirementAnswers();
        assertEquals("햄릿", response.performanceTitle());
        assertEquals("테스트 극단", response.companyName());
        assertEquals("https://cdn.test/poster.jpg", response.posterUrl());
        assertEquals(FIRST_FILE_ID, photoAnswers.getFirst().fileId());
        assertEquals("https://cdn.test/first.jpg", photoAnswers.getFirst().url());
        assertEquals(SECOND_FILE_ID, photoAnswers.get(1).fileId());
        assertEquals("https://cdn.test/second.jpg", photoAnswers.get(1).url());
    }

    @Test
    void rejectsMissingPhotoUrlForFileId() {
        Map<Long, String> photoUrlsByFileId = Map.of(
                FIRST_FILE_ID, "https://cdn.test/first.jpg"
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> ApplicantSubmissionDetailResponse.from(
                        submissionDetail(), "https://cdn.test/poster.jpg", photoUrlsByFileId
                )
        );
    }

    private SubmissionDetailResult submissionDetail() {
        return new SubmissionDetailResult(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "햄릿",
                "햄릿 오디션",
                "테스트 극단",
                30L,
                2L,
                Instant.parse("2026-08-24T03:15:00Z"),
                applicantSnapshot(),
                List.of(),
                new SubmissionDetailResult.FormAnswersResult(
                        List.of(),
                        List.of(
                                new SubmissionDetailResult.PhotoRequirementAnswerResult(
                                        1L, "정면 사진", FIRST_FILE_ID
                                ),
                                new SubmissionDetailResult.PhotoRequirementAnswerResult(
                                        2L, "측면 사진", SECOND_FILE_ID
                                )
                        ),
                        List.of()
                ),
                List.of()
        );
    }

    private SubmissionDetailResult.ApplicantSnapshotResult applicantSnapshot() {
        return new SubmissionDetailResult.ApplicantSnapshotResult(
                new SubmissionDetailResult.BasicInformationResult(
                        null, null, null, null, null, null, null, null
                ),
                new SubmissionDetailResult.AdditionalInformationResult(
                        null, List.of(), null, null, null, null, null, List.of()
                ),
                new SubmissionDetailResult.FieldSnapshotResult(List.of(), List.of()),
                null
        );
    }
}
