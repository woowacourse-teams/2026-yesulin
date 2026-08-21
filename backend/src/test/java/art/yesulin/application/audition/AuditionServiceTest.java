package art.yesulin.application.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionErrorCode;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class AuditionServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private AuditionService auditionService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileService fileService;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void createsDraftWithCompleteBasicInformation() {
        PerformanceResult performance = createPerformance();

        AuditionResult draft = auditionService.create(OWNER_ID, createAuditionCommand(performance.id()));

        assertNotNull(draft.id());
        assertEquals(performance.id(), draft.performanceId());
        assertEquals("DRAFT", draft.status());
        assertNotNull(draft.createdAt());
        assertEquals("햄릿 오디션", draft.title());
        assertTrue(draft.openRun());
    }

    @Test
    void restoresDraftWhenCreationWithSamePublicIdIsRetried() {
        long performanceId = createPerformance().id();
        UUID auditionId = UUID.randomUUID();
        CreateAuditionCommand command = new CreateAuditionCommand(
                auditionId, performanceId, "햄릿 오디션", LocalDate.of(2026, 9, 1), null
        );

        AuditionResult created = auditionService.create(OWNER_ID, command);
        AuditionResult retried = auditionService.create(OWNER_ID, command);

        assertEquals(created.id(), retried.id());
        assertEquals(1, auditionRepository.count());
    }

    @Test
    void updatesBasicInformationAndDerivesOpenRun() {
        AuditionResult draft = auditionService.create(OWNER_ID, createAuditionCommand(createPerformance().id()));

        AuditionResult result = auditionService.updateBasicInformation(
                OWNER_ID,
                draft.id(),
                new UpdateAuditionBasicInformationCommand(
                        "리어왕 오디션",
                        LocalDate.of(2026, 10, 1),
                        LocalDate.of(2026, 10, 31)
                )
        );

        assertEquals("리어왕 오디션", result.title());
        assertEquals(LocalDate.of(2026, 10, 1), result.performanceStartDate());
        assertEquals(LocalDate.of(2026, 10, 31), result.performanceEndDate());
    }

    @Test
    void hidesAnotherOwnersDraft() {
        AuditionResult draft = auditionService.create(OWNER_ID, createAuditionCommand(createPerformance().id()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> auditionService.find(2L, draft.id())
        );

        assertEquals(AuditionErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    private PerformanceResult createPerformance() {
        return performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(
                        uploadReadyImage(),
                        "햄릿",
                        "서울특별시 종로구 대학로 12",
                        List.of()
                )
        );
    }

    private CreateAuditionCommand createAuditionCommand(long performanceId) {
        return new CreateAuditionCommand(
                UUID.randomUUID(), performanceId, "햄릿 오디션", LocalDate.of(2026, 9, 1), null
        );
    }

    private long uploadReadyImage() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }
}
