package art.yesulin.application.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReviewErrorCode;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ScreeningTestFixture;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-review;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class ScreeningReviewServiceTest {

    private static final long OWNER_ID = 1L;
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");

    @Autowired
    private ScreeningReviewService screeningReviewService;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private ScreeningCompletionRepository completionRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @BeforeEach
    void cleanUp() {
        completionRepository.deleteAll();
        screeningReviewRepository.deleteAll();
        submissionRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void completesScreeningIdempotentlyAfterEveryRoundIsReviewed() {
        long roleId = saveScreeningFixture();
        screeningReviewService.save(
                OWNER_ID, roleId, 1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );

        screeningReviewService.save(
                OWNER_ID, roleId, 2,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );
        screeningReviewService.complete(OWNER_ID, roleId);
        screeningReviewService.complete(OWNER_ID, roleId);

        assertEquals(1, completionRepository.count());
    }

    @Test
    void rejectsCompletingScreeningWithPendingReview() {
        long roleId = saveScreeningFixture();

        BusinessException exception = assertThrows(
                BusinessException.class, () -> screeningReviewService.complete(OWNER_ID, roleId)
        );

        assertEquals(ScreeningReviewErrorCode.ROUND_NOT_READY, exception.getErrorCode());
    }

    @Test
    void savesReviewForEachSubmissionRoleAndRound() {
        long roleId = saveScreeningFixture();

        ScreeningReviewsResult firstRound = screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, "발성 확인 필요")
        );
        screeningReviewService.save(
                OWNER_ID,
                roleId,
                2,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "ETC", "추가 논의", null)
        );
        assertEquals("PASS", firstRound.reviews().getFirst().status());
        assertEquals("", firstRound.reviews().getFirst().memo());
        assertEquals("발성 확인 필요", firstRound.reviews().getFirst().note());
        assertEquals(2, screeningReviewRepository.count());
    }

    @Test
    void changesStatusAndKeepsInternalMemo() {
        long roleId = saveScreeningFixture();
        screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "ETC", "추가 논의", "발성 확인 필요")
        );

        ScreeningReviewsResult result = screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );

        assertEquals("PASS", result.reviews().getFirst().status());
        assertEquals("", result.reviews().getFirst().memo());
        assertEquals("발성 확인 필요", result.reviews().getFirst().note());
        assertEquals(1, screeningReviewRepository.count());
    }

    @Test
    void hidesAnotherOwnersScreeningContext() {
        long roleId = saveScreeningFixture();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> screeningReviewService.save(
                        2L,
                        roleId,
                        1,
                        new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
                )
        );

        assertEquals(ScreeningReviewErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    private long saveScreeningFixture() {
        return new ScreeningTestFixture(
                performanceRepository, auditionRepository, roleSectionRepository, scheduleRepository,
                submissionRepository, fileAssetRepository
        ).save(OWNER_ID, SUBMISSION_ID, 2).roleId();
    }
}
