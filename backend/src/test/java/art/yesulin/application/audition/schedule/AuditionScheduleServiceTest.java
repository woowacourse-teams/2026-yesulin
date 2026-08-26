package art.yesulin.application.audition.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.CreatePerformanceRoleCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionErrorCode;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-schedule;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class AuditionScheduleServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private AuditionScheduleService scheduleService;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileService fileService;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    private long performanceRoleId;

    @BeforeEach
    void cleanUp() {
        screeningReviewRepository.deleteAll();
        roleSectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void savesScheduleAndKeepsExistingStageIdentityWhenItChanges() {
        Audition audition = saveAudition();
        AuditionScheduleResult saved = scheduleService.save(OWNER_ID, audition.getPublicId(), createCommand());
        long firstStageId = saved.stages().get(0).id();
        long secondStageId = saved.stages().get(1).id();
        SaveAuditionScheduleCommand reorderCommand = new SaveAuditionScheduleCommand(
                Instant.parse("2026-09-02T00:00:00Z"),
                Instant.parse("2026-09-12T00:00:00Z"),
                List.of(
                        new SaveScreeningStageCommand(secondStageId, "1차 실기", LocalDate.of(2026, 9, 15), "B관"),
                        new SaveScreeningStageCommand(firstStageId, "2차 면접", LocalDate.of(2026, 9, 20), null),
                        new SaveScreeningStageCommand(null, "3차 면접", LocalDate.of(2026, 9, 21), null)
                )
        );

        AuditionScheduleResult reordered = scheduleService.save(OWNER_ID, audition.getPublicId(), reorderCommand);
        long addedStageId = reordered.stages().get(2).id();
        SaveAuditionScheduleCommand removeCommand = new SaveAuditionScheduleCommand(
                reordered.recruitmentStartAt(),
                reordered.recruitmentEndAt(),
                List.of(
                        new SaveScreeningStageCommand(firstStageId, "1차 면접", LocalDate.of(2026, 9, 20), null),
                        new SaveScreeningStageCommand(addedStageId, "2차 면접", LocalDate.of(2026, 9, 21), null)
                )
        );
        AuditionScheduleResult changed = scheduleService.save(OWNER_ID, audition.getPublicId(), removeCommand);

        assertEquals(secondStageId, reordered.stages().get(0).id());
        assertEquals(firstStageId, reordered.stages().get(1).id());
        assertEquals(firstStageId, changed.stages().get(0).id());
        assertEquals(addedStageId, changed.stages().get(1).id());
        assertNotEquals(secondStageId, changed.stages().get(1).id());
        assertEquals(2, changed.stages().size());
        assertEquals(changed, scheduleService.find(OWNER_ID, audition.getPublicId()));
    }

    @Test
    void hidesAnotherOwnersSchedule() {
        Audition audition = saveAudition();
        scheduleService.save(OWNER_ID, audition.getPublicId(), createCommand());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> scheduleService.find(2L, audition.getPublicId())
        );

        assertEquals(AuditionErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void rejectsStageAfterPerformanceEnd() {
        Audition audition = saveAudition();
        audition.updateBasicInformation(
                audition.getTitle(),
                new PerformancePeriod(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 13))
        );
        auditionRepository.saveAndFlush(audition);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> scheduleService.save(OWNER_ID, audition.getPublicId(), createCommand())
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
    }

    @Test
    void rejectsRemovingStageThatAlreadyHasReviews() {
        Audition audition = saveAudition();
        AuditionScheduleResult saved = scheduleService.save(OWNER_ID, audition.getPublicId(), createCommand());
        long keptStageId = saved.stages().get(0).id();
        long reviewedStageId = saved.stages().get(1).id();
        screeningReviewRepository.saveAndFlush(
                new ScreeningReview(UUID.randomUUID(), saveAuditionRole(audition), reviewedStageId)
        );
        SaveAuditionScheduleCommand removeCommand = new SaveAuditionScheduleCommand(
                saved.recruitmentStartAt(),
                saved.recruitmentEndAt(),
                List.of(new SaveScreeningStageCommand(keptStageId, "1차 서류", LocalDate.of(2026, 9, 12), null))
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> scheduleService.save(OWNER_ID, audition.getPublicId(), removeCommand)
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
        assertEquals(2, scheduleService.find(OWNER_ID, audition.getPublicId()).stages().size());
    }

    @Test
    void serializesConcurrentInitialScheduleSaves() throws Exception {
        Audition audition = saveAudition();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<AuditionScheduleResult> first = executor.submit(
                    () -> saveAfterSignal(start, audition.getPublicId(), createCommand())
            );
            Future<AuditionScheduleResult> second = executor.submit(
                    () -> saveAfterSignal(start, audition.getPublicId(), createCommand())
            );
            start.countDown();

            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);

            assertEquals(1, scheduleRepository.count());
        } finally {
            executor.shutdownNow();
        }
    }

    private AuditionScheduleResult saveAfterSignal(
            CountDownLatch start,
            UUID auditionId,
            SaveAuditionScheduleCommand command
    ) throws InterruptedException {
        start.await();
        return scheduleService.save(OWNER_ID, auditionId, command);
    }

    private Audition saveAudition() {
        PerformanceResult performance = performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(
                        uploadReadyImage(), "햄릿", "서울특별시 종로구 대학로 12",
                        List.of(new CreatePerformanceRoleCommand("햄릿", "덴마크의 왕자"))
                )
        );
        performanceRoleId = performance.roles().getFirst().id();
        return auditionRepository.save(new Audition(
                performance.id(),
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
    }

    private long saveAuditionRole(Audition audition) {
        AuditionRoleSection roleSection = roleSectionRepository.saveAndFlush(new AuditionRoleSection(
                audition.getId(),
                new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        performanceRoleId,
                        new AuditionRoleCondition(1, RoleGender.ANY, 0, 100)
                )))
        ));
        return roleSection.getRoles().getFirst().getId();
    }

    private long uploadReadyImage() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }

    private SaveAuditionScheduleCommand createCommand() {
        return new SaveAuditionScheduleCommand(
                Instant.parse("2026-09-01T00:00:00Z"),
                Instant.parse("2026-09-10T00:00:00Z"),
                List.of(
                        new SaveScreeningStageCommand(null, "1차 서류", LocalDate.of(2026, 9, 12), null),
                        new SaveScreeningStageCommand(null, "2차 실기", LocalDate.of(2026, 9, 14), "A관")
                )
        );
    }
}
